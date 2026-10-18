# Beta-Monitoring: Betreiberjobs

Diese Python-Standardbibliothek-Jobs ergänzen den bestehenden App-Admin. Sie
aktivieren sich weder durch einen Webbuild noch durch das Einchecken dieser
Dateien. Standard ist `collection_enabled: false`, Alarmmodus `shadow`, Sentry
und Storeimporte deaktiviert. Ein produktiver Versand erfordert eine privat
konfigurierte, ausdrücklich autorisierte einzelne Empfängeradresse und einen
erneut geprüften Installationsplan.

## Umfang und Grenzen

| Job | Umsetzung | Grenze |
| --- | --- | --- |
| Fehleralarme | Service-RPC mit Lease, persistente SQLite-Sendebilanz, höchstens ein Alarm pro Lauf, Timer jede Minute | `accepted` bedeutet SMTP-Annahme; tatsächlicher Posteingang ist nicht bestätigt |
| Sentry | Ausschließlich lesendes GET der Organisations-Issues, ausgewählte Projekte, maximal 500 Issues aus 90 Tagen, alle Status | `!has:report_id` schließt den bereits lokal gemeldeten JS-Pfad aus; native Geräte-/Symboltests bleiben erforderlich |
| Stores | Idempotenter Import geprüfter täglicher Gesamtwerte als UTF-8-CSV, täglich | Kein automatischer Apple-/Google-API-Abruf; keine Downloads ohne offizielle Datenquelle |
| Aufbewahrung | Täglicher Aufruf der mit der Migration definierten Löschregeln; lokale Sendebilanz nach 100 Tagen bereinigen | Erst nach aktivierter Installation; externe Sentry-Aufbewahrung separat |

Der SQL-Ingest erzeugt kritische Alarme sofort und bei mindestens fünf
betroffenen App-Instanzen desselben Problems innerhalb von 15 Minuten. Identische
Probleme werden 30 Minuten gebündelt. SQL-Queues verhindern konkurrierende
Claims. Fällt der Datenbank-Ack nach SMTP-Annahme aus, verhindert die lokale
Sendebilanz erneuten Versand. Bei Verbindungsabbruch während SMTP-DATA oder
Prozessabbruch nach Sendebeginn wird `uncertain` gespeichert und nicht automatisch
erneut gesendet. Ein Betreiber muss diesen Fall anhand seiner Mailbox prüfen.
Sentry-Nutzerzahlen werden nicht als App-Instanzen ausgegeben. Alarme enthalten
Referenz, Schwere und Summen, keine Rohfehlermeldung, Empfängerlisten, Nutzer-IDs
oder Stacktraces.

## Installation vorbereiten

Erforderlich sind Linux/Python 3.10+, `docker`, lokaler Container `supabase-db`,
die freigegebene Monitoringmigration und der bestehende SMTP-Runtime-Pfad. Die
Zieldateien liegen unter `/opt/kws/monitoring`; der geschützte Zustand unter
`/var/lib/kws-monitoring`. Nur der festgelegte VPS-Host und root dürfen installieren.

1. `config.example.json` außerhalb von Git als private Kandidatenkonfiguration
   ablegen (`0600`). Geheimnisse bleiben in bestehenden geschützten Runtime-Dateien
   oder werden zur Laufzeit aus Bitwarden bereitgestellt.
2. Die Quellen gezielt konfigurieren. `client.sentry_dsn` und
   `client.sentry_org_url` sind nullable öffentliche Clientkonfiguration, keine
   Sentry-API-Tokens. `collection_enabled` ist der explizite Webbuild-Schalter.
   Der sichere Beispielwert aktiviert keine Erfassung.
3. Bei Sentry benötigt `/opt/kws/monitoring/credentials.json` (`0600`) den
   Laufzeitschlüssel `sentry_token` mit minimalem `event:read`-Zugriff. Keine
   personenbezogene Adresse oder Tokenwerte in Repository, CLI-Argumenten oder
   Protokollen hinterlegen.
4. Den Plan ohne `--execute` erzeugen und vollständige Änderungen prüfen:

```sh
python3 install.py --config /protected/monitoring-candidate.json --start-jobs
```

