# Authentication, feed playback and diagnostic visibility

Normal logout now revokes the current device session (`scope: local`) in both foreground and background paths. An unexpectedly lost session is reported once while preserving the existing locked draft and same-account recovery. Expected wrong-password responses remain validation failures; network/service and invalid-session authentication failures are diagnostics.

The feed requests initial playback immediately, without demanding a ready-state/preload threshold or 1.5 seconds of paused preload. Actual underruns retain their headroom gate, quality fallback and bounded watchdog. Pending play requests are serialized per node/source; a stalled initial request remains timed out until `playing`, and explicit reload clears obsolete promises. Media errors and rejected play requests have distinct feed diagnostic codes. Normal navigation cancellations remain quiet.

Technical `app_error` reports use the existing anonymous collector route, without account tokens, usage consent or boulder IDs. Sanitization, bounded persistent delivery, explicit acknowledgements and account-bound queue eligibility remain in force. Usage still requires its original account token and does not downgrade to guest. The migration preserves an existing session's account when a diagnostic arrives anonymously. A rejected presence session also reports the session loss once; that credential is suppressed until the token changes.

The additive migration separates installation/session usage exclusion from individual diagnostic exclusion. Real production/TestFlight/APK admin errors, including retained history, become visible; development/test events remain excluded. Diagnostic events cannot inflate active-device/account usage totals. Existing admin-only RPC/table permissions remain unchanged. Historical visibility updates do not replay alerts.

## Verification

- 388 Node cases passed; isolated SQL validates history, test exclusion, idempotency, admin usage totals, diagnostic session ownership, alert suppression and non-admin/anonymous denial.
- 28 feed browser cases passed, including modeled 0.2-second preload, repeated transitions/detail return, existing underrun/slow-network fallbacks and two visual rounds at 375/768/1280/1920 pixels. Seven focused cases passed after the final change, including initial readyState=2, unresolved-play/retry, repeated transitions, media fallback and underrun/slow-network regressions. The final release gate reruns the entire suite.
- 10 real-SDK session browser cases passed, including local logout, shared refresh, draft recovery and four widths. The overflow assertion now permits the native desktop scrollbar gutter while rejecting horizontal overflow.
- All 15 final monitoring/privacy browser cases passed, including acknowledged session-loss reports without invalid credentials or usage consent, sanitization and four responsive widths. SDK AuthRetryableFetchError and session_not_found classification omit passwords/request bodies; ordinary invalid credentials do not create service incidents. A rejected presence session reports once and stops repeated credential polling, even while usage delivery is failing.
- Production Vite build passed; scoped ESLint has no errors and two existing useAuth warnings. Full app TypeScript comparison: 61 baseline/current diagnostics, no new diagnostics. A bare root `tsc --noEmit` does not check referenced projects and is not used as proof.
- Earlier local fixture failures: missing backend fixture environment, a video-less third boulder and incomplete fixture comment dates. These were corrected in the test setup; no production data changed.

The preload reproduction models a buffer condition in Chromium. It proves that code path and its repair, not the exact physical iPhone trigger. Physical iPhone acceptance remains unverified. Server stream-cancellation warnings are not treated as proof of a media-server outage. Errors never transmitted by older builds cannot be reconstructed retroactively.

## Release

Web and native delivery, migration backup/rollback and final live proof are recorded after publication. Database migration must precede clients sending anonymous diagnostics. No edge auth checks or public store submissions are changed.
