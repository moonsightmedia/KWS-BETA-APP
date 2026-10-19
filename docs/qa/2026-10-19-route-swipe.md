# Hauptseiten: intuitive Wischrichtung und weichere Übergänge

Nutzerauftrag vom 19.10.2026. Umsetzung auf `codex/intuitive-route-swipe`,
ausgehend vom frisch gefetchten `origin/main` (`4b763e5`). Der ursprüngliche
Arbeitsbaum mit offenen Designentwürfen bleibt erhalten.

## Verhalten

- Reihenfolge Home → Boulder → Statistiken: links wischen öffnet die nächste
  Seite rechts; rechts wischen die vorherige Seite links. Freigegebenes
  Vorschau-Training berücksichtigt weiterhin seine bestehende Einstellung.
- Erst nach klar horizontaler Bewegung folgt der Inhalt begrenzt dem Finger.
  Die Richtung bleibt für diese Geste gesperrt. Header und Navigation stehen still.
- Loslassen setzt die sichtbare Position in 90ms fort; die Zielseite kommt in
  200ms aus der passenden Richtung. Kein Rücksprung vor dem Wechsel, keine
  zusätzlichen Bild-/Datentransfers und keine neue Animationsabhängigkeit.
- Kurze oder abgebrochene Gesten gleiten in 180ms zurück. An Anfang und Ende
  gibt es Widerstand und keinen Umlauf. Mehrfinger-Gesten brechen die Wischgeste ab.
- Reduzierte Bewegung entfernt Drag- und Wechselbewegung, auch beim Livewechsel.
  Ohne Web-Animations-API bleibt die Navigation unmittelbar nutzbar.
- Erkannte horizontale Gesten lösen keinen anschließenden Kartenklick aus.
  Formfelder, Switches, Dialoge, Hallenkarte und horizontale Scroller behalten
  ihre bestehenden Gestenausschlüsse. `touch-action` erlaubt Pan-Y und Pinch-Zoom.
- Stabile Callback-Refs binden Ereignisse auch nach Austausch der Lade-/Fehlerfläche
  erneut an. Animationsframes, Animationen und Listener werden beim Verlassen entfernt.
- Die Übergabe an die Zielseite gilt nur einmal und liegt nicht in der
  Browserhistorie. Die Boulder-Detailübergänge bleiben separat.

## Zwei gerenderte QA-Loops

Echte `Index`-, `Boulders`- und `Statistics`-Komponenten in der bestehenden
`personal-workspace`-Fixture mit isolierten Beispieldaten; keine produktiven
Schreibaktionen. Chromium-CDP-Touchereignisse und echte Playwright-Mausbedienung.

| Breite | Loop 1: Seitenrahmen und Inhalt | Loop 2: links/rechts/Home | Horizontaler Overflow |
|---|---|---|---|
| 375px | geprüft | geprüft | keiner |
| 768px | geprüft | geprüft | keiner |
| 1280px | geprüft | geprüft | keiner |
| 1920px | geprüft | geprüft | keiner |

Loop 1: Home, Boulder und Statistik im Viewport verglichen; Header, Navigation,
Abstände, Karten, Schrift und Wasserzeichen bleiben konsistent. Loop 2:
Touchwechsel in beide Richtungen; Fingerposition, Eintritt und Endzustand separat
geprüft. Messung eines Vorwärtswechsels: Austritt vom tatsächlich sichtbaren
`-32px` nach `-48px`, Eintritt von `+32px` nach `0px`; Eintritt während der
Sichtprüfung mit ungefähr `+13px` gemessen. Keine leere Zwischenfläche.

Zusätzlich erfolgreich geprüft:

- kurzer horizontaler Zug, Touch-Cancel, vertikale und diagonale Geste;
- erste und letzte Seite ohne Umlauf, Training im regulären Build ausgeblendet;
- Reduced Motion bei Beginn und Livewechsel während des Ziehens;
- zweite Berührung/Pinch bricht den begonnenen Drag ohne Navigation ab;
- Filterdialog bleibt beim Wischen offen und auf derselben Seite;
- Wischen auf normalen Karten und Segmentbuttons; gewöhnlicher Kartenklick
  öffnet anschließend weiterhin das Detail;
- Ladeansicht → Daten freigeben → Home → Wischen zur Boulderübersicht;
- keine unbehandelten Browserfehler in diesen Prüfungen.

Lokale Bildbelege: `output/playwright/route-swipe/`, insbesondere
`qa-contact-sheet.png`, `loop1-*-{375,768,1280,1920}.png`,
`loop2-statistics-*.png`, `loop2-drag-left-375.png`, `loop2-entry-375.png`,
`loop2-settled-375.png`, `loop2-filter-375.png` und `loop2-reduced-motion-375.png`.

## Technische Prüfungen und Grenzen

- `node --test test/routeSwipe.test.mjs`: 3/3 bestanden.
- Bestehender Playwright-Test „disabled training is excluded from horizontal
  main navigation“ mit korrigierter Gestenrichtung bestanden.
- Zielgerichtete TypeScript-Diagnose der fünf geänderten Produktionsdateien:
  keine Befunde. Zielgerichtetes ESLint und `git diff --check`: sauber.
- Abschließender Produktionsbuild mit den isolierten Lockfile-Abhängigkeiten:
  `node node_modules/vite/bin/vite.js build` erfolgreich (19s). Kein Versionsbump;
  bestehende Bundlegrößen-/Browserslist-Hinweise bleiben Hinweise.
- React-Review: stabile Callback-Refs, primitive Effektabhängigkeiten, aktuelle
  Navigation in Refs, keine React-Renderzyklen pro Touchmove; Cleanup und
  zugängliche alternative Navigation bleiben vorhanden.
- Der erste Gesamtbuild war durch fehlende lokale Pakete blockiert. Im gemeinsam
  verwendeten `node_modules` änderten sich Pakete während der Prüfung; ein weiterer
  Versuch scheiterte an einer inkonsistenten Vite/Rollup-Kombination. Deshalb die
  Junction entfernt und ausschließlich im eigenen Worktree `npm ci --ignore-scripts`
  aus dem unveränderten Lockfile ausgeführt. Keine Paket-/Lockfile-Änderung und
  keine neuen Projektabhängigkeiten.
- Die projektweite TypeScript-Prüfung hat bereits bestehende Befunde außerhalb
  dieses Auftrags. Der gezielte Check der geänderten Dateien ist davon getrennt.
- Authentifizierung, Monitoring und 3D-Hallenkarten sind in der lokalen visuellen
  Fixture isoliert. Kein nativer Android-/iOS-Gerätetest und kein Produktionsrelease.

Build- und Testlogs: `output/route-swipe-build.log`,
`output/route-swipe-training.log`, `output/route-swipe-npm-ci.log`.
