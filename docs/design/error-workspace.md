# Monitoring error workspace — 19 October 2026

Direction: a calm, compact issue inbox that puts actionable work before technical
event data, using the existing KWS visual system rather than a new dashboard theme.

## Adopt / adapt / reject

- Flow references: professional issue triage tools — active queue, status views,
  searchable groups, source selection, deterministic ordering and one detail workflow.
- Style reference: KWS admin surfaces, typography, 44px controls and 4/8/12px tokens.
- Adapt: mobile uses a status select and stacked rows; desktop gets status shortcuts
  and aligned problem, impact and last-seen columns. Both operate on the same state.
- Reject: giant period bars, resolved items mixed into active work, raw build chains,
  fake numeric completeness, unproven diagnoses and confusing zero-person counts.

## Interaction / data contract

- Active is the default: open and in-progress, excluding resolved and ignored.
  All, resolved and regression views remain directly reachable. Counts reflect
  loaded groups plus current search/source, not a global issue inventory.
- Priority orders regression, reported severity, recency, then a stable reference.
  Lifetime Sentry counts are not compared with period-scoped app counts for ranking.
- Search matches original references as well as readable title, platform and version.
  Unknown Sentry impact is explicitly unknown; no automatic assertion of a crash,
  root cause or harmlessness. The original report remains in the technical details.
- Source, status, search and sort persist when changing views or server-side scope.
  Platform/version scopes hide Sentry because its per-platform/release counts are
  unavailable. The UI explains that exclusion and can clear only those scopes.
- Status still documents work, not repair. Confirmed fix version, read-only Sentry
  workflow, unsaved changes, clipboard fallback and focus return remain intact.
- Loading, source failures, stale snapshots, refresh failures, empty results and
  the 200-group cap have distinct honest states. No new tracking or personal data.

## Acceptance

Two rendered loops at 375, 768, 1280 and 1920px: active queue with mixed sources,
then explicit Sentry/all-status selection with unknown reach and lifetime totals.
Also retain long-content and short-viewport regression coverage, source outages,
scope/filter persistence, keyboard detail entry and return, status/fix-version flow.
Fixture images use synthetic data; they are not proof of production measurements.
