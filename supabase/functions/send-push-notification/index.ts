import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts"

// WICHTIG: Supabase selbst sendet KEINE Push-Benachrichtigungen!
// Für native Apps (Android/iOS) brauchen wir FCM (Firebase Cloud Messaging) oder APNs
// Diese Edge Function ist nur der Vermittler zwischen Supabase und FCM/APNs

// FCM V1 API nutzt Service Account JSON (moderner und sicherer als Legacy Server Key)
const FCM_PROJECT_ID = Deno.env.get('FCM_PROJECT_ID') || 'kws-beta-app';
const FCM_SERVICE_ACCOUNT_JSON_RAW = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON') || '';

// Helper function to decode the service account JSON
function decodeServiceAccountJson(raw: string): string {
  // If empty, return empty
  if (!raw || raw.length === 0) {
    return '';
  }
  
  // Try to decode as base64 first (if it was base64 encoded)
  try {
    const decoded = atob(raw);
    // Check if decoded string is valid JSON
    JSON.parse(decoded);
    console.log('[FCM] Successfully decoded base64 JSON');
    return decoded;
  } catch (e) {
    // Not base64, use as-is
    console.log('[FCM] Not base64 encoded, using as-is');
    return raw;
  }
}

const FCM_SERVICE_ACCOUNT_JSON = decodeServiceAccountJson(FCM_SERVICE_ACCOUNT_JSON_RAW);

interface PushToken {
  token: string;
  platform: 'android' | 'ios' | 'web';
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  action_url?: string;
}

