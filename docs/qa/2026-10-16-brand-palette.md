# Einheitliche Markenfarben – 16. Oktober 2026

## Ergebnis

Nutzerauftrag: Die im Header-Audit gefundenen Abweichungen zwischen dokumentierten
HEX-Farben, gerundeten HSL-Tokens und seitenlokalen UI-Farben beseitigen.

`src/index.css` definiert jetzt eine präzise HSL-Markenpalette. Die semantischen
Tokens verweisen darauf, statt ähnliche Werte separat zu wiederholen.

| Rolle | Verbindliches HEX |
| --- | --- |
| Markengrün | #36B531 |
| Dunkelblaue Schrift | #192436 |
| Seitenfläche | #F9FAF9 |
| Sekundärfläche | #F1F5F1 |
| Sekundärtext | #646C71 |
| Konturen | #DDE7DF |

Wiederkehrende direkte Farbklassen in 38 TS-/TSX-Dateien verwenden nun die
entsprechenden `brand-*`-Utilities aus `tailwind.config.ts`. Bestehende bewusst
feste Markenfarben behalten damit ihr Verhalten innerhalb thematisierter
Ansichten; normale Controls verwenden weiterhin semantische Theme-Tokens.
Das alte Textviolett #13112B wurde auf das gemeinsame Dunkelblau angeglichen,
einschließlich des QR-Exportstandards und neutraler Grad-/Editorbeschriftungen.

Direkt angefasste grüne Aktionen und ausgewählte Zustände verwenden dunkelblaue
`primary-foreground`-Beschriftungen entsprechend dem bereits geltenden Designvertrag.
Wiederkehrende alte dunklere Button-Hoverfarben wurden durch den gemeinsamen
95%-Markengrünzustand ersetzt. Die Semantik und Bedienabläufe bleiben unverändert.

Grifffarben, Bereichspaletten, Illustrationsmaterialien, unterschiedliche
Statusfarben und historische transparente Schattenrezepte sind fachlich
verschieden und bleiben erhalten. SVG-/QR-/Exportwerte, die konkrete HEX-Werte
benötigen, entsprechen exakt der Palette. Keine Änderung an Daten oder Rollen.

## Verifikation

- 28 Browsertests erfolgreich: 14 Header-/Palettenprüfungen, fünf Auth-Layouts
  und neun Prüfungen der Gastansicht und ihrer Datenzustände.
- Tatsächlich gerenderte Header, Textfarben und ausgewählte Controls bei
  375, 768, 1280 und 1920px mit exakten RGB-Werten geprüft. Farbtests bestätigen
  #36B531 für Primary/Accent/Success, #192436 für starke Schrift und Beschriftung,
  #646C71 für Sekundärtext, #F1F5F1 für Sekundärfläche, #DDE7DF für Konturen.
- Fest definierte Markenfarben bleiben auch unter `.dark` unverändert;
  semantische Theme-Farben können weiterhin gezielt wechseln. Dies ist eine
  Tokenprüfung, keine vollständige Dark-Mode-Abnahme aller Seiten.
- Loop 1: Screenshots der Hauptseiten bei allen vier Mindestbreiten visuell
  geprüft; Schrift, Seitenrahmen und Header bleiben konsistent.
- Loop 2: Navigation, 32px-Safe-Area, Reduced Motion, Scrollen, Suche,
  Benachrichtigungen, Lade-/Fehler-/Leerzustände und Gast-Wiederholen geprüft.
- Produktionsbundle erfolgreich; bestehende Hinweise zu Chunkgröße, gemischten
  Imports, Browserslist und fonts.css bleiben. Kein Versionsbump.
- Dateibezogenes ESLint für die Testdatei und Tailwind-Konfiguration sowie
  `git diff --check` erfolgreich. React-Review: ausschließlich Farben/Klassen,
  keine neuen Hooks, Effects, Datenabfragen, Interaktionen oder Abhängigkeiten.
- Quellscan: keine alten #13112B-UI-Werte, alten gerundeten primären/Ink-Tokens
  oder direkten Tailwind-Klassen für die sechs vereinheitlichten Markenfarben
  mehr unter `src`.

Tests und Screenshots verwenden lokale synthetische Daten. Es wurden keine
Produktionskonten angemeldet oder Datenbankänderungen ausgeführt. Einzelne
Admin-, Wettbewerbs- und ältere Detailansichten wurden durch Quellprüfung und
Bundlebau abgedeckt, nicht jede dieser Ansichten separat im Browser geöffnet.

Lokale Belege: `test-results/palette-alignment-20261016/`,
`test-results/auth-spacing-20260914/`, `test-results/guest-loading-20260914/`.
Der vorherige Header-Fix bleibt enthalten. Veröffentlichung ist ein eigener
Release-Schritt; dieser Auftrag harmonisiert den Quellcode.
