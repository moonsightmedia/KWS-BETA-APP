# Boulder-Videofeed – interaktiver Screenentwurf

Visuelle These: Das vollständige Boulder-Video trägt die Ansicht; vertraute weiße KWS-Controls und ein ruhiger dunkelblauer Fuß geben Orientierung. Grün kennzeichnet ausschließlich eigene Auswahl.

Inhalt: bildschirmfüllender Feed → Projekt/Kommentare/Track → Name/Grad/Bereich → direkt bedienbare Sterne und Wiedergabe. Desktop hält das Hochkantvideo mittig und ergänzt Vor/Zurück.

Interaktion: Das Video folgt dem vertikalen Wischen und rastet beim Loslassen weich ein; horizontales Ziehen ausschließlich auf den Sternen bewertet erst beim Loslassen. Kurzes Tippen auf die freie Videofläche pausiert/startet nach280ms. Zwei nahe Tipps innerhalb dieser Zeit blenden stattdessen das Layout aus oder wieder ein, ohne Pausezustand oder Projektstatus zu verändern. Die Augen-Aktion bleibt als Alternative; ein kleiner Augenschalter stellt die Bedienung wieder her. Das Video bleibt auch ausgeblendet per Tippen/Wischen bedienbar. Wischen, Gestenabbruch, Hintergrundwechsel und andere Ansichten verwerfen ausstehende Tipps. Panels pausieren das Video und erhalten den aktuellen Boulder. Reduced Motion wechselt ohne die Schiebebewegung.

## Start

```powershell
node node_modules/vite/bin/vite.js --config docs/design/boulder-video-feed/vite.config.ts
```

Öffnen: http://127.0.0.1:5214/docs/design/boulder-video-feed/index.html

## Umfang

- Linke freie Videohälfte350ms gedrückt halten:0,5×; rechte Hälfte:2×. Nur eine kompakte Geschwindigkeitsanzeige bleibt sichtbar. Loslassen stellt ursprüngliches Tempo, Pausezustand und Layout wieder her. Ein pausiertes Video spielt für die Dauer des Haltens. Pfeiltasten links/rechts halten ist die Tastaturalternative; Escape beendet. Swipe vor der Halteschwelle, Sterne und andere Controls bleiben getrennt.
- Drei reale, öffentlich lesbare Video-/Bildquellen der App; Namen/Grade aus öffentlicher Abfrage. Sektoren, Bewertungen, Kommentare und persönliche Zustände sind ausdrücklich Beispieldaten.
- Projekt setzen/entfernen; 1–5 Sterne per Ziehen, Tippen oder Tastatur; Kommentarentwurf und moderierter Beispielversand; heutiges Tracking mit Versuch/Top/Flash, Versuchen und Notiz.
- Gemeinsame Appfilter: Neu, Gespeichert, Auch abgeschraubte, Grade 1–8/?, Grifffarben und Hallenbereiche mit Mehrfachauswahl; dieselben sechs Sortierungen. Zurück führt zur isolierten Karten-/Rasterübersicht, Videos öffnet den Feed wieder. Zwei Beispiele hängen, eines ist im Beispiel abgeschraubt; die persönliche Merkliste ist ebenfalls ein Beispieldatensatz.
- Qualitätswahl HD/SD/Low mit echten vorhandenen Medienquellen; Startqualität über die gemeinsame Verbindungs-/Datensparlogik. Ein Wechsel erhält Wiedergabeposition und Pause. Keine feste SD-Stufe mehr.
- Kommentare öffnen mobil mit etwa56% Bildschirmhöhe; Tracking richtet sich kompakt nach seinem Inhalt und zeigt die optionale Notiz erst nach Aufklappen. Lange Inhalte scrollen innen bei festen Aktionen. Der obere Videoausschnitt bleibt ohne Blur sichtbar. Die bisherigen pauschalen92%-Sheets sind für diese kurzen Interaktionen abgelöst.
- Der Feed hält höchstens das aktive und die zwei benachbarten Videoelemente vor. Nur das aktive spielt; entfernte Nachbarn werden gestoppt. Derselbe DOM-Knoten bleibt beim Einrasten erhalten, statt das Video hart neu aufzubauen.
- Der Name öffnet eine vollständige Detailvorschau statt des bisherigen Info-Sheets. Sie folgt der bestehenden Detailkomposition mit Boulder-Kopf, Medium und Info/Track/Beta; dieselbe Vorschau öffnet auch aus Liste/Raster. Zurück und Browser-Zurück erhalten den Einstieg, Filter, Sortierung, Videoposition und Pausenzustand. Projekt, Bewertung, Kommentare und Track teilen den Zustand mit dem Feed.
- Die Seitenaktionen haben keine dauerhaften Textschilder und keine weißen Kacheln mehr. Die sichtbare Kommentarzahl steht in der Kommentarblase; Projekt bekommt bei Auswahl ein Häkchen, Tracking zeigt das Ergebnissymbol. Zugängliche Namen und 44px-Touchflächen bleiben erhalten.
- Alles bleibt im Arbeitsspeicher dieser Vorschau. Die Hash-Routen sind ausschließlich lokale Entwurfsnavigation; die produktive Detailseite wird nicht geladen oder verändert. Keine Anmeldung, API-Schreibaktionen oder Kontoänderungen. Neuladen setzt persönliche Beispielzustände zurück.
- Gemeinsame KWS-Komponenten: Button, Input, Dialog, DifficultyBadge, BoulderFilterPanel/Controls, SectorFilterOptions, BoulderSortPanel und DropdownMenu; zentrale CSS-Tokens, lokale Appfonts und die bestehenden Lucide-Symbole für Projekt und Tracking.
- Eigenständige Vite-Konfiguration ohne produktive Versions-/Release-Plugins. Kein Bestandteil des regulären App-Einstiegs.

## QA-Inventar

Loop 1: Feed und Kontrollflächen bei 375/768/1280/1920px; unbeschnittenes Video, Kontrast, Typografie, 4/8/12px, 44px-Ziele, Kopf/Fuß und Panelgrenzen.

Loop 2: Projekt an/aus, Sterne erst nach Loslassen, Abbruch unverändert, Video vor/zurück und Zustandsbehalt, Kommentar inkl. ausstehender Freigabe/Entwurfserhalt, Tracking und Flash-Versuchssperre, Filter-Leerzustand/Reset, Panel/Escape/Fokusrückkehr, Pause, Wiedergabe/Seek und Reduced Motion.

Dies ist eine Ansicht zur gemeinsamen Abstimmung, keine Backend- oder native Geräteabnahme. Screenshotbelege und Prüfergebnis werden unter `output/video-feed/` abgelegt.

Die vom Nutzer ebenfalls angesprochenen hohen Onboarding-Sheets gehören zum anschließenden globalen UI-Schritt. In diesem Entwurf wurden keine Onboarding- oder globalen Dialogkomponenten verändert.
