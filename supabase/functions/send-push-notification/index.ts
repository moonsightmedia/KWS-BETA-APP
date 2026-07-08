import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID") || "kws-beta-app";
const FCM_SERVICE_ACCOUNT_JSON_RAW = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Platform = "android" | "ios" | "web";

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  action_url: string | null;
}

interface NotificationPreferences {
  push_enabled: boolean;
  boulder_new: boolean;
  competition_update: boolean;
  feedback_reply: boolean;
  admin_announcement: boolean;
  schedule_reminder: boolean;
}

interface PushToken {
  token: string;
  platform: Platform;
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  action_url?: string | null;
}

interface BoulderRow {
  id: string;
  name: string | null;
  sector_id: string | null;
}

interface SectorRow {
  id: string;
  name: string;
}

interface ProfileRow {
  id: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function decodeServiceAccountJson(raw: string): string {
  if (!raw) return "";

  try {
    const decoded = atob(raw);
    JSON.parse(decoded);
    return decoded;
  } catch {
    return raw;
  }
}

const FCM_SERVICE_ACCOUNT_JSON = decodeServiceAccountJson(FCM_SERVICE_ACCOUNT_JSON_RAW);

function getBearerToken(req: Request): string | null {
  const authorization = req.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

async function supabaseFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service configuration missing");
  }

  const headers = new Headers(init.headers);
  headers.set("apikey", SUPABASE_SERVICE_ROLE_KEY);
  headers.set("Authorization", `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${SUPABASE_URL}${path}`, { ...init, headers });
}

async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const token = getBearerToken(req);
  if (!token || !SUPABASE_URL) return null;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return null;
  const user = await res.json();
  return typeof user?.id === "string" ? user.id : null;
}

