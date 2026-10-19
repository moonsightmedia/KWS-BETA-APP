# Google Play preparation — 19 October 2026

The verified Moonsight Media organisation now contains **KWS BETA APP**,
app ID `4974647572565655951`, package `com.kletterwelt.beta`, German and free.
The user explicitly approved Google's app-signing terms and creation declarations.
This is preparation, not a public release or review submission.

## Android package

- Source baseline: `a88fa8c268ae51890b6305805259eae077988993` (current main when fetched).
- Version code 74, version name 1.0.250; compile/target SDK 36, minimum SDK 23.
- `scripts/build-play-android.mjs` builds the Hostinger native assets and a signed
  release AAB. Signing is explicit (`-PkwsPlayRelease=true`); missing environment
  variables fail without printing values. Existing debug workflows are unchanged.
- Upload signing credentials live only in Bitwarden and ignored local `.secrets/`.
  References: `KWS_PLAY_UPLOAD_KEYSTORE_PASSWORD`, `KWS_PLAY_UPLOAD_KEYSTORE_BASE64`.
  The encrypted keystore and password were read back and verified after storage.
- Direct unused Firebase Analytics dependency removed. Existing collection-off
  metadata retained. The default Hostinger build disables telemetry and monitoring;
  training previews remain disabled. FCM remains available on Android.
- System video selection copies the chosen URI into app cache. Broad video/read/
  write storage permissions are removed, including inherited compressor entries.
  The packaged manifest contains no READ_MEDIA_VIDEO, READ_EXTERNAL_STORAGE,
  WRITE_EXTERNAL_STORAGE or advertising-ID permission.

## Verification

- Signed `bundleRelease` succeeds with Gradle 8.13 / AGP 8.13.1 / Java 21.
- Official bundletool 1.18.3 validates the bundle; jarsigner verifies its signature.
  A self-signed Android upload certificate is expected.
- All eight packaged native ELF libraries have LOAD alignment at least 16 KB.
  Universal APK passes `zipalign -c -P 16 -v 4`.
- QA APK derived from the AAB, signed with the local debug key for local testing,
  installs on the existing Pixel_9 API 36 emulator. Cold activity launch succeeds;
  the home screen renders current Hostinger boulder data. No fatal exception was
  observed in the captured startup log. Existing emulator account data was retained.
- 62 relevant existing tests pass (native silent video, upload queue/recovery/auth,
  Sentry native policy). `git diff --check` passes.
- Build evidence is under ignored `output/play-release-20261019*` and
  `output/play-native-alignment.json`. Do not treat this limited startup check as
  a complete picker/upload/compression/push or physical-device acceptance test.

## Console progress / remaining work

Privacy URL, no ads, no government/financial functions and activity/fitness are
saved. Sport category and Kletterwelt Marketing support details are prepared.
Tracking climbing ascents falls under Google's activity/fitness definition:
https://support.google.com/googleplay/android-developer/answer/14738291

Reviewer credential disclosure to Google is awaiting specific user permission;
the previous permission covered Apple only. Target audience, IARC, data safety,
external account-deletion instructions, store media, Germany-only distribution
and the final AAB upload/release review remain to be completed and verified.
No Play release has been uploaded or published at this checkpoint. Apple build 90
remains waiting for review and was not changed.

## Rebuild

Provide `KWS_ANDROID_KEYSTORE`, `KWS_ANDROID_STORE_PASSWORD`,
`KWS_ANDROID_KEY_ALIAS` and `KWS_ANDROID_KEY_PASSWORD` through the process
environment, then run `node scripts/build-play-android.mjs`. Never put signing
passwords into shell arguments, tracked files, logs or this document. Rebuild from
the final committed source before uploading, so the embedded revision is accurate.

## Follow-up: IARC and deletion instructions

On 19 October the user approved IARC terms and disclosure of the existing
ordinary reviewer account to Google. IARC is now **completed**, with USK 0 for
Germany / PEGI 3. Account creation remains 16+. The access form returned a generic
save failure twice; its exact cause is unconfirmed. No reviewer permissions were
expanded and the unrestricted-access checkbox was not certified for an account
without staff/admin access. User explicitly wants all roles in the same store app;
no employee functionality has been removed. A separate review environment was
initially suggested, then explicitly selected by the user. Its implementation is
recorded in the later checkpoint below.
Apple currently has the ordinary review account too; no Apple approval inferred.

The privacy page now explains the existing browser-based account-deletion flow,
including login, exact navigation, support, affected data and backup retention.
Canonical static source, generator and in-app copy are aligned. The public target
will be `/privacy#konto-loeschen` after the combined main web release; it is not
claimed live before merge/deployment. No new deletion API or alternate email-only
identity/deletion workflow was added. Legal anchor jumps are immediate so the
long legal document does not animate past the requested section.

