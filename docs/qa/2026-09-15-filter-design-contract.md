# Filter und Icons – Design Contract

## Direction

Eine ruhige, direkt reagierende Auswahlhilfe: weniger gleichgewichtige Felder,
sichtbare Auswahl und jederzeit ein klarer Weg zurück zu den Bouldern.

## Flow References

- Nutzerreferenz 1: unmittelbare Ergebnisse, kompakte Auswahl, feste Abschlussaktion.
- Nutzerreferenz 2: aufklappbare Kategorien mit lesbarer Auswahlzusammenfassung.
- Nutzerreferenz 3: mobile, randbündige Filterfläche mit festem Kopf und Fuß.
- Anpassung: bestehende sofortige Mehrfachauswahl behalten; kein Speichern nötig.
- Nicht kopieren: Preis-/Körper-Slider. Bouldergrade sind diskrete, auch nicht
  zusammenhängende Auswahlen. Keine erfundenen Histogramme oder Trefferzahlen.

## Style References / Approved Synthesis

- Feinere, konsistente Outline-Icons aus der zweiten Nutzerreferenz übernehmen.
- Bestehendes Lucide-Set neu gewichten statt eine zusätzliche Bibliothek laden.
- Weiß, KWS-Grün #36B531 und Dunkelblau bleiben; keine blaue/lila/dunkle Ersatzpalette.
- Keine übergroßen Rundungen oder Card-in-Card-Flächen.
- Beauftragt durch Nutzer am 15.09.2026; konkrete Umsetzung daraus abgeleitet.

## System

- Filtertitel, Zusammenfassung, Optionen und Ergebnisaktion in klarer Hierarchie.
- Poppins, bestehende 4/8/12-px-Geometrie; eine gemeinsame Filterfläche.
- Kategorien: Outline-Icon, Name, aktuelle Auswahl, Chevron, gezieltes Zurücksetzen.
- Farbmuster mit Namen und separatem Check; Grade bleiben vollständig zentriert.
- Lucide-Stroke zentral 1.75, ausschließlich Lucide; Karten/Diagramme nicht überschreiben.
- Keine neue externe Abhängigkeit oder Backend-Änderung.

## Components and States

- Gemeinsame Komponenten für Gast, Boulder und Setter.
- Kategorie-Collapse, aktive Zusammenfassung, individuelle und globale Resets.
- Schnellfilter als beschriftete Switch-Zeilen, ohne verschachtelte Buttons.
- Farben: geladen, leer, Fehler/Retry; Auswahl und Fehler dürfen gleichzeitig sichtbar sein.
- Trefferzahl unverändert aus der echten Filterlogik; Null bleibt ein klares Ergebnis.

## Motion

- 180ms für Collapse/Check/Pressed; Layoutwechsel erklärt Kategorien.
- Kein Hover-Layoutsprung; Reduced Motion deaktiviert Bewegung.

## Responsive Composition / Accessibility

- 375px: volle mobile Sheetbreite, ein Scrollinhalt, feste Ergebnisaktion.
- 768/1280/1920px: begrenzter zentrierter Dialog, breitere Optionsraster.
- 44px-Touchziele, Radix-Collapse/Switch, aria-expanded/controls/pressed.
- Tastatur, Fokus-Rückgabe, lange Farbnamen, Farbswatch-Kontrast prüfen.
- Zwei getrennte visuelle Loops; nur isolierte Testdaten und keine Produktionswrites.
