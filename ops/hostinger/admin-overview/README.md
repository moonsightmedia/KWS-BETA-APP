# Admin-Übersicht und sichere Fehlerzuordnung

## Umfang und Freigabegrenze

Die Migration
`supabase/migrations/20261019110000_admin_overview_and_issue_actors.sql`
ergänzt ausschließlich diese beiden RPCs:

- `public.kws_admin_overview()` liefert aggregierte Kennzahlen ohne Kontaktdaten.
- `public.kws_admin_issue_events(text)` liefert maximal 50 technische
  `app_error`-Einzelberichte einer Fehlergruppe mit ihrer ursprünglichen
  Kontozuordnung.

Beide Funktionen prüfen serverseitig eine bestehende Auth-Identität mit
Adminrolle, verwenden `SECURITY DEFINER` mit leerem `search_path` und erhalten
Ausführungsrechte ausschließlich für `authenticated`. Die interne Adminprüfung
bleibt auch bei einem direkten RPC-Aufruf verbindlich. `anon`, `service_role`
und `PUBLIC` erhalten keine Ausführungsrechte.

Keine bestehende `kws_monitoring_*`- oder `kws_ingest_monitoring_events`-Funktion
wird geändert. Damit bleibt die von
`ops/hostinger/monitoring/verify_installation.py` geprüfte bestehende
Monitoring-Funktionssignatur unverändert. Das ist keine Freigabe, einen
abweichenden SQL-Kandidaten oder weitere Funktionen mitzuveröffentlichen.
Erfassung, Edge-Handler, Provider, Alarmempfänger und Versandmodi werden nicht
verändert. Der Web-Autodeployer führt diese Migration nicht automatisch aus.

## Sicher veröffentlichen

Die dokumentierte Zielumgebung ist der bestehende KWS-Host
`srv2044594` mit dem Container `supabase-db`. SSH benutzt die bestehende
verifizierte Verbindung von `kws-admin` zu `187.7.70.230` und die bereits
festgelegten Hostschlüssel. Zugangsdaten, private Schlüssel oder Tokens gehören
nicht in CLI-Argumente, Git, SQL-Protokolle oder dieses Runbook.

Bei der Vorbereitung am19.10.2026 war der bestehende SSH-Zugang nicht erreichbar.
Nach bestätigtem KWS-Hostinger-Konto wurde die Migration um11:04Berlin über den
bereits vorhandenen geschützten Betreiberzugang erfolgreich angewandt. Belege:
`docs/qa/2026-10-19-admin-overview.md`. SSH bleibt unverändert beschränkt.
Ohne bestätigten Zugriff auf genau diesen Host stoppen. Keine Firewall,
öffentlichen Ports, Passwörter oder Web-Autodeploy-Rechte zur Umgehung ändern.

Alternativ zum bestehenden SSH-Zugang kann der bereits eingerichtete HTTPS-
Betreiberzugang verwendet werden: äußere Basic-Authentifizierung und offizielles
`/pg/query` mit bestehendem Service-API-Key sowie verschlüsselter Verbindung zum
vorhandenen Datenbankadministrator `supabase_admin`. Die Werte stammen nur aus
Bitwarden `KWS_HOSTINGER_SUPABASE_CONFIG` und bleiben im Speicher. Niemals
Header, Verbindungszeichenketten oder Passwörter in Logs/URLs/Argumente schreiben.
Die Studio-Standardrolle `postgres` besitzt hier kein CREATE im Public-Schema;
keine Grants zur Umgehung ergänzen. Der alternative Weg ändert keine Rechte und
ersetzt keine Sicherungs-, Hash-, Ziel- oder Negativprüfung.

1. Den exakten Git-Stand und ausschließlich die neue Migration prüfen. Lokal
   `node --test test/adminOverviewDatabase.test.mjs test/monitoringDatabase.test.mjs`
   ausführen. Eine fehlende PGlite-Laufzeit ist ein Fehler, kein Grund, die
   SQL-Prüfung zu überspringen.
2. Einen aktuellen, verifizierten Produktionsbackupstand und ein verschlüsseltes
   Schema-Backup über den bestehenden Betreiberprozess sicherstellen. Keine
   unverschlüsselten Produktdaten in das Repository oder einen öffentlichen
   Downloadpfad exportieren. Die neue Migration erstellt selbst kein Backup.
