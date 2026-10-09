# KWS operating dashboard

Protected landing page: https://supabase.kletterwelt-sauerland.de/
Native Studio remains at `/project/default`; all original Studio API routes stay
behind the existing HTTP Basic login. This is a companion overview, not a fork of
Supabase Studio or an implementation of Supabase Cloud's management plane.

## Data and access

`collect-status.py` runs as a root systemd oneshot every minute on srv2044594.
It makes one read-only repeatable-read database transaction with a six-second
statement timeout, inspects only twelve named production containers, reads Linux
resource counters and checks existing backup verification reports. It emits
aggregate counts and health states; no user records, job owners, URLs containing
tokens, environment values, passwords or connection strings reach the browser.
Each section can fail independently and then becomes unavailable rather than zero.

Snapshot: `/opt/kws/operations-dashboard/public/ops/status.json`, written atomically.
The existing Caddy container mounts the `public` directory read-only. There is no
HTTP write endpoint, additional application service or external analytics provider.
The overview loads local fonts (Poppins/Teko; included OFL licences) and uses a
restrictive CSP. Basic authentication applies to HTML, assets, JSON and Studio.

Client refreshes and server collection each run every minute, so the visible
snapshot may lag collection by up to roughly two minutes. Snapshots older than
three minutes are explicitly marked. CPU is a one-second sample, not a historical
utilisation chart. Video counts include encoded variants, not unique boulders.
Current thumbnail count includes only images in the video service's final folder;
older images remain in Supabase Storage and the migrated image directory.

The backup panel distinguishes successful decryption/hash checks from an actual
isolated DB restore test, and from a verified independent backup location.
An older successful restore test does not certify the newest archive. An
off-server backup is currently not verified and is shown as an open item.

## Deploy and restore

Initial installation (only when dashboard directory is absent):

```powershell
node ops/hostinger/dashboard/deploy.mjs
```

The installer verifies the SSH host, encrypts the previous gateway/backup-engine
configuration, validates Caddy with the existing credentials in memory, starts
the collector and checks all real-data sections before routing the landing page.
Gateway application failure restores its previous configuration. The initial
installer intentionally refuses a second installation. Asset-only updates:

```powershell
node ops/hostinger/dashboard/deploy.mjs --assets-only
```

The production backup engine includes the dashboard directory and both systemd
units in every new encrypted restore set. To recover on a restored server, restore
the directory to `/opt/kws/operations-dashboard`, the two units to
`/etc/systemd/system`, and the saved gateway compose/Caddy configuration, then:

```sh
systemctl daemon-reload
systemctl enable --now kws-operations-status.timer
systemctl start kws-operations-status.service
docker compose -f /opt/kws/public-gateway/docker-compose.yml up -d --no-deps caddy
```

The database, Storage, app and videos must already have been restored using the
main KWS recovery procedure. Never use a browser-visible JSON snapshot as a backup.

Verification:

```powershell
node --test ops/hostinger/dashboard/dashboard.test.mjs
node ops/hostinger/run-remote.mjs ops/hostinger/dashboard/verify.sh
```

Verification evidence: `docs/qa/2026-10-09-operations-dashboard.md`.
