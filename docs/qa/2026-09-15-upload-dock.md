# Setter: Upload-Aktionsleiste und offene Befunde

Stand: 15. September 2026. Lokal umgesetzt, nicht veröffentlicht.

## Umsetzung

Die globale Upload-Übersicht und der seitenlokale Button „Boulder hinzufügen“ waren unabhängig unten rechts positioniert. Auf Erstellen bilden sie jetzt eine gemeinsame Aktionszeile mit mindestens 12 px Abstand. Bei gefülltem Stapel liegt diese Zeile oberhalb der Stapel-Aktionen. Auf den übrigen Setter-Seiten bleibt die globale Upload-Übersicht erhalten. Upload-Provider, Übertragung und Sitzungslogik wurden nicht geändert.

Die Test-Fixture rendert jetzt auch die echte globale Upload-Übersicht. Diese fehlte im vorigen Desktop-Audit und damit auch die Voraussetzung für die übersehene Kollision. Layoutregel in `docs/DESIGN.md`, Abschnitt 15.1, ergänzt.

## Verifikation

- 18/18 Playwright-Tests erfolgreich: `e2e/setter-desktop-audit.spec.ts`, Run 4 unter `test-results/setter-upload-dock-20260915/run4`.
- Neue Tests: 375, 768, 1280 und 1920 px; leer, aktiv, Fehler, Netzwerk-Wartezustand, Wiederherstellung und abgeschlossen; zusätzlich gefüllter Stapel. Eindeutige Trigger, Abstände, gleiche Zeile, tatsächliche Klickflächen, Öffnen/Schließen, Escape und Fokus-Rückgabe geprüft.
- Bestehende Regression: alle vier Setter-Seiten, Sidebar, Rollenrouting, Formulare, Filter, Status und Planung. Schreiboperationen ausschließlich mit isolierten Fixtures; externe Hosts im Test blockiert.
- Die ersten Testläufe hatten Escape-Timingfehler. Der Test wartet nun vor dem nächsten Dialog auf die vollständige Entfernung des animiert schließenden Editors, nicht nur dessen Verschwinden aus dem Accessibility-Baum. Keine Escape-Assertion entfernt; kein pauschales Sleep und keine zusätzliche Produktlogik dafür eingebaut.
- Live-App read-only auf vier Breiten geprüft. Upload-Übersicht auf Desktop mit Escape und mobil mit Schließen-Button bedient; Boulder-Editor geöffnet und ohne Änderungen geschlossen. Screenshots `test-results/setter-upload-dock-20260915/live-after-{375,768,1280,1920}.png`.
- Vite-Produktionsbuild erfolgreich über `test-results/setter-upload-dock-20260915/build-check.mjs`: separater Ausgabeordner, kein Versionsbump, Version weiterhin 1.0.226. Bestehende Warnungen zu Browserslist, Chunk-Größe und gemischten Imports bleiben. Kein vollständiger TypeScript-Clean-Bill behauptet.
- `git diff --check` für die betroffenen Dateien ohne Fehler. Keine Veröffentlichung, keine echten Uploads, Termin-, Status- oder Datenbankänderungen.
- Nutzer-Tab auf Planung, Oktober 2026, ausgewählter 2. Oktober zurückgesetzt; Viewport-Override entfernt.

## Offene Punkte: untersucht, ausdrücklich noch nicht behoben

### 1. Sitzung / JWT expired – zuerst

Aus dem vorherigen Live-Audit ist `PGRST303 / JWT expired` belegt. Mehrere Seiten wurden blockiert; Neuladen stellte sie wieder her. Die vollständige Ursache des fehlgeschlagenen Refresh-Ablaufs ist noch nicht bewiesen.

Code-Anhaltspunkte: `useHallMaps.tsx` verwendet einen übergebenen Access-Token für eigene Fetch-Aufrufe, ohne zentrale Token-Erneuerung bei einem Ablauf. Ein erneuter Query-Versuch kann denselben Token verwenden. Der Visibility-Handler in `useAuth.tsx` aktualisiert den Session-State bei bestehender Sitzung nur im Zweig mit neuer/geänderter Benutzer-ID; der normale Auth-Event-Handler existiert zusätzlich. Deshalb nicht pauschal behaupten, automatische Erneuerung sei komplett abgeschaltet.

Erforderlich: Ablauf reproduzieren (Tokenwechsel, App-Rückkehr, Offline/Online, parallele Abfragen), aktuellen Session-State zuverlässig synchronisieren und Erneuerung koordinieren. Nach erfolgreicher Erneuerung einen fehlgeschlagenen Leseaufruf höchstens einmal mit neuem Token wiederholen. Bei endgültig ungültiger Sitzung verständlich zur Anmeldung führen; keine Endlosschleife. Entwürfe erhalten, Schreib-/Uploadoperationen nicht blind wiederholen. Auth-Tokens nicht protokollieren. Der Fehlerparser der Hallenkarten sollte außerdem lesbare Meldungen statt rohem JSON liefern.

### 2. Boulder-Zähler bei Ladefehlern

`SetterEditPage.tsx` rendert den Zähler oberhalb des Fehlerzweigs; „Weitere Boulder anzeigen“ liegt ebenfalls außerhalb. Bei Fehlern einer benötigten Abfrage können dadurch Zahlen aus gecachten Boulder-Daten neben einer leeren Fehleransicht stehen.

Erforderlich: Laden, Fehler, gültig leer und erfolgreich geladene Liste sauber trennen. Bei Fehlern weder „angezeigt“-Zähler noch Nachladen anbieten, wenn keine Liste gerendert wird. Falls alte Daten bewusst sichtbar bleiben, diese als nicht aktuell kennzeichnen. Filter erhalten; Wiederholung und teilweise fehlgeschlagene Abfragen testen. Kein Hinweis auf verloren gegangene Boulder.

### 3. Einzahl/Mehrzahl

`SetterStatusPage.tsx` hängt „Sektoren“ unabhängig von `groups.length` an. `SetterSchedulePage.tsx` verwendet entsprechend immer „Teilbereiche ausgewählt“.

Erforderlich: „1 Sektor“, „2 Sektoren“, „1 Teilbereich ausgewählt“, „2 Teilbereiche ausgewählt“; verwandte Zähler mitprüfen und 0/1/mehrere testen. Reine Text-/Darstellungsänderung.

## Nächster Schritt

Nach Beauftragung zuerst einen reproduzierbaren Session-Ablauftest hinzufügen und die zentrale Wiederherstellung reparieren; anschließend Zählerzustände und Pluralformen korrigieren. Für diese Befunde ist bisher keine Datenbankmigration begründet.