3. Die geprüfte SQL-Datei über den bestehenden freigegebenen Betreiberzugang in
   ein geschütztes Verzeichnis übertragen. Lokal und auf dem Zielserver den
   SHA-256 vergleichen; erst den tatsächlich geprüften Kandidaten freigeben.
   Auf dem Zielserver Hostname, Container und Datenbank erneut prüfen. Keine
   private Serverkonfiguration durch Werte aus dem Webbuild ersetzen.
4. Als autorisierter Betreiber die geprüfte Datei ausführen, beispielsweise auf
   dem bestätigten Zielhost mit einem bereits freigegebenen absoluten Pfad:

   ```sh
   set -eu
   test "$(hostname -s)" = srv2044594
   docker exec -i supabase-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < /protected/reviewed/20261019110000_admin_overview_and_issue_actors.sql
   ```

   Der Beispielpfad ist kein eingerichteter Serverpfad. Vor dem Aufruf durch den
   verifizierten geschützten Kandidatenpfad ersetzen. Den Exitcode prüfen;
   Fehler nicht mit einer nachfolgenden erfolgreichen Ausgabe verdecken.
   Die Datei enthält ihre eigene Transaktion mit `BEGIN`/`COMMIT` und am Ende
   `NOTIFY pgrst,'reload schema'`. Ein äußerer `ROLLBACK` ist **kein** Probelauf.
   Testausführungen gehören in PGlite beziehungsweise eine isolierte Testdatenbank.
5. Die vorhandene Monitoring-Funktionssignatur vor und nach dem Eingriff mit der
   bestehenden `SCHEMA_SIGNATURE_SQL` aus `verify_installation.py` vergleichen.
   Abweichungen stoppen den Rollout; nicht den bestehenden Beleg ungeprüft
   überschreiben. Bestätigen, dass nur die beiden neuen RPCs angelegt wurden.
6. Die nachstehenden Zugriffs- und Datenprüfungen ausführen. Rohantworten mit
   Kontakten nicht in öffentliche Logs oder Screenshots übernehmen. Erst nach
   erfolgreicher Backendprüfung den Webstand über den normalen PR-/CI-/Main-
   Ablauf veröffentlichen. App und Landingpage bleiben ein gemeinsamer Release.

## Verifikation

- Ein nicht angemeldeter Aufruf und ein Aufruf mit einem normalen Nutzerkonto
  müssen für beide RPCs scheitern. Ein Admin-Token eines nicht mehr bestehenden
  Auth-Kontos darf nicht akzeptiert werden. Keine Produktkonten zum Test löschen
  oder Rollen an echten Nutzern ändern; synthetische Löschprüfungen sind bereits
  in den isolierten SQL-Tests enthalten.
- Mit einem bestehenden Adminzugang `kws_admin_overview` lesen: `schema_version`
  ist `1`, Bestandszahlen sind nichtnegative Ganzzahlen, `period_start` und
  `period_end` umfassen genau 24 Stunden und `generated_at` entspricht dem Ende.
  Unbekannte Sentry-Zahlen sind `null`, nicht `0`.
- Eine vorhandene App-Fehlergruppe lesend öffnen. Das Ergebnis enthält höchstens
  50 nicht ausgeschlossene `app_error`-Berichte, sortiert nach Empfangszeit.
  Unbekannte Fehlergruppen liefern eine leere Liste; ungültige Fingerprints
  werden abgewiesen. Keine echten Fehler zur Prüfung als behoben markieren.
- Ein Kontolink muss exakt das im Originalbericht verknüpfte Konto auswählen.
  Nicht vorhandenes Profil, fehlende Zuordnung oder ein ungültiger Link dürfen
  niemals ein anderes Konto öffnen. Alter oder Anzahl der Benutzerlisteneinträge
  sind kein Identitätsnachweis.
- Eine fehlende neue Ereignis-RPC kann vom Webclient auf die alte Diagnose-RPC
  zurückfallen. Das bedeutet ausdrücklich „Nutzerzuordnung nicht verfügbar“,
  nicht „Gast“. Berechtigungsfehler dürfen nicht umgangen werden. Die
  Admin-Übersicht zeigt bei fehlender Einrichtung keine Ersatznullen.
