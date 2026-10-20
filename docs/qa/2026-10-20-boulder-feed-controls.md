# Videofeed im Vollbild und reguläre Bedienungseinstellungen

Nutzerpräzisierung vom 20.10.2026. Basis: origin/main13dd14c; bestehender PR61 wird auf die korrigierte Umsetzung aktualisiert.

## Ergebnis

Das Video füllt die gesamte Feedfläche hinter den überlagerten Controls wie bei Reels. Bildschirmfüllende Startansicht und inset:0; keine für Kopf, Fuß oder Aktionen reservierten Medienränder. Dezente Verläufe tragen die Lesbarkeit. Ausblenden, Pause, Halten und Qualitätswechsel verändern die Geometrie nicht. Auf breiten Bildschirmen bleibt die bestehende zentrierte Reels-Bühne erhalten.

Die Doppeltipp-Funktion liegt in der regulären App unter Profil & Einstellungen → Einstellungen → Bedienung → Video-Feed. Die neue Route /profile/interaction verwendet dieselbe Auth-Grenze und denselben Seitenrahmen wie die bestehenden Einstellungen. Eine kompakte Zeile „Doppeltipp auf das Video“ mit dem gemeinsamen Select bietet Aus / Als Projekt speichern / Layout ausblenden. Aus ist der Standard. Kein Zahnrad für Bedienung im Feed, kein Einstellungs-Sheet, keine große Optionskarte. Das bisherige Feed-Dialogmodul und dessen spezielle Styles sowie die Messlogik für reservierte Medienflächen sind entfernt.

Die Auswahl wird lokal pro Gerät und Backend gespeichert und wirkt nach der Rückkehr in den Feed. Projekt-Doppeltipp setzt nur die Markierung und erhält Top/Favorit/Notiz/Versuche; wiederholtes Doppeltippen entfernt sie nie. Der ausdrückliche Projektbutton bleibt ein Umschalter. Ein gespeicherter Projektmodus wirkt im Gastbereich wie Aus. Ohne Zusatzaktion reagiert Einzeltippen sofort, mit aktivierter Aktion bleibt das280ms-Unterscheidungsfenster. Auge, vertikale Navigation, Tempo-Halten und Qualität bleiben erhalten.

## Verifikation

19 Integrationstests erfolgreich (42,4s). Die Einstellungen werden dabei über die echte Profilseite und deren neuen Eintrag Bedienung geöffnet; das echte Select ändert die Auswahl, Zurück führt wieder ins Profil, anschließend wird der gespeicherte Modus im tatsächlichen Feed geprüft. Default Aus, Layout, idempotentes Projekt, Gastschutz, Touchgesten, Filter/Detailrückweg, Qualitäts-/Medienfehler, Tracking-Teilfehler, Kommentare und Lazy-Einstieg bestanden.

Zwei visuelle Schleifen bei375/768/1280/1920: Feed im Vollbild, Kommentare/Tracking, reguläre Listen/Grid, Einstellungen als kompakte Zeile geschlossen und Auswahlmenü geöffnet. Videoelement-Geometrie entspricht exakt der ganzen Reel-Seite; die sichtbare Bildfläche deckt die gesamte Bühne ab. Select44px hoch, kein horizontaler Überlauf, keine Browser-JS-Fehler. Kontaktbögen output/video-feed/controls-review-loop1.png und controls-review-loop2.png visuell geprüft. Neue mobile Gegenüberstellung output/video-feed/bedienung-vorschau-v2.png. Alle Bildbelege verwenden eine erkennbare Testaufnahme.

Gezieltes ESLint ohne Befund, git diff --check erfolgreich. Vollständiger Vite-App-Einstieg ohne Versions-/Release-Plugins/Public-Kopie erfolgreich. Vorhandene Bundle-/Browserslist-/Font-Hinweise unverändert. Keine echten Produktionsdatenmutationen, keine native Geräteabnahme.

