# Desktop-Header: horizontaler Sprung beim Seitenwechsel

## Befund und Korrektur

Bestätigter kleiner Layoutfehler auf dem aktuellen `origin/main` (282f6ca).
Auf 1920 × 1080 px benötigt die kurze Home-Fixture keine vertikale Scrollleiste,
Boulder und Statistiken dagegen schon. Die klassische 10px-Scrollleiste verändert
die verfügbare Breite und verschiebt den zentrierten 1180px-Inhalt um 5px.
Mit ausgeklappter Sidebar liegt der Titel vorher auf Home bei x=530, auf den
anderen Hauptseiten bei x=525. Eingeklappt sind es x=442 bzw. x=437.

Ab 768px reserviert `html { scrollbar-gutter: stable; }` denselben Platz auch
auf kurzen Seiten. Nachher stehen alle drei Titel bei x=525 bzw. x=437.
Overlay-Scrollleisten reservieren weiterhin keinen zusätzlichen Platz. Mobile
unter 768px erhält keine neue Gutter-Regel.

Die Schrift ist bereits identisch: Teko, Gewicht 600, 34.4px, Zeilenhöhe 34.4px,
Zeichenabstand -1.032px. Die Titeloberkante liegt auf Desktop durchgehend bei
28.796875px; die Headerhöhe beträgt 89px. Es ist keine neue Schriftanpassung nötig.

## Verifikation

- Zwei neue Regressionstests mit echten lokalen App-Fonts und sichtbaren
  klassischen Scrollleisten reproduzieren vor dem CSS-Fix genau den 5px-Versatz.
  Kurze und lange Seiten sowie beide Sidebarzustände sind explizit abgedeckt.
- Alle zehn Tests aus `e2e/header-stability.spec.ts` bestehen nachher.
- Loop 1: Home/Boulder/Statistiken bei 375, 768, 1280 und 1920px; Position,
  Schrift, optische Zentrierung und horizontale Viewportgrenzen geprüft.
- Loop 2: 32px simulierte Safe Area, Reduced Motion, Scrollen, Benachrichtigungen,
  aufgeklappte Suche und persönliche Lade-/Fehler-/Leerzustände geprüft.
- Lokale Screenshots unter `test-results/desktop-header-20261016/` visuell geprüft.
- Produktionsbundle mit `node node_modules/vite/bin/vite.js build --mode production`
  erfolgreich, ohne automatischen Versionsbump. Vorhandene Hinweise zu Chunkgrößen,
  gemischten Imports, Browserslist und der zur Laufzeit aufgelösten fonts.css bleiben.
- ESLint für die geänderte Testdatei und `git diff --check` erfolgreich.

Die alte Test-Fixture erhielt das inzwischen benötigte `useChangeNotification`
und lädt nun die tatsächlichen lokalen Fonts. Die Tests verwenden ausschließlich
synthetische Daten; keine Anmeldung, Schreiboperation oder Produktionsabfrage.
Der lokale Devserver nutzt synthetische Supabase-Konfiguration. Der Fix wurde
nicht veröffentlicht und nicht auf einem echten angemeldeten Produktivkonto geprüft.

## Ausgelesene Farben (Light Mode)

Die Designreferenz und direkte Komponentenwerte verwenden insbesondere
Markengrün `#36B531`, starke Schrift `#192436`, Seitenfläche `#F9FAF9`,
Kartenweiß `#FFFFFF`, Platzhalter `#EEF2EE`, Headertrenner `#E7F0E8` und
Header-Untertext `#646C71`.

Einige CSS-Tokens liegen leicht daneben. Im Browser aus `src/index.css` konvertiert:

| Rolle/Token | HSL | gerendertes HEX |
| --- | --- | --- |
| primary | 118 57% 45% | #36B431 |
| primary-ink | 118 57% 30% | #247821 |
| foreground | 217 37% 15% | #182334 |
| muted-foreground | 203 6% 42% | #656D72 |
| secondary | 120 8% 94% | #EEF1EE |
| border | 120 8% 88% | #DEE3DE |
| destructive | 5 55% 45% | #B23E34 |
| background / card | 0 0% 100% | #FFFFFF |
| canvas | 120 9% 98% | #F9FAF9 |

Quelle: aktuelle CSS-Tokens, `DashboardHeader.tsx`, `docs/DESIGN.md`.
Diese Bestandsabweichungen wurden dokumentiert; keine Farbänderung im Header-Fix.
