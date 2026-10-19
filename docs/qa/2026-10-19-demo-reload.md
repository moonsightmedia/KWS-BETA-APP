# Demo reload — 19 October 2026

The user reported intermittent white screens when opening the demo from the
guest/login area in the Play release. The installed Play77 APK was pulled
read-only and its unchanged web assets served locally for reproduction.
Guest → login → Demo öffnen causes a full navigation to `/app/login`.
The packaged relative entry then resolves to `/app/assets/index-*.js` instead
of `/assets/index-*.js`; the app cannot bootstrap. The DOM is empty and the
wrong script/style paths were observed in the browser. Capacitor's local server
also resolves asset requests by their path; it does not move `/app/assets` to
the root asset directory. This is independent of authentication or demo data.

Native builds now use the origin-root asset base, matching Capacitor's
`https://localhost` / `capacitor://localhost` origins and the existing web
deployment. The font stylesheet is rooted too. Android and both iOS workflows
run an artifact check before syncing: every local script/link must exist when
resolved from six startup/reload routes. The check fails against the original
APK77 assets and passes against the rebuilt assets. Android79 supersedes77;
no credentials, backend selection, role isolation, or layouts change.

Checks completed before signing:

- 334 existing Node tests passed, including the separate-backend regression.
- Built native assets pass the six-route artifact check.
- Actual built login remains rendered after the explicit demo switch and
  return, with the visible demo notice present only in the selected environment.
- Two browser reload loops at375/768/1280/1920 render the login heading with
  root script paths and no horizontal overflow.
- Production guest independently loads139 current boulders through real HTTPS.
- Customer demo login, three synthetic boulders, detail and statistics render
  against the real isolated backend through the existing local QA transport.
  The production endpoint in that QA transport remains fixture-invalid.

Evidence is in ignored `output/demo-qa-20261019/`. The initial old-package local
origin cannot read production APIs due to its localhost origin; its data error
is not a production outage. Its white-screen reproduction is an asset bootstrap
failure before any API access. No user data, native app, or launcher was reset.

The additional role checks passed: setter editor and its metadata load, admin
overview returns four fake accounts and three boulders, all roles log out, and
anonymous demo guests can play the synthetic video (30s, readyState4, no media
error) and return to the ordinary login. No production or demo content changed.

Build78 was accepted into an unpublished internal draft. Concurrently approved
mobile input/setter improvements reached main through PR52/54, so main through
4b763e5c13751d09163dd4d4b4af3f701b9a72ec was merged before the final79 build.
The final release reuses the existing upload key. Do not claim an installed79
until it has been verified; final CI and release evidence live in the handoff.
