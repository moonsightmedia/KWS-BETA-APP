# User Area Design Guide

Dieser Guide beschreibt die Design-Sprache, die im User-Bereich der Beta-App bereits sichtbar ist und ab jetzt als verbindliche Grundlage für neue oder überarbeitete Screens gelten soll.

## Zielbild

Die App soll sich ruhig, klar und hochwertig anfühlen. Sie ist keine Marketing-Seite und kein internes Tool-Dashboard, sondern eine produktive Boulder-App mit zurückhaltender, moderner Oberfläche.

## Kernprinzipien

1. Ein aktives Grün

- `#36B531` ist die einzige aktive Grünfarbe.
- Das Grün markiert Aktionen, aktive Zustände, Links und positive Status.
- Weitere Grüntöne sind nur als sehr helle Tints erlaubt, nicht als zweite Markenfarbe.

2. Ruhige Oberflächen

- Standardflächen sind weiß oder fast weiß.
- Karten arbeiten mit weichen Borders und leichten Schatten.
- Keine starken Verläufe, keine heroartigen Bannerflächen für normale Produkt-UI.

3. Klare Hierarchie

- Kleine Eyebrow-Labels in Teko oder in schmaler Uppercase-Form geben Orientierung.
- Die eigentliche Information sitzt in wenigen, klar lesbaren Überschriften.
- Untertexte erklären nur Kontext oder Verhalten in einem Satz.

4. Wenig Dekoration, hohe Lesbarkeit

- Farbe dient der Orientierung, nicht der Inszenierung.
- Icons sind unterstützend, nicht dekorativ.
- Wenn ein Bereich ohne extra Schmuck noch funktioniert, bleibt er schlicht.

## Foundations

### Farbe

- Primär: `#36B531`
- Haupttext: `#13112B`
- Sekundärtext: `rgba(19,17,43,0.58)` bis `rgba(19,17,43,0.68)`
- Border: `#DDE7DF`
- Ruhige Flächen: `#F7FBF7`, `#FCFEFC`, `#EEF8EA`
- Negative Statusflächen: sehr helle Rot-/Koralltints, nie als Hauptfläche der Seite

### Typografie

- Headlines: `Teko`
- UI-Text: `Poppins`
- Kicker/Eyebrow:
  - klein
  - uppercase
  - viel Letterspacing
  - eher Orientierung als visuelle Deko

### Radius und Schatten

- Kantenradius soll exakt der bestehenden User-Bereich-Logik folgen.
- Hauptkarten, Preview-Karten und größere Inhaltsblöcke: `rounded-2xl`
- Inputs, Standardbuttons, Listenelemente und kompakte Arbeitsflächen: `rounded-xl`
- Filterchips und kleine Toggle-/Filter-Controls wie in der Boulderliste: `rounded-lg`
- `rounded-full` nur für Badges, Zähler, kleine Statusmarker und echte Kreisformen
- Keine zusätzlichen Radiusstufen einführen, wenn der User-Bereich sie nicht schon nutzt
- Standardshadow: weich und flach
- Keine schweren Floating-Karten für normale Arbeitsflächen

## Komponentenlogik

### Section Header

Ein guter Abschnitt im User-Bereich besteht aus:

- kleinem Kicker
- kurzer, klarer Überschrift
- optional einem Satz Kontext
- optional einer kleinen Aktion rechts

Nicht verwenden:

- große Hero-Inszenierung
- lange Einführungstexte
- KPI-Showcase als Header-Ersatz

### Karten

Karten werden genutzt, wenn sie eine echte funktionale Einheit bilden:

- Preview eines Boulders
- Statistikblock
- Einstellungsgruppe
- Statusgruppe

Karten sind:

- weiß
- weich gerahmt
- kompakt
- textlich klar

Nicht verwenden:

- Card-in-Card-Optik ohne funktionalen Grund
- starke Hintergründe oder Radial-Gradienten für Routine-UI

### Pills und Filter

Filter und Statuschips im User-Bereich sind:

- kompakt
- leicht lesbar
- ruhig
- mit eindeutigem Aktivzustand
- in der Regel `rounded-lg`, nicht pauschal `rounded-full`

Aktiv:

- `#36B531` oder eine sehr helle Grünfläche mit grünem Border

Inaktiv:

- weiß oder `secondary`
- neutrale Border

Nicht verwenden:

- zu viele unterschiedliche Button-Stile im selben Bereich
- schwere Schatten oder zu große Pills für einfache Filter

### Statusdarstellung

Status wird über Text, Zahl und leichte Tints kommuniziert:

- aktiv / positiv: grün
- neutral / gesamt: weiß oder soft neutral
- deaktiviert / negativ: sehr helle Rotfläche

Die Seite selbst bleibt aber neutral. Farbe sitzt in Chips, Badges und Buttons, nicht in großen Flächen.

## Sprache

Die UI-Sprache soll produktiv und direkt sein.

Gut:

- `Statusbereich`
- `Alle Sektoren`
- `Karte anzeigen`
- `Sichtbare wählen`
- `Nach Segmenten gebündelt`

Nicht gut:

- zu große Produktversprechen
- heroartige Claims
- Tool-Sprache mit unklarer Priorität

## Übertragung auf Setter und Admin

Setter und Admin sollen sich wie dieselbe App anfühlen wie der User-Bereich:

- dieselbe Farblogik
- dieselbe Typo-Hierarchie
- dieselbe Kartenruhe
- dieselbe Button- und Filterlogik

Das bedeutet nicht, dass Setter und Admin wie Consumer-Screens aussehen müssen. Sie dürfen dichter und funktionaler sein, aber nicht visuell in eine andere Produktwelt kippen.

## Konkrete Regeln für den Setter-Statusbereich

1. Kein Hero-Header

- Der obere Steuerungsbereich ist eine Arbeitsfläche, kein Showcase.
- Überschrift kleiner, Kontext kürzer, keine dekorativen Verläufe.

2. KPIs nur als Orientierung

- Segment-, Hängt- und Ab-Werte sind kompakte Statuskarten.
- Sie sollen scannbar sein, nicht die ganze Seite dominieren.

3. Filter als ruhige Tools

- Statusfilter, Sektorfilter und Auswahlaktionen als konsistente Pills.
- Ein Stil für aktiv, ein Stil für inaktiv.

4. Gruppenkarten als klare Arbeitsblöcke

- Jede Sektorgruppe als weiße Karte mit kleinem Header.
- Statuschips und Aktionen direkt am Kontext, ohne zusätzliche Inszenierung.

5. Farbe sparsam einsetzen

- Grün für aktiv und Auswahl
- Rot nur für Abschrauben und deaktivierte Status
- keine großen farbigen Flächen ohne funktionale Begründung
