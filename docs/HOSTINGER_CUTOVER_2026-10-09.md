# Hostinger-Umzug: Produktionsstand 9. Oktober 2026

Die Web-App, Supabase und der Videodienst laufen seit dem 9. Oktober 2026 auf
dem Kletterwelt-VPS `srv2044594` in Düsseldorf (`187.7.70.230`).

## Zugänge

- App: https://beta.kletterwelt-sauerland.de
- Supabase API: https://beta-api.kletterwelt-sauerland.de
- Videos: https://video.kletterwelt-sauerland.de
- Supabase Studio auf diesem Laptop: http://127.0.0.1:18000/project/default
  nach `ops/hostinger/open-supabase-dashboard.ps1`. Der SSH-Tunnel muss laufen.
  Benutzer `kws-admin`, Passwort nur in Bitwarden
  `AI Shared/KWS_HOSTINGER_SUPABASE_CONFIG`, Feld `DASHBOARD_PASSWORD`.
  Studio und PostgreSQL sind weiterhin nicht öffentlich erreichbar.

## Übernommener und geprüfter Bestand

- 44 ursprüngliche Benutzerkonten inklusive Passwort-Hashes.
- 68 COPY-Tabellen, 17.454 Zeilen und beide Sequenzen beim finalen Restore
  exakt mit dem ruhenden Quellbestand abgeglichen.
- Vor bewussten Anpassungen: 35 Public-Tabellen, 145 Policies, 37 Funktionen,
  131 Constraints, 118 Indizes, 87 Trigger inklusive temporärer Schreibsperren
  und zwei Realtime-Einträge ohne Abweichungen verglichen.
- 2.389 Storage-Dateien / 440.125.701 Bytes über die neue API hochgeladen und
  wieder heruntergeladen; alle SHA256 identisch. Quell-IDs, Eigentümer und
  Datumswerte erhalten; interne Dateiversionen durch die Ziel-API erneuert.
- 590 Videodateien / 2.018.204.725 Bytes vollständig mit dem gestoppten
  Quell-Videodienst per Pfad, Größe und SHA256 verglichen.
- 136 referenzierte CDN-Dateien übernommen. Elf schon vor dem Umzug fehlende
  URLs bleiben ausschließlich in historischen Boulder-Operationslogs.
- 1.044 URL-Spaltenwerte auf neue Storage-/CDN-Zugänge umgestellt; alte Werte
  bleiben geschützt für eine koordinierte Rückmigration erhalten.

Der frische Kandidat `kws_restore_probe_20261009_141414` wurde atomar zu
`postgres` umbenannt. Die zuvor leere Bootstrap-Datenbank wurde erhalten.
Ältere Testdatenbanken wurden nicht als Produktion verwendet.

## Funktions- und Sicherheitsprüfung

37 Prüfungen im tatsächlichen Produktionssystem bestanden: Passwort-Anmeldung
und Session-Erneuerung, Nutzer/Setter/Admin, Profilprivatsphäre, Schutz gegen
Selbstbeförderung, Push-Aufrufberechtigung und Besitzerprüfung, Video-Rollen,
Realtime mit Sichtbarkeit eigener und Sperrung fremder Benachrichtigungen.
Alle synthetischen Konten und Benachrichtigungen wurden entfernt.

Öffentliches HTTPS, Auth-Health, 104 Boulder, 19 Sektoren, Dateizugriff aus allen
fünf Storage-Buckets, Videowiedergabe mit Range-Requests sowie CDN-Bytes geprüft.
Browser zeigt die 104 Boulder; HD-Video bis zum Ende geladen/abgespielt, kein
Playerfehler. Der beim Browsertest gefundene CORS-Matcherfehler wurde korrigiert;
Web- und native Origins plus eine abgelehnte fremde Origin wurden geprüft.

Der neue Videodienst veröffentlicht ausschließlich in das neue Backend.
Die neue interne Push-Serviceberechtigung liegt verschlüsselt in PostgreSQL
Vault. Reale Push-Zustellung auf einem physischen Gerät bleibt separat offen.

