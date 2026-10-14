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

Release and isolated PostgreSQL evidence will be appended after verification.
