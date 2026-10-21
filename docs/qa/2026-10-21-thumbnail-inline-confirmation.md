# PR69 – Bestätigung im Boulder-Erstellen-Dialog (21.10.2026)

Die ausdrückliche Nutzerkorrektur wird direkt im gemeinsamen SetterBoulderEditorDialog umgesetzt: nach der Griffvorschau stehen „Vorschau bestätigen“ und „Original behalten“. Erst die bestätigte aktuelle Maske darf zum Stapel, ins Bearbeiten oder ins Speichern gelangen. Keine separate Bestandsprüfseite und kein zusätzliches Übernahme-Popup für neue Boulder. Die bestehende Bestandsprüfung bleibt für spätere Änderungen an vorhandenen Bildern.

Die Bestätigung liegt als optionales confirmed-Feld an derselben ThumbnailFocus-Auswahl. Automatik, Tipp-/Konturänderung, Reset und Undo löschen sie. Foto-/Farb-/Volumenwechsel invalidieren eine vorherige Bestätigung; andere Formularfelder ändern sie nicht. Der Editor sperrt die Übernahme vor Bestätigung. Die gemeinsame Dateiauswahl verwendet unabhängig davon bei alten oder unbestätigten Masken die Originaldatei. Volumen, deaktiviertes Feature und Original-Fallback bleiben möglich. Bestandsprüfung nutzt weiterhin ihre eigene ausdrückliche „Passt“-/Online-Freigabe und zeigt keine zweite Inlinebestätigung.

Verifikation:
- 383 Nodeprüfungen grün, darunter bestätigte/unbestätigte/alte Uploadentwürfe.
- 12 echte Setter-UI-Fälle grün: direkte Bestätigung vor Übernahme, Korrektur invalidiert sie, Original behalten, Zurückwechseln zur vorherigen Farbe/Undo benötigen neue Bestätigung, manuelle Kontur und bestehende Karten-/Editorlogik.
- 1 deaktiviertes Feature und 7 Bestands-/Native-/Review-UI-Fälle grün.
- Zwei gerenderte QA-Loops bei375/768/1280/1920 gelesen: output/thumbnail-setter/loop{1,2}-editor-{width}.png. Vorschau/Bestätigungsaktionen/Footer auf jeder Breite erreichbar; keine horizontalen Überläufe. Die große Konturfläche scrollt im Dialog; Footer bleibt fest. Vier-Breiten-Interaktionen und vorhandene Hochformatkarte bleiben geprüft.
- Scoped ESLint nullFehler, vier bestehende FastRefresh-Warnungen (3 gemeinsamerEditor,1Fixture).

Livevorführung ist ausschließlich localhost:5256, echte Editor-Komponenten, gezeichnete Testdaten und lokaler Analyseersatz; CSP blockiert externe Requests und echte Uploads. Es wurden keine produktiven Boulder/Daten/Medien geändert. Lokale UIaufnahme output/thumbnail-confirmation-demo/03-im-erstellen-dialog.png. GitHub-/Produktionsrelease und neueNativeartefakte werden separat geprüft; dieser Bericht behauptet deren Erfolg noch nicht.