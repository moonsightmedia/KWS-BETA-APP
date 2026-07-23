# Crash- und Nutzungs-Monitoring (Hybrid)

## Überblick

| System | Zweck | Flag |
|--------|--------|------|
| **Sentry Capacitor + React** | JS-Fehler, native Crashes, Watchdog/OOM (Heuristik beim nächsten Start) | `VITE_SENTRY_DSN` |
| **Supabase Telemetry** | Geräte-Heartbeats + Upload-Schritt-Events (sofortiger Flush) | `VITE_TELEMETRY_ENABLED=true` |
| **upload_logs** | Forensische Upload-Timeline (pending → compressing → uploading → done/fail/oom) | immer (bei Session) |
| **Feedback** | Manuelle/auto Tickets mit Screenshot | immer an |

Ohne DSN / ohne Telemetry-Flag bleiben Sentry bzw. Telemetrie **tot** (fail-open).

## Was wo landet

- **Sentry Issues:** Stacktraces, native crashes, OOM/watchdog, Upload-Breadcrumbs
- **Admin → Monitoring:** aktive Geräte, Upload-Sessions 24h, Telemetrie-Events, Suspected-OOM-Zähler, Link zu Sentry
- **Admin → Feedback:** bestehende Tickets (unverändert)

## Flags (`.env.production`)

```bash
VITE_SENTRY_DSN=https://...@....ingest.de.sentry.io/...
VITE_SENTRY_ENVIRONMENT=testflight
VITE_SENTRY_ORG_URL=https://moonsight-media.sentry.io/issues/
VITE_TELEMETRY_ENABLED=true
```

Release-Tag: `kws-beta-app@<package.json version>`.

## DB-Migration

Migration: `supabase/migrations/20260723100000_create_telemetry_tables.sql`

Erstellt `telemetry_sessions` / `telemetry_events` und erweitert `upload_logs.status` um `aborted_suspected_oom`.

Im Supabase SQL Editor ausführen bzw. `npx supabase db push` (MCP hatte keine Apply-Rechte).

## Upload-Timeline (sofort flush)

`upload_queued` → `upload_start` → `compress_start` → `compress_done` → `chunk_progress` → `upload_done` / `upload_fail`

Bei App-Restart mit offenen lokalen Sessions: `suspected_oom_resume` + Status `aborted_suspected_oom`.

## TestFlight / dSYM

Workflow lädt dSYMs zu Sentry hoch, wenn Secret `SENTRY_AUTH_TOKEN` gesetzt ist (optional `SENTRY_ORG`, `SENTRY_PROJECT`).

Nach dem Build:

1. Absichtlicher JS-Fehler → Sentry + Feedback
2. Ein Boulder-Upload → Timeline in Admin → Monitoring
3. Optional Memory-Stress → beim Relaunch Suspected OOM / Sentry Watchdog

## Sicherheit

- Fail-open: Init/Capture/Telemetry werfen nicht in die App
- Keine Tokens / langen Pfade in Breadcrumbs
- Session Replay aus (besonders während Compress/Upload)
