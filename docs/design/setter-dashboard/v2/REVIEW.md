# Dashboard-Review und zweiter Entwurf

Stand: 23.10.2026. Lokaler, bedienbarer Entwurf zur Durchsicht; keine Veröffentlichungsfreigabe.

V2: http://127.0.0.1:5256/test/fixtures/setter-dashboard.html?design=v2

Vergleich V1: http://127.0.0.1:5256/test/fixtures/setter-dashboard.html?design=v1

Beide Vergleichslinks verwenden dieselben synthetischen Daten. Die ursprüngliche Ansicht ohne `design`-Parameter behält ihren früheren Beispieldatensatz. V1 bleibt als eigenständige Implementierung erhalten. Die V2-Komponente und ihr zusätzlicher Tailwind-Scan werden ausschließlich vom expliziten QA-Profil geladen.

## Beurteilung

Die fachliche Grundauswahl ist richtig: Ein Schraubteam braucht den aktuellen Bestand nach Grad und Bereich, Resonanz auf einzelne Boulder und die Breite der Rückmeldungen. V1 ist eine brauchbare erste Statistikansicht. Für ein Arbeitsdashboard fehlen jedoch Priorisierung, eine saubere Einordnung der Stimmenbasis und eine kompakte Arbeitsliste. Die Professionalität entsteht durch diese Informationslogik und verlässliche Bedienung; zusätzliche Diagramme allein verbessern sie nicht.

Die Reihenfolge in V2 beantwortet vier Fragen:

1. **Was ist gerade in der Halle?** Kompakte Bestands-, Rückmeldungs- und Abdeckungszahlen mit sichtbarem Geltungsbereich.
2. **Was sollte das Team näher ansehen?** Konkrete Boulder und der belegte Anlass, neben dem Hallenbestand; mobil vor dem Diagramm.
3. **Wie setzt sich die Resonanz zusammen?** Sterne und Schwierigkeit getrennt, ohne den Durchschnitt mehrfach groß zu wiederholen.
4. **Welchen Boulder möchte ich untersuchen?** Suchbare, sortierbare Arbeitsliste und Details einschließlich freigegebener Kommentare.

## Befunde und Änderungen

| Befund aus V1 | Warum das stört | Änderung in V2 |
|---|---|---|
| Kommentaranzahl steht unter „Sternebewertungen“ | Es werden zwei verschiedene Messgrößen vermischt. | „Rückmeldungen“ ist eine klar definierte Summe mit separater Aufteilung in Sterne, Einstufungen und Kommentare. |
| Sternedurchschnitt ist als Kennzahl und erneut groß im Diagramm vorhanden | Wiederholung verbraucht Fläche ohne zusätzliche Entscheidungshilfe. | Durchschnitt einmal im Kennzahlenstreifen; darunter nur die tatsächliche Sterneverteilung. |
| Großes Grad-Diagramm vor allen konkreten Befunden | Auf dem Handy liegt die nächste sinnvolle Handlung weit unten. | Kompakter Hallenbestand und konkrete Prüfanlässe bilden die erste Analyseebene; mobil stehen die Prüfanlässe zuerst. |
| Globales „Passt / zu schwer / zu leicht“ lässt konkrete Abweichungen verschwinden | Probleme an einzelnen Bouldern können sich in der Gesamtzahl aufheben. | Hinweise pro Boulder nennen Richtung und tatsächliche Stimmenzahl; ein Klick öffnet genau dessen Auswertung. |
| Eine einzelne 5-Sterne-Stimme kann ein Ranking anführen | Der beste Platz wirkt belastbarer, als es die Daten hergeben. | Bewertung immer mit Stimmenzahl. Das Ranking verwendet als vorläufige Regel mindestens fünf Sternebewertungen. Wenige Stimmen bleiben sichtbar gekennzeichnet. |
| Ohne Feedback wird nur in einer Liste ausgegeben | Unklar, ob eine Auffälligkeit oder schlicht fehlende Beteiligung vorliegt. | Fehlende Daten werden von abweichenden Bewertungen getrennt. Neue Boulder ohne Feedback gelten nicht sofort als Prüfanlass. |
| Hallenbereiche sind nur ein Filter | Der Vergleich der Verteilung und Datenabdeckung erfordert wiederholtes Umschalten. | Umschaltbare Bereichsübersicht mit Bestand und Feedback-Abdeckung; auch bekannte leere Bereiche bleiben auswählbar. Klick übernimmt den Bereich. |
| Lange Liste ohne Suche und klare Spalten | Einzelne Boulder lassen sich nur schwer wiederfinden und vergleichen. | Suche nach Name/Bereich, Auswahl mit Anzahl, Sortierung und Desktopspalten für Bewertung, Stimmenbasis, Kommentare und Einordnung. Mobil dieselben Inhalte in kompakten Zeilen. |
| Leere Fotoflächen ohne vorhandenes Foto | Sie beanspruchen Platz und sehen wie unvollständige Daten aus. | Klare Gradmarkierung; keine erfundenen Vorschaubilder oder leeren Bildcontainer. |
| Detailfenster nennt Kommentare nur als Zahl | Der praktische Kontext einer Kritik fehlt. | Freigegebene Kommentartexte und Datum direkt in der Auswertung, ohne zusätzlich geladene Autorenprofile. |
| Aktualisierungszeit steht erst ganz unten | Die Aktualität ist beim ersten Blick nicht einschätzbar. | Stand und Aktualisieren-Aktion direkt in der Werkzeugleiste; ein Fehler erhält den letzten erfolgreichen Stand. |
| Mobiles Sortiermenü konnte beim Öffnen die Seite nach oben versetzen | Die Sortierung ist dann außerhalb des sichtbaren Bereichs. | Nichtmodales Sortiermenü mit den bestehenden Dropdown-/Radio-Primitives; keine Seitenscrollsperre für diese Auswahl. |

