# beta-Marke: Web-Release 1.0.241

Nutzerfreigabe am 16.10.2026: „ja, bring das mal live“ nach V10.

## Verhalten

- Vollständige Variante 03 mit Teko-Vektorkonturen auf Anmeldung/Registrierung: 128px mobil, 184px ab 768px, mobil mittig auf Weiß.
- Vollständige Marke in der Desktop-Seitenleiste; eingeklappt bleibt das Zeichen an derselben Stelle.
- Header behalten Seitentitel und Werkzeuge ohne Produktlogo.
- Angemeldete Boulderliste/Grid: Zeichen horizontal mittig im Inhaltsbereich und vertikal mittig im sichtbaren Bildschirm; bleibt beim Scrollen sichtbar, 352/480px breit (maximal 90%), 8% Hallenakzent. Karten bleiben weiß/deckend. Dekorativ, keine Pointer-Eingaben, in Hallenkarte ausgeblendet.
- Zeichen folgt primary (#36B531), Wortmarke brand-ink (#192436). Keine geänderten Datenabfragen, Rollen, Anmeldeaktionen oder Abhängigkeiten.

Lokale Vorschau-Fixtures, Fotos, generierte Screenshot-Boards und deren Konfiguration bleiben außerhalb des Release-Commits. Der Gastscreen und native App-Icons bleiben unverändert.

## Verifikation vor Veröffentlichung

- 226 Node-Regressionstests bestanden.
- 5 Tests des Web-Deploy-Operators und 15 Tests des GitHub-Autodeployers bestanden.
- Bestehende Browser-Gates für Header, Auth, Gast-Laden und Trainingssperre geprüft; ergänzt um Logo-Position/Farben und Hintergrund-Zentrierung bei vier Breiten. Der neue Tablet-Zentrierungscheck berücksichtigt die vorhandene reservierte Scrollleistenbreite.
- 12 zusätzliche lokale Screenshots und Interaktionen der tatsächlichen Komponenten bei 375, 768, 1280 und 1920px bestanden. Zwei visuelle Prüfschleifen: Layout/Markenplatzierung sowie Suche/Filter, Sidebar, Benachrichtigungen, Auth-Formzustände, Tastatur, Reduced Motion und Datenzustände.
- ESLint der betroffenen Komponenten und Tests erfolgreich. Produktionsbuild im Modus hostinger ohne automatischen Versionsbump erfolgreich.
- TypeScript: 74 bekannte Baseline-Diagnosen und 74 aktuelle, keine neu eingeführten Diagnosen. Kein vollständiger grüner Typecheck behauptet.
- React-Review: gemeinsame reine SVG-Komponente, keine neuen Hooks/Effects/Fetches, dekorative Grafik vor Screenreadern verborgen, Fokus/Bedienung erhalten.

## Release-Weg und Rückfall

PR gegen main; unverändertes GitHub-Gate „Web production“. Erst nach erfolgreicher Verify-Stufe baut der bestehende Hostinger-Operator die genaue Main-Revision und bestätigt release.json. Vorheriger Web-Release und bestehende Downloads/Assets bleiben für Rückfall und offene Clients erhalten. Keine Datenbankmigration und kein natives Store-Release.

Produktionsrevision, CI-Lauf und Live-Prüfung werden nach Veröffentlichung hier ergänzt.
Release-Abnahme ergänzt: Die echte lange Liste braucht eine am sichtbaren Bildschirm orientierte Hintergrundebene. Das Zeichen bleibt nun über eine Sticky-Ebene auch beim Scrollen mittig. 14 Header-/Palettenfälle inklusive langer Listen und Scrollprüfung sowie fünf Auth-Fälle bestanden; Gast-/Trainingsprüfungen ebenfalls unverändert erfolgreich. Die 12 Designansichten und Interaktionen wurden nach dieser Korrektur erneut geprüft.
