# Videofeed im Vollbild und reguläre Bedienungseinstellungen

Nutzerpräzisierung vom 20.10.2026. Basis: origin/main13dd14c; bestehender PR61 wird auf die korrigierte Umsetzung aktualisiert.

## Ergebnis

Das Video füllt die gesamte Feedfläche hinter den überlagerten Controls wie bei Reels. object-fit: cover und inset:0; keine für Kopf, Fuß oder Aktionen reservierten Medienränder. Dezente Verläufe tragen die Lesbarkeit. Ausblenden, Pause, Halten und Qualitätswechsel verändern die Geometrie nicht. Auf breiten Bildschirmen bleibt die bestehende zentrierte Reels-Bühne erhalten.

Die Doppeltipp-Funktion liegt in der regulären App unter Profil & Einstellungen → Einstellungen → Bedienung → Video-Feed. Die neue Route /profile/interaction verwendet dieselbe Auth-Grenze und denselben Seitenrahmen wie die bestehenden Einstellungen. Eine kompakte Zeile „Doppeltipp auf das Video“ mit dem gemeinsamen Select bietet Aus / Als Projekt speichern / Layout ausblenden. Aus ist der Standard. Kein Zahnrad für Bedienung im Feed, kein Einstellungs-Sheet, keine große Optionskarte. Das bisherige Feed-Dialogmodul und dessen spezielle Styles sowie die Messlogik für reservierte Medienflächen sind entfernt.

Die Auswahl wird lokal pro Gerät und Backend gespeichert und wirkt nach der Rückkehr in den Feed. Projekt-Doppeltipp setzt nur die Markierung und erhält Top/Favorit/Notiz/Versuche; wiederholtes Doppeltippen entfernt sie nie. Der ausdrückliche Projektbutton bleibt ein Umschalter. Ein gespeicherter Projektmodus wirkt im Gastbereich wie Aus. Ohne Zusatzaktion reagiert Einzeltippen sofort, mit aktivierter Aktion bleibt das280ms-Unterscheidungsfenster. Auge, vertikale Navigation, Tempo-Halten und Qualität bleiben erhalten.

## Verifikation

14 Integrationstests erfolgreich (29,5s). Die Einstellungen werden dabei über die echte Profilseite und deren neuen Eintrag Bedienung geöffnet; das echte Select ändert die Auswahl, Zurück führt wieder ins Profil, anschließend wird der gespeicherte Modus im tatsächlichen Feed geprüft. Default Aus, Layout, idempotentes Projekt, Gastschutz, Touchgesten, Filter/Detailrückweg, Qualitäts-/Medienfehler, Tracking-Teilfehler, Kommentare und Lazy-Einstieg bestanden.

Zwei visuelle Schleifen bei375/768/1280/1920: Feed im Vollbild, Kommentare/Tracking, reguläre Listen/Grid, Einstellungen als kompakte Zeile geschlossen und Auswahlmenü geöffnet. Videoelement-Geometrie entspricht exakt der ganzen Reel-Seite; object-fit ist cover. Select44px hoch, kein horizontaler Überlauf, keine Browser-JS-Fehler. Kontaktbögen output/video-feed/controls-review-loop1.png und controls-review-loop2.png visuell geprüft. Neue mobile Gegenüberstellung output/video-feed/bedienung-vorschau-v2.png. Alle Bildbelege verwenden eine erkennbare Testaufnahme.

Gezieltes ESLint ohne Befund, git diff --check erfolgreich. Vollständiger Vite-App-Einstieg ohne Versions-/Release-Plugins/Public-Kopie erfolgreich. Vorhandene Bundle-/Browserslist-/Font-Hinweise unverändert. Keine echten Produktionsdatenmutationen, keine native Geräteabnahme.

```powershell
$env:PLAYWRIGHT_CHROME_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:BOULDER_FEED_TEST_PORT='5238'
node node_modules/@playwright/test/cli.js test --config playwright.boulder-feed.config.ts
```

Der eigene Testport schützt parallel laufende Player-Vorschauen. Feed-Tests verwenden niemals einen unbekannten vorhandenen Server wieder; CI behält Standardport5217.

## Abgrenzung

Keine neue Abhängigkeit, keine Backendmigration und keine Kontosynchronisierung der Gerätepräferenz. Historischer Prototyp, normaler Detailplayer und fremde lokale Arbeiten bleiben unverändert. PR-Aktualisierung ohne Merge, Deployment oder nativen Release.