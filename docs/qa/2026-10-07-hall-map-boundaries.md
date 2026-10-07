# Feinere Sektorgrenzen – 7. Oktober 2026

## Ausgangspunkt und Umfang

Der reale S25-Screenshot vom vorherigen Review zeigte kräftige, spitze dunkle
Auswahlkonturen bei „Lange Platte D“ und „Grotte D“, breite weiße Trennlinien
und stark ausgeblendete Nachbarflächen. Der Nutzer beauftragte die optische
Nachkorrektur. Ausgangspunkt: `9943f04`, nach frischem `git fetch origin --prune`
mit `origin/main` gleichauf (0/0), nur bestehende untracked Testresultate.

Die gemeinsame `HallMapView` wurde angepasst, nicht der separate
Admin-Geometrieeditor. Kartenpunkte, Sektor-IDs, Bereichspalette und Datenbank
bleiben unverändert. Der schmutzige Originalcheckout wurde nicht bearbeitet.

## Umsetzung

- Weiße Trennlinien: 1,25 CSSpx mit abgerundeten Linienverbindungen.
- Auswahlkontur: 1,5 CSSpx, durchgezogen, abgerundete Verbindungen.
- Hoverkontur: 1,25 CSSpx, gestrichelt; keine Hover-Füllung.
- Alle Konturen liegen oberhalb sämtlicher Flächen und unterhalb der Tags.
  Benachbarte weiße Trenner verdecken dadurch keine Auswahlkante.
- SVG `non-scaling-stroke` hält Konturen unabhängig vom Kartenmaß fein.
  Die zusätzliche CSS-Vergrößerung des `InteractiveMapStage` wird separat über
  dessen bestehenden Viewport-Callback kompensiert; auch beim Zoom bleiben
  Strichstärke und Hover-Strichelung konstant. Panning verändert keinen Auswahlzustand.
- Nicht gewählte Flächen bleiben mit 65% statt 35% Deckkraft sichtbar.
- Tagkonturen für Auswahl/Fokus: 1,5 statt 2px. Häkchen, eigene Tastaturfokus-
  Anzeige, benannte Chips und Status bleiben erhalten.
- Hit-Test weiterhin ausschließlich auf der Polygonfüllung; Konturen sind
  `pointer-events="none"`. Kein Wiederaufleben des Nachbarsektor-Klickfehlers.
- Die bestätigte wiederverwendbare Regel ist in `docs/DESIGN.md` Abschnitt 7.2 dokumentiert.

## Verifikation

- Vorher-Screenshots aus unverändertem Komponentenstand bei 375, 768, 1280 und
  1920px erstellt (8 Capture-Fälle bestanden).
- Nachher: 21 Browserfälle in `e2e/hall-map-selection.spec.ts` bestanden.
  Einschließlich zwei gerenderter Loops an allen vier Breiten, Touch-Grenzfall,
  alle 18 logischen Teilbereiche unabhängig per Touch, IDs/Namen-Parität,
  leere Auswahl, Enter/Space, Hover, Multi-Select, Abwahl, Reset, Reduced Motion
  und echte Boulder-Seite/Filterdialog bei 375 und 1280px.
- Neue Konturregressionen prüfen Strichstärke, runde Verbindungen, Ebenenfolge,
  unveränderte Polygonpunkte und Füll-Hit-Test. Zoomtest prüft die Kompensation
  bei 1,35x sowie Rückkehr auf 1x ohne Auswahländerung.
- Tatsächlich gerenderte Screens visuell angesehen: Mehrfachauswahl an allen
  vier Breiten, Tastaturfokus an allen vier Breiten, Zoom auf 768px, reale
  Boulder-Seite auf 375 und 1280px. Keine neuen Überlappungen oder Layoutsprünge.
- 16 Sektor-/Geometrie-/Kartenquellen-Unitfälle bestanden.
- ESLint für `HallMapView` und `git diff --check` bestanden.
- `npm run build:native` erfolgreich, ohne Versionsbump. Bekannte Chunk-/Import-
  und Browserslist-Warnungen bestehen weiter. Kein fehlerfreier projektweiter
  TypeScript-Status behauptet.
- Browserprüfungen blockieren externe Requests; isolierte Schreibprotokolle leer.

Screenshots liegen in `test-results/hall-map-boundaries-20261007/`, insbesondere
`before-boundaries-*`, `after-boundaries-*`, `after-loop2-focus-*`,
`after-loop2-multi-*`, `after-zoom-768.png` und `after-page-selected-*`.

## Auslieferungsstand

Lokal umgesetzt und geprüft. Noch kein Commit/Push, Web-Deployment, TestFlight-
Build oder neues S25-APK für diese Nachkorrektur. Das installierte Android 1.0.52
enthält weiterhin den vorherigen Stand. Nächster Schritt ist die Freigabe des
Vorher/Nachher-Vergleichs und ein ausdrücklich beauftragtes Update.
