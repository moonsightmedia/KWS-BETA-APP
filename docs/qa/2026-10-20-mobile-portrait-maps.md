# Mobile Karten im Hochformat und direkte Bedienung

Ausgangsbasis: frisch gefetchtes `origin/main`, `181001d`. Die früheren lokalen
Kartenänderungen wurden gezielt auf einen eigenen Branch übernommen. Der alte
Thumbnail-Prototyp und PR69 bleiben erhalten; dieser PR benötigt PR69 nicht.

## Umfang und Bestandsprüfung

Alle sechs `HallMapView`-Einbindungen sowie die beiden direkten
`InteractiveMapStage`-Einbindungen wurden geprüft:

| Oberfläche | Mobil unter768px | Desktop/Tablet ab768px |
|---|---|---|
| Gast-/Boulderkarte, angemeldete Boulderkarte | Hochformat, gemeinsame Komponente | bisheriges Querformat |
| Öffentliche Schraubreihenfolge | Hochformat | bisheriges Querformat |
| Setter: Anlegen und Bearbeiten | kompakt hochkant | kompakt hochkant |
| Setter: Status | Hochformat | bisheriges Querformat |
| Setter: Termin-Sektorauswahl | kompakt hochkant | kompakt hochkant |
| Kartenverwaltung/Zeicheneditor | Hochformat | bisheriges Querformat |
| TV-Seite beim mobilen Aufruf | Hochformat, Kopf darf umbrechen | bisheriges Querformat |

Zuvor koppelte `HallMapView` die Rotation an `lockAspectRatio`. Der echte
Bouldereditor und die Termin-Sektorauswahl setzten diesen Wert auf `false` und
erzwangen240px Höhe. Rotation und Layoutgröße sind jetzt unabhängig. Bereits
hochkant gespeicherte Karten werden nicht erneut gedreht. SVG, 3D-Wände und
Marker verwenden weiterhin dieselbe gemeinsame Geometrie.

Desktop zoomt mit Wheel/Trackpad um den Zeiger. Ziehen im freien Boden bewegt
die Karte, Wandklick und Enter/Space wählen Sektoren. Zoom/Reset sitzen rechts
außerhalb der Karte; kein Handsymbol. Auf Touchgeräten ist die Toolbar verborgen.
Ein Finger scrollt den Inhalt, zwei Finger zoomen/verschieben. Die Fläche ist von
Route-Swipes ausgenommen; nach einer Bewegung wird kein Sektorklick ausgelöst.

Die Kartenverwaltung transformiert die Anzeigegruppe; `getScreenCTM().inverse()`
dieser Gruppe rechnet Eingaben in den ursprünglichen gespeicherten Bildraum
zurück. Aktives Zeichnen/Bearbeiten sperrt weiterhin Karten-Pan/Zoom. Originale
Kartendimensionen, Punkte und Sektor-IDs werden durch Rotation nicht migriert.

## Verifikation

- Releasebuild erfolgreich, bestehender Hinweis auf große Bundles.
-14 bestehende Node-Tests für Orientierung, Geometrie, Kartenquelle und
  Kartenstatus bestanden.
-7 Browserprüfungen: acht Kartenkontexte bei375/768/1280/1920 mit zwei visuellen
  Loops, Sektorauswahl per Tastatur, kein horizontaler Dokumentüberlauf und keine
  Browser-Laufzeitfehler; Desktop-Wheel/Pan/Reset und anschließender Wandklick;
  native emulierte Touch-Eingaben für Ein-Finger-Scroll und Zwei-Finger-Pinch/Pan
  ohne Sektorauswahl; mobiler Eckpunkt-Drag und aufgezeichnete lokale Speicherung
  im ursprünglichen Bildraum.
-9 bestehende Browserregressionen für Schraubreihenfolge, NEU-Badges,
  kollisionsfreie Marker, Auswahl/Reset und öffentliche Lesefehler bestanden.
  Die neuen7 Prüfungen sind zusätzlich im Web-Releaseworkflow eingebunden.
- ESLint: keine Fehler, drei bestehende Fast-Refresh-Exportwarnungen im Editor.
- TypeScript:61 Diagnosen auf unveränderter Basis und61 nach Änderung. Der
  Compilerhost-Vergleich gegen die Originaldateien meldet keine neue Diagnose.
  Der projektweite Typecheck bleibt wegen bestehender Fehler nicht grün.
- Screenshots und Vergleichsberichte liegen lokal unter `output/mobile-maps`;
  Testdaten sind bestehende synthetische Fixtures. TV-Testbilder werden aus dem
  lokalen Asset geladen. Kein Produktionslogin, keine Produktionswrites.

Geprüft wurden gerenderte Chromium-Ansichten und emulierte Touchgesten. Ein
physisches iOS-/Android-Gerät wurde in diesem Lauf nicht verwendet. Die
139 bereits freigegebenen Online-Thumbnails und ihre Nutzerkorrekturen wurden
nicht verändert. Kein Merge oder Produktionsdeployment Bestandteil dieses PRs.
