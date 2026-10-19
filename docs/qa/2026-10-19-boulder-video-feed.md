# Dritte Boulderansicht „Videos“ – Integration, 19.10.2026

Die freigegebene Ansicht ist in die echten Boulderübersichten integriert.
Liste, Grid und Video teilen die jeweilige Auswahl. Der Feed zeigt nur Boulder
mit Beta und übernimmt die bestehende Reihenfolge einschließlich der
Bereichsgruppen im angemeldeten Bereich. Die Ansicht wird mit der bisherigen
lokalen Ansichtsvorliebe gespeichert; Zurück führt zum vorherigen Listen-/Gridmodus.

## Verhalten und Daten

- Der Name öffnet die bestehende `/boulders/:id`-Route. `BoulderRouteContinuity`
  hält den Feed montiert, pausiert ihn und erhält Auswahl, Videoposition und Fokus.
- Projektmarkierungen, Bewertungen, Kommentare und Tagestracking verwenden die
  vorhandenen Community-Hooks und dieselben Query-Keys wie Detail und Statistik.
  Projektänderungen erhalten bestehende Erfolge, Versuche, Notizen und Favoriten.
  Eine reine Projektmarkierung erzeugt keinen gezählten Kletterversuch.
- Ein Tracking-Erfolg wird erst nach Tages- und Status-Schreibvorgang sowie
  aktualisierten Abfragen bestätigt. Teilfehler erhalten den Entwurf; Wiederholen
  aktualisiert denselben Tag. Flash schreibt genau einen Versuch.
- Kommentare bleiben im bestehenden Moderationsablauf. Eigene ausstehende
  Kommentare erscheinen im Sheet, erhöhen den öffentlichen Iconzähler aber nicht.
  Lade-/Fehlerzustände werden von einer echten Null unterschieden.
- Gäste erhalten Videos, Filter, Sortierung und echte Details. Persönliche
  Aktionen werden nicht angeboten; die vorhandenen Auth-/RLS-Grenzen bleiben.
- Einzeltipp pausiert/startet, Doppeltipp schaltet das Layout. Links/rechts halten
  spielt temporär mit0,5×/2× und zeigt ausschließlich das Tempo. Loslassen und
  Abbruch stellen ursprüngliches Tempo, Pause und Ansicht wieder her.
- Das aktive und höchstens zwei benachbarte Medien bleiben vorbereitet. Nur das
  aktive spielt. Filter, Sheets, Detailbesuch und Hintergrund pausieren die Medien;
  ausstehende Gesten und Timer werden verworfen. Route-Swipe und Pull-to-Refresh
  übernehmen keine Feedgeste.
- HD/SD/Low werden nur aus tatsächlich verfügbaren Quellen gewählt. Ein manueller
  Wechsel erhält Position und Pause. Fehler verwenden eine vorhandene niedrigere
  Stufe und danach einen Wiederholungsweg. Anhaltende anfängliche Ladefehler haben
  ebenfalls ein Zeitlimit. Die vorhandenen zustimmungsabhängigen Monitoringwege
  werden verwendet; keine Video-URLs oder Nutzereingaben werden hinzugefügt.
- Externe YouTube-/Vimeo-Betas zeigen ein Vorschaubild und führen zum bestehenden
  Detailplayer mit dessen unveränderter Einwilligung. Native Tempo-/Qualitätsgesten
  werden für einen fremden Iframe nicht vorgetäuscht.
- Der Demo-Hinweis behält seine gemessene Höhe und wird nicht vom Feed überlagert.

## Umsetzung

- `src/components/boulder/BoulderVideoFeed.tsx` und `.css`: freigegebene Komposition,
  begrenztes Medienfenster, direkte Detailnavigation und vorhandene KWS-Primitives.
- `BoulderFeedPanels.tsx`: kompakte Kommentare/Tracking/Sortierung mit festen
  Aktionen, innerem Scrollbereich, Fehlerbehalt und explizitem Verwerfenschutz.
- `src/hooks/useBoulderFeedGestures.ts`: gemeinsamer Besitzer für Tipp, Doppeltipp,
  Halten, Swipe, Maus und Tastatur; Reduced Motion und Fokusverlust berücksichtigt.
- `useBoulderFeedPlayback.ts`: stabile Medienreferenzen, echte Qualitätsquellen,
  Positionsbehalt, begrenzte Fallbacks, Wiedergabestatus und Monitoring.
