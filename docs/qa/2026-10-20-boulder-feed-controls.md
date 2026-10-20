# Videofeed: vollständiges Bild und optionale Doppeltipp-Aktion

Nutzerkorrektur vom 20.10.2026. Ausgangsstand: origin/main 13dd14c, einschließlich veröffentlichter Videoansicht und Lazy-Einstieg.

## Ergebnis

- Die bisherige Medienfläche verwendete bereits object-fit: contain. Starke deckende Verläufe und überlagerte Metadaten verdeckten jedoch große Teile oben und unten. Die neue Medienfläche liegt zwischen den tatsächlich gemessenen Kopf-/Fußhöhen und neben den persönlichen Aktionen. Das vollständige Quellbild bleibt sichtbar; keine Verläufe über dem Bild. Ausblenden und Halte-Tempo verändern weder Größe noch Position des Videos.
- Der Zahnradbutton im Feed öffnet eine kompakte Bedienungsfläche mit den drei Optionen Aus / Als Projekt speichern / Layout ausblenden. Auswahl wird lokal auf diesem Gerät und getrennt nach Backendumgebung gespeichert. Neue und bisherige Nutzer starten mit Aus; ungültige gespeicherte Werte fallen ebenfalls darauf zurück. Keine Backendmigration oder neue Abhängigkeit.
- Ohne Zusatzaktion pausiert ein Tipp sofort. Bei aktivierter Zusatzaktion bleiben 280ms für die Unterscheidung. Layout-Doppeltipp verändert keine Pause/Markierung. Projekt-Doppeltipp setzt ausschließlich die Markierung, erhält Status/Favorit/Versuche/Notiz und entfernt ein bestehendes Projekt bei Wiederholung nie. Der normale Projektbutton bleibt ein ausdrücklicher Umschalter.
- Gäste können den Projektmodus nicht aktivieren; ein zuvor gespeicherter Projektmodus wirkt ohne Anmeldung wie Aus. Layoutmodus und manuelles Auge bleiben verfügbar. Öffnen der Bedienung pausiert das Video und verwirft ausstehende Gesten, Schließen stellt Fokus und gewünschten Wiedergabezustand wieder her.
- Augenbutton, Qualitätswahl, Halten links/rechts, Navigation und bisherige Community-Schreibwege bleiben erhalten. Der historische Prototyp wurde nicht verändert.

## Verifikation

14 Integrationstests erfolgreich (33,6s), einschließlich drei neuer Fälle für Standard Aus/Persistenz/Auge, idempotentes Projektspeichern mit erhaltenem Top/Favorit/Notiz und Gastschutz bei gespeicherter Einstellung. Bestehende Tests für Lazy-Einstieg, Filter/Detailrückweg, Qualitätswahl, echte Touchgesten, Tracking-Teilfehler/Retry, Moderation und externe Einwilligung ebenfalls erfolgreich. Ergänzter gezielter Wiederholungstest prüft Fokus nach Schließen und identische Videogeometrie bei ausgeblendetem Layout.

Zwei visuelle Schleifen bei 375, 768, 1280 und 1920 px: Feed mit vollständig sichtbarem grünem Testrahmen, Bedienung/Aus und Bedienung/Projekt, Kommentare und Track-Notiz sowie übrige Übersicht. Die Testaufnahme zeigt bewusst alle vier Bildkanten. Automatische Geometrieprüfung belegt contain sowie Abstand von oberem Bildrand zum Kopf und unterem Bildrand zum Fuß. Visuell geprüfte Kontaktbögen: output/video-feed/controls-review-loop1.png und controls-review-loop2.png; Einzelbilder unter output/video-feed/integration/loop*.png. Keine Browser-JS-Fehler.

Gezieltes ESLint ohne Befund. Vollständiger App-Einstieg zusätzlich mit React/Vite ohne Versions-/Release-Plugins oder Public-Kopie gebaut; bestehende Browserlist-/Font-/Bundle-Hinweise sind kein neuer Funktionsfehler. Kein echtes Produktionskonto oder echte Community-Daten in Tests verwendet, keine native Geräteabnahme behauptet.

```powershell
$env:PLAYWRIGHT_CHROME_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:BOULDER_FEED_TEST_PORT='5238'
node node_modules/@playwright/test/cli.js test --config playwright.boulder-feed.config.ts
```

Ein anderer Player-Entwurf nutzte lokal Port 5217. Der erste Testanlauf wurde deshalb abgebrochen, ohne dessen Server anzutasten. Die Feed-Konfiguration akzeptiert nun einen eigenen Testport und verwendet niemals einen unbekannten vorhandenen Server wieder. CI behält Standardport 5217.

## Grenzen

Gespeichert wird auf dem aktuellen Gerät, ohne geräteübergreifende Kontosynchronisierung. Quellmaterial, das bereits beim Upload zugeschnitten wurde, wird dadurch nicht rekonstruiert. Kein Merge, Deployment oder nativer Release in diesem Arbeitsschritt.