# Videofeed: stabile Übergänge und ruhiges Puffern

Basis: origin/main f7bcb6a (veröffentlichter PR61), eigener Branch codex/boulder-feed-smooth-transitions. Der vorherige Arbeitsbaum war sauber; frischer Fetch vor Änderung, keine fremden Änderungen übernommen.

## Befund und Umsetzung

Nachbarvideos verwendeten Cover, das aktive Video einen skalierten Contain-Layer. Beim Aktivieren wurde außerdem die Bildgröße auf Vollbild zurückgesetzt. Das erzeugte sichtbare Formatwechsel. Nun erhalten beide Nachbarn dieselbe gewählte Bildgröße, die auch beim Videowechsel bestehen bleibt. Medien sind auf ihre eigene Seite begrenzt, damit ein vergrößertes Video nicht in den Nachbarn zeichnet. Keyed Videoelemente bleiben beim Übergang erhalten.

Der globale Kopf mit Zurück, Sortierung, Auge, Filter und Qualitäts-/Bildgrößenmenü liegt außerhalb der bewegten Seiten. Bouldername, Bewertung, Kommentare, Tracking und Zeitleiste wischen mit ihrem Boulder. Alle globalen Controls verschwinden weiterhin bei ausgeblendetem Layout bzw. Halte-Tempo; Tastaturfokus nach dem Einblenden bleibt erhalten. Das entspricht der im Gespräch empfohlenen Aufteilung.

Das nächste Video lädt Bilddaten statt nur Metadaten vor und dekodiert einen ersten Frame, ohne abzuspielen. Maximal drei Videoelemente, nur eines spielt. Eine echte Pufferlücke pausiert die Wiedergabe bis etwa1,5Sekunden zusammenhängender Puffer vorhanden sind; für2× entsprechend mehr, bei kurzem Rest genügt der Rest. Die Ladeanzeige erscheint erst nach300ms und bleibt dann mindestens450ms sichtbar. Wiederholte Waiting-/Progress-Ereignisse setzen den Fallback-Timer nicht zurück. Drei tatsächliche Wiedergabeengpässe innerhalb15Sekunden schalten zur nächstkleineren verfügbaren Qualität; Seek-/Vorladeereignisse zählen nicht. Pause, Panels, Hintergrund und Fehler räumen den Ladehinweis auf. Qualitätswechsel erhalten Position und gewählte Bildgröße.

## Verifikation

23 Playwright-Integrationstests erfolgreich,56,8Sekunden. Bestehende19 Prüfungen bleiben erhalten. Vier neue Regressionen prüfen:

- echte Touch-Swipes vorwärts/rückwärts, Bildgröße von aktiver und benachbarter Seite, stabile Headergeometrie/DOM-Identität, mitwandernder Fuß, Clipping und genau ein spielendes Video;
- kurze simulierte Pufferlücke ohne Ladehinweis sowie mehrere unzureichende Teilpuffer ohne stückweises Abspielen;
- wiederholte simulierte Wiedergabeengpässe mit echter Qualitätsumschaltung und erfolgreicher Wiederaufnahme;
- echten Qualitätsdownload über Chromium-Netzwerkdrosselung (150ms Latenz,8KiB/s) mit anschließend stetiger Wiedergabe und höchstens einem sichtbaren Ladezyklus.

Zwei gerenderte QA-Schleifen bei375/768/1280/1920px: Originalgröße und Vollbild jeweils mitten im Swipe, danach eingerastet, dazu Menü, Kommentare, Tracking, Filter und Profileinstellungen. Header bleibt in allen acht Übergängen exakt stehen. Keine Browser-JS-Fehler und kein horizontaler Überlauf. Visuell geprüfte Kontaktbögen: output/video-feed/transition-review-loop1.png und transition-review-loop2.png. Einzelbilder: integration/loop{1,2}-{width}-transition.png. Bilder verwenden das erkennbare Testvideo, keine Produktionsdaten.

Gezieltes ESLint ohne Befund, git diff --check erfolgreich. Vollständiger Vite-App-Build mit3342Modulen in16,09Sekunden erfolgreich (ohne Versions-/Release-Plugins oder gesamte Public-Kopie). Bekannte Font-/Browserslist-/Bundlehinweise unverändert.

```powershell
$env:PLAYWRIGHT_CHROME_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:BOULDER_FEED_TEST_PORT='5239'
node node_modules/@playwright/test/cli.js test --config playwright.boulder-feed.config.ts
```

## Grenzen

Native iOS-/Android-Geräte sind nicht abgenommen; Browser dürfen Preload-Hinweise selbst begrenzen. Der Puffer verhindert kurze Start-Stopp-Zyklen, ersetzt aber keine verfügbare Bandbreite. Bei dauerhaften Engpässen bleibt der vorhandene Qualitätsfallback zuständig. Keine Backendmigration, neue Abhängigkeit oder Produktionsdatenmutation. Der historische Prototyp und der normale Detailplayer bleiben unverändert.

Technische Referenzen: [MDN: Buffered TimeRanges](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/buffering_seeking_time_ranges), [MDN: waiting](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/waiting_event), geprüft20.10.2026.
