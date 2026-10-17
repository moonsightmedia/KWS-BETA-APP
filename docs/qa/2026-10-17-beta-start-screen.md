# Beta start-screen revision — local preview

Source: origin/main 68e1a5b, freshly fetched 17 October 2026. Original checkout
was 149 commits behind with unrelated changes; separate `codex/beta-start-screen`
worktree used. No new dependency, no release/version bump, no live data changes.

## Result

Shared LoadingScreen now uses the exact approved Beta lockup on white, 152px
mobile /176px desktop, with one 180ms entrance and a thin indeterminate green
indicator. No card, old KWS mark, gradient or jumping bars. All seven existing
loading/auth states keep specific German status labels. No extra runtime timer.
Reduced Motion disables both animations. Existing authentication/timeouts remain.

Android launch theme references a dedicated green Beta vector on white instead
of the old splash raster or the launcher's inverse color scheme. iOS launch
storyboard uses a constrained centered image instead of full-screen aspect fill.
Three density assets and Android XML are reproducible from the approved SVG via
`node scripts/generate-beta-splash.cjs`.

## Loop 1 — rendered layout

Real production LoadingScreen component in an isolated serve-only Vite harness,
without auth mocks or live requests. Inspected screenshots at 375,768,1280,1920px.
Second pass at the same widths plus 812×375 landscape. No horizontal/vertical
overflow. Exact computed brand colors rgb(54,181,49) and rgb(25,36,54); background
rgb(255,255,255). Compact, centered lockup and readable single status line.
Screenshots: original workspace `output/loading-preview/final-{width}.png`.

## Loop 2 — behavior and states

All seven status labels rendered correctly; `role=status`, aria-live polite and
aria-busy retained. Native image remains decorative. Read-only CSS sampling
confirmed a moving indicator. Reduced Motion returned animationName=none for
both logo and indicator. Final indicator stays visible throughout its cycle.
Browser error console: zero errors. No forms, menus or mutable data in this screen.

ESLint passed for changed component, exporter and local harness. Git diff-check
passed. Whole web development-mode Vite build passed (existing large bundle and
mixed import warnings). Android :app:processDebugResources --offline passed:
96 tasks, all splash XML/theme references linked successfully. Initial attempt
needed the existing generated Cordova-plugin build directory copied from the
previous native worktree; it is ignored, without versioned Gradle mutations.
iOS storyboard XML parsed; assets generated. No macOS/Xcode compile performed.

## Limits / release boundary

Preview: http://127.0.0.1:5190/. Uses the real shared component indefinitely for
visual review; it does not simulate a completed launch or phone performance.
No GitHub push/merge, production deployment, APK installation or TestFlight upload.
Native cold-start transition still requires a device review. Existing phone
installation remains 1.0.65; web version remains1.0.242. The temporary development
build is not an installation/distribution artifact.

Official Android reference consulted:
https://developer.android.com/develop/ui/views/launch/splash-screen
