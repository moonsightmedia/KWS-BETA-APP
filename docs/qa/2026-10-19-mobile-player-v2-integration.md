# V2 im regulären Mobile Player – 19. Oktober 2026

## Änderung

`BoulderVideoPlayer` verwendet unter 768px und auf Geräten mit grobem Zeiger
die bestätigten V2-Controls. Das gilt auch im Querformat. Breite Mausgeräte
behalten native Controls. Reels-Feed, Feedentwurf und externe Provider bleiben
außerhalb dieser Integration.

Die vorhandene Medienlogik bleibt für Quelle, Netzwerkqualität, manuelle und
automatische Qualitätswechsel, Stummschaltung, Monitoring und Retry zuständig.
`useBoulderVideoControls` beobachtet dieselbe Instanz und ergänzt Play/Pause,
Zeitleiste, Neustart, ±5s, Zeitlupe und Loop. Mobile Videos verwenden `contain`.
Ein freier Tap verbirgt alle Controls auch bei Pause, ohne Zeit-/Layoutänderung.
Verborgene Controls sind inert; Tastaturfokus/Enter machen sie wieder erreichbar.

Fehlendes natives Vollbild erhält einen Viewport-Ersatz. Ein stabiler Portalhost
wird dabei aus begrenzenden Vorfahren in den Body verschoben und danach
zurückgegeben. Medieninstanz und Wiedergabe bleiben erhalten. Scrollsperre,
Escape, Menübehandlung und Fokusfolge werden berücksichtigt.

## Verifikation

- Produktionsbuild der aktuellen App-Quellkopie mit dem bestehenden Lockfile
  erfolgreich: 3332 Module, keine Änderung der regulären Appversion.
- Gesamte Node-Regressionssuite: **334 Tests bestanden**.
- Bestehende Detail-/Rückkehr-/Netzwerkprüfungen: **19 Browserprüfungen bestanden**.
- Player-/Vollbildsuite: **9 Browserprüfungen bestanden**. Enthält mobile Controls,
  pausiertes sauberes Standbild, Qualitätswechsel mit Position/Pause/Speed/Loop,
  Viewport-Vollbild mit stabiler Medieninstanz, unveränderte Desktopcontrols,
  Drag/Pause/Resume/Abbruch, automatischen Qualitätsfallback und Retry mit
  Wiederherstellung der Controls und Wiedergabepräferenzen. Stummschaltung
  und Medien-Listener werden nach einem Fehler am neu erzeugten Video erneut
  angebunden; der Retry-Test prüft auch die erzwungene Stummschaltung.
- Zielgerichtete TypeScript-Prüfung einschließlich `vite-env.d.ts`: 0 Diagnosen.
- Lint der neuen Dateien: 0 Fehler. Der bestehende Player hat weiterhin vier
  bereits vorhandene Fast-Refresh-Hinweise wegen seiner exportierten URL-Helfer.
- `git diff --check` erfolgreich.

Der abschließende kombinierte Browserlauf hat alle 28 Prüfungen bestanden;
der abschließende Node-Lauf erneut alle 334. Die vier produktiven Quell-Dateien
stimmen per SHA-256 mit der erfolgreich gebauten Quellkopie überein.

### Zwei visuelle Loops

Loop 1: echte `BoulderDetail`-Seite in der vorhandenen isolierten
Continuity-Fixture bei 375/768/1280/1920px gerendert und betrachtet. Persönliche
Backenddaten sind gemockt. Bei breiten Mausansichten bleibt der alte Playerweg.

Loop 2: dieselbe Seite bei allen vier Breiten mit Touch-Emulation, Pause,
geöffnetem Geschwindigkeitsmenü, freiem Tap zum Verbergen und Vollbild geprüft
und betrachtet. Querformat 844×390 behält die eigenen Controls. Keine
unbehandelten Browserfehler im abgeschlossenen Prüflauf.

Belege: `output/mobile-player-integration/loop2-*.png`, `visual-qa.json`,
`node-tests.tap`; erster Loop unter
`output/player-locked-runtime/test-results/boulder-continuity-20261014/`.
Player-Screenshots liegen auch in `output/mobile-player-integration/player-suite/`.

## Releasevorbereitung

Die produktiven Änderungen wurden auf den frisch gefetchten Stand von `origin/main`
(`4b763e5c13751d09163dd4d4b4af3f701b9a72ec`) in einen separaten Checkout
übernommen. Die zwischenzeitlichen Filter-, Monitoring- und mobilen
Bedienungsänderungen auf `main` bleiben erhalten. Feed-, Onboarding- und
Mobile-Player-Entwürfe sind nicht Bestandteil dieses Releases.

Im separaten Releasecheckout: Lockfile-Installation, Produktionsbuild, alle 334 Node-Tests,
alle 28 Detail-/Player-Browserprüfungen, gezielte TypeScript-Prüfung und Lint ohne Fehler
erneut erfolgreich. Die vier bestehenden Fast-Refresh-Hinweise bleiben unverändert.

Der bestehende Workflow `Web production` führt die neun Playerprüfungen nun
zusätzlich in seinem Browser-Regressionsschritt aus. Veröffentlichung erfolgt
über PR, erfolgreiche CI und den vorhandenen Hostinger-Autodeploy von `main`.
Der endgültige Deploymentnachweis steht im GitHub-Workflow und im öffentlichen
`release.json` für die gemergte Revision.

Keine Paket-/Lockfile- oder Appversionsänderung. Kein nativer Build.
Browserprüfung umfasst Chromium; die Abnahme auf echten iOS-/Android-Geräten
steht aus. Es wurden keine Monitoring-Testereignisse an Produktionsdienste gesendet.