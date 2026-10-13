# Kinderbouldern und individuelle Trainingsmotive

Stand: 13.10.2026, Branch `codex/training-ui`, lokale UI-Vorschau Port5184. Nutzerauftrag: individuelle Icons für sämtliche Übungs-/Spielkarten und ein eigener Kinderbereich für Kita- und Schulkinder.

## Ergebnis

- 69 eigens gezeichnete, explizit zugeordnete SVG-Motive. Jeder Karte ist eine eigene Geometrie zugeordnet; Unitprüfung vergleicht sämtliche 69 Definitionen auf Vollständigkeit und Unterscheidbarkeit. Heelhook zeigt Schuh/Ferse am Griff, Fußwechsel den Wechsel, Memory das Erinnern, Detektiv das Untersuchen. Metadaten und Einheitenteile verwenden das konkrete Übungsmotiv. Die bisherigen Bildwiederholungen der24 neuen Boulderrezepte wurden ersetzt. Die Original-Übungs-PNGs bleiben ihren jeweils eigenen Rezepten zugeordnet.
- Vier Bereiche: Kraft, Bouldern, Wiedereinstieg, Kinder. Mobil/Tablet2×2, Desktopvier nebeneinander. Neue eigene Kinder-Kategorieillustration per eingebautem Imagegen erstellt, gesehen und ins Projekt kopiert; Bild-/Promptnachweis in `public/training/README.md`. Funktionsicons bleiben einheitlich bedienbar.
- Zwölf Kinderboulderspiele, sechs mit eigener Kita-Vereinfachung und sechs für den Schulkontext. Beispiele: Farbenpost, Tierwege, gedachte Schatzsuche, Griff-Detektive, Fußkarte, Geschichtenstationen, freundlicher Spiegel und Heimweg-Mission. Kita-Varianten jeweils eine direkt begleitete Handlung aus unterstütztem Stand plus Bodenalternative. Keine Gegenstände in Griffen/Fallraum und keine Blind-, Sprung-, Tempo- oder Maximalaufgaben.
- Suchachsen Alle/Kita/Schule und Thema; zwölf Schulkinderideen bzw. sechs Kita-Varianten. Karte zeigt kurze Orientierungslabels; Detail enthält vollständige Betreuung, Aufbau und Gruppen-/Zeit-/Fähigkeitshinweise. Kita-Variante liegt vor dem Schulablauf; im Kita-Kontext sind Schulschritte geschlossen. Alters- und Zeitlabels sind keine fachlich validierten Eignungsgrenzen.
- Kinderspiele können gelesen, gesucht und gemerkt werden. Sie gelangen weder über Add/Replace noch aus URL-Kontext/Generator/importierten Sessiondaten in Erwachsenen-Einheiten. Laufender Erwachsenenentwurf bleibt erhalten und wird auf Kinderansichten nicht als eigene Aktion darübergelegt. „Gemerkte Inhalte“ funktioniert für alle Kartenarten, ohne Kinderprofile zu speichern.

Gesamtkatalog69 Karten,65 KWS-verfügbar:16 Kraft-/Fingerboardkarten,33 Boulderaufgaben,4 Wiedereinstiegs-Orientierungen,12 Kinderideen. Weiterhin52 dosierte Erwachsenenrezepte; Fingerboard/Wiedereinstieg/Kinder bleiben ohne generelle Trainingsdosis.

## Grundlagen und offene Freigabe

Kinder-Aufbau-/Aufsichtshinweise wurden gegen DAV-Indoorempfehlungen, DAV-Kinder-/Settingartikel und DGUV202-018 (S.21–22) geprüft. DGUV beschreibt keine allgemeingültige Grenze nach Alter oder Betreuungsdauer; Schul-/Kita-Kontext ist keine automatische KWS-Betriebsfreigabe. Die konkreten Spielregeln bleiben redaktionell. KWS-Ausstattung, passende individuelle Passage, Aufsichtsform/Gruppe und Fähigkeit werden vor Ort geklärt. Keine Wandhöhe, Rutsche oder Betreuungsquote erfunden; kein wissenschaftlicher Wirksamkeitsnachweis dieser einzelnen Spiele.

## Verifikation

- 23 Inhalts-/Plan-/Zeit-/Storage-/History-/Icon-/Kinderguideprüfungen bestanden.
- 23 UI-Szenarien erfolgreich; kompletter Lauf21PASS plus zwei nachgezogene Favprüfungen nach Anpassung des Testlabels „Gemerkte Übungen“ an „Gemerkte Inhalte“. Favoriten hatten durchgehend den korrekten Bestand; es lag kein Speicherverlust vor.
- Zwei visuelle/Interaktionsloops, Root plus unabhängige Komponentenprüfungen bei375/768/1280/1920px. Kita6/Schule12, Themenfilter, Kontext-Rückwege, Kita-Vereinfachung vor Schulablauf, Merken/Reload, offene Erwachsenenentwürfe, Bildfehler-Fallback und echte Übungsmotive geprüft. Kein Overflow/JavaScript-PageError im geprüften Endstand.
- ScopedESLint keine Fehler (bestehende Provider-FastRefresh-Warnung); App-Typecheck76Bestandsdiagnosen außerhalb Training, keine neue Trainingsdiagnose. App-Build mit Vorschauflag bestanden, Version1.0.230 unverändert.
- Isolierte Browserkonten/Fixture, keine produktive Cloud/KI-/Native-Abnahme und keine Veröffentlichung. Fachlicher Hallen-/Kinderreview und Nutzerabnahme offen.

Nächster Schritt: Auftraggeber prüft Symbole sowie Kita-/Schule-Filter und Spielabläufe lokal. Anschließend Kinderbereichs-Verantwortliche prüfen tatsächlichen Aufbau, Betreuung und Spiel-/Illustrationszuordnung vor einem betreuten Pilot.
