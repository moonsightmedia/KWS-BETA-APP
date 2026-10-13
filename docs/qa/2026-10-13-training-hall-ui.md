# Training – Hallenmaterial, ruhige Filter und KWS-Gestaltung

Stand: 13.10.2026. Umsetzung12.–13.10.2026 auf `codex/training-ui`, Vorschau5184. Diese Iteration übernimmt das erneute Nutzerfeedback zu Filter, Eingaberahmen, großem Planbutton, eigenen Einheiten, Hallenmaterial und den fünf Browsermarkierungen. Neue Gestaltungsabnahme weiterhin offen.

## Ergebnis

- Einzelner Fokusborder in TrainingInput, ohne Outline/BoxShadow/RingOffset beim Tippen. Der gemeinsame App-Input bleibt unverändert. Tastaturziele außerhalb der Eingabefelder bleiben erkennbar.
- Themen als Textreiter mit Unterlinie. Filter als ruhige native Radiozeilen mit kleinem Check und explizitem Übernehmen/Verwerfen/Reset. KWS-Verfügbarkeit ist Standard; die Auswahl zeigt im Hallenmodus nur verfügbares Equipment. Weitere Geräte können ausdrücklich einbezogen werden.
- Eigene Einheiten sind eine kompakte Zusatzzeile. Planung startet über einen einzelnen56px-Chat-FAB mit schließbarem Hinweis. Mobil70dvh, Desktop480×600 rechts unten, nichtmodal; Escape/Close führt zum tatsächlichen Auslöser zurück.
- Gesprächskopf verwendet das bestehende KWS-Logo. Wiederholte dekorative Chat-Avatare und Ziel-Icons entfallen. Die entfernten Symbole stammten aus Lucide, nicht aus einer eigenen KWS-Zeichnung. Funktionale Checks/Navigation bleiben.
- Fußtechnik und Brust sind feste Direktlinks aus den ursprünglichen Nutzerbeispielen. Sie sind keine persönliche Analyse oder Vorschläge aus dem Wochenplan. Bereich jetzt „Direkt zu einem Thema“; Zahlen sind echte KWS-Katalogtreffer (5/3), keine Erfolgs- oder Trainingswerte.
- Drei quadratische Bereichbilder. Boulderbild isoliert Person und Griffe ohne Wandfläche/Boden; Reha zeigt eine einzelne Person beim Dehnen. Bereiche/Übungskarten beziehen sich auf KWS-Grün#36B531 als Generationsvorgabe. Rasterillustrationen enthalten Schattierungen und sind keine anatomische Fachfreigabe.

## Inhalt und Hallenvertrag

Vom Nutzer genannt: Bank, Kettlebells, eine vermutlich EZ-/kurze Hantelstange mit Platten, Klimmzugstangen, Fingerboards und Spraywall. Stangentyp, tatsächliche Plattenlasten und Kettlebellgewichte bleiben vor Ort zu bestätigen. Keine Langhantel-/Rack-/Spotterausstattung erfunden.

33 Karten insgesamt, 29 KWS-verfügbar:24 Kraft-/Boulderübungen, eine Fingerboard-Einführung und vier Reha-Orientierungen. Zehn neue Eigengewichts-/Kettlebell-/Stangenübungen plus Fingerboard-Einführung. Zusätzliche Kurzhantel-/Bandkarten bleiben außerhalb des Hallenstandards zugänglich. Bankvoraussetzung beim Kettlebell-Rudern und Kurzhantel-Bankdrücken wird berücksichtigt. Sechs geeignete Wandkarten unterstützen Spraywall alternativ; nicht pauschal jede Lernbewegung.

Fingerboard-Einführung hat keine DefaultDose und wird weder automatisch noch über Add/Replace eingeplant. Importierte lokale Sessiondaten mit undosierten Orientierungskarten werden verworfen. Die Quelle Devise2022 betrifft gemessene Intensitätssteuerung bei fortgeschrittenen/Elite-Kletternden, keine validierte Anfängerintervention. Konkrete Starterdosen und Planregeln bleiben redaktionell und fachlich ungeprüft. Gewichtsangaben werden nicht erfunden.

Seitstützkarte ist die Knievariante, Grafik entsprechend korrigiert. Umfang heißt Haltephasen mit höchstens etwa10Sekunden je Phase; Seite und Pause werden korrekt gezählt. Neue Row-Grafik zeigt die tatsächlich geforderte Bankstütze. Leere/feste Einheiten ohne bekannten Umfang haben eine offene Dauer.

## Verifikation

- 17/17 Inhalts-/Plan-/Zeitprüfungen (`npm run test:training-plan`) bestanden.
- 18/18 UI-Szenarien bestanden; der erste Lauf17/18 hatte eine falsche Testannahme zur5er-Pagination (zweiter Klick zeigt10 statt alle16), der tatsächliche Nachladeablauf wurde danach vollständig geprüft.
- Zweiter Layout-/Interaktionsloop375/768/1280/1920px, zusätzlich die konkrete628×812-Nutzeransicht mit neuen Bildern und Gespräch geprüft. Null PageErrors/Overflow im stabilen Endstand. Drei unabhängige Agenten prüften Daten, Filter/Eingaben und Chat/Startseite.
- Gezielter ESLint ohne Fehler (vorhandene FastRefresh-Warnung im Provider), TypeScript ohne Trainingdiagnosen. Globaler App-Typecheck weiterhin76 Diagnosen in Bestandsmodulen.
- App-Vite-Build mit Vorschauflag bestanden,9,11Sekunden, Version1.0.230 unverändert. Vorschau-Dependency-Scanner wurde auf seinen echten Fixture-Einstieg begrenzt; das verhindert versehentliche Scans fremder Auth-Fixtures mit der lokalen Aliasdefinition. Frischer dauerhafter Vorschau-Server startet sauber; nur bestehender Browserslist-Hinweis.
- Screenshots in `test-results/training-ui`, zusätzliche Filter-Agentenbelege unter `training-calm-filters-subagent-20261012` (nicht versioniert).

## Noch offen

Nutzerabnahme, Trainer-/medizinische Prüfung von Karten/Grafiken/Planregeln, Halleneinweisung und native Geräteabnahme. Keine KI-/Cloud-/Backendanbindung oder Veröffentlichung; Featureflag bleibt standardmäßig aus. Lokale Pläne bleiben je Konto gespeichert, keine geräteübergreifende Synchronisierung.

Exakter nächster Schritt: Auftraggeber prüft die markierten Stellen in der lokalen Vorschau; danach konkret verbleibende Gestaltungsbefunde einarbeiten und das Fachreview des Katalogs vorbereiten.