## Welche Informationen sind sinnvoll?

**Unmittelbar sinnvoll und in V2 enthalten:** aktueller Bestand je Grad/Bereich, Anzahl und Art der Rückmeldungen, gewichteter Sternedurchschnitt mit Nenner, Anteil der Boulder mit Feedback, konkrete Schwierigkeitseinschätzungen, Kommentare und Boulder mit dünner Datenbasis. „Neu angelegt“ ergänzt die Bestandszahl, wird aber ausdrücklich aus dem Datensatz-Anlagedatum berechnet.

**Bewusst keine scheinbare Präzision:** Rückmeldungen sind keine Zahl unterschiedlicher Menschen; App-Feedback repräsentiert nicht automatisch alle Besucher. Sterne beschreiben eine subjektive Bewertung und die Grad-Rückmeldung eine subjektive Einstufung. Aus beiden folgt keine automatische Qualitätsdiagnose und keine automatische Umstufung.

**Spätere Ergänzungen mit fachlicher Voraussetzung:**

- Soll-/Ist-Gradverteilung, sobald die Halle einen Zielmix festlegt. Keine erfundene Normalverteilung oder roten „Fehlbestände“ ohne Ziel.
- Tatsächliches Alter an der Wand und Schraubrotation, sobald ein verlässlicher Hängezeitpunkt bzw. eine Statushistorie vorliegt. `created_at` ist dafür kein Ersatz.
- Zeitliche Entwicklung, sobald Feedbackzeitraum, Boulderbestand und historische Vergleichsgruppe gemeinsam definiert sind. Ein anderer aktueller Boulderbestand kann einen Durchschnitt verändern, ohne dass die Qualität gesunken ist.
- Stil-/Attributmix als ergänzende Analyse, wenn klar ist, welche Setterattribute oder Communityzuordnungen die Halle dafür verwenden möchte.

Private Tops, Versuche, Projekte und Notizen werden nicht für dieses Dashboard herangezogen. Aus fehlendem Feedback darf auch keine geringe Kletterhäufigkeit abgeleitet werden.

## Vorläufige Hinweisregeln

Diese Regeln sind im Infofenster offengelegt und **noch keine bestätigten Hallenstandards oder statistischen Signifikanztests**:

- **Grad prüfen:** mindestens fünf Einstufungen; mindestens 60 % davon in dieselbe abweichende Richtung.
- **Bewertung ansehen:** mindestens fünf Sternebewertungen; Durchschnitt höchstens 2,5.
- **Feedback fehlt:** mindestens sieben volle Tage seit Datensatzanlage und noch kein Feedback. Dies bleibt ein Hinweis auf eine Datenlücke und wird nicht als Qualitätsproblem in „Zum Prüfen“ gezählt.
- **Ranking:** mindestens fünf Sternebewertungen, danach Durchschnitt und bei Gleichstand Stimmenzahl. Ein größerer Nenner verringert die Dominanz einzelner Stimmen, beweist aber noch keine Repräsentativität.

Ein Boulder mit mehreren Hinweisen zählt in der Übersicht einmal. Alle Hinweise werden in seinem Detailfenster erklärt. Es gibt keine Schreibaktion oder automatische Änderung am Boulder.

## Designbegründung und Referenzen

Die Funktionsauswahl stimmt mit den öffentlich beschriebenen Aufgaben einer etablierten Branchenlösung überein: Vertical-Life nennt Gradverteilung über Sektoren, Routenqualität und direktes Klettererfeedback als Teil der Schraubplanung. Das bestätigt die Themenauswahl; es ist kein Nachweis für deren interne Dashboardgestaltung. Quelle: [Vertical-Life – Routesetting Management](https://gym.vertical-life.info/routesetting-management/), live gelesen am 23.10.2026.

Die Hierarchie folgt dem Prinzip, wichtige Zustände schnell erfassbar zu machen und quantitative Größen über Balkenlängen und klare Positionen darzustellen. Der Entwurf leitet daraus kompakte Balken, konkrete Hinweise und weniger doppelte Informationen ab. Quellen: [Nielsen Norman Group – Dashboards](https://www.nngroup.com/articles/dashboards-preattentive/) und [Complex Application Design](https://www.nngroup.com/articles/complex-application-design/), live recherchiert am 23.10.2026. Diese Quellen begründen die Gestaltungsprinzipien, nicht die vorgeschlagenen fachlichen Schwellen.

KWS-Typografie, Farbpalette, 4/8/12px-Radien, Seitenrahmen und Navigation bleiben erhalten. Ein neuer wiederverwendbarer Designvertrag wird erst nach einer tatsächlichen Nutzerentscheidung in `docs/DESIGN.md` aufgenommen.