Der Plan enthält ausschließlich Konfigurationshash, Artefakthashes,
Empfängerhash, Zielpfade und Modi. Er schreibt nichts und versendet nichts.
Erst die identische Ausführung mit `--execute --approved-plan-sha256 <reviewed>`
installiert Dateien und aktiviert die angegebenen Timer. Bei `alert_mode: live`
ist zusätzlich `--allow-live-alerts` in Plan und Ausführung erforderlich; das ist
eine technische Schutzschranke, keine Ersatzfreigabe für eine unbekannte Adresse.
Ohne `--start-jobs` werden nur Dateien vorbereitet.

`activation.json` bindet Konfiguration und ausgeführten Pythoncode. Änderungen
daran schließen alle Jobs bis zur erneuten Prüfung. Für spätere reine
Konfigurationsänderungen den Plan mit `--reconfigure` erstellen und mit dessen
Hash ausführen. Das erhält die Sendebilanz, sichert die alte Konfiguration privat
und stoppt laufende Jobs vor der Umschaltung. Codeänderungen erfordern eine
separate Upgradeprüfung; `--reconfigure` überschreibt keine fremden Änderungen.

## Edge-Handler vorbereiten

Der Live-Mount wurde lesend bestätigt:
`/opt/kws/supabase/runtime/volumes/functions` ist in `supabase-edge-functions` als
`/home/deno/functions` gemountet. Der vorhandene Mainservice leitet Slugs weiter.
JWT-Prüfung und Dispatcher bleiben erhalten; Gastclients verwenden den gültigen
Anon-Bearer, angemeldete Clients ihren Auth-Bearer.

```sh
python3 edge_install.py --source /protected/reviewed-functions --restart-functions
```

Der Quellordner muss `monitoring-events/{index,handler}.ts` und
`send-push-notification/{index,handler}.ts` enthalten. Der Defaultlauf prüft nur
Dateien und zeigt Vorher-/Nachher-Hashes. Die identische Ausführung mit
`--execute --approved-plan-sha256 <reviewed>` prüft Host, Docker-Mount und
unveränderte Ausgangsdateien, sichert alte Handler privat und ersetzt diese vier
Dateien. Ein Restart erfolgt nur mit dem im Plan enthaltenen Flag.

Die geschützte Receipt `/opt/kws/monitoring/edge-installation.json` enthält
Dateihashes, Planhash, Mountprüfung, Restartstatus und Zeitpunkt. Sie bestätigt
keinen echten Ingest und keinen nativen Crashtest (`ingest_verified: false`,
`native_crashes_verified: false`). Der Release-Gate muss zusätzlich einen echten
End-to-End-Test nachweisen. Bei Rollback alte Dateien aus dem ausgewiesenen
Backup wiederherstellen; neu hinzugefügte Handler anhand des Vorherplans entfernen
und den Container kontrolliert neu starten. Keine Migration wird von diesem
Installer ausgeführt.

Die API-Whitelist wird separat mit `route_install.py` geprüft und erst mit
`--execute --approved-plan-sha256 <reviewed>` um exakt `/monitoring-events`
erweitert. Der Installer bindet `/opt/kws/production/API.Caddyfile` an den
bestätigten Container-Mount, validiert Caddy und startet ausschließlich
`kws-api-internal` kontrolliert neu. Das verursacht eine kurze API-Unterbrechung.
Die Caddy-Admin-API bleibt deaktiviert. Bei fehlgeschlagener Aktivierung werden
die vorherigen Bytes wiederhergestellt und der Container erneut gestartet.
JWT-Prüfung, unbekannte Slugs und andere Routen bleiben unverändert.

Den tatsächlichen Ingestnachweis erzeugt das manuelle Operatortool:

```sh
python3 verify_installation.py --migration /protected/reviewed-monitoring-migration.sql
```

