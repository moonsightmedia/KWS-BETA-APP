# Android81 — third boulder view and existing PC integration

The user explicitly requested the missing PC video feed in the next internal
Android update. The pushed source is PR60 / codex/boulder-video-feed at
e19192d9241b5df1bec2fb1ac56c9b26b9688f13. This was merged into the existing
Android80 integration branch, preserving all four earlier PC features and the
native demo reload fix. No new dependency, backend or migration is needed.

Conflicts were resolved by retaining both native-player and feed browser suites,
the onboarding filter host/result hooks, the guest-surface anchor, and the
feed-specific result count. Guest tour readiness excludes the inert regular
page behind video mode. A combined browser regression covers a persisted guest
feed, return to the real tour/detail/filter and re-entry without personal writes.

Existing338 Node tests passed after integration. Final combined CI, rendered
checks, artifact verification and internal publication are captured in the task
handoff and updated PR59 description when complete. Source design and broader
isolated feed tests remain in docs/qa/2026-10-19-boulder-video-feed.md.

The initial81 draft was uploaded but not published. Static imports also pulled
feed community hooks into older isolated list/grid fixtures with narrower hook
exports. A shared lazy entry now loads those modules only when video mode opens;
an integration regression checks this boundary. Final candidate is VersionCode82
/ versionName1.0.250, for the existing internal Play track only.
Public79 and Apple are outside this update. Keep the existing upload signature,
Hostinger/review configuration, optional encoder and permission boundaries.
Do not infer physical81 installation from successful compilation or upload.
