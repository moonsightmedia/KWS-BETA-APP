# KWS Hostinger: vorbereitete Migration

Diese Skripte sind für `srv2044594` (`187.7.70.230`) und den geprüften Geräteschlüssel dieses Laptops bestimmt. Sie sind kein automatisch wiederholbarer Produktions-Deploy. Aktueller Stand und Migrationsablauf: `docs/KWS_SELF_HOSTED_MIGRATION.md`.

## Bestehender Zielstand

- `/opt/kws/supabase/runtime`: offizielles Supabase, leere Datenbank, ausschließlich private Ports.
- `/opt/kws/web`: privater Frontend-Build; API-/Video-URLs Loopback.
- `/opt/kws/edge`: Caddy, `127.0.0.1:9080`, keine öffentliche HTTPS-Konfiguration.
- `/opt/kws/video-private`: privater Testdienst, `127.0.0.1:9000`; keine kopierten Jobs, Publisher deaktiviert.
- `/var/backups/kws/migration`: vollständige verschlüsselte Datenbankvorsicherung, Medienarchive und geprüfte Restore-Nachweise.
- `kws_restore_probe_20261008_121055`: separate wiederhergestellte Probe-Datenbank; Hauptdatenbank weiterhin leer. Private Auth/REST/Storage-Dienste auf 9998/9996/9997. Probe inzwischen bewusst durch Sicherheitspatches und Tests verändert; nicht für Cutover verwenden.

## Lesende Prüfungen

```powershell
node ops/hostinger/run-remote.mjs ops/hostinger/check-private-runtime.sh
node ops/hostinger/run-remote.mjs ops/hostinger/verify-media-backups.sh
pwsh -NoProfile -File ops/hostinger/export-source-media.ps1 -Tool inventory-source-rest.py
pwsh -NoProfile -File ops/hostinger/export-source-media.ps1 -Tool inventory-storage-counts.py
```

API-Inventare speichern neue geschützte Momentaufnahmen auf dem VPS; sie sind kein konsistenter DB-Export. Der Restore-Prüfer erzeugt beim ersten Lauf eine neue isolierte Dateikopie. Bereits geprüfte Kopien werden als vorhanden gemeldet, nicht erneut geprüft. Unvollständige frühere Restore-Verzeichnisse führen zum Abbruch und müssen zunächst untersucht werden.

## Einmalige Einrichtung und Vorsicherungen

`bootstrap.sh`, `prepare-supabase.sh`, `initialize-runtime.sh`, `start-private-supabase.sh`, `transfer-source.mjs`, `build-private-web.sh`, `start-private-web.sh` und `start-private-video.sh` wurden in dieser Reihenfolge verwendet. Nicht blind erneut ausführen: Konfigurationen und Testbuilds werden teilweise neu geschrieben. `repair-private-bootstrap.sh` ist ausschließlich für den dokumentierten fehlgeschlagenen Erststart einer **leeren** Datenbank; er wurde einmal ausgeführt, bewahrt das alte Datenverzeichnis und verweigert eine Wiederholung.

`copy-video-preliminary.mjs` streamt das Quellverzeichnis verschlüsselt auf den neuen VPS. `export-source-media.ps1` mit Standardtool kopiert tatsächliche Storage-Objekte und verschlüsselt das Archiv. Beide Vorsicherungen lesen eine laufende Quelle und ersetzen nicht die abschließende Sicherung nach kontrollierter Schreibsperre.

Zugangsdaten ausschließlich aus Bitwarden beziehungsweise geschützten Serverdateien beziehen. `save-server-secret.ps1` hat die neue Supabase-Konfiguration und den age-Wiederherstellungsschlüssel in Bitwarden gesichert; bestehende Referenzen werden nicht überschrieben. Keine `.env`, Dumps, Manifeste oder privaten Schlüssel einchecken.

Vorläufig sind Sicherungen nur auf dem neuen VPS beauftragt. Das schützt nicht vor vollständigem Verlust des VPS. Langfristige Intervalle, Aufbewahrung und ein unabhängiges Sicherungsziel bleiben offen.

## Nächster Ausführungsschritt

Quell-Dashboard und Postgres 17.6 sind bestätigt. `source-preflight.sql` wurde im Dashboard rein lesend ausgeführt; keine Inhalte von Auth-Hashes oder Tokens ausgeben. `prepare-database-export.sh` installiert die geprüfte CLI 2.120.0 separat auf dem Ziel; `check-source-tls.sh` verifiziert den Session-Pooler mit der aus dem angemeldeten Dashboard bezogenen öffentlichen Supabase-CA. Diese Vorbereitung stellt keine authentifizierte DB-Verbindung her und erzeugt keinen Dump.