- Desktop und Mobilansicht prüfen: Übersicht, Nutzerprofil-Link im neuen Tab,
  Fehlerdetails, Lade-/Fehler-/Leerezustände und veraltete Daten. Technikbericht
  kopieren und sicherstellen, dass weder Name noch E-Mail oder rohe Konto-ID der
  neuen Zuordnung enthalten sind.

## Identität, Datenschutz und Löschung

Die Zuordnung erfolgt ausschließlich über `monitoring_events.user_id` des
einzelnen ursprünglichen Ereignisses und ein noch existentes `auth.users`-Konto.
Anzeigename und E-Mail kommen nur aus dessen exakt zugehörigem `profiles`-Datensatz.
Sitzungsinhaber, spätere Anmeldung, Gerätekennung, pseudonyme Referenzen und
Sentry-Referenzen werden nicht zur Namensauflösung benutzt.

- `account`: Das ursprüngliche Konto existiert. Die Konto-ID ist verlinkbar;
  Name und E-Mail dürfen trotzdem fehlen, insbesondere ohne Profil.
- `guest`: Das Ereignis wurde ohne Konto-ID gemeldet. Das umfasst auch Fehler,
  bevor die Anmeldung beim App-Start wiederhergestellt war; es beweist nicht,
  dass die Person kein Konto besitzt.
- `unassigned`: Eine sichere Kontozuordnung fehlt trotz ursprünglicher
  Kontoreferenz. Kontaktfelder und Konto-ID bleiben `null`.

Anzeigenamen sind auf 200 Zeichen begrenzt. Eine E-Mail mit mehr als 254 Zeichen
wird nicht zu einer anderen Adresse abgeschnitten, sondern als `null` geliefert.
Die bestehende Konto-Löschfunktion entfernt zugeordnete Ereignisse und Sitzungen
weiterhin vollständig. Keine Zuordnung wird nach einer Kontolöschung
rekonstruiert. Aufbewahrung und Einwilligungsmodell werden nicht erweitert.

Die Kontakte sind nur in den geschützten Einzelberichten vorgesehen, nicht in
der Fehlerarbeitsliste, aggregierten Übersicht, Live-Nutzung, Nutzungsstatistik,
Sentry-Übertragung oder im kopierten Technikbericht. Die Live-Zahl bleibt eine
namenlose Teilmenge der Nutzer mit Statistikzustimmung.

## Kennzahlendefinitionen und Grenzen

`kws_admin_overview()` verwendet einen stabilen Datenbank-Snapshot. Alle Felder
mit `_24h` zählen im gelieferten Fenster einschließlich beider Grenzen. Andere
Felder sind aktuelle Bestände beziehungsweise offene Arbeit, nicht Tageszugänge.
Jede Tabellenaggregation liefert einen Datensatz; es gibt keine
REST-Zeilenobergrenze und keine Multiplikation durch Inhalts-/Nutzerjoins.

| Bereich | Definition |
| --- | --- |
| `users.total`, `new_24h` | Alle aktuell bestehenden Auth-Konten, einschließlich Admins; neue Konten nach Erstellungszeit. Keine Store-Downloads und keine Gerätezahl. |
| `users.admins`, `setters` | Unterschiedliche bestehende Konten mit der jeweiligen Rolle. Rollen können sich überschneiden. |
| `users.deletions_pending`, `deletions_overdue` | Löschaufträge mit Status `pending` oder `processing`; überfällig bei `due_at` vor dem Snapshot. |
| `hall.boulders_hanging`, `boulders_removed` | Boulder mit Status `haengt` beziehungsweise `abgeschraubt`. Ein geplanter Boulderstatus existiert nicht. |
| `hall.areas_active`, `sectors_active` | Aktive Kunden-Hallenbereiche beziehungsweise aktive physische Sektoren, getrennte Tabellen. |
| `hall.scheduled_resets` | Zukünftige `sector_schedule`-Einträge. Mehrere physische Sektoren können zum selben gemeinsamen Schraubtermin gehören. |
| `moderation.comments_pending`, `reports_open` | Kommentare mit `moderation_status='pending'` beziehungsweise Inhaltsmeldungen mit `status='open'`. |
| `feedback.people_active`, `legacy_errors_active` | Feedback mit `open`/`in_progress`, getrennt nach `type<>'error'` und älterer automatischer Quelle `type='error'`. |
| `monitoring.app_active` | Offene oder in Bearbeitung befindliche Fehlergruppen mit mindestens einem aufbewahrten, nicht ausgeschlossenen `app_error`. Test-/Adminereignisse allein begründen keine Gruppe. Gruppen sind keine Personen. |
| `monitoring.sentry_active` | Importierte Sentry-Gruppen mit `status='unresolved'`, nur bei bestätigter aktueller vollständiger Quelle. Der Import deckt höchstens 90 Tage ab, nicht einen unbegrenzten Gesamtbestand. |
| `uploads.failed_24h` | Uploadprotokollzeilen mit `failed` oder `aborted_suspected_oom`, deren `updated_at` im Fenster liegt. Versuche, keine eindeutigen Dateien, Nutzer oder noch unbehandelten Supportfälle. |
| `uploads.processing_now`, `video_failed_now` | Boulder mit Videozustand `uploading`/`queued`/`processing` beziehungsweise `failed`. `uploading` bestätigt keine laufende Serververarbeitung; ein Zustand kann veraltet sein. |
| `notifications.*_24h` | Versandzustandsereignisse mit jeweiligem Status `created`, `provider_accepted`, `provider_rejected`, `failed` oder `opened` nach `created_at`. Keine eindeutigen Empfänger oder Nachrichten. Providerannahme beweist keine Zustellung oder Anzeige. |

