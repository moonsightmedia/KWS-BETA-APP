# Guest account navigation correction

## Reproduced on production

At 375px: `/guest` had one mobile navigation. Its account link opened `/auth`,
which removed the navigation entirely. Switching to registration navigated to
`/app/register` and restored the bar with no active entry. `/app/login` also
followed different root/loading/route-restoration rules from `/auth`.

## Correction

One `isAuthPage` predicate covers the three account URLs. The real AppNavigation
component keeps guest navigation mounted on all of them, retains unresolved-session
and dedicated public-flow exclusions, and hides the bar at the same desktop
breakpoint. New account links use `/app/login`. Mobile links use their explicit
active matcher, including correct `aria-current` on registration and legacy URLs.
The Auth form derives its mode directly from the current URL rather than from a
second state synchronized after render. Draft fields still survive form toggles.
Route restoration recognizes the same auth aliases. Account operations unchanged.

## Verification

- Eleven browser tests passed: six focused navigation cases plus the five existing
  auth-layout cases. Tests use real AppNavigation, Sidebar and Auth components;
  only account/role hooks are isolated. No account creation/sign-in/mail sent.
- Navigation-instance marker survives Boulder/login/registration changes. Back/
  Forward preserves the correct active account area and form. Draft first name
  survives login/signup toggles. Direct legacy entry selects the account tab.
- Session resolution, callback, password recovery and legal-page exclusions tested.
- Loop1: rendered layout/screenshots at375/768/1280/1920, mobile nav visible and
  desktop nav hidden for guests. Loop2: long registration scroll, actions remain
  above floating bar at page end, Reduced Motion, no horizontal overflow/errors.
- New cases added to the GitHub browser release gate.
- ESLint passed for changed production components/helper and regression suite.
  React review: derived mode without an effect, stable component ownership,
  no new listeners/dependencies, existing draft/pending state and semantics retained.

Screenshots: `output/guest-navigation/login-{width}.png` and
`register-{width}.png`. Fixture-only history controls are visible in those captures.
The fixture's Boulder heading is a navigation target, not a mock of the Boulder UI.
Existing guest data/error tests remain in the release gate.

Release target: Web1.0.244 / Android1.0.67. Installation and live proofs are recorded
in `output/android-67` and the device-specific agent handoff once complete.