Der Standardlauf prüft nur lokale, freigegebene Konfiguration und Handlerhashes.
Erst `--apply` auf dem festgelegten VPS als root sendet zweimal denselben
kontrollierten `app_error` über den echten öffentlichen Ingest. Der Test ist
`channel=test`, hat keine Nutzungsfreigabe und ist fatal, damit die SQL-Prüfung
den Ausschluss einschließlich Alarmunterdrückung tatsächlich belegt. Das Tool
prüft genau einen gespeicherten Datensatz, ausgeschlossene Installation/Sitzung
und keine Alarmqueue für das Testproblem. Es versendet keine Mail/Pushnachricht.

Nur nach Erfolg wird `ingest-verification.json` (`0600`) geschrieben. Diese
Receipt bindet `config_sha256`, `migration_sha256`, die vier Handler unter `files`
und `database_signature` (geordnetes MD5 der aktuellen Monitoring-
Funktionsdefinitionen). Eine Definition-/Handler-/Konfigurationsänderung macht
die alte Verifikation ungültig. Änderungen während des Tests brechen den
Nachweis ab. Der Verifier ist ein manuelles Stagingtool und gehört nicht zu den
sechs dauerhaft installierten Workerartefakten. Native Crashes bleiben als
unverifiziert gekennzeichnet.

## Geprüfte Storewerte importieren

Unter `/opt/kws/monitoring/store-reports` liegen ausschließlich vollständige,
geprüfte tägliche Gesamtwerte für die jeweilige App. Das Format ist bewusst ein
normalisierter Adapter und kein ungeprüfter Parser beliebiger Storedateien:

```csv
source,metric,metric_date,value,source_timezone,app_identifier,channel,period_kind
```

| source / channel | Erlaubte metric |
| --- | --- |
| `app_store` | `first_time_downloads`, `redownloads` |
| `google_play` | `new_users`, `new_devices`, `install_events` |
| `testflight` | `installations`, `sessions`, `crashes` |

`period_kind` muss `daily` sein. `metric_date` bezeichnet den Quelltag, nicht das
Importdatum. `source_timezone` ist eine verifizierte IANA-Zeitzone; Grenzen werden
mit dem korrekten Tagesoffset gespeichert. Quellenzeitzonen werden nicht pauschal
nach Berlin verschoben. Storedefinitionen bleiben im Datensatz. Echte Nullen
können importiert werden; fehlende Berichte erzeugen keine künstlichen Nullwerte.

TestFlights in der Buildtabelle angezeigte kumulative Installs/Crashes und
rollierende Siebentagessitzungen sind keine Tageswerte. Sie dürfen nicht in
dieses Format umbenannt werden. Ohne nachweisbaren täglichen Export bleiben
TestFlight-Tageswerte nicht verbunden. Google-CSV-Felder wie `Daily User Installs`
dürfen ohne bestätigte Definition nicht als `new_users` umgedeutet werden.
Apple-Downloadreportsegmente enthalten Nachlieferungen/Korrekturen: zuerst einen
geprüften Tagesstand gemäß Providerregeln herstellen; Segmente nicht ungeprüft
summieren. Unterschiedliche Aufschlüsselungen nicht zusammenzählen.

Dateien mit überlappenden App-/Quellen-/Kennzahl-/Tageskombinationen werden
abgelehnt. Ein korrigierter Tagesstand ersetzt die vorherige Datei. Die Datenbank
ersetzt denselben Schlüssel, statt Werte zu addieren. Dateihashes dokumentieren
Revisionen. Unveränderte Dateisätze werden nicht erneut importiert und erneuern
keinen Aktualitätszeitpunkt. Das Cockpit prüft zusätzlich das Alter des letzten
Quellzeitraums; ein erfolgreicher Import alter Zahlen ist keine aktuelle Messung.

Prüfung ohne Datenbankänderung:

```sh
python3 store_importer.py --file /protected/reviewed-daily-totals.csv
```

Maximal 31 Dateien, 500 Tageswerte und 1 MiB pro Datei je Lauf. Die Timer holen
keine neuen Berichte aus den Stores; sie übernehmen die bereitgestellten,
geprüften Dateien. Automatischer Providerzugriff muss separat mit tatsächlich
vorhandenen Rollen und einem abgenommenen Berichtsadapter ergänzt werden.

## Betrieb und Prüfung

