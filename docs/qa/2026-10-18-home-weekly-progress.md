# Home: weekly progress card A

User-approved scope: replace the Home metric strip with variant A, keep it
immediately after the greeting and above the boulder sections, and use the
approved original KWS calendar/flash outlines. No collection or Home ordering
redesign, database migration, or native-store release is included.

## Behavior and data

- `WeeklyProgressCard` consumes the existing seven-day personal summary.
  Dates and weekday labels use local calendar days ending today.
- Each distinct successful boulder belongs to its earliest successful day in
  the selected period. Repeats do not increase the bars. Flashes remain included
  in the total; attempt-only days remain climbing days.
- Zero results show a short empty-state message. Loading and failed queries
  retain the existing honest status/retry component and show no fake zero counts.
- The existing Fortschritt action still opens `/statistics?period=7`.
- Original SVG outlines use the same 24px grid, currentColor and shared 1.75
  stroke as BoulderIcon. Home, statistics, profile climbing days and the Home
  reset-plan card reuse the shared exports.

## Verification

- Functional Node suite after rebasing onto current main: 285 passed, one existing skip; includes period,
  duplicate-day, repeated-top, Flash-subset and attempt-only-day coverage.
- Vite production build succeeded before and after rebasing onto current main;
  this PR does not change the app version.
- Scoped ESLint and `git diff --check` passed.
- Full TypeScript check: 72 existing diagnostics. Exact comparison with main
  using restored source bytes found identical diagnostics after normalizing
  source line/column positions; no new diagnostics.
- Rendered layout at 375/768/1280/1920px inspected: card precedes boulders,
  seven bars and date labels fit, own icons share stroke, no horizontal overflow.
- State and navigation regression tests cover keyboard entry into seven-day
  statistics, consistent values, zero/loading/error/retry, four-digit counts,
  and attempt-only days. Screenshots: `test-results/home-progress-20261018/`.
- Existing header regression uses a taller viewport so Home remains the short
  page and expanded statistics the long page in its scrollbar comparison.
  Overflow checks compare against client width, accounting for real scrollbars.
  The old reset-card test now supplies the
  current public reset-plan contract and checks its current wrapped text.
  The personal-workspace notification fixture includes the current exports.
- Initial local runs caught an incorrect synthetic Flash expectation (corrected
  to five), the obsolete fixtures above, and a missing local CI environment.
  These were harness failures; final results are recorded below.

Final local browser results across the broad run and the targeted follow-up:
122 distinct cases passed; one optional local comparison-artifact check skipped.
The corrected header/personal-workspace follow-up was 29 passed / one skip.
No observed browser exceptions in the new Home/statistics cases. Tests use the
workflow's explicit fixture environment; remote requests are blocked/intercepted.

Release follows the normal PR/checks/main/Hostinger workflow. Deployment and
authenticated production follow-up are recorded in the device handoff.
