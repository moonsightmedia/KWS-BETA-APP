# Schraubplan und neue Boulder auf der Hallenkarte

Nutzerauftrag vom 20.10.2026: echte Karte im öffentlichen Schraubplan mit
nummerierter Reihenfolge und datierter Liste; NEU an den zuletzt neu bestückten
Teilbereichen in der erweiterten Boulderkarte.

## Verhalten und Datengrundlage

- Die Termine kommen unverändert über `usePublicResetSchedule` mit ausschließlich
  `id,sector_id,scheduled_at,note`. Es werden keine Erstellerdaten ergänzt und
  weder Schreibrechte noch Schema verändert. Sektoren und Kartenpolygone folgen
  dem vorhandenen öffentlichen Hallenkatalog.
- Die Karte nutzt `HallMapView`, dieselben real gespeicherten Polygone,
  Bereichsauflösung einschließlich Kurze Platte und denselben SVG/WebGL-Fallback.
- Die Nummerierung zeigt den nächsten Termin pro logischem Teilbereich.
  Zeitpunkte werden chronologisch sortiert, gleiche Zeitpunkte nach öffentlichem
  Namen stabil aufgelöst. Die Liste erklärt ausdrücklich, dass gleiche Uhrzeiten
  gleichzeitig bedeuten. Spätere Termine desselben Teilbereichs und alle Hinweise
  bleiben über den vorhandenen Kalender erreichbar. Keine Daten werden erfunden.
- Nummerierte Markierungen sind per Maus/Touch und Enter/Leertaste erreichbar.
  Die Auswahl markiert den Teilbereich und fokussiert den passenden Listeneintrag.
  Wandbereiche ohne nächsten Termin bleiben sichtbar und werden nicht als
  funktionslose Termin-Buttons ausgegeben. Links führen zum bestehenden Boulderfilter.
- NEU basiert auf gültigem `Boulder.createdAt` aktuell hängender Boulder des
  jüngsten Berliner Kalendertags innerhalb des bestehenden Sieben-Tage-Fensters.
  Alle Teilbereiche dieses Tages einschließlich Zweitsektoren erhalten das Badge.
  Ungültige, zukünftige, fehlende oder veraltete Angaben sowie abgeschraubte
  Boulder erzeugen kein Badge. Ein Datumshinweis erläutert den Bezug.
- Geplante Abschraubtermine belegen keine neue Bestückung. Auch das historische
  `last_schraubtermin` wird nicht als vollständige abgeschlossene Umschraubung
  ausgegeben: es wird im vorhandenen Erstellungsweg bei einzelnen Bouldern gesetzt.
- Der Aufrufer liefert den gesamten geladenen Boulderbestand für die NEU-Ermittlung;
  Such-/Grad-/Farbfilter verändern weiterhin Treffer und Kartenzähler, verschieben
  aber nicht den tatsächlichen jüngsten Bestückungstag.
- Zusätzliche Nummern/NEU-Streifen zählen zur geometrischen Kollisionsfläche der
  Kartentags. Auswahl, Fokus, Pinch/Pan, Orientierung und IDs behalten ihre bisherigen Wege.

## Verifikation

- `node --test test/hallMapStatus.test.mjs test/resetSchedule.test.mjs`: **9/9**.
- `node node_modules/@playwright/test/cli.js test --config test/maps-feedback.playwright.config.ts --workers 1`: **9/9**.
  Zwei gerenderte QA-Loops bei **375, 768, 1280 und 1920px**, danach alle
  16 Screenshots direkt angesehen: Karten-/Listenhierarchie, Nummern und Daten,
  Auswahl/Fokus, NEU mit und ohne Auswahl, Zurücksetzen, Kalender und Hinweise,
  keine Kartenlabel-Überlappung, kein horizontaler Dokumentüberlauf, keine Pageerrors.
- Bestehende öffentliche Schraubplan-Regressionen:
  `node node_modules/@playwright/test/cli.js test --config test/reset-plan.playwright.config.ts e2e/reset-plan.spec.ts --workers 1`: **14/14**.
  Kalender, Gastzugriff, Navigation, REST-Paginierung, ablaufende Termine,
  Ansichtsspeicherung, gesperrter Speicher, mehrfache Termine und lange Hinweise
  sind dabei erhalten.
- Lokale Testdaten sind sichtbar als **Prüfansicht · Beispieldaten** bezeichnet.
  Echte öffentliche Lesehooks lesen ausschließlich synthetische REST-Antworten
  auf Port5232; die Geometrie stammt aus dem vorhandenen 19-Sektor-Test-Snapshot.
  Externe Anfragen werden in der Testsuite blockiert; keine produktiven Datenänderungen.
- Die erste Layoutprüfung führte zur größeren mobilen Schraubplankarte (520px),
  damit die Nummern lesbarer sind. Nach Auswahl prüft die Suite die vollständigen
  Kollisionsboxen inklusive NEU-Streifen.
- Scoped ESLint für die sechs Produktionsdateien: **0 Fehler/0 Warnungen**.
  Der vollständige TypeScript-Lauf enthält weiterhin **61 Diagnosen**, keine in
  den hier geänderten Produktionsdateien. Das ist kein vollständiger grüner Typecheck.
- Die vorhandene Reset-Plan-/Home-Suite zeigte zunächst neun Fehlalarme bei
  exaktem Vergleich `scrollWidth === viewportWidth`: stabile Desktop-Scrollleisten
  reservieren10px (z.B.758 statt768). Die tatsächliche Überlaufprüfung der Kinder
  blieb fehlerfrei. Im angefassten Reset-Plan-Test prüft der Vergleich jetzt den
  fachlichen Zweck `scrollWidth <= viewportWidth`; die unberührten Home-Tests
  wurden nicht geändert.

Belege: `output/maps-feedback-20261020/loop1-schedule-{width}.png`,
`loop2-selected-{width}.png`, `loop1-new-{width}.png`,
`loop2-new-selected-{width}.png`, `types.txt`.

Native Geräteabnahme und Veröffentlichung erfolgen im gemeinsamen Release durch
den Hauptagenten; diese lokale UI-Prüfung bestätigt keinen Store-Rollout.
