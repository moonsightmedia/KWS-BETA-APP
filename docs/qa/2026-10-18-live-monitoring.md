# Live-Monitoring: Implementierung und Abnahme

Auftrag: echte Onlinezahl und aktuell geöffnete Boulder im vorhandenen Admin,
auf Handy und Desktop. Keine Klarnamenbeobachtung oder Bildschirmaufzeichnung.

## Lokal bestätigt

- 290Node-Tests einschließlich beider isolierter SQL-Integrationsprüfungen bestehen,
  ohne übersprungene Datenbankabnahme. PGlite0.3.14 ist als reine Testdependency
  exakt im Lockfile fixiert; die Tests benötigen keinen zusätzlichen Download.
- SQL: Migration zweimal, Administratorprüfung, gesperrte Rohdaten, RLS auf
  Änderungsmarker, Gäste-/Konten-/Gerätededuplizierung, Plattformfilter,
  Boulderaggregation, serverseitiger Ablauf, Sequenzen, Ausschluss, Kontolöschung
  und bestehende Wartung einschließlich neuer Live-Bereinigung bestätigt.
- 21bestehende/erweiterte Cockpit-Browserfälle und9Privacyfälle bestanden.
  Zusätzlich vollständige Boulderlisten-Auf-/Zuklappprüfung im erweiterten Lauf.
- Zwei gerenderte Loops bei375/768/1280/1920px. Erste große Live-Ebene schob
  Fehler zu weit nach unten; korrigiert auf kompakte Übersicht, Fehler danach,
  vollständige Live-Ansicht unter Aktivität. Kein horizontaler Überlauf.
- Ankunft neuer Statusmarker, Verbindungsabbruch/-wiederkehr, bestätigte0,
  Snapshotablauf, HTTP-Fehler ohne falsche0, Filter und Tastatur abgedeckt.
- Echter Client unter ReactStrictMode: Altfreigabev1 wird nicht übernommen;
  explizite Auswahl sendet Live-Status, Hintergrund und Widerruf senden sofort
  inaktive Zustände. Die Tests verwenden isolierte Daten, keine Produktivnutzer.
- Produktions-Vitebuild und fokussierter Frontend-ESLint bestanden. Der vorhandene
  Edge-Scrubber löst unverändert `no-control-regex` aus; keine neue Lintdiagnose.
  Projektweiter Typecheck bleibt an bestehenden Diagnosen außerhalb der geänderten
  Produktdateien hängen; kein pauschaler grüner Typecheck behauptet.
- Native Pluginregistrierung für CapacitorApp Android/iOS synchronisiert. Auf
  Windows kein CocoaPods/Xcode; iOS-Build muss regulär in macOS-CI erfolgen.

## Rollout-Prüfung getrennt

Vor Aktivierung: vollständige DB-Sicherung, geprüfte SQL-Migration,
Hashplan für den bestehenden Edgehandler und erneuter Ingest-Verifikationsbeleg.
Der Prüfhelper `verify-live-presence.mjs` erhält kurzlebige Berechtigung nur per
privater Standardeingabe. Er sendet einen ausgeschlossenen Teststatus durch die
echte öffentliche Edge-Route und prüft Snapshotrechte sowie tatsächliche
WebSocket-Zustellung für Admin gegenüber normalem Konto/Gast. Der öffentliche
Marker enthält keine Identitätsdaten. Kein absichtlich sichtbarer Testnutzer
oder Fehleralarm in Produktivzahlen.

Die erste echte SDK-Prüfung zeigte einen wichtigen Integrationsunterschied:
`accessToken` allein authentifizierte das initiale Realtime-Abonnement nicht.
Ein explizites `await realtime.setAuth(token)` vor dem Beitritt wurde ergänzt.
RLS-Fehlerantworten ohne Datensatz gelten nicht als empfangener Marker; die UI
markiert diesen Zustand als gestört. Es wurden keine Live-Rohdaten oder
Personeninformationen in diesen Fehlerantworten übertragen.

Produktive Release-/Transportbelege liegen nach erfolgreicher Durchführung
geschützt unter `/opt/kws/monitoring`; GitHub-PR/CI und App-/Landing-Revisionsbelege
sind die regulären Veröffentlichungsnachweise. Lokal erfolgreiche Fixtures allein
gelten nicht als Live-Transportbeleg. Physisches iPhone-/Android-Lifecycleverhalten
bleibt von Web- und Emulatornachweisen getrennt abzunehmen.
