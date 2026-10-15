# Öffentlicher Schraubplan · 12. Oktober 2026

## Ergebnis und Grenzen

Lokale Feature-Arbeitskopie: `C:/Users/Janosch/.codex/worktrees/kws-optional-beta/KWS-BETA-APP`, Ausgangscommit `84c153b`.
Kein Commit, Push oder Deployment; der parallele Release-Chat und sein neuerer Stand bleiben unangetastet.
Vor Veröffentlichung sind die Änderungen in den aktuellen Release-Stand zu integrieren und die öffentlichen Lesezugriffe gegen das dort verwendete Backend zu prüfen.

- Eigene öffentliche Route `/schedule`, auch für Gäste, mit Termine- und Kalenderansicht.
- Einstieg über Profilmenü, Profileinstellungen und Home „Nächste Umschraubung → Alle Termine“.
- Home und Plan verwenden denselben React-Query-Cache und vorhandene `sector_schedule`-Daten, keine zweite Terminverwaltung.
- Gleiche Zeitpunkte gruppiert; öffentliche Teilbereichsnamen, unveränderte physische IDs, deduplizierte Notizen und Links zu aktuellen Bouldern.
- Hallenzeit Europe/Berlin; vergangene Termine verschwinden spätestens beim nächsten 60-Sekunden-Takt.
- Lade-, Leer- und Fehlerzustände sind getrennt. Kein scheinbar leerer Plan bei einem Abruffehler.
- Erste Kalenderöffnung zeigt den nächsten Schraubtag; Monatsnavigation, Heute und Tastaturbedienung bleiben verfügbar. Öffentliche Ansicht bietet keine Schreibaktionen.
- Setter-Mutationen invalidieren auch öffentliche/TV-Termin-Caches; andere Geräte aktualisieren über den 60-Sekunden-Abruf.
- Bestehende Animation bleibt auf Nutzerwunsch im 3-Sekunden-Loop, ohne Neugestaltung. Bei reduzierter Bewegung bleibt sie statisch.
- Zusätzlich reproduzierter Setter-Fehler behoben: Datumspopover im modalen Dialog hatte keine aktiven Pointer-Events; lokale Korrektur in `SetterDateField`.

## Verifikation

Isolierter Vite-QA-Server auf `127.0.0.1:5182`, Konfiguration `test/reset-plan.vite.config.ts`. Auth und persönliche Daten sind synthetisch; öffentliche Termin-/Sektor-Hooks laufen tatsächlich gegen simulierte lokale REST-Antworten. Keine echten Hallentermine geschrieben oder gelöscht.
Interaktive Schlusskontrolle zusätzlich im In-App-Browser. Der im Playwright-Interactive-Skill vorgesehene `js_repl` ist nicht verfügbar; verwendet wurden die verfügbare Browsersteuerung und reproduzierbare CLI-E2E-Tests.

- `node --test test/resetSchedule.test.mjs`: 3/3 bestanden (Gruppierung/Immutabilität, ungültige/vergangene Zeiten/fehlende Referenzen, Berlin/Zeitumstellung).
- `e2e/reset-plan.spec.ts`: 8/8 in beiden Prüfrunden bestanden. Agenda und Kalender bei 375/768/1280/1920 px, kein horizontaler Überlauf oder JavaScript-Laufzeitfehler; Navigation, Gäste, Retry/Loading/Empty, echte Pagination über 500 Zeilen, Ablauf per Uhr geprüft.
- `e2e/beta-animation.spec.ts`: 9/9 bestanden auf bestehendem Server 5181; Loop, Replay, reduzierte Bewegung, vier Breiten und zwei Prüfrunden.
- Setter-Regressionsfall `schedule: valid date, physical IDs, pending lock, error retention and deletion`: bestanden nach Pointer-Events-Fix; Schreiboperationen nur gemockt.
- Scoped ESLint und `git diff --check`: bestanden.
- Produktionsbundle mit `npx vite build --outDir test-results/reset-plan-20261012/build`: bestanden; vorhandene Chunk-Größen-/Mixed-Import-Warnungen bleiben.
- Projektweites TypeScript hat bereits bestehende Fehler (u.a. MaterialIcon-Props, Community-/Supabase-Typen, App-Query-Callback und Sidebar-Refs). Der neue Segment-Control-Typfehler wurde korrigiert; erneute Ausgabe enthält keine Fehler in den neuen Schraubplan-Dateien oder `SetterScheduleCalendar`. Keine Behauptung eines insgesamt grünen Typechecks.

Screenshots beider Runden: `test-results/reset-plan-20261012/loop{1,2}-{agenda,calendar}-{375,768,1280,1920}.png`.
Vorschau mit ausdrücklich synthetischen Terminen: `http://127.0.0.1:5182/test/fixtures/reset-plan.html`.

## Exakt nächster Schritt

Nach Abschluss des Release-Chats die Feature-Änderungen kontrolliert in dessen aktuellen Stand übernehmen und `/schedule` mit echten öffentlichen Hallenterminen prüfen, bevor ein Deployment erfolgt. Keine neue Datenbankstruktur erforderlich.
