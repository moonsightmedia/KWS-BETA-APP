# iPhone login returns to guest after successful password authentication

The physical TestFlight 108 report remained reproducible after PR74. The live
server accepted the iPhone password login at 12:50:36 UTC on 21 October. The
corresponding iOS 1.0.256 monitoring release restarted at 12:50:36.902, reported
app readiness after 5,410 ms and returned to the public boulder screen without
an account. The new server session remained present. An older refresh token
had been rejected at 12:50:02, before the successful password login.

This confirms a post-login client startup failure, not rejected credentials.
The exact physical WebKit lock state is not available from those logs.

## Changes

- Normal successful login retains the accepted SDK session and completes the
  existing Auth route transition, without reloading the whole document.
- Capacitor uses the installed SDK's serialized `processLock` in both client
  creation paths. Browsers retain the SDK's tab-coordinating browser lock.
  This avoids a native startup dependency on a pending Navigator lock; it
  does not disable session serialization or change backend authorization.
- An unresolved initial session check no longer becomes a guest after five
  or ten seconds. It reports `AuthenticationInitializationTimeout`; the
  existing Root timeout/retry screen remains responsible for a stalled app.
- Missing session responses are rejected instead of reporting login success.
  Passwords and session credentials are not added to diagnostics.

## Verification

The actual production Supabase client, AuthProvider and Auth page are exercised
with isolated HTTP responses and storage, including a modeled pending browser
lock. All three initial regressions failed on the previous production source:
native initialization fell through to login without completing its session
check, successful web login reloaded the document, and a stalled initial check
had no diagnostic. These prove the respective code paths, not the physical
iPhone's internal lock state.

Four new Chromium cases pass: expired native and browser sessions can sign in
and survive cold reload; six concurrent expired native session reads share a
refresh; stalled initialization stays pending, reports and recovers when the
lock is released; invalid credentials stay on the login form. Ten existing
real-SDK session/recovery cases pass, including local logout, preserved drafts,
failed role reads and four responsive widths. An initial local rerun omitted
the fixture backend environment and failed data-loading setup; rerunning with
the existing CI fixture environment passed all 14 cases.

32 relevant Node tests and the production Vite build pass. Full application
TypeScript diagnostics remain 61 baseline/current, with no new diagnostics.
Scoped lint passes with the two existing Auth hook warnings; the generated
client's six pre-existing `ts-ignore` lint violations are excluded only in the
local comparison, without changing repository rules.

## Release and acceptance

Version 1.0.257 is prepared for the normal PR/main deployment and a new internal
TestFlight build. Final CI, delivered binary and live release proof are recorded
after completion. A fresh physical iPhone login remains the final acceptance;
no device success is claimed from the modeled browser tests.