- `useBoulderFeedCommunity.ts`: vorhandene Abfragen und Schreibwege; kein neues
  Backend, keine Migration und keine zweite persönliche Datenhaltung.
- `src/pages/Boulders.tsx`, `Guest.tsx`: dritte Auswahl und gemeinsame Filter;
  der Gastbereich erhält auch das gemeinsame kompakte Grid neben der Liste.
- `AppNavigation.tsx`: neutraler Wrapper zum Ausblenden der normalen Navigation
  ausschließlich während des aktiven Feeds. Details erhalten ihre normale Navigation.

## Verifikation

**10 Playwright-Integrationstests bestanden.** Die echten Seiten, Router-Retention
und Community-REST-Hooks laufen gegen abgefangene lokale Testantworten; reale
Konten und Produktionsdaten wurden dabei nicht verändert.

1. Drei Ansichten, Filterübernahme, echter Detailbesuch und Rückkehr mit Pause,
   Position und Fokus.
2. Projekt erhält Top/Favorit/Notiz; Bewertung und moderierter Kommentarversand.
3. Zweiter Tracking-Schreibvorgang schlägt fehl: Fehler/Entwurf bleiben; Retry
   erzeugt keinen zweiten Tagesdatensatz.
4. Echte Chromium-Touchfolgen für Tippen/Doppeltippen/Halten/Swipe sowie Seek und
   Qualitätswechsel ohne Verlust der Pauseposition.
5. Gastzugriff ohne persönliche Aktionen oder Schreibaufrufe.
6. Sortierung, Video-Leerzustand/Reset, gespeicherte Ansicht und Demo-Abstand.
7. Verwerfen/Weiterbearbeiten und Flash mit gesperrtem Versuchszähler.
8. Medienfehler: verfügbare kleinere Qualität, vollständiger Fehler und Retry.
9. Externe Beta öffnet den echten Detailplayer samt Einwilligung vor Iframe-Laden.
10. Zwei gerenderte visuelle Loops bei375/768/1280/1920: normale Übersicht,
    Videofeed, Kommentare, aufgeklappte Track-Notiz, Filter sowie Gast-Grid/-Liste.
    Feste Aktionen, kein horizontaler Überlauf, vollständige Viewportbreite.

```powershell
# Optional, falls lokal kein passender Playwright-Browser installiert ist:
$env:PLAYWRIGHT_CHROME_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
node node_modules/@playwright/test/cli.js test --config playwright.boulder-feed.config.ts
```

Belege: `output/video-feed/integration/loop*.png`, `review-loop1.png`,
`review-loop2.png`. Bei der Sichtprüfung wurde die Kommentarzahl in die Blase
zurückgesetzt und die feste Ebene um die klassische Scrollleistengasse erweitert.

Gezieltes ESLint der produktiven Änderungen: **0 Fehler, 0 Warnungen**.
`git diff --check` erfolgreich. Der vollständige App-Einstieg wurde mit React/Vite
nach `output/video-feed/app-build` gebaut, ohne Versions-/Release-Plugins oder
Android-Asset-Schreibvorgänge. Vorhandene Hinweise zu Bundlegröße, Browserslist und
Public-Fonts im isolierten Build bleiben unabhängig von diesem Feature.

## Abgrenzung

Kein Deployment, kein nativer Release und keine neue native Geräteabnahme.
Die Tests belegen lokale Browserintegration und bestehende API-Verträge mit
isolierten Daten; sie ersetzen keine Abnahme auf iOS/Android oder einen
Schreibtest mit einem echten Produktionskonto. Globale Sheet- und Onboarding-
Änderungen bleiben außerhalb dieses Auftrags. Der isolierte Screenentwurf bleibt
unverändert als historische Abstimmung erhalten.

Für den GitHub-Upload wurde der Remote erneut frisch gefetcht. Der Featurebranch `codex/boulder-video-feed` basiert auf `origin/main` (`daf0cbf`), 17 Commits nach dem ursprünglichen lokalen Ausgangsstand. Die Feed-Änderungen wurden isoliert und ohne Konflikte übernommen; neue Filterpersistenz und mobile Verbesserungen bleiben enthalten. Fremde laufende Player-/Onboarding-Änderungen verbleiben im ursprünglichen Arbeitsbaum. Der Web-CI-Prüflauf führt zusätzlich die zehn Feed-Integrationstests aus. Der Upload erfolgt als Pull Request, ohne Merge oder Deployment.
