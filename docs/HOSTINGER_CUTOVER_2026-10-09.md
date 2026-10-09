# Hostinger-Umzug: Produktionsstand 9. Oktober 2026

Die Web-App, Supabase und der Videodienst laufen seit dem 9. Oktober 2026 auf
dem Kletterwelt-VPS `srv2044594` in Düsseldorf (`187.7.70.230`).

## Zugänge

- App: https://beta.kletterwelt-sauerland.de
- Supabase API: https://beta-api.kletterwelt-sauerland.de
- Videos: https://video.kletterwelt-sauerland.de
- Supabase Studio öffentlich: https://supabase.kletterwelt-sauerland.de
  HTTPS mit HTTP-Basic-Anmeldung für **alle** Routen, Benutzer `kws-admin` und
  dasselbe bisherige `DASHBOARD_PASSWORD`. Passwort nur in Bitwarden
  `AI Shared/KWS_HOSTINGER_SUPABASE_CONFIG`; auf diesem Laptop kopiert
  `ops/hostinger/copy-dashboard-password.ps1` es ohne Konsolenausgabe.
  Kein Supabase-Cloud-Konto notwendig. Die Browser-Anmeldung öffnet Studio,
  ein App-Nutzerkonto gewährt keinen Verwaltungszugang.
- Supabase Studio auf diesem Laptop: http://127.0.0.1:18000/project/default
  nach `ops/hostinger/open-supabase-dashboard.ps1`. Der SSH-Tunnel muss laufen.
  Benutzer `kws-admin`, Passwort nur in Bitwarden
  `AI Shared/KWS_HOSTINGER_SUPABASE_CONFIG`, Feld `DASHBOARD_PASSWORD`.
  Der Tunnel bleibt als alternativer Zugang verfügbar; PostgreSQL bleibt privat.

Die Anwendung nutzt **Supabase/PostgreSQL** als Datenbank. Firebase wird für
Push-Benachrichtigungen verwendet, nicht als App-Datenbank.

## Medien und Komprimierung

- Fertige Videos und **neue** Thumbnails: `/opt/kws/video-production/data/final`,
  nach Sektor geordnet, öffentlich unter `https://video.kletterwelt-sauerland.de/videos/`.
- Die beim Umzug übernommenen CDN-Thumbnails: `/opt/kws/web-production/media`,
  öffentlich unter `https://beta.kletterwelt-sauerland.de/migrated-cdn/`.
- Supabase Storage für weitere App-Dateien liegt als Docker-Bind-Mount auf dem
  neuen VPS. Der derzeitige Live-Pfad lautet
  `/var/backups/kws/migration/kws_restore_probe_20261009_141414/storage-files`.
  Trotz des Namens ist dieser Ordner **produktiver Storage**, kein löschbarer
  Sicherungsrest. Dateien nicht manuell verschieben oder aufräumen.
- FFmpeg erstellt H.264/MP4 in drei Stufen: HD mit maximal 1920 Pixeln längster
  Kante / 4 Mbit/s, SD 1280 / 2 Mbit/s, Low 640 / 600 kbit/s, maximal 30 fps.
  Seitenverhältnis bleibt erhalten, kleine Quellen werden nicht hochskaliert.
  Das sind Begrenzungen, keine garantierten konstanten Bitraten. Geeignete
  HD-Quellen werden ohne erneutes Video-Encoding umverpackt.
- Native Geräte können das Upload-Video vorher verkleinern; bei Fehlern oder
  weniger als 10 % Ersparnis wird die Originaldatei verwendet. Web-Uploads
  werden auf dem Server komprimiert. Der Player kann die Qualitätsstufe wechseln.
- Das temporäre Original wird nach erfolgreicher Verarbeitung entfernt.
  Die Sicherung archiviert die vorhandenen fertigen Varianten, kein dauerhaft
  behaltenes unkomprimiertes Kameraoriginal.
- Thumbnails werden vor dem Upload normalerweise zu JPEG mit längster Kante
  480 Pixel und 85 % Qualität. Bei Größenüberschreitung werden Qualität und
  gegebenenfalls Abmessungen weiter reduziert. Komprimierungsfehler verwenden
  als Rückfall die Originaldatei.

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

