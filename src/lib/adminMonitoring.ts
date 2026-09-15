export type SessionRow = {
  device_id: string;
  last_seen_at: string;
  platform?: string | null;
  app_version?: string | null;
  user_id?: string | null;
};
export type EventRow = {
  name: string;
  boulder_id: string | null;
  created_at: string;
  props?: Record<string, unknown> | null;
  device_id?: string;
};
export type UploadLogRow = {
  id: string;
  session_id: string;
  boulder_id: string | null;
  status: string;
  file_type: string | null;
  progress: number | null;
  error: string | null;
  updated_at: string;
  created_at?: string;
  user_id?: string | null;
};
type Source<T> = { available: boolean; rows: T[] };
type FetchRows = <T>(path: string) => Promise<T>;

async function readSource<T>(fetchRows: FetchRows, path: string): Promise<Source<T>> {
  try {
    const rows = await fetchRows<T[]>(path);
    if (!Array.isArray(rows)) throw new Error('Ungültige Monitoring-Antwort');
    return { available: true, rows };
  } catch {
    // Missing permissions, timeouts and absent tables must never become a zero count.
    return { available: false, rows: [] };
  }
}

export async function loadMonitoring(fetchRows: FetchRows, now = Date.now()) {
  const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const [activeSessions, sessionsToday, feedbackErrors, uploadFails, uploadOom, recentUploads, recentUploadEvents, boulderViews] = await Promise.all([
    readSource<SessionRow>(fetchRows, `/rest/v1/telemetry_sessions?select=device_id,last_seen_at,platform,app_version,user_id&last_seen_at=gte.${fiveMinutesAgo}&order=last_seen_at.desc`),
    readSource<SessionRow>(fetchRows, `/rest/v1/telemetry_sessions?select=device_id,last_seen_at&last_seen_at=gte.${dayAgo}`),
    readSource<{ id: string }>(fetchRows, `/rest/v1/feedback?select=id&type=eq.error&created_at=gte.${dayAgo}`),
    readSource<UploadLogRow>(fetchRows, `/rest/v1/upload_logs?select=id&status=eq.failed&updated_at=gte.${dayAgo}`),
    readSource<UploadLogRow>(fetchRows, `/rest/v1/upload_logs?select=id&status=eq.aborted_suspected_oom&updated_at=gte.${dayAgo}`),
    readSource<UploadLogRow>(fetchRows, `/rest/v1/upload_logs?select=id,session_id,boulder_id,status,file_type,progress,error,updated_at,created_at,user_id&updated_at=gte.${dayAgo}&order=updated_at.desc&limit=40`),
    readSource<EventRow>(fetchRows, `/rest/v1/telemetry_events?select=name,boulder_id,created_at,props,device_id&name=in.(upload_start,compress_start,compress_done,chunk_progress,upload_done,upload_fail,suspected_oom_resume)&created_at=gte.${dayAgo}&order=created_at.desc&limit=50`),
    readSource<EventRow>(fetchRows, `/rest/v1/telemetry_events?select=name,boulder_id,created_at&name=eq.boulder_view&created_at=gte.${dayAgo}&boulder_id=not.is.null`),
  ]);
  const sources = { activeSessions, sessionsToday, feedbackErrors, uploadFails, uploadOom, recentUploads, recentUploadEvents, boulderViews };
  const unavailable = (Object.keys(sources) as Array<keyof typeof sources>).filter(key => !sources[key].available);
  const viewsByBoulder = new Map<string, number>();
  for (const event of boulderViews.rows) {
    if (event.boulder_id) viewsByBoulder.set(event.boulder_id, (viewsByBoulder.get(event.boulder_id) || 0) + 1);
  }
  return {
    unavailable,
    activeDevices: activeSessions.available ? activeSessions.rows.length : null,
    sessionsToday: sessionsToday.available ? new Set(sessionsToday.rows.map(row => row.device_id)).size : null,
    feedbackErrors: feedbackErrors.available ? feedbackErrors.rows.length : null,
    uploadFails: uploadFails.available ? uploadFails.rows.length : null,
    uploadOom: uploadOom.available ? uploadOom.rows.length : null,
    activeSessions: activeSessions.rows.slice(0, 20),
    recentUploads: recentUploads.rows,
    recentUploadEvents: recentUploadEvents.rows,
    topBoulders: [...viewsByBoulder.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([boulderId, views]) => ({ boulderId, views })),
  };
}
