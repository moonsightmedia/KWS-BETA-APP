export function launchDashboardFixture(now = Date.now()) {
  const timestamp = new Date(now).toISOString();
  const earlier = new Date(now - 86_400_000).toISOString();
  const source = (state, detail) => ({ state, last_updated_at: state === 'unconfigured' ? null : timestamp, detail });
  return {
    schema_version: 1, generated_at: timestamp, measurement_started_at: earlier, latest_event_at: timestamp,
    summary: { first_opens: 24, web_first_opens: 7, new_accounts: 18, confirmed_accounts: 16, active_devices: 43, active_accounts: 32, sessions: 81, affected_sessions: 3, errors: 9, activation_eligible: 12, activated: 10, boulder_views: 246, video_started: 180, video_failed: 4 },
    daily: [{ date: timestamp.slice(0, 10), first_opens: 24, sessions: 81, affected_sessions: 3, boulder_views: 246 }],
    releases: ['android@1.0.67', 'ios@1.0.24', 'web@1.0.245'],
    issues: [
      { fingerprint: 'fixture-video', title: 'Boulder-Video konnte nicht geladen werden', severity: 'error', first_seen_at: earlier, last_seen_at: timestamp, occurrences: 8, affected_devices: 3, release: 'android@1.0.67', platform: 'android', status: 'open', source: 'app', permalink: null, fixed_release: null },
      { fingerprint: 'fixture-network', title: 'Boulderliste nach unterbrochener Verbindung nicht erreichbar', severity: 'warning', first_seen_at: earlier, last_seen_at: timestamp, occurrences: 1, affected_devices: 1, release: 'ios@1.0.24', platform: 'ios', status: 'acknowledged', source: 'app', permalink: null, fixed_release: null },
    ],
    activity: [{ installation_ref: 'fixture-3a9f', user_ref: 'fixture-konto-82c1', platform: 'android', release: 'android@1.0.67', last_seen_at: timestamp, screen: 'Boulder', boulder_id: 'fixture-boulder-1' }],
    top_boulders: [{ id: 'fixture-boulder-1', name: 'Kleine Kante an der langen Platte', views: 41 }, { id: 'fixture-boulder-2', name: 'Grüner Pfeil', views: 32 }],
    deliveries: [{ id: 'fixture-delivery-1', notification_id: 'fixture-notification-1', recipient_ref: 'fixture-konto-82c1', platform: 'android', status: 'provider_accepted', code: null, created_at: timestamp }, { id: 'fixture-delivery-2', notification_id: 'fixture-notification-1', recipient_ref: 'fixture-konto-82c1', platform: 'android', status: 'opened', code: null, created_at: timestamp }],
    store_metrics: [],
    sources: { collector: source('ready', 'Nutzungsanalyse ist optional. Ereignisse werden für teilnehmende Instanzen erfasst.'), issues: source('ready', 'App-Diagnose nach Messbeginn; native Sentry-Quelle noch nicht verbunden.'), notifications: source('ready', 'Gespeicherte Versandschritte, keine Bestätigung der Handy-Anzeige.'), stores: source('unconfigured', 'Offizielle TestFlight-, App-Store- und Google-Play-Berichte sind noch nicht verbunden.') },
  };
}
