# Hallenkarten-Auswahl – 6. Oktober 2026

## Auftrag und Quelle

Die Auswahl färbte teilweise Nachbarsektoren; ausgewählt und nicht ausgewählt
waren kaum unterscheidbar. Saubere bestehende Arbeitskopie
`boulder-sector-state`, Ausgangscommit `ecb5927`, nach `git fetch origin --prune`
am 06.10.2026 mit `origin/main` gleichauf (0/0). Der schmutzige Originalcheckout
bleibt unangetastet. Keine Änderungen an Datenbank, Kartenbild oder Koordinaten.

## Reproduzierter Fehler

Die alte Karte zeichnete pro Polygon eine unsichtbare, 10 Karten-Einheiten breite
Klickkontur. Sie ragte in Nachbarflächen hinein. Im isolierten Grenztest wurde
ein Klick bei x=48 innerhalb von A (bis x=50) durch die später gezeichnete
Kontur von B abgefangen: Erwartet `Bug A`, tatsächlich `Bug B`. Der gleiche Test
besteht nach Entfernung der Außen-Klickkontur. Nur die echte Polygonfüllung und
die sichtbaren Tags sind interaktiv.

Hover und Auswahl teilten außerdem dieselbe dunklere Füllung. Touch-Hover konnte
dadurch wie eine weitere Auswahl aussehen. Hover verändert jetzt keine Füllung;
Touch setzt keinen Hover. Tastaturfokus ist eine getrennte Tagkontur.

## Umsetzung

- Auswahl: dunklere ursprüngliche Bereichsfläche, dunkelblaue durchgezogene
  Kontur, Markengrün-Tag mit dunkelblauer Schrift und kontrastierendem Häkchen.
- Nicht ausgewählte Flächen treten bei einer Auswahl mit Füllopazität 0,35 zurück.
- Hover: gestrichelte Kontur, nie dieselbe Auswahlfärbung. Reduced Motion respektiert.
- `aria-pressed`, benannte entfernbare 44px-Chips, Live-Status und eindeutiger Reset.
- Zähler und direkte Wahl beziehen sich auf logische Teilbereiche. Bug A hat
  weiterhin zwei physische Flächen; beide gehören bewusst zu derselben Auswahl.
- Explizit leere Auswahllisten übernehmen keine alten Einzelwerte. Übergebene IDs
  sind führend gegenüber veralteten Namen. Eine Auswahlaktion verwendet einen
  Callback-Kanal, nicht zwei gleichzeitig.

Die gemeinsame `HallMapView` korrigiert die Boulderkarte sowie ihre bestehenden
Setter-Verwendungen. Der separate Admin-Geometrieeditor wurde nicht verändert.

## Prüfungen

- Zwei gerenderte QA-Loops bei 375, 768, 1280 und 1920px: Übersicht/Auswahl,
  Hover, Tastaturfokus, Enter/Space, Mehrfachauswahl, einzelne Abwahl, Reset,
  reduzierte Bewegung und kein horizontaler Überlauf.
- Isolierte reale Kartenkomponente mit historischer 19-Flächen-Geometrie und
  18 logischen Gruppen; alle 18 Gruppen per Touch unabhängig an-/abwählbar.
- Grenztest mit zwei synthetischen Nachbarflächen, Pointer und Touch; außerhalb
  der tatsächlichen Fläche verändert sich die Auswahl nicht.
- Echte Boulder-Seite/Sidebar mit isolierten Hooks bei 375 und 1280px:
  Auswahl Bug A liefert 4 passende Boulder und bleibt im Filterdialog ausgewählt;
  Abwahl dort stellt 8 Boulder und eine leere Kartenauswahl wieder her.
- Kartenregressionen, 10 gespeicherte Gruppenzustands-Tests und 10
  Setter-Kalender/Status-Regressionsfälle bestanden. 16 Sektor-/Geometrie-/Quellen-
  Unit-Tests bestanden. ESLint für `HallMapView` und `git diff --check` sauber.
- `npm run build:native` erfolgreich. Bestehende Chunk-/Importwarnungen bleiben.
  Kein projektweiter fehlerfreier TypeScript-Status behauptet; die gezielte
  TypeScript-Prüfung meldete keine Diagnose für `HallMapView`.
- Keine Live-Datenbankzugriffe: Tests blockieren externe Requests, Schreibprotokolle leer.

Screenshots: `test-results/hall-map-selection-20261006/` mit
`before-selected-*`, `after-selected-*`, `loop2-focus-*`, `loop2-multi-*` und
`page-selected-*`. Die tatsächliche Karte wurde mobil, auf Tablet und Desktop
visuell geprüft, nicht nur anhand von DOM-Attributen.

## Grenzen und nächster Schritt

Noch nicht committed, gepusht oder ausgeliefert. Kein neuer APK-/TestFlight-Build
und keine physische S25-Prüfung dieser Kartenänderung. Der nächste Release wird
erst nach Nutzerauftrag ausgeführt. Vorher/Nachher-Prüfung betrifft Rendering
mit isolierten Daten, nicht aktuelle produktive Sektordaten.
