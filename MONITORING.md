# Crash- und Nutzungs-Monitoring

## Überblick

| System | Zweck | Flag |
|--------|--------|------|
| **Sentry** | Crashes, JS-Fehler, Breadcrumbs (Uploads) | `VITE_SENTRY_DSN` |
| **Supabase Telemetry** | Aktive Geräte, Boulder-Views/Ticks | `VITE_TELEMETRY_ENABLED=true` |
| **Feedback** (bestehend) | Manuelle/auto Fehlermeldungen im Admin | immer an |

Ohne gesetzte Flags bleiben Sentry und Telemetrie **komplett tot** (kein Netzwerk, kein Init-Risiko).

## Phase 1 — Sentry (TestFlight zuerst)

1. Projekt auf [sentry.io](https://sentry.io) anlegen (z. B. `kws-beta-app`).
2. DSN kopieren.
3. Lokal / CI Env setzen:

```bash
VITE_SENTRY_DSN=https://...@o....ingest.sentry.io/...
VITE_SENTRY_ENVIRONMENT=testflight   # optional; default: testflight auf Native, sonst Vite MODE
VITE_SENTRY_ORG_URL=https://sentry.io/organizations/.../issues/  # Link im Admin-Monitoring
```

4. TestFlight-Build mit DSN deployen (nicht zwingend sofort in Web-Prod).
5. In der App absichtlich einen Setter-Upload starten — Breadcrumbs `upload_start` / `upload_compressing` sollten bei Issues sichtbar sein.

Release-Tag: `kws-beta-app@<package.json version>`.

## Phase 2 — Telemetrie

1. Migration anwenden:

```bash
# lokal / CI
npx supabase db push
# oder SQL aus supabase/migrations/20260721120000_create_telemetry_tables.sql im Dashboard
```

2. Env:

```bash
VITE_TELEMETRY_ENABLED=true
```

3. Events: `heartbeat`, `boulder_view`, `boulder_tick`, `upload_start`, `upload_fail`  
   Heartbeat ~90 s, Batch-Flush ~30 s, Timeout 3 s, bei Fehler **kein** Retry-Sturm.

## Phase 3 — Admin

Admin → Tab **Monitoring**:

- Aktive Geräte (5 Min)
- Geräte heute
- Feedback-Fehler / Upload-Fails (24 h)
- Top Boulder Views
- Link zu Sentry (wenn `VITE_SENTRY_ORG_URL` gesetzt)

## Rollout-Reihenfolge (risikoarm)

1. Nur TestFlight + Setter mit Sentry-DSN
2. 1 Woche Noise prüfen (AbortErrors bleiben gefiltert)
3. Telemetrie-Flag für Admin/Setter, dann alle User
4. Web-Prod Sentry optional mit niedrigerem Sampling später

## Sicherheit

- Fail-open: Init/Capture/Telemetry werfen nicht in die App
- Keine Tokens, keine Medienpfade in Breadcrumbs/Events
- Session Replay bewusst **aus**
- Feedback-System bleibt unverändert parallel

## Checkliste „App bleibt stabil“

- [ ] App startet ohne DSN / ohne Telemetry-Flag
- [ ] Upload funktioniert unverändert
- [ ] Admin → Monitoring lädt (oder zeigt Hinweis, wenn Tabellen fehlen)
