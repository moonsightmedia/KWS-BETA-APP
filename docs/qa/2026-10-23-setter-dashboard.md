# Setter-Dashboard – QA am 23.10.2026

## Grundlage

- Host PC-JANOSCH, Agent codex-pc, Initialisierung erfolgreich.
- Hauptcheckout enthielt fremde lokale Änderungen und lag nach frischem `git fetch origin` 123 Commits hinter `origin/main`.
- Isolierter Worktree `C:/Users/janos/Documents/Codex/worktrees/kws-setup-dashboard`, Branch `codex/setup-dashboard`, Basis `474fcdd`.
- Repository-Designstandard und Vault-Designstandard gelesen; KWS-Tokens, Surfaces, Segmentsteuerung, Select, Dialoge, Sidebar und DashboardPageLayout wiederverwendet. Keine neuen Abhängigkeiten.

## Loop 1 – Hierarchie und Layout

Echte lokale Appoberfläche im In-App-Browser bei 375, 768, 1280 und 1920 CSS-Pixeln gerendert und Screenshots angesehen. Erste Runde identifizierte zu enge Kennzahlspalten und zusammengedrückte Listennamen bei Tabletbreite. Kennzahlen wechseln jetzt erst ab 1024px auf vier Spalten; ausführliche Listenzusätze erst ab 1280px. Kleinere Layouts behalten zwei Kennzahlspalten und kompakte Zeilen. Kein horizontaler Dokumentüberlauf.

Belege: `output/setter-dashboard/loop1-*.png`, `loop1-fixed-768.png`, `loop2-*.png`.

## Loop 2 – Verhalten und Zustände

- Bei allen vier Breiten: Bereichsselect geöffnet, „Bug“ ausgewählt und neu berechnete Kennzahlen verifiziert: 26 Boulder, 20 mit Feedback, 47 Sternebewertungen, 8 freigegebene Kommentare. Sowohl primäre als auch sekundäre Bereichszuordnungen berücksichtigt.
- Detailfenster geöffnet, mobile Unterkante und begrenzte Desktopgröße geprüft, mit Escape geschlossen. Fokusrückgabe nach Abschluss der Schließanimation an die auslösende Boulderzeile bestätigt.
- Erste Detailprüfung erkannte fehlende Innenabstände, einen zu hohen mobilen Standarddialog und fehlende Schließenaktion. Durch kompaktes Sheet, feste Kopfzeile, genau einen inneren Scrollbereich und benannte Schließenaktion korrigiert.
- Grad 5 filtert 28 Boulder und springt zur Liste. „Ohne Feedback“ ergibt dort einen erklärten Leerzustand. Ohne Gradfilter ergeben sich 26 Boulder ohne Feedback.
- Bestbewertet sortiert absteigend; fehlende Sterne werden als Gedankenstrich gezeigt. Einzelstimmen und Kommentare verwenden die passende Einzahl.
- Datenhilfe öffnet und schließt per Escape; Fokus kehrt zur Infoaktion zurück.
- Erfolgreicher leerer Bestand, initiales Laden und REST-503 getrennt getestet. Laden/503 zeigen keine Kennzahlen; nur die erfolgreiche leere Antwort zeigt Bestand 0 und keinen erfundenen Sternedurchschnitt.
- Fake-REST begrenzt absichtlich auf 73 Datensätze je Seite. Realer Query-Hook lädt dennoch alle 118 Boulder, 230 Sternebewertungen, 168 Schwierigkeitseinstufungen und 38 Kommentare.

Belege: `browser-results.json`, `dropdown-*.png`, `dialog-*.png`, `detail-fixed-375.png`, `error-375.png`, `empty-375.png`, `loading-375.png`, `info-375.png` unter `output/setter-dashboard/`.

## Technische Prüfung

- `node --test test/setterDashboard.test.mjs`: 5 Tests bestanden. Gewichteter Mittelwert, unbekannte Grade, ungültige/orphan Stimmen, Bereichsfilter mit Zweitzuordnung, Deduplizierung, kurze REST-Seiten, Folgeseitenfehler und nicht fortschreitende Cursor.
- Gezieltes ESLint: keine Fehler, bestehende Fast-Refresh-Warnung für gemischte Exporte in SetterAreaLayout.
- App-Releasebuild mit `npx vite build --outDir output/setter-dashboard-build` erfolgreich. Bestehende Bundle-/dynamische Importwarnungen bleiben.
- Projektweiter Typecheck: Basis 61 Diagnosen, aktueller Stand ebenfalls 61, keine neuen Diagnosen. Vergleich mit CompilerHost und Originaldateien aus Git unter `output/setter-dashboard/typecheck-comparison.json`.
- Keine Browser-Laufzeitfehler im geladenen Normalzustand. Absichtlich erzeugte HTTP-503 für Fehlerprüfung separat.
- React-Review: stabile Listenschlüssel, abgeleitete/memoisierte Auswertung, parallelisierte Reads, Abbruch/Timeout, kontogebundener Query-Key, keine Produktions-Fixtures, zugängliche Namen und Tastaturbedienung.

## Grenzen

Browserprüfung mit lokal synthetischen REST-Daten. Kein Test mit echten Konten/Produktionsdaten, kein physischer iOS-/Androidtest. Keine Datenbankmigration, kein Push und keine Veröffentlichung. Notion-Projektseite live gelesen, Inhalt aufgrund Größe gekürzt und ein unbekannter Block; keine daraus abgeleitete Releasefreigabe. Maßgeblich für den neuen Entwurf ist der direkte Nutzerauftrag, Codebasis ist das frisch gefetchte Git-Repository.

## Nachkorrektur – mobile Navigation

Nutzerbild zeigt zusammengeschobene Beschriftungen bei fünf Setterzielen. Die bisherige Maximalbreite von 72px war unabhängig von der tatsächlich kleineren Linkspalte. Korrektur: gleich breite Gridspalten mit `minmax(0,1fr)`, Labelbreite strikt auf die Spalte begrenzt. Fünf Ziele nutzen 12px Seitenabstand und weniger Innenpadding; unter375px 10px statt11px Text. Alle fünf vollständigen Labels passen bei320px; Desktop bleibt unverändert.

Zwei visuelle Schleifen: Layout bei320/350/375/390/768/1280/1920px; anschließend alle fünf aktiven Ziele bei320/375px angeklickt und `aria-current=page` bestätigt. Bei320px 57,6px Platz je Label, längstes Label56,78px; bei375px 68,64px Platz, längstes Label62,45px. Screenshots angesehen, Viewport anschließend zurückgesetzt und Dashboardvorschau offen gelassen. Keine neuen Tests für die reine Layoutkorrektur; ESLint und Releasebuild14,68s erfolgreich. Belege: `output/setter-dashboard/nav-fix-*` und `build-nav-fix.log`.
