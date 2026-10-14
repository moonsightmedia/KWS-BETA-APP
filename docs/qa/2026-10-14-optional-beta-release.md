# Optional Beta web release

User authorizes removing the replay icon and publishing the optional Beta feature.
The 3-second SVG/CSS animation loops automatically, respects reduced motion and
does not create/upload a fake video. A thumbnail and metadata remain required.

## Integration and verification

- Isolated release worktree: `codex/beta-placeholder-release`.
- Base retains current iOS/account work (`53ef731`); merge includes actual live
  Boulder navigation fix `3976e20`. No schedule/poster/training draft bundled.
- No replay state, button or Lucide refresh icon in the placeholder.
- 10 publication unit tests pass: thumbnail gate, no active job/video, exact
  confirmed response, forbidden/unconfirmed write, no automatic mutation retry.
- 22 browser scenarios pass: create without video, upload failure, repair, later
  real video, two responsive loops and actual detail page/dialog at 375, 768,
  1280 and 1920 pixels. Fixtures isolate REST/upload hooks; no live rows created.
- 18 further browser scenarios pass: automatic loop/no controls/reduced motion
  at all four widths, plus existing navigation/media continuity regressions.
- Scoped ESLint: zero errors, two pre-existing Fast Refresh export warnings.
- Full application bundle builds with explicit local QA-only config; existing
  font/Browserslist/chunk warnings remain. This build is NOT the deployment
  artifact or native release; production rebuilds with server-side public config.
- Responsive captures inspected: mobile editor/detail, tablet editor, desktop
  placeholder/dialog. Fixture thumbnail is the historical synthetic map image.
- Server metadata read via existing Hostinger Web Console on srv2044594; direct
  laptop SSH timed out. No firewall/access change. Current web revision 3976e20.
- Read-only production schema confirms nullable video URLs/jobs/sessions,
  default status none and existing setter-only insert/update RLS. No migration.

## Narrow deployment safeguards

Use exact public Git archive SHA-256, `--expected-revision` before build and
before source swap, and `--web-only` to avoid updating unrelated backup/account
operators. Preserve distributed APK downloads and old hashed assets. Existing
deploy rollback restores prior source on failed restart or route checks.
Do not print service/database credentials; deploy runs from protected runtime.

## Explicit limitations

No production write test, account creation, notification test delivery, APK or
TestFlight build in this request. Existing ready-transition notification trigger
is unchanged: no-video publication (none) does not claim immediate new-video
push notification. Real video later follows the existing upload lifecycle.
Deployment/live proof is recorded after successful publication, not assumed here.
