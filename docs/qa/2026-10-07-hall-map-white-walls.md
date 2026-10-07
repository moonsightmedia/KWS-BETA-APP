# Weiße Wandkarte – 7. Oktober 2026

## Auftrag und Ergebnis

Die vom Nutzer gelieferte weiße 2,5D-Variante wird als interaktive SVG-Karte
umgesetzt, nicht als Rasterbild und nicht als vermessenes 3D-Hallenmodell.
Weiße Wandoberflächen, dezente Unterkante/Kontaktschatten, graugrüner Boden,
feine neutrale Trennlinien, grüne Auswahlkontur, navy Haken, weiße Tags/Chips.
Liste/Karte-Umschalter und `Boulder anzeigen` in der tatsächlichen Boulder-Seite.
Handy weiterhin hochkant, Tablet/Desktop quer. Geometrieeditor unverändert.

## Verbindliche fachliche Korrektur

Atta-Höhle (obere Keilfläche) bleibt Bug A. Felsenmeer (linker Streifen) ist
Kurze Platte. Gemeinsamer Resolver korrigiert ausschließlich Felsenmeer mit
fehlender oder alter Bug-A-Zuordnung; spätere explizite andere Zuordnungen
bleiben erhalten. Die neue Gruppe übernimmt nicht die gespeicherte Bug-area-ID.
Alle 19 physischen Sektor-/Region-IDs und gespeicherten Punkte bleiben erhalten.
Nun 19 getrennte logische Karteneinheiten in sechs Bereichen. Öffentliche
Filter und Admin-Gruppierung verwenden denselben Resolver.

Keine produktive Datenbankmigration und kein produktiver Schreibzugriff.
Admin-Editor öffnet weiterhin den physischen Datensatz und seine gespeicherten
Strukturfelder; die Kompatibilitätsanzeige ist keine persistierte Hierarchie.
Alte öffentliche Bug-A-Links bedeuten nun nur die korrekte Keilfläche.

## Verifikation

- Final: 51 Playwright-Tests bestanden, `hall-map-selection`, `admin-hierarchy`
  und `boulder-filter-refresh`, ein Worker; 375/768/1280/1920px.
- 16 Unitfälle für Sektortaxonomie, Rotation und Kartenquelle bestanden.
- Testfälle: Nachbarklicks, alle 19 Touch-Auswahlen, Mehrfachauswahl, Hover,
  Tastaturfokus, Reset, Reduced Motion, Zoom/feine Konturen, Größenwechsel,
  ID-vs-Name-Autorität, feste Editorvorschau, Kartenbildausfall ohne Polygonausfall.
- Tatsächliche Boulder-Komponente bei 375/1280px: Bug A wählen, vier Fixture-
  Boulder, CTA schließt Karte mit erhaltener Auswahl, Wiederöffnen, Kurze Platte
  unabhängig hinzufügen/abwählen, Filterdialog synchron. Keine Backend-Writes.
- Admin bei allen vier Breiten: Suche Felsenmeer -> Kurze Platte, Editor/Flächen
  erreichbar, kein Horizontalüberlauf. Strukturänderung im Mock aktualisiert die
  bestehende physische ID statt einen Ersatzdatensatz anzulegen.
- Zwei tatsächliche visuelle Loops geprüft. Nach Loop 1 Bereichsnamen aus
  Wand-Bounding-Boxes auf freie Bodenanker verschoben, Lange Platte zweizeilig
  im Hochformat, Couch-Ecke vom Inselmarker getrennt und feine Kanten ergänzt.
  Final Übersicht/Einzelauswahl bei allen vier Breiten und Mehrfachauswahl/
  Tastaturfokus auf Handy tatsächlich visuell angesehen.
- React-Review: eindeutige useId-SVG-Defs, memoisiertes Layout mit vollständigen
  Abhängigkeiten, keine neue Library/Effect-Kaskade, vorhandene ARIA-/Touch-
  Behandlung erhalten. ESLint Produktionsdateien und `git diff --check` bestanden.
- `npm run build:native` erfolgreich, Version unverändert 1.0.229. Bestehende
  Browserslist-/Import-/Chunkwarnungen. Kein APK-/TestFlight-Build ausgeliefert.

Im Zwischenlauf scheiterten neun Erwartungen an alte Trennlinienbreite und
falschen Testselektoren; korrigiert, final komplett grün. Keine Fehlfunktion
verschwiegen. Testdaten stammen vom gespeicherten Hierarchie-Snapshot, nicht
von einer aktuellen Live-Datenbankabfrage. Kein Safari-/physischer Gerätetest.

## Artefakte und Grenzen

`test-results/hall-map-white-walls-20261007/final/` enthält finale Screenshots:
`after-page-selected-375.png` und `after-page-selected-1280.png` sind die echte
Boulder-Seite mit isolierten Hooks; übrige Breiten sind die reale Kartensurface.
Die kuratierten Bodenanker gelten nur für die bekannte gebündelte KWS-Vorlage;
andere Vorlagen erhalten die generische aus Geometrie abgeleitete Beschriftung.
Bestehende nicht ausgeführte historische E2E-Suites können noch 18 Gruppen oder
die frühere zusammengefasste Bug-A-Zuordnung erwarten; kein kompletter App-Test
behauptet. Archivierte QA-Berichte beschreiben ihren damaligen Stand.

## Übergabe

Arbeitsstand im managed Worktree `boulder-sector-state`, Basis `9943f04`.
Vorherige uncommittete Kontur-/Hochformatänderungen bleiben erhalten. Kein
anderer Checkout verändert, kein Commit/Push/Deployment. Lokaler Server läuft
auf `http://127.0.0.1:5173/boulders` aus diesem Worktree, production-env-Modus.
Exakt nächster Schritt: Nutzer prüft dort unter Karte die Optik und Auswahl;
erst nach anschließendem Update-Auftrag veröffentlichen und auf S25 prüfen.