Alle Worker laufen ohne `--apply` ausschließlich als Dry-run, ohne Mail,
Providerzugriff oder Datenbankänderung. Fehlende Sentry-Credentials erscheinen
als `not_connected`, deaktivierte Quellen als `disabled`; Importfehler erhalten
feste Fehlercodes ohne Providerantworten oder Geheimnisse im Journal. Die SQL-
RPCs sind ausschließlich `service_role` zugänglich. Python übergibt Daten per
stdin an den lokalen Container, ohne DB-Schlüssel in Prozessargumenten.

```sh
python3 -m unittest discover -s ops/hostinger/monitoring -p 'test_*.py' -v
```

Offline-Tests decken SMTP-Mehrfachschutz/Neustart/Ackverlust/unklare Annahme,
sichere Meldungen, Sentry-Paginierung/Negativfilter/fehlende Credentials,
Storekorrekturen/Zeiträume/Mehrfachzählungen und die Aktivierungsgrenzen ab.
Ein externer Ausfallmonitor läuft nicht auf diesem VPS: die vorhandene
Moonsight-Hub-Anbindung benötigt zunächst die Auflösung des mehrdeutigen
`moonmon detect --mode adopt`-Befunds (Vite unbekannt; altes `vercel.json` wird als
Provider erkannt). Es wurde kein Ersatzmanifest erfunden.

Am 18.10.2026 nach ausdrücklicher Veröffentlichungsfreigabe installiert:
frisches verschlüsseltes Backup, Monitoringmigration, vier Edge-Dateien,
gezielte API-Route und vier Betreiber-Timer. Der öffentliche Ingest wurde mit
einem ausgeschlossenen Test zweimal auf genau einen Datensatz und keine Alarme
geprüft. Alarmmodus ist `live`; die autorisierte Adresse steht nur in der privaten
Konfiguration. Ein eindeutig markierter SMTP-Test wurde angenommen, ohne einen
echten Fehler oder Nutzerereignisse zu erzeugen. Das bestätigt nicht den
Posteingang. Sentry- und Storeimporte bleiben deaktiviert. Web-/Native-Release
und tatsächliche Geräteprüfung sind hiervon getrennte Nachweise.

Offizielle Quellen, geprüft am 17.10.2026:

- [Sentry Organisations-Issues](https://docs.sentry.io/api/events/list-an-organizations-issues/)
- [Sentry Suchnegation](https://docs.sentry.io/concepts/search/), [has-Feld](https://docs.sentry.io/concepts/search/searchable-properties/issues/)
- [Apple Downloaddefinitionen und Berichtskorrekturen](https://developer.apple.com/documentation/analytics-reports/app-download)
- [Apple TestFlight-Metriken](https://developer.apple.com/help/app-store-connect/test-a-beta-version/view-build-status-and-metrics/)
- [Google monatliche CSV-Berichte und Zugriffsrollen](https://support.google.com/googleplay/android-developer/answer/6135870?hl=en)
# Provider-Zugriff vor Aktivierung prüfen

Der manuell startbare GitHub-Workflow `Monitoring provider readiness` läuft nur
auf `main`. Er nutzt vorhandene GitHub-Secrets ausschließlich auf dem Runner,
stellt nur GET-Anfragen und exportiert keine privaten Schlüssel, Tokens,
Testeridentitäten oder Fehlerereignisse. Das kurzlebige Ergebnisartefakt enthält
nur Zugriffsstatus, die öffentliche Sentry-DSN und aggregierte TestFlight-Zahlen
der fünf neuesten Builds. Fehlende Rechte bleiben ausdrücklich sichtbar.

TestFlight-Werte behalten den vom Provider gelieferten Zeitraum. Sie sind weder
tägliche Store-Downloads noch eindeutige neue Personen und dürfen nicht in den
Daily-CSV-Importer umgedeutet werden. Eine erfolgreiche Provider-Prüfung
aktiviert weder native Crash-Erfassung noch Importe oder externe Alarme.

Quellen: [Apple Build-Metriken](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-builds-_id_-metrics-betabuildusages),
[Apple Metrikdefinitionen](https://developer.apple.com/help/app-store-connect/test-a-beta-version/view-build-status-and-metrics/).

