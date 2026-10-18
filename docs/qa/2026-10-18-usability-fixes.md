# Bewertungssterne, Suchergebnisse und Profilentwürfe

Ausgangspunkt: DesignMotionHQ-Appreview, anschließender Nutzerauftrag zur
Umsetzung genau dieser drei Verbesserungen. Basis: `950921f` auf `origin/main`,
anschließend konfliktfrei auf `778dd88` aktualisiert. Die zwischenzeitlichen
Upstreamänderungen betreffen Monitoring, dessen Designregeln und die Version;
die vier hier geänderten Produktdateien sind davon unberührt.

## Verhalten

- Fünf Bewertungsbuttons nennen jeweils ihren Wert, z. B. „3 von 5 Sternen“.
  `aria-pressed` kennzeichnet nur den gespeicherten Wert. Jeder Button hat
  44 × 44px Trefferfläche, sichtbaren Tastaturfokus und ist während des Speicherns
  gesperrt. Fehlgeschlagene Bewertungen verändern die gespeicherte Auswahl nicht.
- Gast- und angemeldete Bouldersuche haben einen Namen unabhängig vom
  Platzhalter. Aktive Suche/Filter zeigen „Treffer“, insbesondere „0 Treffer“;
  die ungefilterte Gastübersicht behält ihre Bestandsangabe. Ergebnisänderungen
  werden über `aria-live="polite"` angekündigt.
- Ungespeicherter Name bzw. E-Mail blockiert interne Navigation einschließlich
  Zurück. Der gemeinsame KWS-Alertdialog bietet „Weiter bearbeiten“ und
  „Verwerfen“. Escape erhält die Eingaben. Neuladen aktiviert den nativen
  Browserhinweis; dessen Anzeige hängt auch von Browser und Nutzerinteraktion ab.
  Zurückgesetzte Felder und bestätigtes Speichern verlassen die Seite ohne
  Warnung. Fehler erhalten den Entwurf. Automatisch gespeicherte Bilder bleiben
  von den Textentwürfen getrennt.

Die Produktion nutzt bereits einen Data Router. Zwei bestehende Profil-Fixtures
verwenden jetzt entsprechend `createMemoryRouter`, damit der echte
Navigationsschutz auch in den Tests läuft. Die Profil-Geometrieprüfung vergleicht
Scrollbreite mit `clientWidth` statt mit der Fensterbreite, um reservierten Platz
für vertikale Scrollleisten korrekt zu behandeln.

## Nachweise

- Regulärer CI-Browserbefehl mit allen sieben Suites: 66/66 bestanden,
  einschließlich Header, Auth, Gast-Ladezuständen, Gastnavigation und Trainingssperre.
- `e2e/usability.spec.ts`: 13/13 bestanden (Suche als Gast und angemeldet,
  Treffer/Leerzustand/Reset; Sternnamen, Auswahl, Tastatur, 44px-Flächen,
  Speicherung und Fehler).
- `e2e/profile-avatar.spec.ts`: 15/15 bestanden, einschließlich vier Größen,
  Abbrechen/Escape/Verwerfen, Historiennavigation, E-Mail-Entwurf, Rücksetzen,
  Speicherfehler/-erfolg und echter abgebrochener Browser-Neuladeaktion.
- Alle Node-Regressionen: 267 bestanden, 1 bestehender Skip, 0 Fehler.
- Produktionsbuild: `npx vite build` bestanden, ohne automatischen Versionsbump.
- ESLint aller geänderten TS/TSX-Dateien: keine Fehler, zwei bestehende
  Fast-Refresh-Hinweise in den Fixture-Einstiegen.
- TypeScript-Prüfung gegen unveränderte Basis verglichen: dieselben 73
  Fehlerdiagnosen, keine zusätzlichen; der Gesamtcheck ist daher weiterhin rot.

Visueller Loop 1: Rating, Gast-/Nutzersuche und Bestätigungsdialog bei
375/768/1280/1920px gerendert und angesehen. Kein horizontaler Überlauf;
mobile Bestätigung unten bündig, Desktop zentriert; KWS-Tokens erhalten.

Visueller Loop 2: Fokus/Auswahl, Ergebnis-/Leerzustand, Dialog nach abgeschlossener
Eintrittsanimation sowie Wiederöffnen, Escape und Navigation geprüft. Frühe
Testaufnahmen während der Animation wurden durch stabile Aufnahmen ersetzt.
Lokale Belege: `output/usability/qa-layout.jpg`, `qa-states.jpg`, Einzelbilder und
Prüflogs. Sämtliche Schreibfälle liefen mit synthetischen Daten und blockierten
Remoteanfragen, ohne Änderungen am Livekonto.

Die beiden Suites sind zusätzlich im regulären Web-CI-Browserlauf enthalten.
Dieser Auftrag verändert keine Datenbank, native App oder Trainingsfreigabe.
Ein Branch/PR veröffentlicht die Änderung noch nicht; erst ein Merge in `main`
durchläuft den bestehenden automatischen Web-Release.
