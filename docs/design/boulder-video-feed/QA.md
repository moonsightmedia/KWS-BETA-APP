# Screenentwurf: Verifikation am 19.10.2026

Geprüft wird der eigenständige Entwurf, keine produktive Integration.

## Gerenderte Prüfung

Zwei getrennte Sichtprüfungen bei 375×812, 768×1024, 1280×900 und 1920×1080:

1. Feed, vollständiges 720×1280-Video mit `object-fit: contain`, Titel/Grad,
   Bedienflächen, Radien, Kontrast, lokale Schriften und Viewportgrenzen.
2. Ausgewähltes Projekt, vier Sterne, geöffnete Kommentare und Tracking;
   mobile randbündige Sheets, begrenzte Desktopdialoge, feste Kopf-/Fußbereiche.

Alle acht abschließend geprüften Panelzustände passen in den Viewport und
pausieren das Video. Kopf, Seitenaktionen und Videofuß passen an allen vier
Breiten ohne horizontalen Überlauf. Die Screenshots wurden betrachtet;
kurzzeitige Bestätigungsmeldungen sind vor den endgültigen Aufnahmen abgeklungen.
Die 44px großen Stern- und Aktionsflächen sowie 4/8/12px-Radien bleiben erhalten.

Belege: `output/video-feed/loop1-*-feed.png`, `loop2-*-{feed,comments,track}.png`,
`layout-qa.json`, `state-qa.json` und `screenentwurf.png`.

## Interaktionen

- Projektmarkierung an/aus; individuelle Sterneauswahl per Pointer und Tastatur.
- Echte Chromium-Touch-Ereignisse: Bewertung bleibt während des Ziehens
  ungespeichert, Loslassen übernimmt vier Sterne; Touch-Abbruch erhält die
  vorherige Zwei-Sterne-Bewertung. Vertikal weiter/zurück erhält den Wert.
- Kommentar eingeben, nur im Entwurf absenden und „Wartet auf Freigabe“ anzeigen;
  nicht gesendeter Text bleibt nach Schließen/Öffnen erhalten.
- Tracking: Flash begrenzt auf einen Versuch, Übernehmen aktualisiert das
  zugehörige Feed-Control. Das Öffnen selbst trägt keinen Erfolg ein.
- Filter ohne passende Projektvideos zeigen den Leerzustand; Zurücksetzen
  bringt die drei Beispielvideos zurück.
- Escape schließt genau das Panel und gibt den Fokus an dessen Auslöser zurück.
  Kein gleichzeitiger Rücksprung zur Übersicht. Erneutes Öffnen funktioniert auch
  mit reduzierter Bewegung; der Dialog hat dann keine Eintrittsanimation.
- Keine erfassten JavaScript-Ausnahmen im überprüften Browserlauf.

Die Prüfung hat einen Escape-Konflikt und einen beim Wechsel zu Reduced Motion
verbleibenden Dialoghintergrund aufgedeckt. Beide sind im eigenständigen Entwurf
korrigiert, die betroffenen Abläufe erneut bestanden. Frühere Zwischenläufe sind
keine bestandenen Endprüfungen.

## Technische Prüfung und Grenzen

Der isolierte Vite-Produktionsbuild ist erfolgreich. ESLint meldet keine Fehler
und eine Fast-Refresh-Warnung für das bewusst eigenständige React-Einstiegsmodul.
`git diff --check` ist fehlerfrei.

Die Vorschau importiert keinen Auth-/Backendclient und schreibt ausschließlich
in ihren React-Arbeitsspeicher. Medien werden öffentlich über HTTPS geladen;
keine Originalvideos wurden heruntergeladen oder als neue Binärdateien abgelegt.
Die anfänglich gefundenen alten Medienverweise aus der lokalen Konfiguration
lieferten 404 und wurden durch öffentlich lesbare Medien des aktuellen
Produktionsbackends ersetzt. Zugangswerte wurden nicht ausgegeben oder gespeichert.

Sektoren, Bewertungen und Communitydaten sind Beispiele. Filter sind exemplarisch;
der vollständige Katalog, der bestehende Tracking-Datenweg, API-Fehlerfälle,
native App-Lebenszyklen und echte Smartphone-/Screenreader-Abnahme gehören erst
zur späteren Implementierung. Es wurde nichts veröffentlicht.

## Überarbeitung: App-Icons, vollständige Filter und Qualitätswahl

