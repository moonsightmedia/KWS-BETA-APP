# Migration: Kletterwelt-VPS

Stand: 8. Oktober 2026. Zielumgebung eingerichtet; vorbereitende Medienkopien begonnen. Vollständiger Datenbankexport, Datenbank-Restore und Produktionsumschaltung stehen aus.

## Umsetzung und geprüfte Ergebnisse

- Arbeitsbranch `codex/hostinger-migration`, Quellstand `52d0769`. Ursprüngliches Arbeitsverzeichnis nicht verändert. Betriebsskripte unter `ops/hostinger/`.
- Docker 29.8.2 / Compose 5.6.0 installiert. SSH über `kws-admin` mit Geräteschlüssel und strikt geprüftem Hostschlüssel; root- und Passwortanmeldung deaktiviert. UFW erlaubt SSH nur von der aktuellen Admin-IP `79.241.116.61`, zusätzlich HTTP/HTTPS. Bei IP-Wechsel muss die SSH-Regel über Hostinger-Konsole angepasst werden. Fail2ban aktiv; Docker-Logs begrenzt.
- Supabase: offizieller Tag `self-hosted/v0.8.2`, Commit `564eab8ad7840b13324f68b1bfac074ef8d51c21`, Postgres 17.6. Alle elf Dienste healthy; leere Zieldatenbank. Auth-Health und REST mit Service-Schlüssel geprüft. Die Gateway-Schemasperre für anonyme OpenAPI-Anfragen ist beabsichtigt; normale REST-Anfragen passieren das Gateway. API-/DB-Ports ausschließlich Loopback. Quell-Postgresversion und Restore-Kompatibilität noch zu bestätigen.
- Web-App auf VPS gebaut; privater Caddy auf `127.0.0.1:9080`. HTML, direkte App-Routen, JavaScript-MIME, Asset-Caching und fehlende Assets geprüft. API-/Video-Ziele im Testbuild zeigen bewusst auf Loopback. Caddy-Image per Digest gepinnt. Keine öffentliche App- oder Funktionsabnahme und keine TLS-/DNS-Umschaltung.
- Privater Videodienst auf `127.0.0.1:9000`, Node 22 und FFmpeg, 1 CPU/2 GB RAM. Nur bereits veröffentlichte Dateien aus der geprüften Kopie übernommen; keine Jobs oder Upload-Sessions gestartet. Publisher mangels Service-Schlüssel bewusst deaktiviert, Auth gegen neue leere Supabase-Instanz. 23 Videodienst-Tests bestanden; HTTP-Bytes aller drei Videoqualitäten mit Dateien verglichen, Range-Anfragen geprüft, unautorisierter Upload 401. Authentifizierte Uploads, Publisher und Lastprobe noch offen.
- Quellidentität `pkzzxtsyxwxoraytyjau` durch ausgelieferte Web-Konfiguration, Video-Publisher-Konfiguration und Service-Schlüssel-Projektreferenz abgeglichen. Lesendes REST-Inventar: 35 Tabellen/Views und 44 Auth-Nutzer. Das ist kein Datenbankdump und kein konsistenter gemeinsamer Snapshot; vollständiges DB-Inventar steht aus. Vorhandene Supabase-CLI-Anmeldung gehört einem anderen Projekt und bleibt unverändert.
- Video-Vorsicherung auf dem Ziel-VPS verschlüsselt gespeichert und praktisch wiederhergestellt: 590 Dateien, 2.018.204.725 Bytes, 106 HD-/105 SD-/105 Low-Dateien. Archiv-Prüfsumme und authentifizierte Entschlüsselung bestanden. Endgültiger Vergleich mit ruhender Quelle noch ausstehend.
- Storage-Vorsicherung vollständig verschlüsselt und wiederhergestellt: 2.389 Objekte, 440.125.701 Objektbytes. Alle Größen und SHA-256 geprüft. Bucket-Inventar: beta-videos 27, sector-images 26, feedback-screenshots 2.307, hall-maps 16, profile-avatars 13. Rootgeschützte Rohkopien und verschlüsselte Archive ausschließlich unter `/var/backups/kws/migration`, nicht in Git/Vault oder auf dem Laptop. Noch kein Import ins Supabase-Storage-Protokoll; vor finalem Cutover konsistent erneut sichern und vergleichen.
- Neue Supabase-Konfiguration und Wiederherstellungsschlüssel in Bitwarden hinterlegt: `AI Shared/KWS_HOSTINGER_SUPABASE_CONFIG`, `AI Shared/KWS_HOSTINGER_MIGRATION_AGE_IDENTITY`. Quellzugriff: `AI Shared/KWS_SUPABASE_SERVICE_ROLE_KEY`. Keine Geheimniswerte dokumentieren.
- DB-Export blockiert durch fehlende Dashboard-Anmeldung und Datenbankzugang. DNS läuft über All-Inkl/KAS; `api.kletterwelt-sauerland.de` zeigt bereits auf einen anderen Dienst und darf nicht ungeprüft überschrieben werden. SMTP, Provider, Functions, Push, native Builds und Funktions-/Rechteprüfung folgen nach DB-Restore.