DB-Zugang ist bestätigt und vollständiger Export/Probe-Restore geprüft; siehe `docs/qa/2026-10-08-migration-restore.md`. Nächste Phase: DNS-Zugang/API-Domain und SMTP bereitstellen; URLs, öffentliche TLS-Konfiguration, Realtime/Functions/Push und Web/native Clients prüfen. Erst danach finale Schreibsperre, neuen ruhenden Gesamtbestand sichern, sauberes finales Ziel wiederherstellen und Umschaltung koordinieren. Quelle und vorbereitende Sicherungen erhalten.

`capture-source-db-secret.ps1` ist die manuelle, verborgene Eingabe für die neue Bitwarden-Referenz `AI Shared/KWS_SUPABASE_DB_PASSWORD`. Es verändert kein Passwort bei Supabase. Offengelegte Werte gemäß Zugangsablauf zuerst manuell erneuern. Das Skript verweigert das Ersetzen einer vorhandenen Referenz und zeigt nur den Referenznamen, niemals den Wert.

## Erprobter Datenbankablauf

Diese Befehle dokumentieren die ausgeführten Schritte; nicht blind als wiederholbaren Deploy behandeln. Neue Probes dürfen nicht mit bereits laufenden, anders gebundenen Probe-Containern verwechselt werden. Drei gefilterte Dateien allein reichen nicht: Anwendungstrigger auf Auth, Storage-Policies, originale Funktionstexte und exakte Grants gesondert übernehmen.

1. `run-source-database.ps1` führt `export-source-database.py` aus. Passwort kommt aus Bitwarden über SSH-stdin und libpq-Umgebung, nicht aus argv. Alle tatsächlichen Dumps in PG17-Client mit `verify-full`; gemeinsame exportierte Snapshot-ID für Schema, Daten und vollständiges Archiv. Der echte Schlüssel fließt niemals in CLI-Dry-run-Ausgaben. Künftige Dumps mit `--keep-comments`.
2. `verify-media-backups.sh` entschlüsselt auch das DB-Archiv und prüft sämtliche Dump-/Inventardateien gegen den geschützten Manifest. Ein erfolgreicher Dateirestore ersetzt nicht den Datenbank-Restore.
3. `upgrade-private-auth-compatibility.sh` aktualisiert ausschließlich das **leere** Hauptziel auf stabiles Auth 2.197.0. `check-database-restore-compatibility.sh` vergleicht Quell-/Zielspalten.
4. `restore-database-probe.sh` erstellt einen isolierten Clone des leeren Hauptziels mit verschlüsseltem Rollback-Dump. Hauptdienste kurz zum Clone anhalten und danach wieder healthy starten. Restore der App-/Auth-/Storage-Daten in einer einzigen Transaktion; Abbruch rollt sie zurück. Fehler-/Leerprobes bleiben erhalten.
5. `verify-database-probe.sh` vergleicht alle COPY-Spaltenwerte, Tabellenmengen/Zahlen und Sequenzen mit dem gesicherten Snapshot.
6. `restore-probe-schema-supplements.sh` übernimmt Storage-Policies und unveränderte Funktionstexte aus dem vollständigen Archiv. `compare-source-database-metadata.py` über `run-source-database.ps1 -Tool ...` vergleicht RLS, Policies, Funktionen/ACLs, Constraints, Indizes, Trigger und Realtime. `restore-probe-function-grants.sh` entfernt die nachgewiesenen zusätzlichen Zielgrants; `restore-probe-auth-triggers.sh` übernimmt beide Registrierungstrigger. Danach erneut Struktur-/Rechtevergleich.
7. `start-probe-services.sh` startet private Auth/REST/Storage-Container auf der Probe. Kein SMTP-Versand konfiguriert, Selbstregistrierung gesperrt. `import-probe-storage.sh` nutzt die Storage-API statt Rohkopie des Volumes, verifiziert sämtliche Downloads und bewahrt Quell-IDs/Besitzrechte/Datumsfelder neben neuen Dateiversionen.
8. `test-probe-api.sh` verändert ausschließlich die Probe: neue getrennte Testkonten, Testfarbe/-bilder und zwei ausgehende Push-Trigger als Stubs. Frühere fehlgeschlagene Ergebnisse bleiben erhalten. `apply-probe-security.sh` hat die separat versionierte Sicherheitsmigration nur in dieser Probe angewandt. Danach alle 39 Prüfungen bestanden.

Bei der finalen Migration: neuen Dump und Dateidelta nach nachgewiesener Schreibsperre, sauberes Ziel ohne Testkonten/Stubs, identischen vollständigen Vergleich **vor** bewussten Sicherheits-/URL-Anpassungen, diese Änderungen gesondert prüfen. Der vorhandene Probe-Stand ist kein finales Deployment.
