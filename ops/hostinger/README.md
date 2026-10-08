# KWS Hostinger: vorbereitete Migration

Diese Skripte sind für `srv2044594` (`187.7.70.230`) und den geprüften Geräteschlüssel dieses Laptops bestimmt. Sie sind kein automatisch wiederholbarer Produktions-Deploy. Aktueller Stand und Migrationsablauf: `docs/KWS_SELF_HOSTED_MIGRATION.md`.

## Bestehender Zielstand

- `/opt/kws/supabase/runtime`: offizielles Supabase, leere Datenbank, ausschließlich private Ports.
- `/opt/kws/web`: privater Frontend-Build; API-/Video-URLs Loopback.
- `/opt/kws/edge`: Caddy, `127.0.0.1:9080`, keine öffentliche HTTPS-Konfiguration.
- `/opt/kws/video-private`: privater Testdienst, `127.0.0.1:9000`; keine kopierten Jobs, Publisher deaktiviert.
- `/var/backups/kws/migration`: rootgeschützte Vorsicherungen, Manifeste und Restore-Tests. Keine vollständige Datenbanksicherung vorhanden.

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

Geschützten DB-Zugang bestätigen, vollständige Rollen-/Schema-/Datensicherung einschließlich Auth erstellen und in einer isolierten Probeumgebung wiederherstellen. Passwort über geschützte Laufzeitübergabe/Passwortdatei beziehen, nicht in `--db-url` oder sonstigen Prozessargumenten verwenden. Danach Storage über das unterstützte Protokoll importieren, Betriebskonfiguration übertragen und Daten-/Rechte-/App-Tests durchführen. DNS, native Clients und Schreibsperre erst danach koordinieren. Quelle weder ändern noch löschen, um fehlende Zugangsdaten zu umgehen.
