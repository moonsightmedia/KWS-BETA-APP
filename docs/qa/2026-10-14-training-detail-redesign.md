# Training: Rastergrafiken und neue Übungsdetails

Stand14.10.2026. Branch codex/training-ui, lokale Vorschau5184, Version1.0.230. Kein Push, Merge oder Deployment. Konzept unter docs/design/training-exercise-detail-concept.md.

## Ergebnis und Referenzen

Alle75Detailrouten erhalten denselben klaren Ablauf: Bild, kurze Aufgabe, Anleitung/Umfang/Varianten, optional Schrittmodus. Übungen, Spiele, betreute Kita-/Schulideen und medizinische/Fingerboard-Orientierung bewahren unterschiedliche Inhaltsverträge. Quellen liegen getrennt am Ende. Material Bank bei erhöhten Liegestützen ergänzt. Vorhandene Ausführungsgrafiken bleiben; sechs neue generierte Rasterbilder für Körperregionen ersetzen die eigenen SVG-Pfade. Themenreiter verwenden lesbare Textlabels.

[Hevy How-to](https://www.hevyapp.com/features/exercise-performance/), [Fitbod FAQ](https://fitbod.me/faqs/) und [Freeletics Tutorials](https://www.freeletics.com/en/blog/posts/freeletics-exercises-bear-walk/) am14.10.2026 recherchiert. Die offizielle Hevy-Anleitungsabbildung zusätzlich visuell angesehen. Gemeinsames Prinzip: Demonstration plus konkrete Schritte; Einstellungen und Hintergrund separat. Eigene KWS-Umsetzung, keine fremden Bilddateien übernommen, keine vorgetäuschten Videos. Das ist ein UI-Vergleich, keine wissenschaftliche Validierung unseres Programms.

## Inhalte und Grafiken

Alle75Karten redaktionell bearbeitet. Haupttexte Ziel/Schritte/Hinweis:5.390→4.995Wörter, minus7,3%; alle redaktionellen Felder ohne Quellen:10.999→10.441, minus5,1%. Der größere Unterschied der sichtbaren Textmenge entsteht durch getrennte Ansichten, nicht durch behauptete massive Gesamtkürzung. Konkrete Handlungen ersetzen Fachsprache. Quellen und alle16verglichenen Vertragsfelder pro Karte erhalten:1.200Vergleiche ohne Änderung an IDs, Equipment, Zahlen/Defaultdosen, Quellen, Eligibility, Formaten oder Zeitwerten. Vergleichsdatei lokal exercise-copy-comparison.json. Bestehende Studien-/Quellengrenzen bleiben.

Sechs transparente PNGs mit ursprünglichen/finalen Prompts und Originalpfaden unter public/training/regions/prompts.json; README enthält Sichtprüfung und Farbgrenze. Farbkorrektur ausschließlich per Imagegen. Nicht pixelgenau uniforme Markenfarbe behauptet; grüne Schatten und Randübergänge bleiben. Finale mittlere Grünflächen liegen je Kanal innerhalb25RGB-Stufen von54/181/49, alle Eckpixel transparent. Eine Glow-Wade verworfen; sauberer ursprünglicher Freisteller als Editbasis. Neutraler Hüft-Farbedit wurde vom Bilddienst abgewiesen; vollständig bekleidete Neugeneration gelang. Keine automatische Freigabe durch diese Bilder.

## Prüfung

- 36/36UI-Szenarien PASS im vollständigen Lauf. Neue Tabs/Schrittmodus/Varianten, Kita↔Schule, Aufbau, manuelle Einheiten, Wochenplan, Ersetzen und Kontext-Rückwege geprüft. Nach finalem Bildaustausch zwei betroffene Szenarien erneut PASS.
- 24/24Plan-/Inhalts-/Historyprüfungen PASS. Datenverträge unverändert; Kinder/medizinische Orientierung nicht als Erwachsenenrezept einplanbar.
- Alle75Detailrouten auf375px ohne Route-/PageError oder globale horizontale Überbreite geöffnet; route-audit.json lokal. Sechs repräsentative Inhaltsarten in zwei Durchgängen auf375/768/1280/1920px gerendert: Standard sowie Umfang, Aufbau, Schrittmodus. Reale Screenshots angesehen; aktive Tabs nach Abschluss von CSS-Übergängen geprüft. Körpergrafiken natürlich geladen; defektes Kniebild hat stabilen Fallback und weiterhin lesbare Region.
- Unabhängiger Subagent375/1280px, sechs Routen, normaler Klick/Tabs, Schrittfolge, Alterswechsel und Add→Entwurf. Drei konkrete Befunde behoben: neutraler Bildcaption bei Vergleich, Bank im Material, doppelte explizite30s-Halteangabe entfernt. Keine fachliche Freigabe daraus abgeleitet.
- Volltest entdeckte eine tatsächliche Suchlücke: Goblet-Zweck vor der Brust fand bei Suchthema Brust fälschlich ebenfalls Beine. Aktiv dargestelltes erkanntes Thema wird jetzt wirklich angewendet; Brustfilter und weitere Regressionen PASS. Veraltete Erwartung So läuft das Spiel an den jetzt universellen Schrittbereich angepasst.
- ScopedESLint PASS. TypeScript76Bestandsdiagnosen außerhalb Training/DashboardHeader, keine neue Diagnose in bearbeiteten Produktdateien. Finaler Preview-Build PASS. Bekannte fonts.css-/Browserslist-/großeChunks-Hinweise bleiben.

Lokale Belege unter test-results/training-raster-audit-20261014: detail-loop1/2-*.png, detail-step-mode-final-mobile.png, raster-regions-final-mobile.png, detail-route-audit.json, body-raster-palette-check.json, exercise-copy-comparison.json, detail-typecheck-final.txt und detail-build-final.txt. Diese Dateien sind QA-Artefakte, keine produktiven Inhalte.

## Grenzen und nächster Schritt

Visuelle/technische Prüfung, kein empirischer Verständlichkeits-, Wirksamkeits- oder Sicherheitsnachweis. Janosch probiert die neue Anleitung samt Schrittmodus in der lokalen App; danach KWS-Fachreview und reale Durchführung mit passenden Teilnehmenden. Native-/Cloud-/KI-Freigaben bleiben eigene Aufgaben.