```powershell
$env:PLAYWRIGHT_CHROME_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:BOULDER_FEED_TEST_PORT='5238'
node node_modules/@playwright/test/cli.js test --config playwright.boulder-feed.config.ts
```

Der eigene Testport schützt parallel laufende Player-Vorschauen. Feed-Tests verwenden niemals einen unbekannten vorhandenen Server wieder; CI behält Standardport5217.

## Abgrenzung

Keine neue Abhängigkeit, keine Backendmigration und keine Kontosynchronisierung der Gerätepräferenz. Historischer Prototyp, normaler Detailplayer und fremde lokale Arbeiten bleiben unverändert. PR-Aktualisierung ohne Merge, Deployment oder nativen Release.
## Ergänzung: Kurzer Pinch mit zwei festen Bildgrößen

Die Nutzerpräzisierung ersetzt den stufenlosen Detailzoom: Eine kurze Zwei-Finger-Geste schaltet zwischen Originalgröße (vollständiges Quellbild) und Vollbild (Bühne füllen). Zusammenziehen wählt Originalgröße, Auseinanderziehen Vollbild. Bereits6% bzw. mindestens10px Änderung des Fingerabstands genügen. Das Bild folgt während der Geste begrenzt den Fingern; beim Loslassen rastet es über160ms ein. Es verbleibt kein Zwischenzoom und kein verschobener Ausschnitt. Gemeinsames Verschieben oder kleines Zittern schaltet nicht um. Reduced Motion wechselt ohne Animation.

Standard bleibt Vollbild. Eine neue Aufnahme startet wieder so; Qualitätswechsel erhalten die gewählte Stufe, Wiedergabeposition und Pause. Technisch wird die vollständig eingepasste Quelle transformiert, damit Originalgröße zuvor abgeschnittene Ränder wirklich zurückbringt. Keine neue Abhängigkeit und kein erneutes Laden zum Größenwechsel.

Der gemeinsame Gestenbesitzer trennt Ein-Finger-Tipp/Halten/Swipe von zwei Fingern. Der verbleibende Finger wird bis zum vollständigen Loslassen nicht als neue Aktion behandelt. Abbruch, dritter Finger, Panel und Hintergrund beenden die Geste. Zweite Kontakte auf der Sternleiste können keine Bewertung abschicken. Unter Bildgröße im vorhandenen Wiedergabemenü stehen nur Originalgröße / Vollbild, auch bei nur einer Videoqualität. Plus wählt Vollbild, Minus Originalgröße,0 Vollbild. Strg/Mausrad/Trackpad wählt je Geste eine Stufe. Browser/App werden nicht mitgezoomt; die Geste gilt nur auf der direkten Videobühne. Externe Player behalten den Detailweg.

Fünf Zoom-Integrationstests: kurze14px-Pinches in beide Richtungen trotz geringer Vorschauskalierung; Restfinger ohne Swipe/Menü/Schreibvorgang; Qualitätswechsel und Reset beim Video-Wechsel; touchCancel und dritter Finger einschließlich Rücknahme/Feedback-Cleanup; Übernahme während Halte-Tempo ohne ungewolltes Play/Pause; Menü/Tastatur/Strg-Rad und Querformat-Neuberechnung; Zittern, gemeinsames Verschieben und Reduced Motion; zweite Finger an Bewertungscontrols ohne Schreibvorgang. Bestehende14 Tests ebenfalls erfolgreich, final19/19. Zwei visuelle Schleifen375/768/1280/1920 zusätzlich mit Originalgröße, Vollbild und geöffnetem Bildgrößenmenü geprüft. Belege output/video-feed/snap-review-loop1.png, snap-review-loop2.png und snap-review-menu.png sowie integration/loop*-zoom-*.png. Vollständiger App-Build3342Module16,07s erfolgreich; gezieltes ESLint ohne Befund.

Referenz zur Gestenbehandlung: MDN Pointer Events/Pinch zoom gestures und touch-action (20.10.2026). Native Geräteabnahme bleibt ausstehend; browserseitige Touchfolgen sind belegt.
