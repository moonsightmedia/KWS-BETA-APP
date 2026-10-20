# Videofeed und Detailgesten – 20.10.2026

## Änderung

- Der angemeldete Videofeed verwendet die globale gefilterte Sortierung statt
  der für Liste/Raster angelegten Bereichsgruppen. Datum, Grad und Name gelten
  damit über alle Sektoren. Ein ausdrücklich geänderter Sortiermodus beginnt
  beim ersten Ergebnis; der Rückweg aus Details behält den aktuellen Boulder.
- Eine Aufwärtsgeste auf der freien mobilen Videofläche öffnet echte Details.
  Der nach unten ziehbare Kopf und Außenklick schließen das Sheet. Das separate
  X entfällt; der vorhandene Griff ist eine 44px große, beschriftete
  Tastaturaktion. Escape, Fokusfalle und Fokusrückgabe bleiben erhalten.
- Ursache des Touchfehlers: Die Übergabe der impliziten Pointer-Capture vom
  Video/Griff an die Gestenfläche erzeugte ein hochbubbelndes
  `lostpointercapture`. Dies wurde fälschlich als Abbruch gewertet. Abbruch
  erfolgt jetzt nur, wenn der Gestenbesitzer selbst tatsächlich Capture verliert.
- Eine klare Rechtswischgeste verlässt den Feed bzw. führt aus dem Detail zum
  tatsächlichen Ursprung zurück. Vertikale Navigation, Scrubbing, Buttons,
  Bewertung und Zwei-Finger-Gesten behalten ihre getrennten Zuständigkeiten.
  Auch Details ohne direktes Video erhalten die Rückgeste bei freiem Inhalt;
  ihr vertikaler Seitenscroll bleibt nativ.
- Normale und nicht messbare Netze starten mit HD. Bekannte langsame Netze
  und Datensparmodus dürfen kleiner starten. Bestehende Fehler-/Puffer-Fallbacks
  und manuelle Qualitätswahl bleiben erhalten.
- Die Boulderkarte bekommt den vollständigen geladenen Katalog für die
  tatsächliche neueste Schraubphase; ihre Filterreferenzen bleiben gefiltert.

## Prüfung

Isolierte App-Fixtures mit synthetischen Daten und lokalem Testvideo;
keine produktiven Konten oder Kundeninhalte verändert.

- 11 mobile Detailtests bestanden: echte Chromium-Touchereignisse, Öffnen aus
  unterer und mittlerer Videofläche, Ziehen am Griff, Außenklick, Tastatur,
  Gastrechte, Fehlerpfad, Foto-Detail, abgebrochener Swipe und Medienkontinuität.
- 6 Netzwerk-/Fallback-Unit-Tests bestanden.
- Neue Feedregressionen für Grad und Datum über gemischte Sektoren (Gast und
  angemeldet) sowie horizontale Rückgeste versus vertikaler Videowechsel bestanden.
- Vollständige Feed-Suite: 27/27 bestanden, einschließlich Pinch, Halten,
  Tracking, Teilfehler, langsamer Verbindung und beider visuellen Loops.
- ESLint für die geänderten Produktdateien ohne Fehler oder Warnungen.
- Gesamtes TypeScript-Projekt weiterhin mit vorhandenen Fehlern, unter anderem
  `useBoulders`, `useCompetitionBoulders` und den alten `colorHex`-Zugriffen in
  `Boulders.tsx`. Keine neuen Diagnosen in Gesten, Sheet oder Netzwerklogik.

Reproduzierbar:

```powershell
npx playwright test --config test/video-feedback.playwright.config.ts
$env:VIDEO_FEEDBACK_SUITE='feed'
npx playwright test --config test/video-feedback.playwright.config.ts
Remove-Item Env:VIDEO_FEEDBACK_SUITE
node --test test/networkUtils.test.mjs test/videoPlayback.test.mjs
```

Die Testkonfiguration verwendet ausschließlich ihren eigenen Port5231 und
schließt den dazu gestarteten Vite-Server nach dem Lauf.

## Visuelle Loops

Detailprüfung bei375/768/1280/1920px, jeweils Layout sowie geöffnetes Sheet
beziehungsweise gewechselter Desktop-Tab. Die beiden schmalen Profile simulieren
Touch, die breiten Desktop. Bilder unter
`output/video-feedback-20261020/loop{1,2}-*.png` wurden visuell geprüft.
Keine überstehenden Bedienelemente, klare geöffnete Sheetfläche und kein
redundantes X. Der breite Desktopplayer behält seine vorhandenen Controls.

Feed-Loops verwenden die echte App-Integration und liegen unter
`output/video-feed/integration/loop{1,2}-*.png`.

Grenzen: Chromium-Touchsimulation ersetzt keine physische Android-/iOS-Abnahme.
Dieser Schritt erstellt oder veröffentlicht keinen neuen Store-Build.
