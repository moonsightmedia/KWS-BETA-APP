# Training – nachvollziehbarer Verlauf, Auswahl und Boulder-Spiele

Stand: 13.10.2026. Branch `codex/training-ui`, lokale Vorschau auf Port 5184. Ersetzt die statischen Themendirektlinks und das Fünfer-Nachladen der vorherigen Iteration. Nutzerabnahme und fachliche Freigabe bleiben ausstehend.

## Umsetzung

- „Zuletzt trainiert“ zeigt die letzten zwei ausdrücklich abgeschlossenen Einheiten mit Datum, Titel, Fokus und Übungszahl. Eine gespeicherte Einheit kann direkt oder im Wochenplan markiert werden. Suchvorgänge, Favoriten und Speichern werden nicht als Training ausgegeben.
- Verlauf als maximal 30 unabhängige Snapshots gespeichert. Neue Wochen erhalten eigene IDs, damit wiederverwendete `preview-*`-Session-IDs keinen alten Abschluss einer neuen Woche zuordnen. Terminverschieben erhält die Zuordnung. Rückgängig entfernt genau einen Snapshot und öffnet den zugehörigen Termin, falls diese Woche noch aktuell ist.
- „Erneut zusammenstellen“ erzeugt eine separate gespeicherte Einheit mit neuen Übungs-IDs, bearbeitbarem Umfang und erneuter optionaler Wochenzuordnung. Der offene Einheitsentwurf bleibt erhalten; die alte Zeitbudgetvorgabe wird nicht übernommen. Spätere Änderungen verändern den historischen Snapshot nicht.
- Bestehende v2-Speicherstände bleiben nutzbar, ohne frühere Abschlüsse mit erfundenen Daten zu rekonstruieren. Speicherung je Konto und Gerät, Tab-Abgleich, Reload und Reset enthalten den Verlauf. Intake-Antworten bleiben ausgeschlossen. Defekte Verlaufseinträge werden unabhängig vom vorhandenen Plan verworfen. Sammlungslimits erhalten den letzten lesbaren Speicherstand und melden fehlende Speicherung.
- „Zur Einheit hinzufügen“ benennt den Einheitsentwurf bzw. beim Ergänzen die bestehende Zieleinheit. Auswahlleiste öffnet die Einheit. Auswählen → Anpassen → Speichern wird erklärt; Wochenzuordnung ist anschließend optional. Orientierungskarten bleiben unplannbar.
- Bibliotheken zeigen sämtliche gefilterten Treffer mit Gesamtzahl. Kein „Weitere 5“. Boulderformat Alle/Übungen/Spiele und Lernfeld sind eigene Filter; Suche, Rückweg und Kontext bleiben erhalten. Formatwechsel entfernt ein nicht mehr passendes Thema. Filter-Escape schließt auch im geprüften mobilen Reduced-Motion-Szenario und gibt Fokus zurück.
- Sichtbarer Bereichsname „Wiedereinstieg“; bestehende `rehab`-Routen bleiben kompatibel. Kachelzahlen sind tatsächliche KWS-Katalogzahlen. Der optionale Einheitenlink bleibt auf Desktop kompakt und liegt frei vom Chat-Hinweis.

## Inhalt und wissenschaftlicher Geltungsbereich

57 Karten insgesamt, davon 53 KWS-verfügbar: 16 Kraft-/Fingerboardkarten, 33 Boulderaufgaben und vier Wiedereinstiegs-Orientierungen. Der Boulderbereich enthält 23 Übungen und zehn Spiele. Neu: 14 Lernaufgaben plus zehn Spiele mit vollständigen Schritten, Aufbauvoraussetzungen, Cues, Varianten, Fehlern und Quellengrenzen.

Beispiele: Startpositionen-Labor, Griff-/Fußwechselorganisation, Rückweg abklettern, Teilsequenzen, Übertragungsbeobachtung, Tritt-Memory, Beta-Detektiv, Beobachtungs-Bingo, Mini-Add-on und Spraywall-Werkstatt. Spielthemen bilden Fußtechnik, Körperposition, Koordination und Boulderlesen ab. Spraywall-exklusive Spiele bekommen keine pauschale Boulderwand-Alternative. Motorische Illustrationen werden passend wiederverwendet; sie erklären nicht eigenständig sämtliche Spielregeln.

Neue Dosierungen sind redaktionelle Lernvorschläge: zwei eigene kurze Versuche/Spielzüge, Pausen zwischen eigenen Versuchen, zusätzliche Gruppenwartezeit offen. Motorik-/Previewquellen sind keine individuelle Studienvalidierung jedes Spiels. Die 24 neuen Rezepte bleiben aus der automatischen Planwahl ausgeschlossen (`planEligible=false`), sind jedoch bewusst manuell auswählbar. Spezifische Grifflösungen, Platte und Hookübergänge führen örtliche Einweisung/Coach-Voraussetzungen auf. Kein automatisch erzeugtes Wettkampf-/Jugend-/Therapieprogramm.

## Verifikation

- 22 Inhalts-, Plan-, Zeit-, Verlauf- und Speicherprüfungen bestanden (`npm run test:training-plan`).
- Alle 21 UI-Szenarien bestanden, zuletzt vollständiger Lauf mit 20 Erfolgen und anschließend reparierter Testselektor für den als Button gerenderten Bibliotheksrückweg plus erneuter Vier-Breiten-Layoutloop. Die Escape-Regression wurde im Code korrigiert und im vollständigen Lauf bestätigt.
- Render-/Interaktionschecks bei 375, 768, 1280 und 1920 Pixeln durch Root und unabhängige Komponentenprüfungen; neue Spielsuche und tatsächlicher gefüllter Trainingsverlauf zusätzlich gesichtet. Keine Überbreite oder JavaScript-PageErrors im geprüften Endstand.
- Scoped ESLint: keine Fehler, eine bestehende Fast-Refresh-Warnung des Providers. App-Typecheck: 76 vorhandene Diagnosen außerhalb des Trainingsbereichs; keine Trainingsdiagnose. Vollständiger App-Build mit Vorschauflag erfolgreich, Version 1.0.230 unverändert. Buildwarnungen zu bestehenden Bundles/Imports bleiben.
- Lokale UI-Fixture mit synthetischen Konten. Kein produktiver Backend-, Cloud-, KI- oder Native-Abnahmenachweis; keine Veröffentlichung.

## Nächster Schritt

Auftraggeber prüft Auswahl → eigene Einheit → Abschluss → Wiederholen sowie Spiele-/Lernfeldfilter in der lokalen Vorschau. Danach Karten, Illustrationszuordnung und Planregeln mit Coach/Sportwissenschaft/Physiotherapie fachlich prüfen und verbleibende konkrete UX-Befunde bearbeiten.
