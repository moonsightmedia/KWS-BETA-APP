# Integrated external availability · 19 October 2026

## Scope

Admin Overview now includes a shared read-only Systemstatus panel for App, API and Videos. The same panel is in Monitoring Overview, below the existing primary metrics so mobile error triage remains above the fold. Independent Hub checks and Telegram alarms remain outside KWS and unchanged.

## Verified locally

- 338 Node test cases pass, including four new availability parser/projection/SQL authorization tests.
- Four Python bridge tests pass: exact UTF-8 HMAC, fixed destination, redirect rejection, bounded acknowledgement and configuration validation.
- 46 monitoring/admin browser tests pass, including ten new availability cases. The allowed-request assertion was extended for the new reader RPC; an initial above-the-fold regression was corrected by moving the secondary Monitoring panel below existing metrics.
- Responsive views at 375, 768, 1280 and 1920 px inspected in two rendered rounds. Missing, old, failed and outage states remain distinguishable; no horizontal overflow. Keyboard history disclosure and failed refresh followed by recovery are tested.
- Scoped ESLint passes. No TypeScript diagnostics in the changed production files; the full app typecheck still reports pre-existing errors elsewhere and is not claimed clean.
- Fixture screenshots are isolated example data, not production telemetry.

## Verified operationally before web publication

- Existing encrypted KWS database backup verified fresh, successful and containing more than 4,000 verified files before migration.
- Native PostgreSQL pgcrypto HMAC checked against an independent .NET HMAC-SHA256 vector. PGlite's isolated crypto adapter is not presented as native crypto proof.
- Only additive private tables and two tightly scoped RPCs installed. Existing monitoring functions, activation hash, auth/users and Hub registry/routing/check configuration unchanged.
- Dedicated root-owned bridge installed and its minutely timer enabled after an actual signed snapshot was acknowledged and read as an existing administrator. A subsequent automatic tick succeeded.
- Actual services: three fresh operational checks, three live alarm modes; three recent projected historical incidents at the verification point. No synthetic outage or new notification was sent for this UI work.
- Invalid-signature public HTTP publication rejected. Anonymous HTTP admin read denied. Private table and function grants checked. Ordinary/deleted administrator boundaries are covered in SQL regression tests.
- Dedicated signing credential backed up in Bitwarden under `KWS_AVAILABILITY_BRIDGE_SIGNING_KEY`. No service-role key or user data is exported to the Hub bridge or browser.

## Limits

After 180 seconds without fresh source/check data, or immediately after a failed refresh, the panel does not display green. This is an unconfirmed state, not an invented outage. Current infrastructure status does not follow app period/platform/version filters. Incident history is bounded to twelve projected entries, with no fabricated uptime percentage. API/video health checks are not full functional or playback tests. A total KWS outage prevents opening KWS Admin; independent external Telegram alarms continue.

Web publication and actual signed-in production UI evidence are recorded separately in the task handoff after the release is confirmed. No native store release or physical-device crash acceptance is included in this change.