async function userHasRole(userId: string, roles: string[]): Promise<boolean> {
  const roleFilter = roles.join(",");
  const res = await supabaseFetch(
    `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&role=in.(${roleFilter})&select=user_id&limit=1`,
  );
  if (!res.ok) {
    console.error("[Push] Role check failed:", res.status, await res.text());
    return false;
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function canSendNotification(callerUserId: string, notification: NotificationRow): Promise<boolean> {
  if (notification.type === "boulder_new" || notification.type === "schedule_reminder") {
    return userHasRole(callerUserId, ["admin", "setter"]);
  }

  if (notification.type === "admin_announcement") {
    return userHasRole(callerUserId, ["admin"]);
  }

  return callerUserId === notification.user_id || await userHasRole(callerUserId, ["admin"]);
}

async function fetchSingle<T>(path: string): Promise<T | null> {
  const res = await supabaseFetch(path);
  if (!res.ok) {
    console.error("[Push] Supabase fetch failed:", path, res.status, await res.text());
    return null;
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] as T : null;
}

async function fetchMany<T>(path: string): Promise<T[]> {
  const res = await supabaseFetch(path);
  if (!res.ok) {
    console.error("[Push] Supabase fetch failed:", path, res.status, await res.text());
    return [];
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows as T[] : [];
}

function isNotificationTypeEnabled(type: string, preferences: NotificationPreferences): boolean {
  if (!preferences.push_enabled) return false;

  switch (type) {
    case "boulder_new":
      return preferences.boulder_new;
    case "competition_update":
      return preferences.competition_update;
    case "feedback_reply":
      return preferences.feedback_reply;
    case "admin_announcement":
      return preferences.admin_announcement;
    case "schedule_reminder":
      return preferences.schedule_reminder;
    default:
      return true;
  }
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  let serviceAccount;
  let jsonString = serviceAccountJson.trim();

  if (jsonString.startsWith("\"") && jsonString.endsWith("\"")) {
    jsonString = JSON.parse(jsonString);
  }

  serviceAccount = JSON.parse(jsonString);
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  let privateKeyPem = serviceAccount.private_key.replace(/\\n/g, "\n");
  privateKeyPem = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----/g, "");
  privateKeyPem = privateKeyPem.replace(/-----END PRIVATE KEY-----/g, "");
  privateKeyPem = privateKeyPem.replace(/\n/g, "").trim();

  const privateKeyBytes = Uint8Array.from(atob(privateKeyPem), (c) => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const jwt = await create({ alg: "RS256", typ: "JWT" }, claim, privateKey);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get FCM access token: ${tokenResponse.status} ${await tokenResponse.text()}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function sendFCMMessage(accessToken: string, token: string, payload: PushPayload): Promise<unknown> {
  const message = {
    message: {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        ...Object.fromEntries(
          Object.entries(payload.data || {}).map(([key, value]) => [key, String(value)]),
        ),
        action_url: payload.action_url || "",
      },
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    },
  );

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(`FCM V1 API error: ${response.status} ${JSON.stringify(responseData)}`);
  }

  return responseData;
}

function isInvalidTokenError(error: unknown): boolean {
  const text = JSON.stringify(error);
  return text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT") || text.includes("NOT_FOUND");
}

async function deletePushToken(token: string): Promise<void> {
  const res = await supabaseFetch(`/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!res.ok) {
    console.error("[Push] Failed to delete invalid token:", res.status, await res.text());
  }
}

async function deliverNotification(notification: NotificationRow): Promise<Record<string, unknown>> {
  const preferences = await fetchSingle<NotificationPreferences>(
    `/rest/v1/notification_preferences?user_id=eq.${encodeURIComponent(notification.user_id)}&select=push_enabled,boulder_new,competition_update,feedback_reply,admin_announcement,schedule_reminder`,
  );

  if (!preferences || !isNotificationTypeEnabled(notification.type, preferences)) {
    return { success: true, skipped: true, reason: "Push disabled by preferences" };
  }

  const tokens = await fetchMany<PushToken>(
    `/rest/v1/push_tokens?user_id=eq.${encodeURIComponent(notification.user_id)}&select=token,platform`,
  );

  const supportedTokens = tokens.filter((token) => token.platform === "android" || token.platform === "ios");
  if (supportedTokens.length === 0) {
    return { success: true, skipped: true, reason: "No supported push tokens" };
  }

  if (!FCM_SERVICE_ACCOUNT_JSON) {
    throw new Error("FCM_SERVICE_ACCOUNT_JSON not configured");
  }

  const accessToken = await getAccessToken(FCM_SERVICE_ACCOUNT_JSON);
  const payload: PushPayload = {
    title: notification.title,
    body: notification.message,
    data: {
      ...(notification.data || {}),
      notification_id: notification.id,
      notification_type: notification.type,
    },
    action_url: notification.action_url,
  };

  const results = [];
  for (const pushToken of supportedTokens) {
    try {
      const result = await sendFCMMessage(accessToken, pushToken.token, payload);
      results.push({
        platform: pushToken.platform,
        token: `${pushToken.token.substring(0, 20)}...`,
        success: true,
        result,
      });
    } catch (error) {
      const invalid = isInvalidTokenError(error);
      if (invalid) {
        await deletePushToken(pushToken.token);
      }
      results.push({
        platform: pushToken.platform,
        token: `${pushToken.token.substring(0, 20)}...`,
        success: false,
        invalid,
        error: String(error),
      });
    }
  }

  return {
    success: true,
    notification_id: notification.id,
    sent: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length,
    results,
  };
}

async function createNotificationForUser(
  userId: string,
  title: string,
  message: string,
  data: Record<string, unknown>,
): Promise<NotificationRow | null> {
  const res = await supabaseFetch("/rest/v1/notifications", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      type: "boulder_new",
      title,
      message,
      data,
      action_url: "/boulders",
    }),
  });

  if (!res.ok) {
    console.error("[Push] Failed to create notification:", res.status, await res.text());
    return null;
  }

  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] as NotificationRow : null;
}

async function createAndDeliverBoulderNotifications(
  callerUserId: string,
  boulderIds: string[],
): Promise<Record<string, unknown>> {
  if (!await userHasRole(callerUserId, ["admin", "setter"])) {
    return { success: false, error: "Forbidden" };
  }

  const uniqueBoulderIds = [...new Set(boulderIds)].filter(Boolean);
  if (uniqueBoulderIds.length === 0) {
    return { success: false, error: "boulder_ids is required" };
  }

  const boulders = await fetchMany<BoulderRow>(
    `/rest/v1/boulders?id=in.(${uniqueBoulderIds.map(encodeURIComponent).join(",")})&select=id,name,sector_id`,
  );
  if (boulders.length === 0) {
    return { success: false, error: "No boulders found" };
  }

  const sectorIds = [...new Set(boulders.map((boulder) => boulder.sector_id).filter(Boolean))] as string[];
  const sectors = sectorIds.length > 0
    ? await fetchMany<SectorRow>(
      `/rest/v1/sectors?id=in.(${sectorIds.map(encodeURIComponent).join(",")})&select=id,name`,
    )
    : [];
  const sectorNames = sectorIds
    .map((sectorId) => sectors.find((sector) => sector.id === sectorId)?.name)
    .filter(Boolean) as string[];
  const sectorLabel = sectorNames.length === 1
    ? `in ${sectorNames[0]}`
    : sectorNames.length > 1
      ? `in ${sectorNames.join(", ")}`
      : "";

  const title = boulders.length === 1 ? "Neuer Boulder" : `${boulders.length} neue Boulder`;
  const message = boulders.length === 1
    ? `Ein neuer Boulder ist jetzt verfuegbar${sectorLabel ? ` ${sectorLabel}` : ""}.`
    : `${boulders.length} neue Boulder sind jetzt verfuegbar${sectorLabel ? ` ${sectorLabel}` : ""}.`;
  const data = {
    boulder_count: boulders.length,
    boulder_ids: boulders.map((boulder) => boulder.id),
    sector_ids: sectorIds,
  };

  const profiles = await fetchMany<ProfileRow>("/rest/v1/profiles?select=id");
  const preferences = await fetchMany<{ user_id: string; in_app_enabled: boolean; boulder_new: boolean }>(
    "/rest/v1/notification_preferences?select=user_id,in_app_enabled,boulder_new",
  );
  const preferencesByUserId = new Map(preferences.map((preference) => [preference.user_id, preference]));
  const targetUserIds = profiles
    .filter((profile) => {
      const preference = preferencesByUserId.get(profile.id);
      return !preference || (preference.in_app_enabled && preference.boulder_new);
    })
    .map((profile) => profile.id);

  const deliveryResults: Array<Record<string, unknown>> = [];
  for (const userId of targetUserIds) {
    const notification = await createNotificationForUser(userId, title, message, data);
    if (!notification) {
      deliveryResults.push({ user_id: userId, success: false, error: "Notification create failed" });
      continue;
    }

    try {
      const delivery = await deliverNotification(notification);
      deliveryResults.push({ user_id: userId, ...delivery });
    } catch (error) {
      deliveryResults.push({ user_id: userId, success: false, error: String(error) });
    }
  }

  return {
    success: true,
    event: "boulder_new",
    notifications_created: deliveryResults.filter((result) => "notification_id" in result).length,
    sent: deliveryResults.reduce((sum, result) => sum + (typeof result.sent === "number" ? result.sent : 0), 0),
    failed: deliveryResults.reduce((sum, result) => sum + (typeof result.failed === "number" ? result.failed : 0), 0),
    results: deliveryResults,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const callerUserId = await getAuthenticatedUserId(req);
    if (!callerUserId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    if (body?.event === "boulder_new") {
      const boulderIds = Array.isArray(body?.boulder_ids) ? body.boulder_ids.map(String) : [];
      const result = await createAndDeliverBoulderNotifications(callerUserId, boulderIds);
      return jsonResponse(result, result.success === false ? 400 : 200);
    }

    const notificationId = body?.notification_id;
    if (!notificationId || typeof notificationId !== "string") {
      return jsonResponse({ success: false, error: "notification_id is required" }, 400);
    }

    const notification = await fetchSingle<NotificationRow>(
      `/rest/v1/notifications?id=eq.${encodeURIComponent(notificationId)}&select=id,user_id,type,title,message,data,action_url`,
    );
    if (!notification) {
      return jsonResponse({ success: false, error: "Notification not found" }, 404);
    }

    if (!await canSendNotification(callerUserId, notification)) {
      return jsonResponse({ success: false, error: "Forbidden" }, 403);
    }

    return jsonResponse(await deliverNotification(notification));
  } catch (error) {
    console.error("[Push] Error:", error);
    return jsonResponse({ success: false, error: String(error) }, 500);
  }
});
