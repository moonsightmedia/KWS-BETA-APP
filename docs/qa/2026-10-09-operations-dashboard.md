# KWS operational overview — 9 October 2026

Live URL: https://supabase.kletterwelt-sauerland.de/

## Result

Supabase Studio project label is now **KWS Beta App** and organisation environment
label is **Kletterwelt Sauerland**. The protected domain root now shows a companion
overview with real production counts, server CPU/RAM/disk, twelve production
services, video processing and backups. Original Studio remains reachable at
`/project/default`; observed table/auth/storage/SQL/advisor/query-performance links
are used rather than guessed routes.

Observed data: 44 auth users, 104 boulders, 19 sectors, 2,389 Storage objects,
35 public app tables; 316 `.mp4` variants and zero images in the video service's
final folder. Other older thumbnails remain in Storage/migrated images. No
production records were inserted to populate the screen.

## Verification

- 7 automated behavioural tests: first-load failure, failed refresh with retained
  readings, stale snapshot, partial unavailable sections, stopped services,
  overdue backups, invalid snapshot and legitimate zero counts.
- 22 HTTPS checks: nine unauthenticated routes return 401, wrong Basic credentials
  and an API service token are denied, authorised HTML/assets/snapshot and native
  Studio SQL work, public app/video/auth health remain accessible.
- Initial collector and repeated timer snapshots have no section errors.
  All twelve named production dependencies are running; configured health checks
  are healthy. Containers without health checks are reported as running only.
- Desktop browser baseline console has no errors or warnings.
- Actual browser network-block test shows the failure message and retains the 44
  users and other readings; successful refresh after clearing the temporary block
  hides the warning again. The temporary browser network block is removed.
- Tab from Refresh reaches the first count link; visible solid focus outline.
  Studio navigation and return to the overview work. Viewport overrides reset.
- Two visual loops: layout at 375, 768, 1280 and 1920px, then refresh/failure,
  keyboard/navigation and loaded-state review. No horizontal content overflow.
  Corrected a wrapped mobile app button and singular server uptime label.

Screenshots are in `test-results/operations-dashboard-20261009/`, including the
actual rendered mobile, tablet, desktop and retained-readings failure state.
Full-page screenshot commands timed out; ordinary viewport captures are used.
This screenshot-tool limitation is not an app rendering failure.

## Backup and secrets

New complete encrypted set **20261009T154201Z.tar.age** successfully decrypts and
hash-verifies **4,251 files**, all **2,389 Storage versions**, **448 referenced
media URLs** and the Vault root key. It includes the dashboard directory and
systemd units, plus the renamed Studio environment. An actual isolated DB restore
test remains confirmed for the earlier 14:33:59 UTC archive: 73 exact tables,
17,618 rows, 2 sequences and Vault decryption. No new DB restore is claimed for
the 15:42 archive. Daily backup timer remains active.

Independent off-server backup is still unverified and explicitly visible in the
overview. The Bitwarden reference **KWS_HOSTINGER_SUPABASE_CONFIG** was updated
from the actual runtime environment and read back for exact equality. No secret
values are in source, browser JSON, proof files or this note.

## Scope

Only Studio was recreated for its name; only the public gateway was recreated for
the dashboard mount/routing. Database/Auth/Storage/video were not restarted for
dashboard installation. Asset correction updates did not restart services.
No new external dependency or paid service. Existing private VPS/cloud project
are retained; unrelated private-VPS applications are not affected. Android Wi-Fi
installation and Store publication remain separate open launch work.
