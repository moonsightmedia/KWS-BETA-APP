# Home loading placeholders

Approved: use the Home loading draft, keep the Beta-logo app-start screen and
publish after verification.

Home now retains its regular header, greeting and section order while catalog
data load. The weekly skeleton also covers the separate personal-data loading
path. It reserves the regular weekly card's geometry without values, date claims
or activity bars. Boulder cards and lower sections have matching placeholders.
Reduced Motion disables their pulse; no artificial delay is added. Error/retry
and successfully empty results remain distinct.

The global `LoadingScreen`, `beta-loading.css`, authentication guards and
`App.tsx` are unchanged. Home placeholders render after those existing guards.

## Local verification

- Scoped ESLint and `git diff --check`: passed.
- Node regression tests: 285 passed, one existing skipped test.
- Vite production build: passed (existing large-chunk warning).
- Home browser suite: 17 passed, including nine new delayed-data/startscreen
  cases. All use isolated synthetic data; external requests are blocked.
- Visual loop 1: actual Home screens at 375, 768, 1280 and 1920 px, loading and
  loaded; existing KWS colors, geometry, header, navigation and card order retained.
- Visual loop 2: initial catalog loading, personal-only loading, transition to
  data, retry after personal failure, empty state, statistic navigation and
  Reduced Motion. Weekly card height/top and next section top remain equal
  within 0.5 px at each width; no horizontal overflow or page errors.
- The separate full-screen app-start fixture shows the approved Beta logo,
  96px loading indicator, correct accessible status and Reduced Motion behavior.

Screens: `test-results/home-progress-20261018/{initial,personal}-{loading,loaded}-{width}.png`
and `preserved-app-start-375.png`. The fixture's release-data button is a test
control, absent from product code. Its delay is user-controlled; production has
no test timer, sample data or controls.

The full existing release workflow and production revision check are required
before reporting the change live. Existing full-repository type/lint debt is not
claimed green by this focused check.
