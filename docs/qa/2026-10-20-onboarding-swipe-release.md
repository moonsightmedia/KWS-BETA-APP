# Guest onboarding and continuous route swipes, 20 October 2026

The user selected PR58 and PR62 for the next combined app update while the independent PR68 library migration finishes. This integration starts from the delivered Android83/TestFlight100 source and current published main; it retains the green Beta icons, isolated store-review environment, source-quality uploads, SDR playback, current feed and V5 detail player. PR69 remains separate and disabled.

PR58 `4c452e7048c61cf5c0907a482af9f3ca15050c2e` adds safe-area/visual-viewport positioning, matching SVG spotlight geometry, a compact accessible replay control and return from a persisted video view to the last card view. Its target-movement check is combined with the existing half-pixel scroll-boundary protection; the V5 player keeps its onboarding media anchor.

PR62 `b9b142283cef7466e7a7b2a4e7e6ed40c7e30c31` replaces the limited drag with a continuous pager. Both pages follow the finger; the inert incoming page retains its DOM on commit. Header/navigation, detail-return continuity, vertical scrolling and reduced-motion behavior remain intact. The merge keeps the current AppNavigation in continuity fixtures, all current CI suites plus the new swipe cases, and both the SDR video rule and preview-background CSS.

## Verified integration checks

- Six route-swipe unit tests and 47 browser checks for route swipes, detail continuity, guest navigation and header behavior passed.
- Complete guest flows passed at 375, 768, 1280 and 1920 pixels. Six additional safe-area profiles include 375×812, 393×852 and 844×390 landscape; all passed.
- 43 keyboard/short-screen/filter edge checks, real-app first-launch/reload/registration continuity and zero-result return checks passed. No personal data writes occurred.
- The initial landscape replay failure was a test race: an immediate `isVisible()` check missed the legitimate statistics prompt appearing after tour completion. The test now explicitly waits for and declines that prompt, and asserts that it is absent during the tour. No app consent behavior was bypassed, no timeout was enlarged, and no assertion was removed.
- Scoped ESLint has no errors; the existing App effect dependency and continuity Fast Refresh warnings remain unchanged. React review confirms cleanup of listeners/observers/frames, no React updates per drag frame, inert previews, shared queries, stable controller state and accessible navigation alternatives.

Direct rendered QA and the two visual loops are in progress. Full release CI, production publication, actual signed Android84 checks and the next TestFlight availability verification remain pending. Physical iPhone/Safari acceptance is not claimed.

Evidence is retained locally in `output/followups-58-62-20261020`, `output/playwright/onboarding*` and the browser-regression artifact directories. The underlying video migration and encrypted post-migration NAS copy are tracked separately; this UI integration must not interrupt them or overlap web-asset deployment with the backup's web-file snapshot.
