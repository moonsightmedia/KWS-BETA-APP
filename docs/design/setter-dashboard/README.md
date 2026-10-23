# Setter-Dashboard

Der aktuelle Stand ist in der regulären App unter `/setter/dashboard` integriert und wird per Pull-Request zur Prüfung vorgelegt. Kein Merge oder Deployment in diesem Auftrag. V1–V4 sind historische Vergleiche.

## Lokale Vorschau

```powershell
npx vite --config test/setter-dashboard.vite.config.ts
```

http://127.0.0.1:5256/test/fixtures/setter-dashboard.html?design=final

Die Vorschau verwendet die echte Sidebar, den Seitenrahmen, die Dashboard-Komponente und ihren REST-Leseweg mit synthetischen lokalen Antworten. Anmeldung und Rollen sind ausschließlich im expliziten QA-Profil ersetzt. Das normale Releaseprofil importiert keine dieser Testmodule. `?design=v1`, `v2`, `v3` und `v4` öffnen die früheren Entwürfe.

Fehlerfälle über `&state=error`, `loading`, `empty`, `no-feedback` oder `refresh-error`. Letzterer lädt zunächst erfolgreich und lässt den nächsten manuellen Refresh scheitern.

## Bedienung

- Gemeinsamer Bereichskopf: nativ wischen, Pfeile oder Pfeiltasten/Pos1/Ende. Kennzahlen, Diagramme und Liste wechseln zusammen. Kein Umlauf und keine eigene Touch-Erkennung.
- Vier Kennzahlen: Bestand, Rückmeldungen mit Zusammensetzung, durchschnittliche Bewertung und Feedback-Abdeckung.
- Grade 1–8 und unbekannt; ein Grad filtert die Liste und setzt den Fokus dorthin. Der Bereichsvergleich ermöglicht direkte Sprünge. Bewertungsdetails sind auf kleineren Flächen einklappbar.
- Konkrete Prüfanlässe vor der Boulderliste. Suche, Filter und Sortierung führen zur lesenden Detailansicht mit freigegebenen Kommentaren. Zählweise hinter dem Info-Symbol.
- Leerer Bestand zeigt einen Leerzustand ohne Null-Dashboard und unwirksame Filter. Fehlende Bewertungen bleiben unbekannt. Ein fehlgeschlagener Refresh erhält den letzten erfolgreichen Stand.

## Daten

Bestehende Quellen: `boulders`, `sectors`, `sector_areas`, `boulder_ratings`, `boulder_grade_feedback` und freigegebene `boulder_comments`. Kein neues Schema und keine Änderung an Zugriffsrichtlinien. Bestehende RLS bleibt zuständig.

Hängend bedeutet `status=haengt` oder Legacy-Nullstatus. Zweitbereiche zählen mit; innerhalb der Auswahl wird ein Boulder einmal gezählt. Der unabhängige Bereichskatalog erhält auch Bereiche ohne Sektor oder Boulder. Unbekannte Grade bleiben sichtbar.

Rückmeldungen sind Sternebewertungen, Schwierigkeitseinstufungen und freigegebene Kommentare, keine Anzahl verschiedener Personen. Alle bisherigen Rückmeldungen zum aktuellen Bestand zählen. Jede Sternebewertung wird gleich gewichtet; unbewertete Boulder zählen nicht als Null. Namen, Konto-IDs, E-Mail-Adressen, Tracking und private Notizen der Feedbackgeber werden nicht abgefragt.

Prüfhinweise: mindestens fünf Stimmen der jeweiligen Art; mindestens 60 % finden den Grad in dieselbe Richtung abweichend oder der Sternedurchschnitt liegt bei höchstens 2,5. Das Ranking „Beste Bewertung“ benötigt fünf Sternebewertungen je Boulder. Hinweise ändern keine Boulder.

Stabile ID-Pagination bis zur leeren Seite berücksichtigt kleinere Servergrenzen. Feedback wird auf den aktuellen Bestand begrenzt und in maximal 100 Boulder-IDs pro Abfrage geladen. Maximal drei paginierte Feedback-Reader gleichzeitig, gemeinsamer Abbruch und 20-Sekunden-Zeitlimit. Jede fehlgeschlagene Quelle verwirft den neuen Gesamtstand. Die Abfragen bilden keinen transaktionalen Datenbank-Snapshot.

Aktuelle Prüfung: [Abschlussprüfung](../../qa/2026-10-23-setter-dashboard-final.md). Frühere Berichte beschreiben die damaligen Entwürfe. Lokale Screenshots und Protokolle unter `output/setter-dashboard/final/` gehören nicht zum Release. Reale Setter-Anmeldung/RLS und physische iOS-/Android-Geräte wurden nicht geprüft.
