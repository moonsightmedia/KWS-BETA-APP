# Training remains unreleased

Explicit user correction, 15 October 2026: training is not ready and must not be
published. This supersedes the training-enable decision in the 1.0.238 report.

- Central flag requires Vite DEV and the explicit preview opt-in. A production
  web/native build stays disabled even when an inherited preview flag is true.
- Both /training/* and /profile/training are gated. Existing navigation,
  profile-menu and route-swipe consumers use the same flag.
- Web deployment and native build helper explicitly set preview=false.
- Local serve-only training development harness remains enabled. No training
  source, stored preferences, units or history were deleted.
- Other 1.0.238 features and backend are unchanged.

Verification before release:

- 7 Node checks: DEV/preview matrix, routes, operator configuration. PASS.
- 4 actual App-root browser cases at 375/768/1280/1920: authenticated profile,
  no training navigation/settings, three blocked direct routes, keyboard return,
  public schedule/calendar. PASS. First attempt had an incorrect link locator
  for the existing button-based profile item; corrected from rendered evidence.
- Production native frontend build 1.0.239 and Gradle build 62 PASS.
- APK signature matches previous builds, protected private-credential scan PASS.
- Android 1.0.62 installed in-place on SM-S931B, no uninstall or data clear.

Web rollout and final installed-APK/runtime evidence are recorded after actual
verification. TestFlight is not triggered by this correction.
