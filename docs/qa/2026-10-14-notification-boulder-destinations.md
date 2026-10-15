# Open the Boulders named by a notification

Previously Boulder notifications and push actions commonly pointed at `/boulders`.
The client ignored the stored batch membership and persisted collapsed groups.

Inbox “Ansehen” and realtime toast actions now use
`/boulders?notification=<notification-id>`. The catalog reads that one notification
under the signed-in owner and selects its complete `boulder_ids` (legacy
`boulder_id`, or sector references when no Boulder references exist). It does not
substitute the batch's `latest_boulder_id`. Groups open once per notification
visit, while subsequent manual group changes and detail-return state survive.
Catalog/sector data refresh before the selection is presented. The selected
notification remains removable through “Aus Mitteilung”. Historical records are
not subject to the unrelated seven-day New filter.

The push trigger carries the same short URL plus notification ID/type. For
Boulder batches it retains the large ID list in the database rather than packing
it into FCM. Other notification data/destinations and existing push preferences
are preserved. Existing inbox records resolve without rewriting or resending
them. Already delivered old OS pushes retain their original payload.

## Verification before release

- Combined inbox/continuity/new-flow browser suite: **42 passed**. After adding
  failure/retry and delayed-read cases, new-flow suite: **12 passed** (44 unique
  cases across these suites).
- Four widths 375/768/1280/1920: real NotificationCenter → NotificationItem →
  owner-scoped lookup → real Boulder catalog → detail → retained filtered
  overview. Multi-sector groups begin collapsed and are expanded by the link.
- Single legacy upload, 800-ID batch, older catalog dates, absent/foreign record,
  deleted Boulders, removing the selection, native-open event, realtime toast,
  failed read retry and no unfiltered cards during a delayed read are exercised.
- Notification/push unit suites: **14 passed**. Focused ESLint: no errors.
  TypeScript remains the exact normalized baseline of **76 existing errors**.
- Visual loop 1: four widths, inbox and opened selection. Loop 2: error/retry,
  grid mode, repeated round trip. Images under
  `test-results/notification-boulders-20261014/`.
- Isolated test environment sets a loopback API URL and synthetic public key.
  All real external requests are blocked. No production test notifications or
  uploads are created by these tests.

## Integration and server verification

- Isolated PostgreSQL push-trigger suite: **10 passed**, disposable database
  removed, **zero real pushes**. Covers preference/device gates, one batch → one
  push, exact URL/ID/topic, bounded payload for 800 IDs, full ID list retained in
  the inbox, other notification data, and private execution permissions.
- Git-normalized migration SHA256:
  `931f1057fed39a6eede64dc335381612b44dc0c4c79e10df70e4311304f4bca5`.
  CRLF working-copy bytes differ from the Git blob; server downloads were checked
  against the Git blob. The initial mismatch stopped before any production change.
- Concurrent live release `f6144b81e10d87f35aebecc2791ae3cce5dcf6a6` superseded
  3976e20 during work. The old-revision guard blocked rollout. Merged that actual
  live source, preserving optional Beta publication/placeholder and its release
  safeguards. No earlier web release was overwritten.
- After integration: **31 browser tests passed** (13 selection, 14 continuity,
  4 placeholder loops). Together with the 18 inbox tests, **49 unique browser
  scenarios** are covered. Cached notification re-entry also clears old searches
  and expands all selected areas, independent of the transient filtered render.
- Integrated TypeScript has **75 existing diagnostics**, exactly matching the
  normalized f6144b8 live baseline. None added by notification links. Focused
  ESLint and Hostinger/Gradle builds pass.

## Final rollout and live proof

- Web **1.0.234**, exact source
  `6cc470b08ce7282e257424de800db3df8c1319af`, verified using public version.json,
  VPS SOURCE.json and successful rollout report. Exact archive SHA256
  `6daab9d700df04770ce4d293d78472b8d1121cf18df903166ab3283bf172ef44`.
  The operator checks expected revision f6144b8 both before build and source swap;
  web-only mode preserves unrelated operators, old assets and distributed APK53.
- Production push function replaced only after matching the original function
  SHA256 `6c6184c2cc6992bffec448b124dbd0f8f99871f7ae0dcdf87f9af208b35a5dfe`.
  New definition SHA256
  `aef0cfede924cf926c2ca4bc81ca880420867c5e8cd12c17a709876ec67c5bad`.
  Private rollback/report under `/opt/kws/tools/notification-links-c6b35e3/`.
  Historical notifications are not rewritten or resent; grouping worker and
  sector text formatter are unchanged. No real test push was sent.
- Live signed-in browser: opened an already-read real **“8 neue Boulder in den
  Sektoren Buckbord und Bug”** message. “Ansehen” resolved its exact 8 Boulders;
  canonical parent Bug was expanded, with Bug C/D card labels. Opened Wilder Satz
  and returned to the same notification URL and same eight visible cards.
  Proof: `output/boulder-navigation/live-notification-selection57.png`.
- Android **1.0.57**, frontend 1.0.234: Hostinger build, Capacitor, Gradle and
  protected asset inspection pass. Final APK installed in place on the paired
  Galaxy S25; pulling the installed APK confirms **12,041,013 bytes** and SHA256
  `5c54bcdc34f545036243deb7e2a757a6e706197fe61816460bab3f7f8b879400`.
  Wireless debugging reconnected using fresh mDNS discovery after the device
  disconnected. User data was preserved. Physical inbox/push-tap flow was not
  claimed: the phone remained at keyguard after installation. Browser flow,
  native-open event and isolated server payload tests provide the stated proof.
- Existing public APK53 remains HTTP200, correct APK MIME, 12,230,063 bytes.
  APK57 is installed locally, not published as a new public download.