Die Quelle bleibt live und unverändert. Keine Vollständigkeits- oder Verlustfreiheitsfreigabe vor erfolgreichem Gesamt-Restore und endgültigem Daten-/Dateivergleich.

## Konkrete Vorbereitung für einen verlustfreien Wechsel

**Abbruchpunkt:** Noch kein vollständiger Datenbankexport, kein wiederhergestellter Probe-Datenbestand und keine Umschaltfreigabe. Das Dashboard benötigt die persönliche Anmeldung; Quellversion und Auth-/Schema-Kompatibilität sind noch unbestätigt.

### Quellprojekt zuerst eindeutig bestätigen

Die versionierte `.env.production` nennt den öffentlichen Host `pkzzxtsyxwxoraytyjau.supabase.co`; `supabase/config.toml` nennt dagegen `ewimvxhpkbhffcozsefm`. Das ist eine echte Prüflücke, kein Beleg für zwei zu migrierende Datenbanken. Vor Export Web-Deployment, aktuellen nativen Build und laufenden Video-Publisher mit dem richtigen Projekt im Dashboard abgleichen. CLI nicht blind mit dem vorhandenen Link verwenden. Keine Schlüsselwerte ausgeben.

Bekannte Integrationen aus dem aktuellen Quellcode: Storage-Buckets `beta-videos`, `sector-images`, `hall-maps`, `profile-avatars`, `feedback-screenshots`; Edge Function `send-push-notification`; Video-Publisher-RPC `sync_boulder_video_job`. Vollständigkeit ausschließlich anhand der Live-Instanz prüfen. Generierte TypeScript-Typen enthalten nur einen Teil der in den Migrationen vorkommenden Tabellen und taugen nicht als vollständiges Inventar.

### Sicherungsumfang und Nachweis

| Bestand | Sicherung | Abnahmekriterium |
|---|---|---|
| Anwendung, Nutzer und Rechte | Rollen, Schema, vollständige Daten einschließlich Auth nach dem offiziellen Supabase-Verfahren; versionierte Migrationen zusätzlich sichern | Live-Tabellen vollständig vorhanden; exakte Zeilenzahlen, vollständiger Vergleich der Schlüssel und Inhalte in geschützter Umgebung, Fremdschlüssel, Sequenzen, Policies und RPC-Rechte geprüft |
| Supabase Storage | Alle tatsächlichen Objekte über S3/Storage-Protokoll separat kopieren; Bucket-Einstellungen, Objektpfade und Besitzrechte erfassen | Gleiche Objektmenge, Größen und über heruntergeladene Bytes verifizierte Prüfsummen; Lese-/Schreibrechte und vorhandene URLs getestet |
| Video-VPS | Gesamtes KWS-Datenverzeichnis einschließlich Upload-Sessions, Queue-/Job-Daten, Manifesten und Ready-Markern konsistent kopieren | Dateipfade, Größen und SHA-256 stimmen im ruhenden Bestand überein; veröffentlichte Videos und drei Qualitätsstufen funktionieren; offene Jobs sind geklärt |
| Betriebskonfiguration | Auth-/SMTP-/Provider-Konfiguration, Redirects, Functions, Jobs, Webhooks, Push, DNS und Backup-/Monitoring-Konfiguration inventarisieren | Einstellungen bewusst am Ziel eingerichtet; keine Probe-Mails, Push-Nachrichten oder Jobs an echte Nutzer; Geheimnisse über geschützte Referenzen |

