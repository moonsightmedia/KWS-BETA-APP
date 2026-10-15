# Setter upload token recovery — 14 October 2026

## Scope and cause

Local implementation in `codex/beta-placeholder-release`, based on `1b0b4f1`.
Fresh origin fetch verified HEAD/upstream 0/0 before edits. Existing unrelated
Android Gradle changes and earlier diagnostic files are preserved. No deploy,
signing change, token-lifetime change, production write or test upload was made.

The production incident had definitive PostgREST 401 `JWT expired` errors.
`processUpload` retained a render/start-time session through preparation, chunks
and the final thumbnail PATCH. The chunk utility also retained an access token.
An actual-provider regression additionally exposed the queue's initial auth
closure: jobs must bind their owner when queued, not when a render callback runs.

## Implementation

- A narrowly scoped upload transport uses the existing shared session coordinator.
  It reads current credentials per request and proactively refreshes tokens near
  expiry. Parallel REST reads, log writes and media requests share one refresh.
- Only explicitly configured media bases and known upload REST paths are allowed.
  No token is sent to unrelated paths/hosts. Redirects are rejected. Account
  identity is fixed for queued and resumed jobs; account switches cannot replay
  an old job under another user.
- Exactly one authentication replay is permitted after an explicit expiry 401.
  Hostinger's `Invalid or expired token` response is an authentication-middleware
  rejection before its chunk route writes. Generic 401, 403, 429, 5xx and ambiguous
  network failure do not trigger an auth replay. Other mutations still retain
  the pre-existing no-replay policy.
- REST bodies, chunk numbers and upload IDs are preserved on replay. Upload log
  creation, begin RPC, chunks, status reads and final thumbnail save all use the
  transport. A Request/stream body is rejected rather than replayed consumed.
- Real reauthentication errors stop the generic five-attempt chunk loop and
  cannot fall through from a rejected status read into a new upload. The file
  and ID remain in the open provider state. The existing sign-in dialog restores
  that workspace without reloading; explicit resume checks owner/server state.
- This is NOT persistent draft storage across app termination. Original gallery
  files should still be kept. iOS background execution is not promised; the next
  request after resume resolves the current token instead of relying on a timer.

## Verification

- 73 Node tests pass: sessionRecovery, uploadAuthentication (25 new),
  uploadRecovery and uploadQueue.
- New tests run the real resumable utility with web Files and a simulated iOS
  filesystem reader. Forced expiry between parts, an explicit final-part 401
  and expiry before thumbnail save yield one queued job and one final save.
  Abort, concurrent renewal, revoked session, permission denial, account switch
  and endpoint restrictions are covered with synthetic sessions only.
- 11 Playwright tests pass with the installed real Supabase SDK, actual AuthProvider
  and actual UploadProvider; all external requests intercepted. Preparation and
  media storage are fixtures, not real iPhone hardware or production services.
  The two new flows prove mid-video/final-PATCH recovery and password reconnect
  with original file, draft and same upload ID retained; already accepted parts
  are not uploaded again. Existing auth tests cover 375/768/1280/1920px drafts,
  resume/visibility change and SDK lock regression.
- 26 existing video-server tests pass locally, including real FFmpeg, session
  ownership, SHA retry/idempotency and queue behavior. Existing installed server
  dependencies reused through an ignored junction; no dependency added.
- Production Vite build succeeds. Focused helper-module ESLint passes.
  UploadContext retains five pre-existing explicit-any errors and hook warnings.
- Full-project TypeScript has pre-existing errors. Virtual comparison against
  HEAD (no reset/rewrite) reports 75 baseline, 74 current, ZERO new diagnostics.
  Run `node scripts/check-upload-type-regressions.mjs` to repeat.
- `git diff --check` passes. No credentials are included in fixtures or reports.

## Repeating the browser test

Use only fixture environment values for the local test server, e.g. PowerShell:

```powershell
$env:PLAYWRIGHT_PORT = '5193'
$env:VITE_SUPABASE_URL = 'https://api.fixture.invalid'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = 'public-fixture-only'
$env:VITE_VIDEO_API_URL = 'https://video.fixture.invalid'
$env:VITE_ALLINKL_API_URL = 'https://assets.fixture.invalid/upload-api'
node node_modules/@playwright/test/cli.js test e2e/session-recovery.spec.ts e2e/upload-authentication.spec.ts --workers=1 --output=test-results/upload-authentication-20261014/verification
```

Do not point browser fixtures or cleanup output directories at production/user
media. Token fixture strings are fabricated, not signed credentials.

## Release boundary / next step

Fix is local, not committed/pushed/deployed in this request. Integrate the scoped
patch into the latest coordinated release (other chat has newer navigation and
notification changes), then publish only when requested. The old installed
TestFlight build cannot receive this code without an iOS build. Apple signing
remains blocked by membership migration. Real iPhone long-upload/background
acceptance is still needed after Apple enables distribution. No lasting draft
database or native background-upload service was introduced.

References: Supabase sessions and JavaScript refreshSession documentation, checked
14 October 2026; production incident report in the adjacent QA note.
