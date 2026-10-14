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

Real-device installation and live-browser verification are recorded after rollout.
Fixture timing is not a prediction of real mobile network startup time.