Die erste vereinfachte Filtervariante und die feste SD-Medienquelle sind abgelöst.
Projekt verwendet Target, der Tracking-Einstieg Plus und die Ergebnisse die
vorhandenen Plus/BadgeCheck/Zap-Symbole. Kommentare verwenden MessageSquare.
Die Vorschau rendert nun die tatsächlichen gemeinsamen Appkomponenten für
Schnellfilter, Grad-Mehrfachauswahl inklusive ?, Farbauswahl, Hallenbereiche und
alle sechs Sortierungen. Die Daten bleiben Beispiele; ein drittes Video ist
als abgeschraubt geführt und erscheint erst mit entsprechendem Filter.

Qualitätswechsel tatsächlich im Browser nachgewiesen: SD720×1280 zu
HD1080×1920 behält 5,0 Sekunden und pausierte Wiedergabe; Wechsel während der
Wiedergabe zu Low360×640 behält etwa5,02 Sekunden und laufende Wiedergabe.
Die Menülabels versprechen keine von der Quelle unabhängige Auflösung.
Die Startauswahl verwendet die gemeinsame Netzwerk-/Datensparfunktion.

Zwei erneute visuelle Loops prüfen Feed/Qualitätsmenü/Filter sowie aktive Auswahl,
Sektorgruppen, Sortierung und Reset bei375/768/1280/1920px. Genau ein Filter-
Scrollbereich, erreichbare Fußaktionen, pausiertes Video und passende Panelgrenzen.
Filterkombination aus Grad5+6 und Grün ergibt einen Treffer; Gespeichert zeigt
das zweite Beispiel; Auch abgeschraubte ergibt drei; Name A–Z zeigt das korrekt
als abgeschraubt bezeichnete dritte Beispiel zuerst. Qualität und Filter behalten
ihre Auswahl bei den jeweiligen Panels. Kein fehlerhafter1/0-Videocounter im Leerzustand.

Belege der Überarbeitung: `output/video-feed/revision-*.png` und `revision-qa.json`.
Die älteren Screenshots dokumentieren den vorherigen Entwurf.

## Überarbeitung: Tippen, ruhiger Videomodus und kompakte Sheets

- Ein kurzes Tippen auf die freie Videofläche pausiert/startet, auch bei
  ausgeblendeten Bedienelementen. Die Augen-Aktion entfernt Kopf, Seitenaktionen,
  Beschriftungen, Bewertungs-/Wiedergabezeile und Bildverläufe. Ein44px großer
  Augenschalter bleibt erreichbar; Escape stellt die normale Ansicht wieder her.
- Echte Chromium-Touch-Bewegung zieht den Feed während der Geste um230px, ohne
  vorher den aktiven Boulder zu wechseln. Loslassen startet das240ms-Einrasten.
  Danach bleibt der vorbereitete Videoknoten erhalten; nur das aktive Video spielt.
  Höchstens drei Videoelemente, weiter entfernte Knoten beim Entfernen pausiert.
  Eine kurze25px-Geste kehrt zum gleichen Video zurück. Auch ohne Bedienelemente
  funktionieren Wechsel und Pause/Fortsetzen.
- Neue Sichtprüfung bei375/768/1280/1920: Standardfeed, ausgeblendete Bedienung,
  Kommentare und Track. Bei375×812 sind Kommentare454,7px und Track448,7px hoch,
  jeweils etwa56% statt92%. Am Desktop Kommentare maximal480px; Tracking etwa436px.
- Zweite Sichtprüfung mit aufgeklappter Notiz und langem Beispielkommentar an
  allen vier Breiten: Inhalte scrollen innen, Senden/Speichern bleiben im Viewport.
  Die Notiz startet eingeklappt; Aufklappen vergrößert nur bei Bedarf.

Belege: `output/video-feed/motion-loop1-*.png`, `motion-loop2-*.png`,
`motion-drag.png`, `compact-qa.json`, `motion-state-qa.json`,
`motion-screenentwurf.png`. Frühere Screenshots zeigen die jeweils älteren Entwürfe.
Onboarding und globale Dialogimplementierung sind auf ausdrücklichen Nutzerwunsch
ein folgender Schritt; die neue Regel ist bereits in `docs/DESIGN.md` dokumentiert.

## Überarbeitung: Detailnavigation und dezente Seitenaktionen

Der Bouldername führt per lokalem Hash zur vollständigen Detailvorschau in der
bestehenden Info-/Track-/Beta-Komposition. Liste und Raster öffnen dieselbe
Vorschau. Der produktive Detailseiten-Code wird dabei nicht ersetzt oder geladen.

- Feed pausiert im Hintergrund. Rückkehr erhält denselben Videoknoten, 5s
  Position und vorherigen Pausenzustand; Fokus kehrt zum Namen zurück.
