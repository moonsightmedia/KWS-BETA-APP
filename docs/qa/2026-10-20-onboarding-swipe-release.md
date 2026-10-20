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

Both rendered QA loops are complete at 375, 768, 1280 and 1920 pixels. The moving-page screenshots show the actual incoming route, preserved navigation and clipped contents without a blank overlay. Direct tour checks cover the V5 player, difficulty/colour/area filters, results, local account-preview actions and return to the guest list with all three selected filters retained. The preview remains labelled as example data. Keyboard, landscape and small-height evidence is retained with the automated checks.

Full release CI passed for `6278739e430bd933b6c206cc296eb2de7f780241` in run `39441002961`. Full-project TypeScript still reports 61 diagnostics; this is not a clean typecheck. There are no diagnostics in the new pager, coachmark, context, swipe hook or App files. The reported colourHex lines in the modified Boulder/Guest files are unchanged from the baseline.

Android 1.0.251 (84), built from that exact revision, is available to the existing internal testers as of 20 October, 16:57 Berlin time. Its signed AAB SHA256 is `295e923e6000c88e241e421217731bac01268a15cf1a4889505b839a56d59d79`. Checks of the actual archive confirm the source/endpoints, absence of production/review server secrets, unchanged permissions/features/SDK requirements, all eight ELF libraries aligned to 16 KB and all ten green launcher icons identical to the verified preceding release. Play's device comparison reports no lost devices. The two advisory warnings concern optional obfuscation mappings and native debug symbols; neither is a release error.

The matching iOS workflow is `39443065959`, dispatched with exact source `6278739e430bd933b6c206cc296eb2de7f780241` and Hostinger backend. Actual IPA and TestFlight availability checks are recorded after processing; dispatch alone is not delivery. Public-store submissions remain unchanged. Physical iPhone/Safari acceptance is not claimed.

Before the web release, PR68's post-migration backup and isolated restore completed successfully at 14:52 UTC: 133 source archives verified, 399 previous files preserved, no current HDR/audio/unresolved URLs, 94 restored tables and 23,421 exact rows. The encrypted export is immutable and ready for the independent NAS transfer. Production CPU has returned to two cores and the container root filesystem remains read-only. Web publication can therefore proceed without overlapping the backup's web-file snapshot; NAS checksum verification is tracked independently.

Evidence is retained locally in `output/followups-58-62-20261020`, `output/playwright/onboarding*` and the browser-regression artifact directories. The underlying video migration and encrypted post-migration NAS copy are tracked separately; this UI integration must not interrupt them or overlap web-asset deployment with the backup's web-file snapshot.