Die Quellen melden `state`, ursprünglichen Betreiber-`status`,
`last_updated_at` und `last_success_at`:

- `collector`: letzter empfangener nicht ausgeschlossener Bericht; ohne Bericht
  `empty`, nach mehr als 24 Stunden `stale`. Das ist kein unabhängiger
  Ausfallmonitor und kein Erfassungs-Vollständigkeitsbeweis.
- `sentry`: nur `connected` mit Erfolg innerhalb von 15 Minuten ist `ready`.
  Teilimport (`partial`) oder Fehler ergibt `error`; veralteter, fehlender oder
  zukünftiger Erfolgszeitpunkt ergibt `stale`. Andernfalls `unconfigured`.
  Nur `ready` liefert einen numerischen `sentry_active`-Wert; sonst `null`.
- `alerts`: dieselbe Statuslogik, Aktualitätsgrenze fünf Minuten. Ein erfolgreicher
  Job bestätigt keine tatsächliche Postfachzustellung einer Alarm-E-Mail.
- `stores`: dieselbe Statuslogik, Aktualitätsgrenze 72 Stunden. Die Übersicht
  erfindet keine offizielle Downloadzahl und summiert keine inkompatiblen Store-
  Metriken. Ein Quellenstatus allein ersetzt keinen geprüften Storebericht.

Die Fehlerarbeitsliste kann auf 30 Tage und maximal 200 Gruppen begrenzt sein,
während die Übersicht aktive aufbewahrte Gruppen zählt. Die Detailzuordnung
umfasst maximal 50 letzte Einzelberichte, unabhängig vom Listenzeitraum.
Weder diese Begrenzung noch eine fehlende Quelle ist ein Nachweis, dass keine
weiteren Fehler oder betroffenen Nutzer existieren.

## Rücknahme

Wenn der neue Webstand zurückgenommen werden muss, den bestehenden gemeinsamen
App-/Landing-Rollback verwenden. Anschließend kann ein autorisierter Betreiber
die vorher geprüfte Datei `ops/hostinger/admin-overview/rollback.sql` auf genau
dem bestätigten Zielhost mit derselben `psql`-Ausführung und
`ON_ERROR_STOP=1` anwenden. Auch diese Datei enthält ihre eigene Transaktion.

Die Rücknahme entfernt ausschließlich `kws_admin_issue_events(text)` und
`kws_admin_overview()` und lädt den PostgREST-Schemacache neu. Sie löscht keine
Produkt-/Diagnosedaten, ändert keine bestehenden Monitoring-Funktionen,
Berechtigungen anderer Funktionen, Löschtrigger, Versandjobs oder Provider.
Abschließend die unveränderte bestehende Monitoring-Funktionssignatur und den
alten Diagnosezugriff prüfen. Nicht die ursprüngliche Monitoringmigration
rückgängig machen und keine gesamte Datenbank zur Entfernung zweier RPCs
wiederherstellen.
