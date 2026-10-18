# Beta-Launchcockpit

## Implementierter Stand

Der bestehende Adminbereich `Monitoring` erhält Übersicht, Fehler, Nutzung und
Mitteilungen. Uploadübersicht und Uploadaktivität bleiben erhalten. Diese Änderung
installiert oder veröffentlicht nichts von selbst. Produktionsfassung und neue
Erfassung bleiben bis zum kontrollierten Rollout unverändert.

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

Automatische Store-API-Abholung, externer Ausfallmonitor, D1-/D7-Retention,
Vorperiodenvergleiche und zusätzliche Performancequantile sind nicht als fertige
Quellen/Metriken ausgewiesen. Serverseitige Summen erfolgreicher Begehungen und
Favoriten sind vorbereitet, werden im ersten Cockpit aber noch nicht visualisiert.
Die Moonsight-Hub-Übernahme wartet auf geklärte Erkennung: altes `vercel.json`
ist kein Nachweis für den tatsächlich verwendeten Hostinger-Betrieb.

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