// Get OAuth2 access token for FCM V1 API using Service Account
async function getAccessToken(serviceAccountJson: string): Promise<string> {
  try {
    console.log('[FCM] Starting access token request...');
    console.log('[FCM] Service Account JSON length:', serviceAccountJson.length);
    console.log('[FCM] Service Account JSON first 200 chars:', serviceAccountJson.substring(0, 200));
    console.log('[FCM] Service Account JSON last 100 chars:', serviceAccountJson.substring(Math.max(0, serviceAccountJson.length - 100)));
    
    // Try to parse JSON - handle both string and already-parsed JSON
    let serviceAccount;
    let jsonString = serviceAccountJson;
    
    // If it's already a string that looks like JSON, try parsing it
    if (typeof jsonString === 'string') {
      // Remove leading/trailing whitespace
      jsonString = jsonString.trim();
      
      // If it starts with a quote, it might be double-encoded
      if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
        console.log('[FCM] JSON appears to be double-quoted, unescaping...');
        try {
          jsonString = JSON.parse(jsonString);
        } catch (e) {
          console.log('[FCM] Failed to unescape, using as-is');
        }
      }
      
      // Try parsing as JSON
      try {
        serviceAccount = JSON.parse(jsonString);
      } catch (parseError: any) {
        console.error('[FCM] JSON parse error:', parseError);
        console.error('[FCM] Error message:', parseError.message);
        console.error('[FCM] JSON string (first 500 chars):', jsonString.substring(0, 500));
        console.error('[FCM] JSON string (last 200 chars):', jsonString.substring(Math.max(0, jsonString.length - 200)));
        throw new Error(`Invalid JSON in FCM_SERVICE_ACCOUNT_JSON: ${parseError.message}`);
      }
    } else {
      // Already an object
      serviceAccount = jsonString;
    }
    const now = Math.floor(Date.now() / 1000);
    
    // Create JWT claim
    const claim = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };
    
    console.log('[FCM] JWT claim created:', { iss: claim.iss, aud: claim.aud });
    
    // Prepare private key - remove PEM headers and convert to base64
    let privateKeyPem = serviceAccount.private_key.replace(/\\n/g, '\n');
    // Remove PEM headers if present
    privateKeyPem = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----/g, '');
    privateKeyPem = privateKeyPem.replace(/-----END PRIVATE KEY-----/g, '');
    privateKeyPem = privateKeyPem.replace(/\n/g, '').trim();
    
    console.log('[FCM] Preparing private key (length:', privateKeyPem.length, ')');
    
    // Convert base64 to ArrayBuffer
    const privateKeyBytes = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
    
    console.log('[FCM] Importing private key...');
    // Import private key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes.buffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
    
    console.log('[FCM] Private key imported, creating JWT...');
    // Create and sign JWT
    const jwt = await create(
      { alg: 'RS256', typ: 'JWT' },
      claim,
      privateKey
    );
    
    console.log('[FCM] JWT created, exchanging for access token...');
    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[FCM] Token request failed:', tokenResponse.status, errorText);
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('[FCM] Access token received successfully');
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Send FCM V1 API message
async function sendFCMV1Message(
  accessToken: string,
  token: string,
  payload: PushPayload
): Promise<any> {
  const message = {
    message: {
      token: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        ...Object.fromEntries(
          Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])
        ),
        action_url: payload.action_url || '',
      },
      android: {
        priority: 'high',
      },
    },
  };
  
  console.log(`[FCM] Sending message to FCM API for project: ${FCM_PROJECT_ID}`);
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    }
  );
  
  const responseData = await response.json();
  console.log(`[FCM] FCM API response status: ${response.status}`);
  console.log(`[FCM] FCM API response data:`, JSON.stringify(responseData, null, 2));
  
  if (!response.ok) {
    console.error(`[FCM] FCM API error: ${response.status}`, responseData);
    throw new Error(`FCM V1 API error: ${response.status} ${JSON.stringify(responseData)}`);
  }
  
  return responseData;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { tokens, payload }: { tokens: PushToken[]; payload: PushPayload } = await req.json();
    
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No tokens provided' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!payload || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payload' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Separate tokens by platform
    const androidTokens = tokens.filter(t => t.platform === 'android').map(t => t.token);
    const iosTokens = tokens.filter(t => t.platform === 'ios').map(t => t.token);
    
    const results = [];
    
    // Send to Android devices using FCM V1 API
    if (androidTokens.length > 0) {
      console.log(`[FCM] Processing ${androidTokens.length} Android token(s)...`);
      try {
        if (!FCM_SERVICE_ACCOUNT_JSON) {
          console.error('[FCM] FCM_SERVICE_ACCOUNT_JSON not configured');
          results.push({ 
            platform: 'android', 
            success: false, 
            error: 'FCM_SERVICE_ACCOUNT_JSON not configured. Bitte Service Account JSON als Supabase Secret setzen.' 
          });
        } else {
          console.log('[FCM] FCM_SERVICE_ACCOUNT_JSON found, length:', FCM_SERVICE_ACCOUNT_JSON.length);
          console.log('[FCM] Getting access token...');
          // Get access token
          const accessToken = await getAccessToken(FCM_SERVICE_ACCOUNT_JSON);
          console.log('[FCM] Access token obtained, sending messages...');
          
          // Send to each token
          for (const token of androidTokens) {
            try {
              console.log(`[FCM] Sending to token: ${token.substring(0, 20)}...`);
              const result = await sendFCMV1Message(accessToken, token, payload);
              console.log(`[FCM] Successfully sent to token: ${token.substring(0, 20)}...`);
              results.push({ platform: 'android', token: token.substring(0, 20) + '...', success: true, result });
            } catch (error) {
              console.error(`[FCM] Error sending to token ${token.substring(0, 20)}...:`, error);
              results.push({ platform: 'android', token: token.substring(0, 20) + '...', success: false, error: String(error) });
            }
          }
        }
      } catch (error) {
        console.error('[FCM] FCM V1 API error:', error);
        results.push({ platform: 'android', success: false, error: String(error) });
      }
    }
    
    // Send to iOS devices using APNs (requires additional setup)
    if (iosTokens.length > 0) {
      console.log('iOS push notifications require APNs setup');
      results.push({ platform: 'ios', success: false, error: 'APNs not configured' });
    }
    
    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
