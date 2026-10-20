# Vier freigegebene DesignMotion-Ergänzungen

Nutzerauftrag vom 20.10.2026: alle fünf Entwürfe außer Mehrfachauswahl
implementieren, prüfen, pushen und veröffentlichen. Ausgangspunkt origin/main
13dd14c; bestehender Videofeed, Monitoring und andere parallele Arbeiten erhalten.

## Änderungen

- BatchUpload nennt die tatsächlich fehlenden Angaben des betreffenden Boulders
  und verknüpft die Uploadsperre mit einem lesbaren Grund.
- Settereditor startet im Namen und fokussiert einen ungültigen Namen beim
  Speicherversuch. Bestehender Verwerfenschutz und Dialog-Tabbegrenzung bleiben.
- Der bestehende Speicherweg zeigt Pending/Fehler klarer. Die Erfolgsmeldung
  erscheint erst nach Boulder-/Attributschreiben und gegebenenfalls Uploads.
- Projektentfernung im Detail-Tracking bietet zehn Sekunden Rückgängig. Beide
  Richtungen verwenden einen kontogebundenen PATCH ausschließlich von is_project
  und prüfen den umgekehrten aktuellen Wert sowie genau eine bestätigte Zeile.
  Kein Wiederherstellen alter Notizen, Versuche, Erfolge, Favoriten oder Sessions.
  Eine weitere Trackingaktion, Kontowechsel oder Unmount verwirft das Angebot;
  ein Fehler oder Konflikt bestätigt keine Wiederherstellung. Bei einem Ladefehler behält der Dialog seinen verfügbaren Standardfokus.\n  Marker-only-Zeilen
  bleiben ohne erfundene Aktivität, entsprechend dem bestehenden separaten
  Marker-Schreibweg der persönlichen Sammlungen.
- Keine neue Auswahl-UI und kein Undo von endgültigem Löschen. Keine Migration,
  Rollenänderung, native Storeveröffentlichung oder Änderung des Startladers bzw.
  der Home-Wochenkarte.

## Prüfung vor Push

- 338 Node-Tests erfolgreich.
- 28 Browserfälle (erste neun neue Fälle + 19 bestehende Setterfälle) erfolgreich;
  erweiterte neue Suite mit zwölf Fällen ebenfalls erfolgreich. 31 unterschiedliche
  Fälle insgesamt, nicht als einzelner 31er-Lauf ausgegeben.
- Neue Suite prüft mit echtem Mutationshook und isolierter REST-Antwort: PATCH
  nur is_project, Kontofilter und Vergleichswert; Erhalt aller Trackingdaten;
  fehlgeschlagene Entfernung, Konflikt beim Undo, Konto-/Ansichtswechsel, konkrete Tracking-ID,
  Folgeaktion und Zeitablauf; Editorfokus, Fehlererhalt, Pending und Speichersperre.
- Gerenderte echte Produktkomponenten mit isolierten Fixtures: 16 Layoutfälle
  an 375/768/1280/1920 ohne Dokumentüberlauf/defekte sichtbare Bilder.
  Zweiter visueller Durchgang mit Pending/Fehlern auf allen vier Breiten,
  Projektentfernung und Wiederherstellung manuell bedient.
- Hostinger-Vitebuild erfolgreich ohne Versionsbump. ESLint der fünf geänderten
  Produktdateien: 0 Fehler, 3 Fast-Refresh-Exportwarnungen (vorher 2).
- TypeScript gegen separat archivierten origin/main: 69 vorher / 69 nachher vor Einbezug der parallelen Feed-Erweiterung,
  keine neue Diagnose; globaler Typecheck bleibt wegen bestehender Befunde rot.
- Browserprüfungen verwenden ausschließlich erfundene Daten und blockieren
  externe Zugriffe. Keine manuellen produktiven Datenänderungen/Uploads/Mails.

Belege lokal im verwalteten Worktree unter output/designmotion-four-release/qa,
type-comparison.json und build.log; Node-/Type-Logs unter output/design-review-five.
Die Web-production-CI enthält die neue Suite. Veröffentlichung erfolgt erst nach
grünen Remote-Checks über main und den regulären Hostinger-Proof.

## Nachprüfung des echten Ladefalls

PR #63 wurde als 824f3e8 veröffentlicht; beide HTTPS-Proofs und Web-production-CI
39405005199 bestätigten dieselbe Revision. Die reine Live-Leseprüfung zeigte
anschließend, dass die anfängliche Merkmalsabfrage den Namenseingang sperrt:
Radix fokussierte deshalb den noch bedienbaren Bereich „Weitere Angaben“.
Die isolierte Erstprüfung hatte nur bereits geladene Merkmale simuliert.

Der Editor hält den Anfangsfokus während dieser Abfrage jetzt auf der Dialogfläche
und übergibt ihn nach dem Laden an das Namensfeld. Hat der Nutzer den Fokus
inzwischen selbst versetzt, bleibt dessen Wahl erhalten. Ein Lesefehler behält
den bisherigen verfügbaren Schließen-Fokus. Laufende Speichervorgänge lösen
keinen neuen Anfangsfokus aus. Keine Speicher-, Berechtigungs- oder API-Änderung.

Die erweiterte Browser-Suite mit 14 Fällen ist lokal erfolgreich, darunter zwei
neue Ladefälle. ESLint: 0 Fehler, unveränderte drei Exportwarnungen.
Die Ergänzung durchläuft denselben normalen PR-/main-/Hostinger-Ablauf.
