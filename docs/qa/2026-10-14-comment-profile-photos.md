# Profile photos beside Boulder comments

The current detail page used two fixed placeholders: author initials beside each
comment and “Du” beside the composer. Both now use the shared 8px avatar surface.
Own comments and the composer read the same owner-scoped profile cache as the
header/menu, so photo autosave/removal updates them immediately. Other visible
authors use their current photo, falling back to initials for absent/broken images.

The new `get_comment_author_avatars` RPC returns only ID and public photo URL,
only to signed-in users and only for requested authors of comments visible to
that viewer on that Boulder. It matches the existing comment visibility predicate
and preserves the admin moderation view. Hidden/banned profiles return no photo.
Requests are deduplicated and batched in groups of 100; comment names/photos load
in parallel. Photo-fetch failure retains comments and an editable composer.
Private profile fields, existing name RPC, profile RLS, moderation state and
comment text are unchanged.

## Verification

- 8 comment browser cases plus 8 existing photo/autosave cases passed. The real
  comments hook, author row, composer and shared cache are rendered with isolated
  network responses; no production content is written by the tests.
- Four widths 375/768/1280/1920: author/composer photos, moderation note, field,
  send button and wrapping. Second visual loop covers cached photo replacement,
  missing/broken photo and failed peer-photo request, while drafts remain editable.
  Proof: test-results/comment-avatars-20261014/comments-*.png.
- 19 isolated PostgreSQL cases passed using the production visibility helper:
  approved/pending/rejected, self/peer/admin/anonymous, wrong Boulder, unknown or
  unrequested author, block, ban, hidden comment/Boulder/profile, duplicates,
  100-author bound, execution privileges and exact result columns. Disposable
  database removed; zero production writes during tests.
- Focused ESLint, Vite/Gradle and protected APK inspection passed. TypeScript
  remains at 75 existing diagnostics. The two existing colorHex diagnostics in
  BoulderDetailSections are unrelated; new tuple-map typing adds no diagnostics.
- Migration SHA256:
  917600d3202f8268a3ed813866ee98ac93c6596c511cdcdff0adc8a346ef9f96.
  Production installed only the new RPC. Hash comparison confirms existing
  name/visibility helper definitions and profile/comment policies unchanged.
  Protected evidence: /opt/kws/tools/comment-avatars-1a34b18/.

Release: source 1a34b1853dec3b924d4ba45efe7a214b0ba2820e, frontend 1.0.237,
Android 1.0.60. Public version.json confirms 1.0.237 and the real affected Boulder
was opened after publication. Both the existing owned pending comment and the
composer contain fully loaded profile photos. The pending moderation note and
comment text remain unchanged; no live comment or photo was edited for testing.
Proof: output/boulder-navigation/live-comment-avatars60.png and the focused
live-comment-avatars60-detail.png beside it.

Source archive SHA256:
1599cbc036031aea5396d788223eb5477f0966cf40757d1f7c98534f08acb040.
The web operator required bc5a9c5 before building and swapping and retains the
previous release/assets and distributed APK53. No other operators were replaced.

Android 1.0.60 is installed in place on the paired Galaxy S25. The pulled installed
APK matches the protected build: 11,986,923 bytes, SHA256
e20669adb326a6a2bd02cf498a8a66ceeabcfeb1c6fea62f470aade6faa96e51.
Protected inspection checked 33 assets, correct API/video/recovery endpoints and
absence of private credentials. APK60 is installed locally, not newly published
as a public download. Interaction evidence is from the live browser and isolated
browser tests; physical handset interaction is not claimed.
