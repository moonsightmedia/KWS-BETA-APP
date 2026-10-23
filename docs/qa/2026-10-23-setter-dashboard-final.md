# Setter-Dashboard – Abschlussprüfung 23.10.2026

## Umfang

Basis `474fcdd`, isolierter Worktree `kws-setup-dashboard`, Branch `codex/setup-dashboard`. Der Hauptcheckout mit fremden Änderungen bleibt unberührt. Vor Arbeitsbeginn Remote frisch gefetcht: fünf lokale Entwurf-Commits, kein Rückstand zu `origin/main`. Nutzer beauftragt Fertigstellung und PR, keinen Merge/Release.

Die endgültige Oberfläche liegt unter `src/components/setter/`; keine Produktimporte aus historischen Entwürfen. Die Vorschau ohne Versionsparameter bzw. mit `?design=final` rendert die echte App-Komponente. Auth-/REST-Ersatz gilt nur im expliziten Testprofil.

## Zwei visuelle Schleifen

1. Normale vollständige Dashboardansicht bei **375, 768, 1280 und 1920 px** gerendert und visuell geprüft. Hierarchie: Bereich → Kennzahlen/Verteilung → konkrete Prüfanlässe → Boulderliste. Vier Spalten auf Desktop, zwei Kennzahlspalten und kompakte Zeilen auf kleinen Flächen. Kein horizontaler Dokumentüberlauf. Im Durchgang Sortierauswahl verbreitert, Überschrift verkürzt, doppelte Bestandszahl im Kopf und doppelte Mengenangabe beim Nachladen entfernt.
2. Bereich **Bug** bei denselben vier Breiten gewählt und gerenderte Ansicht geprüft: **26 Boulder, 269 Beiträge, Ø 4,3 und 77 %**. Gesamthalle: **118, 1.219, Ø 4,3 und 78 %**. Gleiche Spaltenausrichtung für Kopf und Zeilen. Keine Prüfanlass-Karte ohne konkrete Auffälligkeit. Fokus und aktive Auswahl sichtbar.

Belege: `output/setter-dashboard/final/loop1-*.png`, `loop2-*.png`. Die erste Schleife enthält noch den anschließend gekürzten Nachladebutton; die zweite zeigt die bereinigte Fassung. Die spätere Leerzustandskorrektur betrifft ausschließlich leere Bereiche.

## Interaktionen und Randfälle

- Native horizontale Browsergesten auf 375 und 1920 px wechseln nach Bug. Vertikale Geste über dem Kopf scrollt das Dokument um 450 px bei unverändertem Bereich. Pfeiltasten, Pos1/Ende sowie sichtbare Pfeile ergänzen die Geste. Kein Umlauf am Ende. Ausrichtung vor dem Zeichnen und ResizeObserver erhalten die gewählte Seite beim Größenwechsel.
- Unabhängiger Bereichskatalog enthält Kurze Platte ohne Sektorzeile. Auswahl ergibt einen kurzen Leerzustand und Rückweg zur ganzen Halle; Null-Kennzahlen, Suche und Sortierung werden dort ausgeblendet.
- Grad 5 ergibt 28 Treffer, Fokus springt zur Liste. Nicht passende Suche ergibt einen Leerzustand mit genau einer Rücksetzaktion. Zurücksetzen stellt die vollständige Auswahl wieder her.
- „Beste Bewertung“ ergibt 68 qualifizierte Treffer; Einzelstimme reicht nicht. Prüfung der Mindeststimmen zusätzlich automatisiert.
- Komet-Detail zeigt 16 Sternebewertungen, zwölf Einstufungen, zwei freigegebene Kommentare und 9/12 „zu schwer“. Mobile Dialoghöhe/Innenabstände visuell geprüft; Escape gibt Fokus an die auslösende Zeile zurück. Infofenster ebenso geprüft.
- Initiales Laden zeigt Skeletons und keine Kennzahlen. REST-Fehler zeigt Wiederholungsaktion und gesperrte Bereichsauswahl. Fehlgeschlagener Refresh erhält 118/1.219/4,3/78 % mit sichtbarer Fehlermeldung.
- Erfolgreicher Bestand ohne Feedback zeigt 118/0/–/0 %, ausdrücklich keine Sterne-/Gradeinstufungen; kein erfundenes Nullrating. Zugehörige Graphen enthalten kurze Leerzustände.

Belege zusätzlich: `detail-375.png`, `empty-area-375.png`, `error-375.png`, `refresh-error-375.png`, `loading-375.png`, `no-feedback-375.png` im gleichen lokalen Ordner.

## Daten und technische Prüfung

- **16 gezielte Tests bestanden:** gewichtete Sterne, Deduplizierung, Zweitbereiche, ungültige Grade, isolierte Such-/Gradfilter, Mindeststimmen, kurze Serverseiten, Folgeseitenfehler, unabhängiger Bereichskatalog, 205-Boulder-Pagination mit begrenzten Feedback-Abfragen, Fehler einer Teilquelle und leerer Bestand ohne Community-Abfragen.
- **Gesamte Node-Suite: 412 Tests bestanden**, keine Fehlschläge.
- Gezieltes ESLint ohne Fehler; bestehende Fast-Refresh-Warnungen am Layout und Fixture-Einstieg.
- Regulärer App-Build und expliziter QA-Build erfolgreich. Bestehende Bundlegrößenwarnungen bleiben.
- TypeScript-Vergleich: Ausgangsstand 61 Diagnosen, aktueller Stand 61, **keine neuen Diagnosen**. Kein grüner projektweiter Typecheck behauptet.
- Query-Key kontogebunden, Anmeldung/Rollen unverändert; nur GET-Abfragen. Keine Migration und keine Produktionsdatenänderung. Feedback auf aktive Boulder begrenzt; freigegebene Kommentare; keine Identitätsfelder der Feedbackgeber. Abbruch/Timeout und Fehlerbehandlung erhalten vollständige Zählungen.

## Grenzen und nächster Schritt

Beispieldaten im lokalen Browser, keine physische iPhone-/Android-Abnahme und keine echte Setter-/RLS-Sitzung. Repository-Policies wurden gelesen; dies ersetzt keinen Live-RLS-Test. Keine neuen Abhängigkeiten. PR zur Code-/UI-Prüfung vorlegen; anschließend echte Setter-Sicht vor einer Veröffentlichungsfreigabe prüfen.