Das lesende `scripts/migration/inventory.psql` erzeugt exakte Tabellenzahlen für `public`, `auth`, `storage` sowie Schema-/Rechte-Metadaten in einer Read-only-Transaktion. Zusätzliche Anwendungsschemas separat aufnehmen. Es ist für `psql`, nicht den Dashboard-SQL-Editor. Noch nicht ausgeführt: Quell-Datenbankzugang fehlt; `psql` ist auf dem Ziel verfügbar. Zugang über geschützte libpq-Service-/Passwortdateien oder gleichwertige Laufzeitübergabe; keine Datenbank-URL mit Passwort in Kommandozeile, Chat oder Logs. Ausgaben und Dumps nur im geschützten Migrationsbereich außerhalb Git/Vault. Benutzerentscheidung: vorläufig ausschließlich neuer VPS als Backup-Ziel; keine NAS- oder zusätzliche Online-Speicherung. Langfristige Sicherungspolitik später festlegen. Ein Backup auf demselben VPS schützt nicht vor vollständigem Verlust dieses Servers. Eine Zeilenzahl allein beweist keine inhaltliche Gleichheit.

### Reihenfolge mit Abbruchpunkten

1. **Inventar und Zugang:** richtiges Quellprojekt, Postgres-/Auth-/Storage-Versionen, Erweiterungen, Größen und alle Schreiber bestätigen; Backup-Ziel und Wiederherstellungszugang festlegen. Solange diese fehlen, keine finale Migration starten.
2. **Ziel und Sicherung:** abgesicherte Supabase-Instanz mit kompatiblen Versionen vorbereiten und vollständige verschlüsselte Quellsicherung auf dem vereinbarten neuen VPS erstellen. Snapshot allein genügt nicht.
3. **Probeumzug:** isolierte Kopie wiederherstellen. Ausgehende Mails, Push, Webhooks und Video-Publisher zunächst deaktiviert lassen. Quell-/Zieldaten vergleichen, Rechte positiv und negativ prüfen und mit separaten Testkonten Login, Passwortreset, Medien sowie Uploads testen. Passwort-Hashes erhalten, nie ausgeben. Ein erneuter Login kann wegen neuer JWT-Schlüssel nötig werden.
4. **Client- und URL-Migration:** bestehende native Builds mit alter API-Adresse sowie zwischengespeicherte Web-Versionen berücksichtigen. Alte Clients müssen aktualisiert oder ihre Schreibzugriffe serverseitig zuverlässig blockiert werden. Ein Hinweis in der neuen Oberfläche reicht nicht. Vorhandene absolute Storage-URLs inventarisieren und über eine geprüfte Zuordnung gezielt am Ziel umschreiben; Pfade, Query-Parameter und fremde Hosts nicht blind ersetzen. Die spezielle Hallenkarten-Erkennung in `src/lib/hallMapSource.ts` hängt an einer alten absoluten URL und muss bei einer Umschreibung nachgeprüft werden.
5. **Finales Wartungsfenster:** alle Schreiber am alten Bestand kontrolliert sperren: Web/native REST, Auth-Neuanlagen und Kontoveränderungen, Storage-Uploads/-Löschungen, Videoannahme und Publisher, Functions, Webhooks und Cronjobs. Bereits laufende Uploads/Jobs auslaufen lassen oder ihren Zustand ausdrücklich sichern. Schreibsperre durch verbotene Testzugriffe nachweisen. UI-Wartungsbanner allein schützt nicht vor alten Clients.
6. **Finaler konsistenter Stand:** nach bestätigter Ruhe Rollen/Schema/Daten erneut vollständig sichern; Datei-Delta einschließlich inzwischen gelöschter/ersetzter Objekte mit einem geschützten Manifest abgleichen. Kein ungeprüftes `sync --delete`. Drei getrennte Dumps bei aktiven Schreibern ergeben keinen garantiert gemeinsamen Stand. Probe-Daten und Testkonten dürfen im endgültigen Zielbestand nicht übrig bleiben; neue finale Instanz oder dokumentierter sauberer Restore, nicht auf veränderte Probe-Daten auflegen.
7. **Vergleich und Umschaltung:** endgültigen Datenvergleich vor URL-Anpassungen durchführen, Änderungen an URLs separat nachweisen, sichere Rechte und getesteten Restore bestätigen. Dann Clients, API und Videodomain koordiniert wechseln. Quelle bleibt gegen Schreibzugriffe gesperrt; erst nach bestandener Prüfung Schreibzugriffe am Ziel öffnen. Zeitpunkt und letzter Quell-/erster Zielschreibzugriff dokumentieren.
8. **Rückweg:** vor ersten Zielschreibzugriffen kann auf den verifizierten alten Stand zurückgeschaltet werden. Danach zuerst beide Schreibpfade sperren und neue Zieländerungen sichern/abgleichen; kein einfacher DNS-Rückwechsel mit Verlust neuer Einträge. Quelle und Sicherungen bis zum abgestimmten Ende der Rückfallfrist behalten. Beendigung des Cloud-Projekts und Löschung alter Dateien sind separate spätere Schritte.