- Browser Zurück/Vorwärts, Escape, Detailtabs, verschachtelte Kommentar-/Track-
  Sheets sowie gemeinsame Projekt-/Bewertungs-/Trackingzustände geprüft.
- Kommentarzahl im Symbol, keine dauerhaften Beschriftungen oder weißen
  Aktionskacheln; Projektstatus mit Häkchen und mindestens44px große Touchflächen.
- Zwei visuelle Loops bei375/768/1280/1920: Feed und Detail; danach ausgewähltes
  Projekt, Track-Tab und kompakter Track-Dialog. Vollflächig deckender Hintergrund,
  keine horizontale Überbreite. Übergangsanimationen vor finaler Aufnahme beendet.
- Build erfolgreich, ESLint ohne Fehler; bekannte Fast-Refresh-Warnung am
  Standalone-Einstieg bleibt. Keine Browser-JavaScriptfehler.

Belege: `output/video-feed/detail-loop1-*.png`, `detail-loop2-*.png`,
`detail-review1.png`, `detail-review2.png`, `detail-qa.json`.

## Überarbeitung: Doppeltipp schaltet das Layout

- Zwei nahe Tipps auf die freie Videofläche innerhalb280ms schalten zwischen
  normaler und ruhiger Ansicht um. Die Wiedergabe und Projektmarkierung bleiben
  unverändert. Einzeltippen pausiert/startet nach Ablauf des Doppeltippfensters.
- Mit Chromium-CDP echte Touchfolgen geprüft: aus-/einblenden bei laufendem und
  pausiertem Video, auch direkt auf dem mittigen Playhinweis. Dieser ist bei
  normaler Pause dekorativ, damit er den zweiten Tipp nicht als Button abfängt.
- Ausstehende Tipps werden bei Swipe, Pointer-Abbruch und geöffneten Panels
  verworfen. Nach mehr als280ms tritt keine verspätete Pause auf. Maus-Doppelklick,
  Escape, Augen-Alternative und Reduced Motion ebenfalls geprüft.
- Zwei gerenderte Loops bei375/768/1280/1920: normale/ruhige Ansicht und danach
  Pause/ruhige Pause. Keine Bildverschiebung durch das Ausblenden. Keine JS-Fehler.
- Build und git diff --check erfolgreich. ESLint0Fehler, weiterhin eine bekannte
  Fast-Refresh-Warnung am Standalone-Einstieg. Keine native Geräteabnahme.

Belege: `output/video-feed/tap-loop1-*.png`, `tap-loop2-*.png`,
`tap-review1.png`, `tap-review2.png`, `tap-qa.json`.

## Überarbeitung: temporäres Tempo beim Gedrückthalten

- Echte Touchfolgen: links350ms halten ergibt playbackRate0,5, rechts2.
  Loslassen stellt1 beziehungsweise ein zuvor gesetztes0,75 wieder her.
  Während des Haltens sind Chrome und Augenschalter verborgen; nur das Tempo
  bleibt sichtbar. Vorherige ruhige Ansicht bleibt nach Loslassen ruhig.
- Pausiertes Video spielt während des Haltens und pausiert danach wieder.
  Ein vorheriger kurzer Tipp wird beim anschließenden Halten nicht verspätet
  ausgeführt. Halten löst beim Loslassen keinen Tipp oder Videowechsel aus.
- Pointer-Abbruch stellt Tempo wieder her. Fokusverlust-Handler ausdrücklich
  per Browserereignis geprüft: Tempo normal, Wiedergabe pausiert; erneuter Fokus
  stellt den normalen Wiedergabezustand her. Ein Headless-Tabwechsel erzeugte
  selbst keinen verlässlichen Fokuswechsel; keine native Geräteabnahme behauptet.
- Swipe vor Halteschwelle und Sternebewertung bleiben getrennt. Tastatur links/
  rechts halten, Loslassen, Escape ohne Katalogwechsel und Reduced Motion geprüft.
- Zwei visuelle Loops375/768/1280/1920:0,5×/2×, danach aus ruhiger Pause halten/
  loslassen. Gemessene Videogeometrie vorher/nachher unverändert. Keine JS-Fehler.
- Vite-Build, ESLint und git diff --check erfolgreich; weiterhin eine bekannte
  Fast-Refresh-Warnung am Standalone-Einstieg.

Belege: `output/video-feed/hold-loop1-*.png`, `hold-loop2-*.png`,
`hold-review1.png`, `hold-review2.png`, `hold-qa.json`.
