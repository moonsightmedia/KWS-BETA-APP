# Boulder return navigation and media continuity

Home's "Neu an der Wand" used to return to `/boulders`. Live network inspection
also observed SD followed by HD for the same video, together with redundant
Boulder/sectors reads. The thumbnail preloader scheduled the whole catalog,
without waiting for each batch to finish.

The detail now records and validates its internal origin. Exactly that page is
retained during the visit, with its router location frozen: filter state, image
nodes, view, groups and scroll survive. Header Back uses history when that source
is present; direct/reloaded detail has an internal fallback. Account changes key
the retention boundary anew. Other navigation releases the page. Restoration
includes keyboard focus and corrects native scroll anchoring on the next frame.
The 180ms entry transition respects reduced motion.

Video quality is selected before mounting media. Equivalent URL objects do not
restart the player; the source is declared once. Network/data saver selection,
manual quality, error/stall fallback, muting and fullscreen remain available.
The catalog-wide Home preloader is removed. Boulder/sector query data stays
fresh for 30 seconds; mutations and pull-to-refresh still invalidate explicitly.
Transformed Boulder data is memoized, and a valid empty response stays empty.

## Verification

- 22 Playwright tests passed: 10 new continuity tests, 10 existing group-state
  regressions, and 2 existing video/fullscreen checks. Reads use isolated fixtures,
  and external requests are blocked. No real account or database writes.
- Home/detail/return checked at 375, 768, 1280 and 1920px. The tests assert the
  same thumbnail DOM node, exact captured scroll restoration, retained search,
  URL filter and grid, header/browser Back, Forward, guest navigation and release
  of retained DOM. Reduced motion and safe direct-link fallback are covered.
- Video starts exactly once on HD, Low or data-saver SD as appropriate; a Track
  switch and equivalent data objects cause no extra `loadstart`.
- Both visual loops inspected: header/content/media geometry at the four widths;
  then return states, focus, filters, fullscreen and reduced-motion behavior.
  Screenshots: `test-results/boulder-continuity-20261014/` (local QA artifacts).
- Vite development and Hostinger/native builds passed. Focused ESLint: zero
  errors, five fast-refresh export warnings (four existing, one context export).
- TypeScript comparison against exact production source `5339600`: 76 existing
  diagnostics before and after, zero new diagnostics. Full typecheck is not green.
- Installer preservation is included from the reviewed Android-download fix;
  its four Python tests pass. Deployment source is based on the exact live
  revision, preserving separately pending onboarding/iOS and volume work.

## Rollout

- Web revision `1e6dd7bbe56c6599a76021def9a86c7ddd7b041a` deployed on the existing
  Hostinger production service. Server SOURCE/BUILD witness confirms the revision;
  API, media and database remain unchanged. Previous release retained for rollback.
- Live mobile browser: Home → two real Boulder details → header Back → Home
  verified. After re-enabling DevTools network capture, opening "Großer Mars"
  requested only its HD media URL (HTTP 206); no SD-then-HD swap. Header now
  announces "Zurück zur Startseite". Return restores focus to the original card.
- Android 1.0.54 installed over the existing package on Galaxy S25 (SM_S931B),
  current Android user 0. ADB installation succeeded without clearing user data.
  Pulling the installed APK confirms it is byte-identical to the reviewed artifact:
  SHA256 `46499b8235a420b88b5e3797a2725a649865d90c3defe60fe48d7eb4d28662f7`.
  Protected artifact scan: no private credentials, correct Hostinger API/video URLs.
  Real-phone interaction check awaits the user unlocking the phone; do not infer
  native login or playback success from installation. iPhone build not distributed.
- Existing public 1.0.53 download remains intact (12,230,063 bytes). New 1.0.54
  installer is local in `output/boulder-navigation/`; it is not yet a public download.
- Live screenshots: `output/boulder-navigation/live-detail-375.png` and
  `live-return-home-375.png`, local artifacts. PR #7 records the source changes.

Fixture timing is not a prediction of real mobile network startup time.

## Final refinement and installed version

The final audit found another catalog-preload call inside `useAuth`, in addition
to Home. That call and import are now removed too; repository search confirms no
active caller remains. The final Hostinger/native build and Android assembleDebug
pass. This refinement removes startup work without changing navigation behavior.

Final live revision: `f22c072de1c1cea17751fa61d21a392c7c6302e4`, web 1.0.232.
SOURCE/BUILD witness and public version.json confirm rollout; one existing Android
download is preserved. Final Android 1.0.55 replaces the intermediate 1.0.54.
Installation succeeded; pulling back the installed package confirms SHA256
`b20c4ac44fadc92ab9943d5bd58546ec05464113bbddcc13d20dd905580a7509`.

After unlocking, the original signed-in phone session was visible. The real
"Alter Uranus" detail opened. WebView media inspection confirmed readyState 4,
currentTime 24.211667 equal to its duration, muted true and no media error.
Full native return-flow automation did not complete: inspector access stalled,
then the phone display went to sleep. Header/source retention is verified in the
22 browser regressions and real live-browser flow; do not claim an additional
completed phone return/thumbnail-identity test. Temporary ADB forwarding removed.
