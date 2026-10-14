# Boulder return flash — 2026-10-14

The retained source page in 1.0.232 still used `hidden` (`display:none`). Returning
required layout, painting and two scroll corrections. A new regression reproduced
this: the original card had no bounding box while detail was open.

## Final behavior

The source stays laid out at its original document scroll position. The detail
uses an opaque fixed foreground with its own scroll container. Closing removes
that foreground; no source unhide, document scroll restoration or delayed rAF
correction remains. The source is inert and aria-hidden while covered, and focus
returns without scrolling. Leaving the flow releases the retained source.

The document root owns the background scroll lock. Locking body was rejected in
the first implementation: its existing 100% height clamped the document scroll.
Classic scrollbar width is compensated. Tabs and pull-to-refresh use the active
detail scroller; mobile navigation synchronizes before paint and reads that same
scroller. The entry animation moves content only: its opaque shell never fades.

## Verification

- Final continuity + fullscreen suite: **16 passed**. Earlier accompanying sector
  persistence suite: **10 passed**. Pull gesture unit tests: **4 passed**.
- At 375/768/1280/1920 px, a scrolled overview retains the same card DOM node and
  bounding box while detail is open and after return. All 25 sampled animation
  frames retain document scroll position and height. Desktop uses a shorter
  viewport so its two-column fixture is genuinely scrollable.
- Header Back, history Back/Forward, Home origin, overview URL/search/grid state,
  guest, direct links, reduced motion, scroll-lock cleanup, inert cleanup and
  mobile navigation are covered. Videos start with one selected quality and do
  not restart on tab changes.
- Visual loop 1 found source ghosting through the shell's opacity animation.
  Loop 2 confirmed opaque detail and stable returned overview after removing
  shell animation. Screenshots: `test-results/boulder-continuity-20261014/`.
- Fixture dates are fixed once per module; mapping `new Date()` per card caused
  random order across millisecond boundaries. Harness controls are fixed outside
  layout so route labels cannot alter document height.
- Focused ESLint: no errors, one existing fast-refresh export warning.
- TypeScript: 76 diagnostics, identical normalized set to the production
  baseline; no new diagnostic. Global typecheck is therefore not clean.
- Hostinger frontend build, Capacitor sync and Gradle assembleDebug succeeded.
  Android 1.0.56 embeds frontend 1.0.233. Protected asset inspection passed with
  no private credentials; final APK SHA256:
  `7c117c1cb19f5cd18a4077d8d46ec6358f170a48cfd5d74ae7054d237b7d67df`.
- Updated the paired Galaxy S25 in place without clearing user data. Real detail
  close returned to Home with its existing scroll/cards. Further production and
  device evidence is appended after rollout.

No database, media, notifications or user records were changed.