## Sicherungen und Rückfallgrenze

Vollständige Produktionssicherung `20261009T143359Z.tar.age` erstellt und
entschlüsselt geprüft: 4.225 Dateien, alle 2.389 Storage-Versionen, 448
Medienreferenzen sowie Konfiguration und der notwendige Vault-Wurzelschlüssel.
Isolierter Datenbank-Restore `kws_backup_restore_20261009_143419` geprüft:
73 Tabellen mit 17.618 exakt übereinstimmenden Zeilen, zwei Sequenzen und
funktionierende Vault-Entschlüsselung.

Der systemd-Timer `kws-production-backup.timer` ist aktiv: täglich 03:30 UTC
plus bis zu zehn Minuten Verzögerung. Verschlüsselte Sets werden nach sieben
täglichen und bis zu vier wöchentlichen Repräsentanten aufbewahrt.
Archive liegen unter `/var/backups/kws/production`.
Die Entschlüsselungsidentität liegt zusätzlich in Bitwarden unter
`AI Shared/KWS_HOSTINGER_MIGRATION_AGE_IDENTITY`.

Eine zusätzliche NAS-Übertragung läuft. Bisher verifizierte Vorsicherungen:
Datenbank und Storage. Vollständigkeit der NAS-Medienkopie und des finalen
NAS-Gesamtstands noch nicht bestätigt; keine automatisierte tägliche
Offsite-Synchronisierung eingerichtet. NAS-Ziel:
`M:\Customer\Boulder und Kletterwelt GmbH\KWS BETA APP\Backups\Hostinger Migration\2026-10-09`.

Die Cloud-Datenbank bleibt schreibgesperrt; der alte KWS-Video-Container bleibt
gestoppt. Die Originale werden erhalten. Seit `PUBLIC-WRITES-ENABLED.json`
darf kein DNS-only-Rollback oder unkoordiniertes Entsperren der alten Quelle
erfolgen: neue Änderungen könnten sonst verloren gehen. Eine Rückmigration
muss neue Zieländerungen zuerst sichern und zusammenführen.

## Erforderliche Client-Aktualisierung und verbleibende Launch-Arbeit

- Android: `output/hostinger-cutover/KWS-Beta-Hostinger-1.0.53.apk` installieren.
  Gleiche Signatur wie die bisherige APK, tatsächliche Installation noch offen.
- iPhone des Routenbauers: TestFlight-Build **81** installieren, in `KWS Team`
  als „Im Test“ bestätigt. Bisheriger Build 80 verbindet sich mit der alten,
  jetzt schreibgesperrten Cloud-Datenbank.
- Web-App neu laden und gegebenenfalls erneut anmelden. Bestehende Passwörter
  bleiben erhalten; alte Cloud-Sessions wechseln nicht automatisch das Backend.
- Bestätigungs-/Reset-Mails verwenden vorerst `beta@kletterwelt-sauerland.de`,
  Antworten an `marketing@kletterwelt-sauerland.de`. SMTP vorher real getestet.
  `app@` benötigt weiterhin die externe Microsoft-365-Administration.
- Reguläre Store-Veröffentlichung, Apple-Organisationsumstellung, Google-Konto,
  rechtliche/Moderations-Launchpunkte und Veröffentlichung des Posts sind
  eigenständige noch offene Arbeiten. Der Serverumzug ist keine Store-Freigabe.
- TypeScript hat weiterhin 79 vorhandene Diagnosen außerhalb dieser
  Betriebsänderungen; keine vollständig fehlerfreie TypeScript-Prüfung behauptet.

Serverseitige Belege: `/opt/kws/production/DATABASE-PROMOTED.json`,
`RUNTIME-VERIFIED.json`, `PUBLIC-CUTOVER-VERIFIED.json`, `CORS-VERIFIED.json`
und die `.restore-verified.json` neben dem Produktionsbackup.
