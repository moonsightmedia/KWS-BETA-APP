# Persönlicher Fortschritt – Umsetzung und Verifikation

## Ergebnis

- Home-Crash repariert: Vorschaukarten bekommen transformierte Boulder-Daten mit Sektor-/Bildzuordnung; defensive Sektorauflösung bleibt zusätzlich vorhanden.
- Persönliche Trackingdaten nicht mehr auf 12 Einträge begrenzt. Cursor-Pagination liest bis zur leeren Antwort, auch bei niedrigerem Server-Limit. Metadaten ebenfalls paketweise/paginiert.
- Wochenzahlen aus datierten Klettereinträgen statt Marker-Änderungsdatum; Flash gehört zu Tops. Home-Neu-Zähler zählt nicht mehr nur die sechs Vorschaubilder.
- Statistiken: Fortschritt / Meine Boulder; 7 Tage / 30 Tage / Gesamt. Getoppte Boulder, Flashes, eindeutige Klettertage, höchster erfolgreicher Grad, protokollierte Versuche und Flashquote. Gradfilter, Tagesdetails und nachladbare ältere Tage.
- Projekte und Gespeichertes: eigene Auswahl, Suche, Wandstatus, erledigte Projekte; Markierung entfernen verändert weder Notizen noch Versuche/Erfolge. Gespeichert-Filter bei Lesefehlern zeigt keine falsche leere Sammlung.
- Profil nutzt dieselbe Berechnung. Beschriftung im Boulder-Detail heißt ebenfalls Gespeichert.
- 404 und ErrorBoundary im App-Stil. Expliziter Retry, Fokus auf Fehlerüberschrift. Beschreibungsdialog erreichbar, nicht automatisch nach 30 Sekunden verworfen; fehlgeschlagener Bericht wird nicht als gesendet quittiert.

## Verifikation

- 9 reine Daten-/Regressionsprüfungen: `node --test test/personalProgress.test.mjs`, bestanden. Enthält 1.234 Einträge mit künstlichem Server-Cap 87; fehlende Metadaten; Teilfehler; falscher Eigentümer; Dubletten; alte/abgeschraubte Boulder; Datumsgrenzen; Markierung ist keine Aktivität.
- 16 Browserprüfungen in `e2e/personal-workspace.spec.ts` einschließlich Bildprüfung der Vergleichsseite. Echte UI bei 375/768/1280/1920, Home-Crashpfad, Profil, Zeiträume/Grade, Sammlungen, Fehler/Leer/Laden/Retry, Tastatur und Reduced Motion.
- Ein Browsertest verwendet die echten persönlichen Query-/Mutation-Hooks und den echten REST-Adapter mit abgefangenen Testantworten: Pagination, Nutzerfilter, präziser PATCH, erfolgreiche Cache-Aktualisierung sowie verweigerter PATCH ohne Verlust der Einträge.
- Zusätzliche 16 bestehende Filter-Interaktionstests bestanden; gemeinsamer Lauf: 31/31.
- Zwei visuelle Durchgänge plus Nachkorrekturen. Gefunden/korrigiert: umgebrochene Zeitraum-Tabs, ungleiche Kennzahlhöhen, zu lange erste Tagesliste, abgeschnittene mobile Klettertage-Beschriftung und fehlender Innenabstand des Fehlerdialogs. Ein Desktop-Testfehler lag am zunächst außerhalb des ErrorBoundary platzierten Fixture-Menü; Fixture an echten App-Aufbau angepasst und erneut geprüft.
- Gezieltes ESLint für Statistik/Home/Profil/404, neue Komponenten, ErrorBoundary, persönliches Datenmodell, REST-Adapter und Community-Hooks: bestanden.
- Vite-Produktionsbuild bestanden, ohne Versionsbump oder Kopieren des Public-Ordners; Version bleibt 1.0.226. Vorhandene Warnungen: großes Bundle, gemischte statische/dynamische Imports, veraltete Browserslist-Daten.
- Projektweiter TypeScript-Check bleibt rot durch bestehende Projektfehler (u. a. generierte Supabase-Typen, MaterialIcon, Kalender und Swipe-Refs in bestehenden Seiten). Keine TypeScript-Diagnose in der neuen Statistik, Sammlung, ErrorBoundary oder dem persönlichen Datenmodell. Kein Clean-Typecheck des Gesamtprojekts behauptet.

## Grenzen und Übergabe

- Browserprüfung mit isolierten Testdaten. Kein produktiver Boulder, Tick, Bericht oder Upload wurde angelegt, verändert oder gelöscht. Keine Live-Sentry-Abnahme, kein echter iPhone-/S25-Test, kein Deployment, Commit oder Push in diesem Auftrag.
- Alte Erfolge ohne Tagesprotokoll erscheinen in Gesamt, aber nicht in erfundenen Zeiträumen. Fehlende Grade werden nicht geschätzt. Historische Versuche ohne Protokoll sind nicht rekonstruierbar.
- Die Projekt-/Speichern-Marker sind unabhängig: Entfernen einer Markierung löscht die andere nicht. Der Hallenkatalog außerhalb der persönlichen Pagination wurde nicht grundsätzlich umgebaut.
- Vergleich: `test-results/personal-progress-20260915/comparison.html`. Vorherbilder sind separat erhalten. Screenshots sind Testdaten, keine gemessene echte Nutzung.
- Nächster Schritt: lokale Statistik mit dem eigenen Konto ansehen und Gestaltung abnehmen; vor Veröffentlichung echter Geräte-/Session-Smoke-Test.

## Commit-Prüfung (2026-09-15)

- Persönliche Test-Fixtures von den älteren Admin-/Setter-Fixtures entkoppelt; 9 Datentests und 16 Browserprüfungen erneut bestanden.
- Den ausgewählten Git-Index separat exportiert und erfolgreich als Produktionsbuild gebaut, ohne die übrigen offenen UI-Änderungen oder einen Versionsbump.
- Vergleichsbilder bleiben lokale QA-Artefakte. Ohne diese Dateien überspringt der zugehörige optionale Vergleichstest; die funktionalen Tests bleiben ausführbar.
- Commit umfasst Home, Statistik, Sammlungen, Profilkennzahlen, Fehlerseiten und deren Abhängigkeiten. Ältere Admin-/Setter-/Designänderungen bleiben separat im Arbeitsbaum; kein Push oder Deployment.
