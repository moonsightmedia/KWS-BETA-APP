# Video originals / SDR native integration, 20 October 2026

The existing Android82 / TestFlight99 integration is retained and updated with the current published main changes and PR68, including the browser SDR brightness hint from PR64. The normal mobile detail player uses the latest approved V5 composition. Existing green Beta icons, earlier guest onboarding and corrected native swipe direction remain present; newer unmerged PR58/PR62 work is separate.

The merge preserves the lazy feed entry and the combined guest onboarding regression while adding the current feed zoom/preferences/transition tests and the new detail-player CI suite.

Server source aba3aa97c15364584557a780e3bc8518c8bb76ec is deployed to production and the isolated store-review environment. Its manifest is unchanged. A restore-tested encrypted pre-migration backup is independently checksum-verified on the NAS. Real HTTP upload, private-original access controls, full decoding of all three SDR renditions and a production-library canary passed before client delivery. Following those gates, clients can roll out alongside the remaining library conversion: unique media families and conditional database writes protect concurrent uploads, while the new client preserves newly selected source quality. Final library inventory and a fresh post-migration backup remain mandatory. Physical iPhone/HDR appearance acceptance remains unverified.

Integration regression: the V5 mobile player now exposes the existing onboarding media target. The coachmark stops retrying a scroll when a viewport-sized target has reached its scroll boundary. The existing full guest/feed/filter-tour browser regression reproduced the failure and passes after the fix (4.3s). No onboarding steps or account permissions were removed.

## Delivered artifacts

Both native artifacts were built from `6b575eb407d29414f8fb8422717e7618f0537630`. Its complete web and video CI passed. Merging published main `78ff7b77a3888d2b7bc18e9915e17b3e7eb16469` into this branch changes only rollout documentation relative to that delivered source; it does not change shipped application code.

- Android `1.0.250 (83)`: signed AAB SHA-256 `ed0ccd357ae7f6df5b881092631b7b164f718584d03ea05c95df5e490df8fe3f`; actual package version, source revision, production/review endpoints, absence of private server secrets, signature and all eight native libraries' 16 KB alignment verified. All ten launcher PNGs match the approved green Beta icon. Google Play shows this release active and available to existing internal testers; no device compatibility exclusions were added.
- iOS `1.0 (100)`: GitHub workflow `39428309034` completed successfully and uploaded the signed IPA. SHA-256 `c8fbd4fbe3d61d79fb8d67dbad5786eb672df76001d0ca1b80da9cc3eaa54742`; actual bundle version, identifier, source/endpoints, secret absence and compiled green icon verified. App Store Connect shows build 100 as **Im Test** in the existing internal **KWS Team** group. No new testers or permissions were added.
- Existing public-store submissions were not withdrawn or replaced as part of this internal delivery. Internal availability does not imply public-store approval or a verified installation on the user's phone.

Evidence is retained in the operator workspace `output/media-rollout-20261020`: `final-83-artifact-proof.json`, `android83-icon-proof.json`, `google-internal-83-active.png`, `ipa100-proof.json`, `ios100-icon-proof.json` and `testflight100-team.png`. These proof files contain no account passwords or private API keys.

## Rendered checks

Two browser QA loops at 375, 768, 1280 and 1920 pixels verified the SDR display hint, active reel geometry and playback/pause state. Initial automation screenshots exposed Playwright's automatic pre-click scrolling of the full-height reel; reloading and using the visible pause control through native accessibility produced stable, correctly positioned screenshots at all four sizes. This was a driver interaction artifact and did not warrant a product layout change. Viewport overrides and temporary QA tabs were cleared afterwards.

The monitoring dialog's early-focus Escape regression was reproduced before the fix and passed afterwards, including unsaved-change protection and focus restoration. The complete native CI passed without skipped cases or enlarged timeouts.
