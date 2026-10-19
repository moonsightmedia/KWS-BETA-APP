export function adminOverviewFixture() {
  const now = new Date();
  const generatedAt = now.toISOString();
  const ready = { state: 'ready', status: 'connected', last_updated_at: generatedAt, last_success_at: generatedAt };
  return {
    schema_version: 1, generated_at: generatedAt, period_start: new Date(now.getTime() - 86_400_000).toISOString(), period_end: generatedAt,
    users: { total: 248, new_24h: 12, admins: 3, setters: 8, deletions_pending: 2, deletions_overdue: 1 },
    hall: { boulders_hanging: 172, boulders_removed: 394, areas_active: 6, sectors_active: 19, scheduled_resets: 3 },
    moderation: { comments_pending: 4, reports_open: 2 },
    feedback: { people_active: 5, legacy_errors_active: 1 },
    monitoring: { app_active: 3, sentry_active: 2 },
    uploads: { failed_24h: 2, processing_now: 1, video_failed_now: 1 },
    notifications: { created_24h: 84, provider_accepted_24h: 46, provider_rejected_24h: 2, failed_24h: 3, opened_24h: 27 },
    sources: {
      collector: { ...ready, status: 'observed' }, sentry: { ...ready }, alerts: { ...ready },
      stores: { state: 'unconfigured', status: 'not_connected', last_updated_at: null, last_success_at: null },
    },
  };
}