Nach Veröffentlichung von Studio und APK erneut vollständig gesichert:
`20261009T150551Z.tar.age`, 4.236 Dateien einschließlich Verwaltungs-
Konfiguration und APK, alle 2.389 Storage-Versionen und 448 Medienreferenzen
entschlüsselt und per SHA256 geprüft. Dieses neue Set wurde nicht nochmals
in eine Datenbank zurückgespielt; der vorherige Restore-Test bleibt der belegte
Datenbank-Wiederherstellungstest.

Der systemd-Timer `kws-production-backup.timer` ist aktiv: täglich 03:30 UTC
plus bis zu zehn Minuten Verzögerung. Verschlüsselte Sets werden nach sieben
täglichen und bis zu vier wöchentlichen Repräsentanten aufbewahrt.
Archive liegen unter `/var/backups/kws/production`.
Die Entschlüsselungsidentität liegt zusätzlich in Bitwarden unter
`AI Shared/KWS_HOSTINGER_MIGRATION_AGE_IDENTITY`.

Eine zusätzliche NAS-Übertragung läuft. Bisher per SHA256 verifiziert:
Datenbank- und Storage-Vorsicherung sowie der finale Cloud-Datenbankexport
`database-final-20261009T140930Z.tar.age`. Vollständigkeit der NAS-Medienkopie und des finalen
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
  Download auf dem Handy:
  https://beta.kletterwelt-sauerland.de/downloads/KWS-Beta-Hostinger-1.0.53.apk
  HTTPS-Download SHA256-geprüft:
  `b63cee6f5852cd570a5efd99e2fc092a4e0708e843bc4110088a7890391e1f48`.
  Vorhandene App aktualisieren, nicht deinstallieren. Bei direkter WLAN-
  Installation zuerst Android-WLAN-Debugging koppeln, dann `adb install -r`.
  Am 9. Oktober wurden kein ADB-Gerät und kein mDNS-Gerät entdeckt.
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

Der öffentliche Studio-Zugang wurde am 9. Oktober nach separater verschlüsselter
Konfigurationssicherung eingerichtet: Caddy mit Argon2id-Passworthash aus
`/opt/kws/public-gateway/studio-auth.env` (root-only, Compose `env_file: format: raw`).
Keine Zugangswerte im Git. 13 HTTP/TLS-Prüfungen erfolgreich: alle sieben
Verwaltungsrouten ohne Login 401, falsche Basic-Daten und alleiniger Service-JWT
401, authentifizierte Studio-Seite und reale Datenbankabfrage 200 sowie Web/
Video weiterhin erreichbar. Belege: `PUBLIC-STUDIO-VERIFIED.json` und
`ANDROID-DOWNLOAD-VERIFIED.json` in `/opt/kws/production`.
Die Chrome-Automation konnte den HTTP-Basic-Dialog nicht bedienen und zeigte
`ERR_BLOCKED_BY_CLIENT`; der authentifizierte HTTP- und Datenbankzugriff wurde
serverseitig verifiziert. Manueller Browser-Login bleibt separat zu bestätigen.
# Betriebsübersicht ergänzt am 9. Oktober, 17:42 MESZ

Die geschützte Domainwurzel https://supabase.kletterwelt-sauerland.de/ zeigt jetzt
eine KWS-Betriebsübersicht. Native Studio bleibt unter `/project/default` erreichbar
und heißt **KWS Beta App**. Die Übersicht liest nur aggregierte Produktionsdaten:
Bestand, Serverressourcen, zwölf benannte Dienste, Videos und Sicherungsnachweise.
Server- und Browseraktualisierung laufen minütlich. Unbekannte/alte Werte werden
gekennzeichnet; die fehlende unabhängige Sicherung außerhalb des VPS bleibt sichtbar.

Neuer vollständiger verschlüsselter Sicherungssatz **20261009T154201Z.tar.age**:
4.251 Dateien entschlüsselt/hashgeprüft, 2.389 Storage-Versionen und 448
referenzierte Medien nachgewiesen. Dashboard und systemd-Units sind enthalten.
Der bestätigte Datenbank-Restore-Test bezieht sich weiterhin auf den älteren
Sicherungssatz von 14:33:59 UTC; kein neuer Restore-Test wird behauptet.

Implementierung: `ops/hostinger/dashboard/`; Betriebsanleitung im dortigen README.
Prüfbericht: `docs/qa/2026-10-09-operations-dashboard.md`. Bestehender Zugang und
Bitwarden-Referenz **KWS_HOSTINGER_SUPABASE_CONFIG** bleiben gültig; Referenz nach
Projektumbenennung mit der tatsächlichen Serverkonfiguration abgeglichen.
