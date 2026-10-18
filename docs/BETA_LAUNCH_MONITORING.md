# Beta-Launchcockpit

## Implementierter Stand

Der veröffentlichte Adminbereich `Monitoring` enthält Übersicht, Fehler, Nutzung,
Mitteilungen und Aktivität. Uploadübersicht und Uploaddiagnose bleiben erhalten.
Web und native Releases haben getrennte Abnahmen; ein erfolgreicher Webrelease
aktiviert keine zusätzliche native Erfassung.

### Verifizierter Providerstand am 18.10.2026

- Der getrennte Sentry-Importer ist mit ausschließlich `event:read` verbunden
  und übernimmt bereinigte Fehlergruppen. Web-Sentry bleibt deaktiviert.
- Ein kontrollierter nativer Java-Absturz auf einem isolierten Android-Emulator
  wurde nach Neustart tatsächlich von Sentry empfangen und aufgelöst. Nutzer-/
  Geodaten, Freitexte, Breadcrumb-Inhalte und Gerätekennungen wurden am
  gespeicherten Ereignis geprüft. Der Test bleibt aus dem Dashboard ausgeschlossen.
  Echte Androidgeräte und iPhones sind damit nicht abgenommen.
- Der Betreiber hat das Data Processing Amendment selbst angenommen; die
  angemeldete [Legal-Seite](https://moonsight-media.sentry.io/settings/legal/)
  bestätigt Version5.1.0, unterschrieben am18.10.2026. Neue native Builds haben
  die freigegebene Sentry-Konfiguration: Android1.0.248/code71 ist als geprüfte
  APK verfügbar, TestFlightbuild94 wurde einschließlich dSYM-Dateien erfolgreich
  hochgeladen. Echte physische Android-/iPhone-Abnahme und die Verfügbarkeit für
  einzelne Apple-Tester sind damit nicht nachgewiesen. Alte Installationen
  erhalten die zusätzliche native Erfassung erst nach einem App-Update.
  Web-Sentry bleibt ausdrücklich deaktiviert, Firebase Analytics nativ ebenfalls.
  Der neue kontrollierte Android-Emulatortest hat den unbehandelten Java-Absturz,
  aufgelösten Quellframe und die bereinigten gespeicherten Daten bestätigt;
  Testkanal und Fehlergruppe bleiben von den Produktivzahlen getrennt.
  [Aktivierungsnachweise und Grenzen](qa/2026-10-18-native-sentry-activation.md).
- Die offizielle Apple-API ist lesbar. Ein `ONGOING`-Analytics-Request wurde für
  die exakte KWS-App angelegt und zurückgelesen. Erste Tagesberichte und der
  abgenommene automatische Berichtsadapter fehlen noch. Verfügbare aggregierte
  TestFlight-Buildwerte werden nicht als tägliche Storedownloads importiert.
  Google Play ist nicht verbunden; fehlende Berichte sind keine Nullwerte.
- Provider-Prüfberichte werden vor dem GitHub-Artefaktupload mit `age`
  verschlüsselt. Der private Schlüssel bleibt außerhalb von GitHub. Zwei frühere
  unverschlüsselte Aggregate-Artefakte wurden entfernt; sie enthielten keine
  Nutzeridentitäten oder privaten Credentials. Eine Löschung beweist nicht,
  dass vorher keine Kopie angefertigt wurde.
- Der externe Moonsight-Hub ist nach Betreiberfreigabe repariert: exaktes
  Backupimage wiederhergestellt, echte Sicherung und isolierte Wiederherstellung
  bestanden. App, Auth-API und Videodienst werden nun jede Minute außerhalb des
  KWS-VPS auf Erreichbarkeit geprüft, ausschließlich im Beobachtungsmodus ohne
  neue Alarme. Drei tatsächlich gemessene, erreichbare Endpunkte und die automatische
  Entwarnung sind verifiziert. Prüfgrenzen und stabile Zuordnung stehen unter
  [ops/monitoring](../ops/monitoring/README.md). Das ersetzt weder Videowiedergabe-
  noch vollständige API-/Datenbanktests oder Store-/Crashquellen.

- Automatische technische Fehler: React-Abstürze, unbehandelte Fehler,
  fehlgeschlagene Datenabfragen/-änderungen nach Query-Retry, Start-Timeout,
  technische Anmeldefehler, Upload- und endgültige Videofehler. Abbrüche und
  erwartete Anmeldevalidierungen werden nicht als Absturz behandelt.
- Lokaler, bereinigter Puffer: höchstens 200 Ereignisse/1 MB/72 Stunden,
  Fehlerpriorisierung, Backoff, nur bestätigte IDs entfernen. Einzelne Eventkeys
  verhindern verlorene Offlineberichte zwischen Browser-Tabs. Ohne verfügbaren
  lokalen Speicher bleibt nur der flüchtige In-Memory-Puffer.
- Nutzungsereignisse ausschließlich nach gerätebezogener Auswahl: erste
  Beobachtung, Sitzungen, geladene Boulderansichten, tatsächliche Videostarts,
  Filter/Sektoraktionen, Loginversuche und gemeldete Mitteilungsöffnungen.
  Keine Suchtexte, Screenshots, Formularinhalte oder Replay. Kontowechsel
  dürfen keine fremden wartenden Ereignisse neu zuordnen.
- Admin-RPCs prüfen die Rolle serverseitig. Rohdaten sind nicht allgemein
  lesbar. Fehlergruppen, Referenzen, Status, Fixversion und Regressionen
  unterstützen die Bearbeitung; technische Details werden erst bei Bedarf geladen.
- Versandhistorie unterscheidet In-App-Anlage, Versandversuch,
  Providerannahme/-ablehnung, unklare Annahme, Clientempfang und Öffnung.
  Providerannahme ist kein Nachweis der Anzeige auf dem Gerät. Android-Push
  bleibt der einzige vorhandene native Versandpfad; dies implementiert kein APNs.

## Was die Zahlen bedeuten

`Erstmals erfasste App-Instanzen` zählt teilnehmende Android-/iOS-Installationen
ab Messbeginn, nicht sicher neue Downloads und nicht eindeutige Menschen.
Bestandsinstallationen können erstmals erscheinen; Speicherreset kann eine neue
Kennung erzeugen. Webinstanzen werden separat gezählt. Konten stammen aus der
Auth-Datenbank und sind bei Plattform-/Versionsfiltern nicht zuordenbar.

Eine Sitzung rotiert nach 30 Minuten ohne aufgezeichnetes Ereignis. Ein
Vordergrundsignal wird ungefähr jede Minute erzeugt. Die Aktivitätsliste zeigt
höchstens drei Minuten alte Signale und pseudonyme Referenzen, keine verifizierte
Aufmerksamkeit oder lückenlose Echtzeitbeobachtung. Das Cockpit fragt standardmäßig
minütlich ab; diese Aktualisierung ist abschaltbar. Tage sind Berliner Kalendertage.

Fehlerbetroffene Sitzungen haben denselben Opt-in-Nenner wie die Nutzungsdaten;
Diagnosefehler ohne Nutzungsfreigabe erhöhen diesen Nenner nicht. Erfolgreicher
Einstieg zählt die erste geladene Boulderansicht innerhalb von 24 Stunden nur bei
bereits vollständig beobachtbaren Kohorten. Sentry-Issues und deren Nutzerzahlen
werden nicht zu lokalen Fehlern/Geräten addiert.

Storedownloads bleiben `Nicht eingerichtet`, solange kein offizieller Bericht
importiert wurde. Der gelieferte Adapter übernimmt geprüfte tägliche CSV-Gesamtwerte
mit Definition, Quellzeitraum, Zeitzone und Revision. Er ruft Apple/Google nicht
automatisch ab. Fehlende/defekte/veraltete Quellen sind keine künstlichen Nullen.

## Kontrollierte Aktivierung

1. Diff/CI prüfen. Die Änderung am privilegierten Weboperator separat prüfen und
   dessen vertrauenswürdige Serverfassung über den bestehenden Operatorprozess
   aktualisieren. Kein Kandidatenskript ungeprüft als root ausführen.
2. Datenbank sichern und die Migration
   `20261017203000_beta_launch_monitoring.sql` kontrolliert anwenden. Sie ersetzt
   keine bestehenden Produktdaten und aktiviert keinen Mailversand.
   Die Datei enthält selbst `BEGIN`/`COMMIT`: Ein äußerer `ROLLBACK` ist kein
   Probelauf. Dafür eine isolierte Testdatenbank verwenden.
3. Die vier Edge-Dateien und Betreiberjobs gemäß
   `ops/hostinger/monitoring/README.md` per geprüftem Hashplan installieren.
   Die tägliche Bereinigung aktivieren. Nutzungsrohereignisse: 30 Tage,
   technische Rohdaten/Versandhistorie: 90 Tage, tägliche Summen: 366 Tage.
   Der Kontolöschtrigger löscht zugeordnete Diagnose-/Versandereignisse und Sitzungen.
   Die bestehende API-Routen-Whitelist benötigt außerdem exakt den zusätzlichen
   Slug `monitoring-events`. `route_install.py` prüft einen Hashplan, sichert die
   vorherige Caddydatei und erhält JWT-Prüfung sowie alle anderen Routengrenzen.
4. Wenn Backend und Bereinigung eingerichtet sind, die gewünschte private
   Konfiguration mit `collection_enabled: true` im Alarmmodus `shadow` per
   geprüftem Plan vorbereiten. Das veröffentlicht noch keinen neuen Client.
   Mit dem expliziten Operator-Verifier einen ausgeschlossenen Testbericht
   zweimal durch Edge und Datenbank senden. Der private Beleg bindet echte
   Annahme, Idempotenz, Konfiguration, Schema und genau die geprüften Handler.
5. Erst nach diesem Beleg den neuen Client bauen. Der Webbuild verlangt aktuelle Handlerhashes,
   passenden Kandidat/Migrationshash, Ingestbeleg, unveränderte DB-Routinen und
   die exakten unveränderten Worker und einen aktiven Bereinigungstimer.
   Jede Konfigurationsänderung verlangt einen neuen Verifikationsbeleg.
   Fehlende Nachweise stoppen den Build.
6. App und Landingpage gemeinsam über den vorhandenen Releaseweg veröffentlichen;
   echte Gast-/Admin-/Widerruf-/Offline-/Boulder-/Videoflüsse nachprüfen.
   Abgeschaltete Erfassung darf die Produktfunktionen nicht beeinträchtigen.
7. E-Mail zunächst `shadow`. Empfänger nur privat eintragen. Liveversand erfordert
   den expliziten erneuten Plan samt Versandfreigabe. Ein Testalarm muss getrennt
   bestätigt werden; SMTP-Annahme beweist keinen Posteingang.

## Native Builds und Sentry

- Firebase Analytics bleibt in nativen Builds dauerhaft deaktiviert; Android-
  Werbekennung und iOS-Vendor-ID sind zusätzlich für Analytics gesperrt. Die
  eingebundene Firebase-Bibliothek darf nicht am freiwilligen eigenen KWS-
  Sammler vorbei Nutzungsereignisse erfassen. Diese Konfiguration gilt erst für
  aktualisierte native Builds; ein rückwirkender Netzwerkbeleg für ältere
  Versionen wird damit nicht behauptet. Siehe [Android](https://firebase.google.com/docs/analytics/android/configure-data-collection)
  und [iOS](https://firebase.google.com/docs/analytics/ios/configure-data-collection).
- TestFlight: Repositoryvariable `KWS_MONITORING_ENABLED=true` erst nach
  Backend-Abnahme; optional `KWS_SENTRY_DSN`. Die tatsächliche ausgecheckte
  Gitrevision wird eingebaut. Simulator-/Screenshot-CI sendet keine Diagnosen.
- Androidskript: explizite Umgebungsvariablen `KWS_MONITORING_ENABLED=true` und
  optional `KWS_SENTRY_DSN`. Kein automatisches Erben aktivierter Telemetrie.
- Web: geschützte `/opt/kws/monitoring/config.json`, nicht die alte `.env.production`,
  steuert die Freigabe. `VITE_TELEMETRY_ENABLED` bleibt für den Altsammler false.
- Releasekennung: `kws-beta-app@Version+Gitrevision`. Automatisches JS-Doppelerfassen
  durch Sentry wird beim neuen Sammler vermieden; korrelierte Berichte haben
  `report_id`. Der lesende Sentry-Importer schließt diesen Pfad aus.
- Sentry-Projekt/Region, Auftragsverarbeitung, Credentials, Source-Map-/dSYM-Upload,
  symbolisierte Testfehler sowie echter iOS-/Android-Absturz nach Neustart müssen
  vor einer Behauptung vollständiger nativer Crashdiagnose abgenommen werden.
  Der TestFlight-Workflow lädt vorhandene dSYMs über den getrennten CI-Token
  hoch. Der serverseitige Sentry-Importer verwendet ausschließlich `event:read`;
  der CI-Token wird nicht auf den VPS kopiert. JavaScript-Filter gelten nicht
  automatisch für native SDK-Ereignisse: Im Sentry-Projekt müssen zusätzlich
  IP-Speicherung aus und serverseitige Regeln für Nutzer, Requests, Extras,
  Breadcrumbs, Framevariablen, Freitexte und Gerätekennungen aktiv sein.

### Kontrollierter nativer Android-Absturz

`NativeCrashProbeTest` liegt ausschließlich im Instrumentierungs-Testpaket,
nicht im ausgelieferten APK. Ohne `run_native_crash_probe=true` überspringt er
den Absturz. Nur auf einem isolierten Emulator mit separatem QA-Build ausführen:

```powershell
adb -s <emulator> shell am instrument -w -e class com.kletterwelt.beta.NativeCrashProbeTest -e run_native_crash_probe true -e probe_report_id <uuid-v4> com.kletterwelt.beta.test/androidx.test.runner.AndroidJUnitRunner
```

Der instrumentierte Prozess muss dabei abstürzen; ein erfolgreicher Testexit
ist kein Nachweis. Nach normalem Neustart müssen das konkrete Sentry-Ereignis,
`handled=false`, native Plattform und aufgelöste Frames geprüft werden. Das
zufällige `report_id` hält den Test aus dem Dashboard-Import heraus. Ein Android-
Emulatornachweis ersetzt keinen iPhone-Absturztest.

## Weitere Ausbaustufen

Automatische Store-API-Abholung, D1-/D7-Retention,
Vorperiodenvergleiche und zusätzliche Performancequantile sind nicht als fertige
Quellen/Metriken ausgewiesen. Serverseitige Summen erfolgreicher Begehungen und
Favoriten sind vorbereitet, werden im ersten Cockpit aber noch nicht visualisiert.
Die externe Erreichbarkeitsprüfung ist im Beobachtungsmodus aktiv; eine neue
Alarmfreigabe steht aus. Die Hostinger-Zuordnung ist bestätigt. Das alte
`vercel.json` bleibt kein Nachweis für Vercel-Produktion; generische Hub-Runtime-
Metadaten sind ausdrücklich unbekannt, nicht als vollständig gesund ausgegeben.

## Prüfung

```sh
node --test test/monitoringClient.test.mjs test/monitoringIngest.test.mjs test/monitoringPushAudit.test.mjs test/launchMonitoring.test.mjs test/pushAuthorization.test.mjs
KWS_MONITORING_PGLITE_PATH=/trusted/runtime/@electric-sql/pglite/dist/index.js node --test test/monitoringDatabase.test.mjs
npx playwright test --config test/launchMonitoring.playwright.config.ts
npx playwright test --config test/monitoringPrivacy.playwright.config.ts
python3 -m unittest discover -s ops/hostinger/monitoring -p 'test_*.py'
python3 ops/hostinger/test-update-production-web.py MonitoringBuildGuardTests
```

Für den SQL-Test ist ein isolierter, vorhandener PostgreSQL-Testenginepfad
erforderlich; keine Produktivdatenbank verwenden. Im Auftrag wurde PGlite nur im
temporären Validierungsordner bereitgestellt, ohne Repository-Abhängigkeit.
Ohne diesen expliziten Pfad überspringt der allgemeine CI-Node-Lauf den SQL-Test;
die hier dokumentierte tatsächliche SQL-Ausführung und die echte
Produktions-Ingestfreigabe ersetzen keinen dauerhaft eingerichteten CI-Testenginepfad.
Responsive QA nutzt klar markierte Beispieldaten bei 375/768/1280/1920 px.
