# Setter-Dashboard – lokaler Entwurf

Nutzerauftrag 23.10.2026: Dashboard im Setup-/Setterbereich entwickeln, einen bedienbaren Entwurf zeigen und erst anschließend die Veröffentlichung freigeben lassen.

## Vorschau

Im isolierten Worktree `C:/Users/janos/Documents/Codex/worktrees/kws-setup-dashboard`:

```powershell
npx vite --config test/setter-dashboard.vite.config.ts
```

Adresse: http://127.0.0.1:5256/test/fixtures/setter-dashboard.html

Die Vorschau verwendet die tatsächliche Sidebar, den Seitenrahmen, die Zugangsprüfung, die neue Dashboardseite und ihren echten REST-Leseweg mit vollständig synthetischen lokalen Antworten. Authentifizierung ist ausschließlich im expliziten QA-Profil ersetzt. Die Uploadübersicht ist dort ausgeblendet. Das normale Vite-/Releaseprofil importiert diese Testmodule nicht.

## Verhalten

- Neuer Menüpunkt „Dashboard“ auf Mobilgeräten und Desktop, geschützte Route `/setter/dashboard`. Bestehender Einstieg `/setter` bleibt Erstellen; `?view=dashboard` ist ebenfalls kompatibel.
- Kennzahlen: hängende Boulder, Feedback-Abdeckung, Anzahl Sternebewertungen, Kommentaranzahl und gewichteter Sternedurchschnitt.
- Verteilung der Grade 1–8 sowie unbekannt. Ein Grad filtert ausschließlich die nachfolgende Boulderliste und springt direkt dorthin. Das Vergleichsdiagramm und die Bereichskennzahlen bleiben erhalten.
- Hallenbereich filtert Bestand und alle Rückmeldungen gemeinsam. Eine zweite Bereichszuordnung zählt mit, ein Boulder wird innerhalb der Auswahl nur einmal gezählt.
- Sterneverteilung und Einstufung „Zu leicht / Passt / Zu schwer“.
- Liste mit „Meistes Feedback“, „Bestbewertet“ und „Ohne Feedback“, explizitem Nachladen und einer lesenden Detailansicht je Boulder. Unbewertet wird als Gedankenstrich angezeigt.
- Kompakte mobile Sheets mit Schließen, Escape und Fokusrückgabe; begrenzte Desktopdialoge. Datengrundlage über Infoaktion erreichbar.

## Messdefinitionen und Daten

Führende Datenquelle bei späterem Betrieb sind die bestehenden REST-Tabellen `boulders`, `sectors` mit `sector_areas`, `boulder_ratings`, `boulder_grade_feedback` und freigegebene `boulder_comments`. Der Entwurf ändert kein Schema und keine Zugriffsrichtlinie. Bestehende RLS bleibt zuständig.

Hängend bedeutet `status=haengt` oder der vorhandene Legacy-Nullstatus. Abgeschraubte Boulder werden ausgeschlossen. Feedback bedeutet die Summe von Sternebewertungen, Schwierigkeitseinstufungen und freigegebenen Kommentaren. Diese Summe ist keine Anzahl unterschiedlicher Personen. Attributvoten und private Tracking-/Projekt-/Notizdaten werden nicht abgerufen oder mitgezählt. Auch Namen, Konto-IDs und E-Mail-Adressen der Feedbackgeber werden nicht abgefragt.

Alle gespeicherten Rückmeldungen zu den aktuell hängenden Bouldern zählen ohne Datumsfilter. Keine Behauptung einer historischen Bestandsentwicklung oder einer exklusiven aktuellen Hängeperiode. Der Durchschnitt gewichtet jede einzelne Sternebewertung gleich; unbewertete Boulder gehen nicht als Null ein.

Alle Tabellen werden mit stabiler ID-Pagination bis zur leeren Seite geladen, auch bei kleinerer Servergrenze. Eine fehlgeschlagene Folgeseite verwirft den neuen Gesamtstand. Quellen werden parallel gelesen; Zeitlimit 20 Sekunden, manueller Refresh und letzter erfolgreicher Stand. Das ist kein transaktionaler Datenbank-Snapshot. Eine fehlende Quelle zeigt einen Fehler, keine scheinbaren Nullzahlen.

## Freigabe und Grenzen

Nur lokal umgesetzt. Kein Push, PR, Merge, Deployment, Datenbankschreibzugriff oder nativer Build. Live-Backend und echte Setter-Anmeldung wurden für diesen Entwurf nicht getestet. Die authentifizierten Produktionsabfragen und die reale RLS-Sicht müssen vor der Veröffentlichung abgenommen werden. Bestätigte neue Designregeln dann in `docs/DESIGN.md` aufnehmen.

Prüfbelege: `docs/qa/2026-10-23-setter-dashboard.md`. Lokale Screenshots und Protokolle liegen in `output/setter-dashboard/` und sind nicht Teil des Releases.
