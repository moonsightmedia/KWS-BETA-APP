# Isolated store-review environment

The same public app retains customer, setter and admin functions. An explicit
login-page action selects a separate synthetic backend. This is visible to every
user, never detected from a reviewer/device/IP. Production remains the default.

## Trust boundaries

- Root `/opt/kws/store-review` on srv2044594 only. Separate database, Auth users,
  JWT secret, Storage files, media files and Docker volumes.
- Provisioning copies software identities, public schema, Auth trigger definitions,
  Storage policies/bucket settings and publication membership only. No production
  user rows, media objects, SMTP credentials or FCM service account are copied.
- Four reserved `@review.kws.invalid` accounts, invented hall/boulders/progress,
  original synthetic picture and animation. Customer and setter permissions remain
  enforced by the real API/RLS. Review JWTs cannot authenticate in production.
- The private Docker network is internal. Only the existing HTTPS gateway joins
  it and exposes the app APIs and separate video service; Studio/meta are hidden.
  No new public database/SSH/container-management port.
- Separate auth storage, role caches, feedback retries and telemetry state. A full
  page reload drops in-memory query data. No production fallback from a failed demo.

## Installation / retention

`prepare.py --start`, `seed.py`, `storage.py`, then `media-and-security.py` run as
root only after review of the scripts. Supply an original synthetic MP4 as
`demo-source.mp4`. Seeding is marker-guarded and never overwrites existing PGDATA.
Storage setup requires an empty object store and must not be rerun after uploads.
The fixed video URL validation is rebound only in the review database.

`public-routing.py` prints the exact gateway change hashes; `--activate` validates
the config, retains both old gateway files and restores them on failed HTTPS
health checks. Existing production routes are preserved. This is an operator
step, not part of automatic app publication.

Canonical credential references in Bitwarden EU:
`KWS_STORE_REVIEW_ACCOUNTS`, `KWS_STORE_REVIEW_CONFIG`. Protected server copies
are mode600 below the root-only directory. No credential values belong in Git,
Notion, screenshots or handoffs. Production backup policy is unchanged. The demo
contains disposable invented data and is reproducible from schema plus fixtures;
it is not a backup of production. Preserve the referenced credentials when
recreating it, or coordinate an explicit replacement with the store review.

Mail, registration of new demo accounts, external push and external diagnosis
collection are disabled in the demo. Existing preverified demo logins work.
Review instructions must state these limits; no successful external delivery is
simulated. No real user emails, device tokens or credentials are imported.

## Verification

- `python test_guards.py`: isolation and gateway mutation guards.
- `media-and-security.py`: real login, forbidden roles, cross-backend JWT rejection,
  actual image/video upload, three transcoding levels, Range and publication.
- `verify-public.mjs`: real HTTPS, hidden management routes, protected admin RPC,
  own/foreign avatar writes and real Realtime own/foreign notification delivery.
  Takes four accounts and the public anon key only in process environment.
  Its two-host DNS lookup pins the known VPS while retaining full TLS/SNI
  verification; it never requests production.
- `test/store-review.vite.config.ts`: local UI QA with fixture-invalid production
  defaults. A loopback proxy transports real demo API/media responses over verified
  HTTPS to the same fixed VPS while local recursive DNS is stale. Only URL prefixes
  are translated for browser rendering; no result rows are invented. The proxy and
  aliases are absent from production/native builds.

Enable native demo selection with `KWS_STORE_REVIEW_ENABLED=true` and the separate
public anon key in `KWS_STORE_REVIEW_ANON_KEY`. The Android builder rejects a
privileged or production-matching key. The enabled runtime is part of the final
signed store bundle; never claim it is available in an older installed build.
