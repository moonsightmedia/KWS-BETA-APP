# Mobile Hallenkarte im Hochformat – 7. Oktober 2026

## Umfang

Vom Nutzer beauftragte Hochformatdarstellung nach dem Sektorgrenzen-Review.
Lokale Umsetzung im bestehenden Worktree auf `9943f04`; zuvor `origin/main`
nach Fetch gleichauf. Die vorherige lokale Konturverfeinerung bleibt enthalten.
Kein anderer Checkout wurde bearbeitet.

## Anzeige, nicht Datenmigration

- Vollständige querformatige Hallenkarten werden unter 768px im Uhrzeigersinn
  um 90° dargestellt; Tablet und Desktop behalten das Querformat.
- Prozentpunkte werden ausschließlich für die Anzeige mit `(100 - y, x)`
  umgerechnet. Das SVG erhält entsprechend getauschte Breite/Höhe.
- Flächen, Auswahlkonturen und Markeranker verwenden dieselbe Transformation.
  Die Markertexte werden nicht gedreht; die Kollisionspositionierung läuft
  anschließend im neuen Anzeigekoordinatensystem.
- Die Bildvorlage dreht sich mit. Eigenständige bereits hochformatige Karten
  und feste, kleine Formularvorschauen (`lockAspectRatio=false`) bleiben
  unverändert. Der separate Admin-Geometrieeditor bleibt unverändert.
- Gespeicherte Punkte, Bereichspalette, IDs und Sektorzuordnungen bleiben gleich.
  Die bestehende Auswahl überlebt das Umschalten zwischen den Bildschirmgrößen.
  Zoom/Pan wird beim Wechsel der Anzeigegeometrie regulär zurückgesetzt.
- Wiederverwendbare UI-Regel: `docs/DESIGN.md`, Abschnitt 7.3.

## Prüfung

- 34 Browsertests bestanden: 24 Karten-/Filterfälle und 10 Setter-Kalender-
  bzw. Statusregressionen. Externe Requests blockiert; keine produktiven
  Schreibzugriffe. Formularmutationen erfolgen ausschließlich im Testfixture.
- Zwei gerenderte Karten-Loops bei 375, 768, 1280 und 1920px: Übersicht,
  Einzel-/Mehrfachauswahl, Hover, Tastaturfokus, Abwahl, Reset und Reduced Motion.
  Screenshots jeder Breite und beider Loops tatsächlich visuell geprüft.
- Touch auf allen 18 logischen Teilbereichen; Klick nahe gemeinsamer Grenze
  und außerhalb der Flächen. Kein Nachbarsektor übernimmt die Auswahl.
- Aufrechte Textmatrix, responsive Dimensionen, Auswahl nach Größenwechsel,
  Bildvorlage und Overlay (unter 2 CSSpx Rundungs-/Rahmenabweichung), feste
  Formularvorschau sowie Handy-Zoom bei 393px zusätzlich geprüft.
- Tatsächliche Boulder-Seite und Filterdialog bei 375 und 1280px geprüft.
- 19 Unitfälle bestanden: Rotation/Ecken/Unveränderlichkeit, Geometrie,
  Kartenquellen und Sektortaxonomie.
- ESLint für Produktionskomponente und neue Hilfsfunktion sowie
  `git diff --check` bestanden. React-Review: Transformation als abgeleiteter
  Zustand, memoisiertes Markerlayout mit vollständigen Abhängigkeiten,
  bestehende Fokus-/ARIA-/Touchbehandlung erhalten, keine neue Abhängigkeit.
- `npm run build:native` erfolgreich ohne Versionsbump. Bestehende Import-/
  Chunk-/Browserslist-Warnungen; kein projektweiter TypeScript-Check behauptet.
- Kein neuer nativer Build und kein Test auf einem physischen Handy oder
  Safari in dieser Änderung. Die installierte APK enthält diesen Stand noch nicht.

## Screenshots und Übergabe

`test-results/hall-map-portrait-20261007/`: `before-overview-375.png` zeigt den
unmittelbaren vorherigen Querformatstand; `after-overview-375.png` die neue
Hochformatansicht. `after-page-selected-375.png` zeigt die echte Boulder-Seite.
Die übrigen Bildschirmgrößen, Fokus-, Mehrfachauswahl- und Bildvorlagenbilder
sind dort ebenfalls gespeichert. `comparison.html` bündelt den Vergleich.

Lokal fertig, noch nicht committed/gepusht/veröffentlicht. Nächster Schritt:
nach ausdrücklichem Update-Auftrag Kontur- und Hochformatänderung gemeinsam
ausliefern und anschließend die native Darstellung auf dem S25 prüfen.