### Noch offene Eingaben für die Ausführung

Supabase-Dashboard-/DB-Zugang über Bitwarden-Referenz; Quell-DB-Version; DNS-Zugang und künftige API-Domain; SMTP/Provider; unterstützte alte App-Builds und serverseitige Schreibsperre; Umfang noch offener Uploads/Jobs. Diese Punkte blockieren den vollständigen Datenbankexport beziehungsweise die Umschaltung. Das vorläufige Backup-Ziel ist der neue VPS.

Aktuell geprüfte technische Referenzen: [Supabase Cloud zu Self-hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform), [Storage-Objekte kopieren](https://supabase.com/docs/guides/self-hosting/copy-from-platform-s3). Storage-Dateien nicht einfach in das interne Ziel-Volume legen: das Storage-Protokoll muss Metadaten und Dateistruktur korrekt erzeugen. Bei Schema-/Versionsfehlern niemals benötigte Auth-/Storage-Daten aus dem Dump entfernen, um den Restore nur scheinbar erfolgreich zu machen; kompatible Zielversionen oder eine verlustfrei geprüfte Anpassung verwenden.

## Live verifizierter Infrastrukturstand

- Kletterwelt-Hostingerkonto: KVM 4 aktiv, Server `srv2044594.hstgr.cloud` (VPS-ID 2044594), IPv4 `187.7.70.230`, Standort Germany – Düsseldorf. 4 CPU-Kerne, 16 GB RAM, 200 GB Speicher, 16 TB Bandbreite. Ablaufdatum 8. Oktober 2028. Automatische Verlängerung auf ausdrücklichen Benutzerauftrag deaktiviert; Hostinger bestätigt „Sie werden nicht erneut abgerechnet“, Status weiterhin aktiv. Frühere Anzeige bei aktivierter Verlängerung: Abbuchung 24. September 2028, 671,76 EUR ohne Steuern für weitere 24 Monate; diese automatische Abbuchung ist jetzt deaktiviert. Finale Kaufrechnung noch nicht geprüft.
- Installiert ist Ubuntu 26.04 LTS, abweichend vom früher vorbereiteten 24.04-Entwurf. Die aktuelle offizielle Docker-Anleitung unterstützt 26.04 LTS; keine Neuinstallation erforderlich allein wegen dieser Abweichung.
- Hostinger zeigte bei der Vorbereitung wöchentlichen Backup-Zeitplan und 0 Snapshots/Backups. Kein kostenpflichtiges Upgrade gebucht; vollständiger Hostinger-Snapshot-Restore noch nicht geprüft. Die Server-Firewall wurde inzwischen separat eingerichtet und verifiziert.
- Der bestätigte Geräteschlüssel `codex-laptop-kws-vps` wird jetzt für `kws-admin` verwendet. Root-Anmeldung deaktiviert. Ca. 178 GB verfügbarer Plattenplatz nach Einrichtung und vorbereitenden Kopien; Docker installiert. Keine privaten Schlüsselwerte dokumentiert.
- Serverfingerprint über die authentifizierte Hostinger-Webkonsole verifiziert und in einer separaten lokalen known-hosts-Datei gepinnt. SSH-Verbindung mit strikter Hostprüfung getestet. Das Windows-ssh-keyscan-Werkzeug scheitert am bevorzugten neueren KEX-Verfahren des Servers; der direkte SSH-Client funktioniert mit explizit kompatibler sicherer Aushandlung.
- Quell-Videodienst read-only per bestehendem SSH-Zugang geprüft: Container `kws-video-server-video-server-1` läuft und ist healthy; Bind-Mount `/opt/kws-video-server/data` nach `/data`, Umfang 1,9 GB. Momentaufnahme: 106 HD-, 105 SD- und 105 Low-Dateien. Differenz vor der Kopierabnahme anhand der Familien/Ready-Marker prüfen, nicht automatisch als verlorene Datei interpretieren.
- `video.kletterwelt-sauerland.de` zeigt weiterhin auf den bisherigen VPS `187.124.182.245`. Keine DNS- oder Produktionsumschaltung vorgenommen.
- Die aktuelle Compose-Override-Datei nutzt den vorhandenen Traefik des Quellservers und deaktiviert Caddy. Auf dem Ziel darf sie nicht unbemerkt automatisch übernommen werden. Ein gemeinsamer Ziel-Proxy muss ausdrücklich eingerichtet werden.
- Audit-Worktree nach frischem Fetch per Fast-forward auf `52d0769` aktualisiert (aktueller origin/main); vorhandene untracked Launch-Entwürfe erhalten. Ergebnisse des Audits vom 7. Oktober beziehen sich weiterhin auf `63adae1` und wurden für die neue Hallenkarten-Korrektur noch nicht wiederholt.

## Ziel

Kletterwelt besitzt und bezahlt den neuen Hostinger-KVM-4-VPS. Supabase einschließlich Postgres, Auth, Storage, Realtime und der benötigten Functions sowie der bestehende Videodienst sollen dort laufen. Auch das Web-Frontend zieht auf diesen VPS um. Native Apps laufen auf den Endgeräten und erhalten die neue Backend-Konfiguration. Moonsight betreut die Technik.

## Vor der Einrichtung erfassen

Vertragskonto und Kletterwelt-Rechnungsdaten; Standort; Verlängerung und Backupoptionen; Medien-/DB-Größen, freie Kapazität und Peaklast; DNS-Verwaltung; SMTP-Absender und Versanddienst; Auth-Anbieter; Quell-Datenbankversion und Erweiterungen; Storage-Buckets, Funktionen, Webhooks und Jobs. Zugangsdaten ausschließlich über Bitwarden-Referenzen und geschützte Laufzeitkonfiguration verwenden. Bereits verifizierte Punkte siehe Umsetzungsstand.

## Zielbetrieb

- Eigenständige Compose-Projekte und persistente Volumes für Supabase und Video.
- Ein gemeinsamer HTTPS-Reverse-Proxy. Der vorhandene Video-Caddy belegt 80/443; kein zweiter öffentlicher Proxy auf denselben Ports.
- Video-Domain erhalten, soweit DNS und bestehende URLs das erlauben. Eigene API-Domain unter Kletterwelt für Supabase vorab festlegen.
- Postgres, Docker-Daemon, interne Dienste und Studio nicht offen ins Internet stellen. Administrativer Zugriff geschützt und getrennt von der öffentlichen API.
- Ressourcengrenzen für Videojobs, Uploadspeicher und Logs. Datenbank erhält Reserven; CPU-Konkurrenz bei realem Upload messen.
- Updates, Fehler-/Uptime-Meldungen und getrennte verschlüsselte Backups. VPS-Snapshots ergänzen den Datenbank-/Dateibackup; Wiederherstellung praktisch testen.

## Probe vor Umschaltung

1. Gepinnte, aktuelle Supabase-Docker-Version mit kompatibler Postgres-Version auf dem neuen VPS einrichten. Geheimnisse neu erzeugen und geschützt hinterlegen.
2. Rollen, Schema und Daten nach dem offiziellen Supabase-Verfahren exportieren und zuerst in einer getrennten Probeinstanz wiederherstellen. Auth-Nutzer, UUIDs, Hashes, Rollen, Policies, RPC-Grants und Erweiterungen separat verifizieren. Keine Produktionsdaten oder Dumps in Git/Vault ablegen.
3. Storage-Dateien getrennt kopieren und per Anzahl/Größe/Checksumme prüfen. Ein Datenbankdump enthält nicht die tatsächlichen Dateien. Thumbnail-, Sektor-, Hallenkarten-, Avatar- und Feedbackmedien berücksichtigen.
4. Videoverzeichnis mit bestehenden finalen Dateien, Jobs, Manifesten und Ready-Markern konsistent übernehmen. Neue Testuploads prüfen; bestehende URLs und Dateinamen erhalten. Altes Volume nicht löschen.
5. Functions, SMTP, Auth-Redirects, Provider, Trigger/Webhooks und Pushkonfiguration ausdrücklich neu konfigurieren. Ein Dump migriert diese Betriebskonfiguration nicht vollständig.
6. Neue API-/Publishable-Konfiguration für Web und native Builds vorbereiten; Service-Credentials ausschließlich serverseitig. Auch Videoauth und Supabase-Publisher auf die neue Instanz umstellen.
7. Mit getrennten Testrollen Gast, Nutzer, Setter und Admin prüfen: erlaubte und verbotene Zugriffe, Registrierung, E-Mail, Session-Erneuerung, Passwortreset, Bilder, Uploadabbruch/Wiederaufnahme, drei Videoqualitäten, Kommentare, Feedback und Benachrichtigungen.
8. Mit Lastprobe die gleichzeitige Datenbanknutzung während FFmpeg testen. Freien Speicher und Upload-Reservierungen messen.
9. Vollständiges verschlüsseltes Backup auf dem neuen VPS erzeugen und in einer isolierten Probeinstanz wiederherstellen. Erst nach erfolgreichem Restore die Umschaltung vorbereiten. Dauerhafte Backup-Intervalle, Aufbewahrung und ein unabhängiges Ziel sind noch nicht beauftragt.

## Umschaltung und Rückweg

Wartungsfenster und eindeutiges Schreibziel festlegen. Alte Uploads auslaufen lassen oder kontrolliert anhalten. Finalen konsistenten Datenbankexport und Datei-Delta übernehmen; Vollständigkeit prüfen. Neue API und Videodomain umschalten, aktuellen Web-Release und native Store-Builds mit der neuen Konfiguration testen. Bei neuem JWT-Secret müssen bestehende Sitzungen neu authentifiziert werden.

Besonders wichtig: Alte native Builds besitzen die bisherige Supabase-URL eingebaut. Vor der Umschaltung prüfen, wie lange sie unterstützt werden und wie neue Daten einen doppelten Schreibbestand vermeiden. Ein bloßer DNS-Wechsel der Videodomain löst diese Client-Migration nicht.

Rollback nur mit geklärtem Datenstand: Nach neuen Schreibzugriffen auf dem neuen Server reicht ein DNS-Rückwechsel nicht. Neue Daten müssen erhalten und konsistent zurückgeführt oder Schreibzugriffe angehalten werden. Quellserver und Supabase-Cloud-Projekt erst nach validierter Migration und festgelegter Rückfallfrist außer Betrieb nehmen.

## Abnahme

Keine fehlenden Nutzer oder Medien; Login und Mail funktionieren; Rechte bestehen positive und negative Tests; bestehende und neue Videos spielen; Clientmigration geklärt; Fehlerzustände sind verständlich; Restore gelungen; Logs enthalten keine Credentials; Monitoring und zuständiger Betreiber benannt.

Quellen: [Supabase Restore](https://supabase.com/docs/guides/self-hosting/restore-from-platform), [Supabase Docker](https://supabase.com/docs/guides/self-hosting/docker), bestehender versionierter `hostinger-video-server` und Launch-Prüfbericht vom 7. Oktober 2026.
