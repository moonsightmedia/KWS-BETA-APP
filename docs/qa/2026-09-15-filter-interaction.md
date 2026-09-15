# Interaktive Filter und Outline-Icons

## Ergebnis

Gast/Boulder/Setter teilen aufklappbare Filterkategorien mit verständlichen
Auswahlzusammenfassungen und gezieltem Kategorien-Reset. Diskrete Grad-Multiauswahl
in ruhigem Track, benannte Farbmuster, zunächst sechs Farben, weitere explizit
aufklappbar. Ausgewählte zusätzliche Farben bleiben beim Einklappen sichtbar.
Schnellfilter der angemeldeten Boulderansicht sind beschriftete Switches. Kopf
nennt echte Treffer, Fuß behält Reset und Ergebnisaktion. Keine Filterlogik oder
Datenbankstruktur geändert.

Lucide zentral 1.75, neue gemeinsame Navigationssymbole in appIcons.ts. Entfernt
ist die globale Stroke-Überschreibung sämtlicher SVGs. Karten/Diagramme bleiben
bei eigenen Werten. KWS-Farbtokens unverändert. FAB bekommt nur ml-auto, damit
er bei ausgeblendeter Upload-Übersicht weiterhin rechts bleibt.

## Quellen und Richtung

Drei direkte Nutzerreferenzen, docs/DESIGN.md, vorhandene Shared Components.
Designentscheidung siehe 2026-09-15-filter-design-contract.md. Skills:
janosch-ai-workflow, mobile-app-ui-design, design-better-interfaces,
verify-web-products, react-best-practices. Keine neue externe Abhängigkeit.

## Zwei visuelle Loops

1. Vorher-Aufnahmen vor App-Codeänderung bei 375/768/1280/1920; gerenderte
   Filter geprüft. Erster Entwurf zu lang: Farbliste anschließend progressiv
   auf sechs Optionen reduziert. Keine Card-in-Card oder neue Palette.
2. Finale Auswahl-, Collapse-, Quickfilter-, Error- und Navigationsscreens
   betrachtet. Gradzahlen mittig, Farb-Checkmarks, Footer, verschiedene Breiten,
   Tastatur/Fokus und Reduced Motion geprüft.

Belege: test-results/filter-interaction-20260915/comparison.html und PNGs.
Isolierte Daten, echte App-Komponenten und echte Seiten. Keine Produktionswrites.
Screenshots im Report sind mit Testdaten beschriftet, keine echten Wandfotos.

## Tests

- 48/48 gemeinsam: app-chrome, boulder-filter-refresh, filter-interaction.
- Erweiterte neue Suite danach 15/15, einschließlich Kontrast und Touchgrößen.
- Anschließend 2/2: korrigierter Screenshot-Ausschnitt und Report-Bildverfügbarkeit.
- Insgesamt **50 unterschiedliche bestandene Browserfälle**, nicht die Summe
  der wiederholten Läufe. Playwright-Ausgaben stets in eigene run-Unterordner.
- Gezieltes ESLint aller zehn berührten TS/TSX-Produktdateien erfolgreich.
- Produktions-Vite-Build erfolgreich, Version 1.0.226 unverändert. Automatischer
  Version-bump-Hook ausdrücklich nicht ausgeführt. Bekannte Bundle-/Browserslist-
  Hinweise bestehen weiter.
- git diff --check: kein Whitespacefehler (nur CRLF-Hinweise).
- Projektweiter Typecheck bleibt rot: 93 Meldungen. Keine Meldungen in den
  neuen Filter-/Icon-Komponenten. Bestehende Seitentypen u.a. colorHex,
  HTMLElement-Ref und isFetching liegen außerhalb dieser Filteränderung;
  kein vollständiger TypeScript-Erfolg behauptet.

## Befunde und Einordnung

- Behoben, Minor: zu schwere globale SVG-Kontur; Lucide-Selektor muss als
  Attributselektor geschrieben werden, sonst entfernt Tailwind die nur durch
  die Bibliothek erzeugte Klasse aus dem Base-Layer.
- Behoben, Minor: mobiler FAB rückte ohne Uploadtrigger nach links; ml-auto.
- Während Umsetzung behoben: Map-Icon kollidierte mit JavaScript Map; Alias.
- Testpräzisierung: vor Glocken-Hover vollständig geschlossenes Profilmenü
  abwarten; vorhandene Hover-/Click-Funktion nicht geändert.
- Kontextabhängig: Setter Bearbeiten sperrt bei Farbkatalogfehler weiterhin die
  Seite entsprechend vorheriger Datenregel. Farb-Error/Retry im gemeinsamen
  Panel wurde daher im Gastbereich geprüft, nicht fälschlich als Setter-Flow.

## Grenzen / nächster Schritt

Lokal verfügbar, kein Commit, Push, Deploy oder TestFlight-Build. Keine echte
Geräteinstallation oder komplette Admin-/Hallenkarten-Abnahme in diesem Task.
Nächster Schritt: Nutzer nimmt Filter- und Icon-Richtung im Vergleich ab.
