# Home: überragende Umschraubungskarte

Nutzer meldet eine rechts abgeschnittene Karte unter „Nächste Umschraubung“.
Der daneben/darunter liegende Sessionbereich ist ebenfalls breiter als der Inhalt.

## Ursache und Fix

Das mobile Grid hatte keine explizite Spaltendefinition. Seine automatischen
Tracks und die automatische Mindestbreite der beiden Section-Griditems
übernahmen die intrinsische Breite des langen, abgeschnittenen Termintitels.
Das globale Overflow-Clipping verdeckte den Fehler, begrenzte aber nicht die Karte.

In `src/pages/Index.tsx` jetzt `grid-cols-1 min-w-0` am gemeinsamen Grid und
`min-w-0` an beiden Sections. `lg:grid-cols-2` bleibt erhalten. Texte, Termine,
Badges, Farben, Rundungen und Funktionen bleiben unverändert. Kein bloßes
zusätzliches Overflow-Hiding, keine Datenbank-/API-Änderung.

## Verifikation

- Fehler vorab mit „Bug A & Kurze Platte bekommen neue Boulder“ reproduziert:
  bei 375 px lag die rechte Kartenkante bei 457,55 px, Badge bei 443,55 px.
  Der Geometrietest schlug erwartungsgemäß fehl.
- Nachher: rechte Kartenkante 359 px, Badge 345 px; 16 px Seitenrand bleibt frei.
- Vier Regressionstests bei 375, 768, 1280 und 1920 px erfolgreich. Karte,
  Badge und Sessionbereich bleiben im sichtbaren Seiteninhalt. Ein Resize,
  die Projekte-Navigation und ein leerer Schraubplan sind ebenfalls geprüft.
- Zwei gerenderte QA-Loops mit synthetischen, ausschließlich lesenden Daten.
  Keine Browser-Runtimefehler. Vorher-/Nachher-Screens unter
  `test-results/home-reset-overflow-20261014`, mit `view_image` geprüft.
- Reproduktion: `node node_modules/@playwright/test/cli.js test --config
  test/volume-silent.playwright.config.ts e2e/home-reset-overflow.spec.ts --workers=1`.

## Auslieferung

Lokal in `codex/volume-boulders-silent-video`, nicht veröffentlicht. Der isolierte
Fix besteht nur aus drei Klassenänderungen an Home und kann unabhängig von
Volumen-Boulder-/Video-Features in den aktuellen Release-Zweig übernommen werden.
Keine Datenbankmigration und kein Server-Update für diesen Layoutfix erforderlich.
