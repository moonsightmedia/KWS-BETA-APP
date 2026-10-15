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

Verified rollout:

- PR9 merged into main (35c3ca59d99f4cce0f864f49ed7a0e6ca4188a2a).
- Production serves source 41bdb01ee6b14c9017c27f876441d6f18d87335b,
  frontend1.0.239, build2026-10-15T09:21:10.162Z,
  entry /assets/index-CXTRJrYg.js. Training assistant code is absent from the
  new entry; schedule and volume feature markers remain.
- Direct SSH timed out from the current network. Used the already authenticated
  KWS Hostinger web console for srv2044594 instead, without firewall/access changes.
- Exact public archive SHA256
  0c9bcf40a5a46eaffece26b6ae8343143cc461425c47c11190e7dd0a5f07ef37,
  operator SHA2566b1c6fcba1865bec2b475ecbe0dffdd734f1e530b9762a4cac8385f818d5d2ba.
  Existing compare-and-swap and rollback operator completed in web-only mode.
  Previous source retained at /opt/kws/web-production/previous-source-20261015T092110Z;
  distributed download1 preserved. No database/backend/media changes.
- Live browser checks: all three training URLs blocked at375/768/1280/1920,
  public calendar still working, no page runtime errors. Authenticated real KWS
  profile confirms only Home/Boulder/Statistics and no training settings item.
- Local opt-in preview root still passes4/4 cases at all required widths.
- Android62 installed APK read back: SHA256
  03af86c0b923f5efdd80a0d274ca30ac73d38aaad10944e9bdd69b9fa5f1970e,
  identical to checked artifact; activity cold launch Status:ok.
- TestFlight was not triggered. Existing already-loaded web clients need a
  reload to replace their old client bundle. No local data was erased.

Evidence: test-results/training-release-gate/live/verified.json, profile and
live route screenshots, output/android-62/. Machine-specific generated Gradle
paths are deliberately excluded from Git.
