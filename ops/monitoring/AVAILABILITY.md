# External availability in the KWS admin dashboard

The independent Moonsight Hub remains responsible for checking App, API and video health every minute and sending Telegram alerts. The KWS dashboard is a read-only projection, not a replacement for external monitoring. If KWS is completely unavailable, its dashboard cannot be opened; the external checks and alarms continue.

## Data path and security

- A dedicated root-owned systemd oneshot on the existing Hub host reads only the three statically allowlisted KWS projects through the existing local operator API. It does not change registry entries, targets, routing or alarm modes.
- `availability-export.mjs` projects service state, check time, optional latency, actual alarm mode and at most twelve recent incidents. No user identities, monitored URLs, raw responses or operator tokens leave the Hub.
- `availability-bridge.py` signs the exact UTF-8 JSON with a dedicated 32-byte HMAC-SHA256 key. It posts only to the fixed KWS publisher endpoint using the public anon key; no KWS service-role credential is stored on the Hub. Redirects are rejected, requests and responses bounded.
- `20261019180000_admin_availability.sql` validates the signature, shape, service allowlist and timestamps before accepting a newer snapshot. Duplicate or older snapshots cannot overwrite a newer one. Key and snapshot tables are in an inaccessible private schema with RLS enabled.
- `kws_admin_availability()` requires an existing authenticated administrator. Anonymous users, ordinary accounts and deleted accounts cannot read the snapshot. No browser receives the signing key or Hub operator credential.

## Installation

Apply the migration through the existing protected database administration channel after checking a fresh verified encrypted backup. Provision a random 32-byte key in the private `availability_key` table and a matching protected config on the Hub, without logging the value.

Install the two source files at `/opt/moonsight-hub/integrations/kws-availability/`, the two unit files in `/etc/systemd/system/`, and the config at `/etc/moonmon/secrets/kws_availability_bridge.json` (root-owned, mode 0600). Config has exactly `signing_key` (64 hexadecimal characters) and `public_key` (existing public anon JWT).

The deployed signing key is backed up under the Bitwarden credential reference `KWS_AVAILABILITY_BRIDGE_SIGNING_KEY`; never include its value in this runbook.

Run the oneshot manually, verify its acknowledgement and an actual admin read, then enable the timer. Do not redeploy the whole Hub or restart its existing monitoring containers for this integration.

## UI semantics

`Admin → Übersicht` and `Monitoring → Übersicht` show the same responsive Systemstatus panel. App, API and Videos stack on mobile and use three columns on desktop. Refresh is independent from the other dashboard sources; it runs every 30 seconds while visible. Last incidents expand with mouse, touch or keyboard.

Only a fresh confirmed result is green. Snapshot or individual check ages of 180 seconds, failed refreshes, missing data and unsupported payloads become “Nicht bestätigt”, never a fabricated outage or a healthy zero. The age calculation uses server time plus elapsed client time. “Prüfung auffällig” is distinguished from an incident confirmed by the Hub. Alarm mode shown with stale data is explicitly the last reported state.

API/video checks cover their health endpoints, not every business action or actual video playback. This panel does not invent historical uptime percentages; incident history is bounded by the Hub result and twelve-entry projection, not a complete audit archive. Dashboard period, platform and app-version filters do not apply to current infrastructure health.

## Operations and rollback

- Check `systemctl status kws-availability-bridge.timer` and `journalctl -u kws-availability-bridge.service`. Logs contain only generic success/failure, not keys, requests or raw source responses.
- A broken bridge causes the dashboard to go unconfirmed within three minutes. Existing Hub checks and Telegram delivery do not depend on the bridge or KWS publisher.
- To stop only this integration: disable its timer and optionally revoke publisher execution. Keep existing checks, routes and alarm modes unchanged. UI fails closed if its reader is unavailable.
- Rotate by stopping the timer, replacing the dedicated key in both protected locations, verifying a manual run and restarting the timer. Never copy secret values into Git, tickets, screenshots or documentation.

## Verification

Run `node --test test/adminAvailability.test.mjs`, `python -m unittest discover -s test -p availability_bridge_test.py`, and the launch-monitoring Playwright config. Tests cover payload validation, admin boundaries, replay, age/error handling, projection minimization, exact signing, redirects and responsive/keyboard interactions. PGlite uses an isolated crypto adapter; real PostgreSQL pgcrypto HMAC and the end-to-end signed publication must additionally be verified against the deployed installation.
