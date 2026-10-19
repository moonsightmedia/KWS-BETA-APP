# Android device compatibility — 19 October 2026

The user could join internal testing but Google Play rejected installation as
incompatible. The Console's actual bundle76 details report **0 supported Android
devices**, despite all four ABIs, API24+, and16KB page-size support.

The merged manifest inherits `android.software.video.encoder` with
`required="true"` from `@honem/native-video-compressor`. The connected user device
is Samsung SM-S931B, Android16 / API36. The device went offline before its feature
inventory could be read; no device-inventory result is claimed. The app does not
require compression for its core functions:
`nativeVideoUpload.ts` already falls back to lossless silent-video preparation
when compression is unavailable. Existing tests cover this path on Android/iOS.

The app manifest now explicitly overrides only that requirement to optional.
No permissions or codecs are removed and no fallback is weakened. Version77
supersedes76; versionName stays1.0.250.

Release gates:
- Inspect the actual merged/bundled manifest, not just the source declaration.
- Confirm the old required=true filter is absent, broad media/FGS/AD-ID
  permissions remain absent, and the existing upload signature is valid.
- In Google's processed bundle, supported devices must be greater than zero.
- Check the exact Samsung model in the device catalog when available.
- Publish77 to the internal track and replace the unusable76 production
  submission. Do not claim a Play Store installation until the user completes it.

Initial fallback regression run:7 tests passed. Google post-upload device counts
and final release status are recorded in the operator handoff after verification.