Two visual QA loops cover generated landing legal text and the React app at
375/768/1280/1920: no horizontal overflow, deep-link heading below the fixed
header, HTTPS web-app link, keyboard access to the Marketing contact and matching
request instructions. Evidence: output/play-release-20261019/privacy-*.png.
Latest main `8c86264` (PR42/43) was merged into this isolated release branch to
preserve current interface/statistics/monitoring changes. Final AAB must be rebuilt
again after these edits; the earlier checksum is now a historical checkpoint.

## Current checkpoint: isolated demo and accepted Play bundle

The user chose a separate synthetic environment and explicitly authorised
disclosing its three customer/setter/admin logins to Google Play. All three
entries and English navigation instructions are now saved, with Google's
"Änderung gespeichert" confirmation. Optional device/partner usability testing
with these credentials is disabled. The original form failure was client-side
validation of the mandatory full-access certification, reproduced with a visible
checkbox error and no failed network request.

`review-api.kletterwelt-sauerland.de` and `review-video.kletterwelt-sauerland.de`
serve the isolated Docker stack through verified HTTPS. No source user rows,
objects or media were copied, only software/schema/policy configuration. Demo
mail, new registrations and external push are disabled and disclosed in Google's
instructions. Canonical credentials are verified in Bitwarden EU under
`KWS_STORE_REVIEW_ACCOUNTS` and `KWS_STORE_REVIEW_CONFIG`.

Verification includes27 private API/media checks and16 public HTTPS/Storage/
Realtime checks: real logins, own/foreign rows, role escalation denial, cross-system
JWT rejection, actual synthetic video transcoding in three qualities, Range,
publisher state, protected admin overview, avatar ownership and own-only live
notifications. The real customer, setter (including a saved edit) and admin UI
were exercised. Two rendered visual loops cover375/768/1280/1920px; notice,
sidebar/header, wrapping, images and actions fit. Local UI QA uses a documented
HTTPS transport adapter because the local recursive DNS cache retains the old
wildcard answer; public Google/Cloudflare DNS resolve the new VPS records. Full
TLS/SNI validation remains enabled. No test responses were invented.

Product source `6ccf023e82a1c875f0ac6422640d9823c68e991f` includes main24bf173,
including the admin overview. Android74/1.0.250 now uses minSDK24, target36 and
the explicit demo switch. The signed AAB was validated with Bundletool, signature
verification, embedded source check, private-secret exclusion and all8 native
libraries'16KB ELF alignment. SHA256:
`acd492e8d68b828005924a8f0f16840706c5a5c6b3ab564278ad416d52871fb5`.
Google processed it and saved it in the production draft. The earlier minSDK23
upload was rejected by enabled automatic protection; protection was preserved.

322 Node regression tests and3 provisioning isolation tests pass. The release
CI repeated an existing keyboard-focus test failure. A subsequent test-only
commit waits for actual dialog keyboard readiness before Escape, still checking
dialog removal and focus return, and retains monitoring failure evidence. Its CI
result remains a release gate. CI for the test-only commit51d002e subsequently passed, including the full browser and combined build checks. No main merge/web deployment or store submission
is inferred from a successful local build or a saved draft.

Country selection is saved as Germany only. IARC is complete (USK0/PEGI3), while
account creation and the target audience are16+. Store phone screenshots and
final Data Safety details remain open at this checkpoint. Apple90 is unchanged.

## Later checkpoint — current main, privacy and Google validation

- Three isolated review-role credentials were explicitly authorised and saved
  under Google App Access. Target audience16–17 and18+ and the complete Data
  Safety declaration are saved. The listing is ready for review with four
  unmodified432×768 captures of the actual responsive app UI (boulders, video,
  filters, login); these are not claimed as physical Android device tests.
- Disabled automatic diagnostics now return without legacy screenshot/feedback
  transmission; explicit user reports remain possible. Four policy regression
  tests cover disabled collection, upload errors, enabled collection and manual
  reporting. The complete local suite passes330 tests after merging mainbc0d5f3,
  including setter quick actions and stable boulder entry. CI39250503286 passed.
- Repeated the two visual QA loops on375/768/1280/1920px after that merge. Home
  and administration keep the notice/header/sidebar clear without horizontal
  overflow. A375px capture taken during the sidebar transition was replaced
  after the layout settled. Temporary viewport overrides were cleared.
- AAB75 frombfbddb315a2c348c513b49041eed4b35c0783a2a was validated, signed and
  accepted/saved by Google; SHA256
  fd39a71c95128f38e52142de661d9620eb868065520076f96d24a1a846090652.
  Server secrets are excluded and all eight native ELF libraries align to16KB.
- Google's final validation exposed unused FOREGROUND_SERVICE_DATA_SYNC from
  the optional, unwired Capgo uploader. No application code imports that plugin;
  uploads use the active WebView's existing chunked path. Remove its two
  services, broadcast receiver and foreground-service permissions at manifest
  merge. Build76 supersedes75 and must be checked in the actual packaged
  manifest before upload. Do not falsely declare background functionality or
  remove protection to satisfy the form. No Google submission yet.
- The external account-deletion anchor still requires the regular main/CI web
  release before review submission. Apple90 remains unchanged.
