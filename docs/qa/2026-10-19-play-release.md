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
