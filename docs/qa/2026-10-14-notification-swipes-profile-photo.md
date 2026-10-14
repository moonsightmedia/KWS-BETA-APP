# Reversible notification gestures and an immediately visible profile photo

The inbox now supports right swipe to toggle read/unread and left swipe to hide
an item. Both actions offer Undo inside the fixed panel footer and equivalent
keyboard-accessible buttons. Hiding sets an owner-scoped `dismissed_at`; it never
deletes or re-inserts the notification. List, unread count and bulk read exclude
hidden items; Undo restores the previous field values without another push.

Gestures lock direction after 10px and commit at 88px. Buttons/links do not start
a gesture. Vertical pan and pinch remain browser-owned. Cancellation restores the
row; transitions respect reduced motion. An actual touch test caught implicit
capture moving from a child to the wrapper: bubbled lost-capture events must not
cancel the wrapper's gesture.

The photo previously loaded from `profiles` in the profile page, from stale auth
metadata in the menu/sidebar, and never appeared on the closed header trigger,
which used a fixed person icon. These account surfaces now use the same owner-keyed
profile query. An explicit null photo beats old metadata. The closed header
trigger itself renders AccountAvatar; it does not require opening the menu.

Picking/uploading or removing a photo immediately saves only `avatar_url` and
updates that shared cache. Name/email drafts are preserved until their own Save.
Profile writes require the returned own row and matching photo URL; missing rows
or unsupported avatar storage are not reported as success. Preview, busy state,
confirmed success and failure are distinct. Metadata synchronization remains
compatibility-only and cannot restore a removed image or reset an active draft.

## Verification

- 30 unique browser scenarios: 22 notification/inbox cases and 8 photo cases.
  Covers real browser touch input, vertical scroll, short/cancelled directions,
  owner-scoped writes, failure/retry, reversible hiding, unread count, read state,
  keyboard controls, paging, topic filters, realtime and notification links.
- Photo cases cover four widths, the real closed ProfileMenu trigger, stale auth
  metadata, deliberate metadata-sync failure, automatic upload/removal, failed
  persistence, revisiting, and preserving unsaved name/email fields. No real user
  photo was changed for testing. Upload transport is mocked in these cases;
  the existing storage/compression implementation is unchanged.
- 7 notification unit tests and focused ESLint pass. TypeScript retains the 75
  existing baseline diagnostics; none are in the touched modules.
- 10 isolated PostgreSQL checks passed with owner RLS, foreign-owner denial,
  read/unread, hide/restore, preserved payload/read fields and zero real pushes.
  Disposable database removed. Migration SHA256:
  `0243d89d63521c95302867410bfab8d2963e07de8654bb012e4672c866c41041`.
- Production migration added only the nullable column: a transaction-local
  snapshot verified all 932 existing notification records unchanged. No rows were
  initially hidden. Existing policies are owner-bound for SELECT and UPDATE;
  no access policy or push trigger was changed.
- Two visual loops at 375/768/1280/1920px: layout, photo crops, controls, wrapping;
  then gestures, scroll, error/retry, empty/read states and Undo. Screenshots:
  `test-results/notifications-20260915/after-inbox-*.png` and
  `test-results/notification-swipe-profile-20261014/profile-*.png`.
- Live mobile inbox: swiped away the already-read genuine 17-Boulder message,
  then restored it with Undo. The same message/read state returned, unread stayed
  zero, and no test push was generated. Proof:
  `output/boulder-navigation/live-swipe-undo58.png`.

## Release evidence

The initial web 1.0.235 / Android 1.0.58 release established autosave/shared data.
Final live inspection caught the remaining closed-header person icon, corrected
in bc5a9c5 with the fixture changed to exercise that real trigger.
Final web **1.0.236** is live from
`bc5a9c50d125600ce6ade76fb2df706f471c95e3`. Public version.json, protected
SOURCE.json and successful rollout report agree. Archive SHA256:
`ae8e3f9d1ed462d96e960385435c897ed420f6ba5b0696c007257161ff910e37`.
The final expected-revision guard matched 1518d6c. Distributed APK53 and previous
assets were preserved; unrelated operators were not replaced.

Android **1.0.59**, frontend 1.0.236, is installed in place on the paired Galaxy
S25. Pulled installed APK: **11,986,793 bytes**, SHA256
`c776d8d27bdc99b657d1781afb94a6cd6f1e9128e956d08b46161ad3f54b94b7`,
identical to the protected artifact inspection (33 assets, no private credential,
correct API/video/recovery endpoints). APK59 is locally installed, not a new
public download. No physical touch/autoupload was claimed from the handset.

Final live browser: the closed mobile header button contains a loaded photo
without opening the menu. Full proof `output/boulder-navigation/live-profile-icon59.png`,
focused header proof `output/boulder-navigation/live-profile-header59.png`.
Production follow-up confirms zero hidden notifications after Undo and zero
UPDATE push triggers. Test viewport overrides were cleared.

Protected server evidence and reusable test under
`/opt/kws/tools/notification-swipe-profile-1518d6c/`. Web rollouts check the
expected live source before build and swap and preserve old assets/installers.
