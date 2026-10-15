# KWS: Migrations- und Restore-Prüfung

Stand: 8. Oktober 2026. Quelle bleibt live; keine DNS- oder Produktionsumschaltung.

## Gesicherter Bestand

| Bestand | Verschlüsselte Sicherung / Prüfung |
| --- | --- |
| Datenbank | `database-precopy-20261008T120213Z.tar.age`: Rollen, Schema, COPY-Daten, vollständiges PostgreSQL-Custom-Archiv, internes Auth-/Storage-Schema und Inventar. Exportierter gemeinsamer Read-only-Snapshot; 76 Tabellen inventarisiert, 44 Auth-Nutzer. Alle sechs DB-Dateien nach Entschlüsselung per Größe/SHA-256 verifiziert. |
| Storage | `storage-precopy-20261008T105603Z.tar.gz.age`: 2.389 Objekte, 440.125.701 Bytes, vollständig entschlüsselt und geprüft. Anschließend alle Bytes über Storage-API importiert und wieder heruntergeladen; alle SHA-256 gleich. Quell-IDs, Eigentümer und ursprüngliche Datumsfelder erhalten; API-Versionen neu erzeugt. |
| Video | `video-precopy-20261008T105817Z.tar.age`: 590 Dateien, 2.018.204.725 Bytes, authentifiziert entschlüsselt/wiederhergestellt. Neue private Wiedergabe HD/SD/Low und Range geprüft; 23 Diensttests bestanden. |
| Referenzierte CDN-Bilder | `cdn-precopy-20261008T125923Z.tar.gz.age`: 136 Dateien, 195.766.433 Bytes, verschlüsselt und vollständig entschlüsselt/per SHA-256 wiederhergestellt. Alle 136 zusätzlich über privaten neuen Webdienst mit gleichem Hash/MIME/Byteumfang abgerufen. 147 eindeutige CDN-URLs gefunden; elf bereits an der Quelle 404, ausschließlich aus historischen Operationslogs. Alle aktuellen Boulder-Vorschaubilder und Sektorbilder vorhanden. |

Alle Daten und detaillierten Manifeste liegen rootgeschützt ausschließlich auf dem neuen VPS unter `/var/backups/kws/migration`. Kein Rohbestand im Repository, Vault oder auf dem Laptop. Medien und Datenbank wurden zu verschiedenen Zeiten gesichert; dies ist noch kein finaler ruhender Gesamtbestand.

## Isolierter Restore

`kws_restore_probe_20261008_121055` ist eine separate Datenbank. Die Hauptdatenbank `postgres` enthält weiterhin keine App-Nutzer oder App-Tabellen. Probe-Dienste sind ausschließlich an Loopback gebunden: Auth 9998, REST 9996, Storage 9997.

Vor Teständerungen wurden sämtliche COPY-Spaltenwerte von **17.411 Zeilen in 68 Tabellen** als Multimenge der SHA-256 ihrer COPY-Zeilen verglichen. Keine fehlenden Tabellen oder abweichenden Werte. Beide Sequenzen gleich. Auth-Admin-API erkennt alle 44 wiederhergestellten Quellkonten. Backend-Migrationshistorien werden vom passenden Ziel verwaltet; originale Quellhistorien bleiben im vollständigen Archiv erhalten.

Strukturvergleich gegen die lesend abgefragte Quelle: **35 Tabellen, 145 Policies, 36 Funktionen, 131 Constraints, 118 Indizes, 26 Trigger, zwei Realtime-Mitgliedschaften**. Vier PG17-Cloud-Deparser-Varianten bei `varchar[]`-zu-`text[]`-Casts konstanter Arrays wurden ausschließlich über diese exakte, semantisch identische Transformation normalisiert. Alle anderen Definitionen, Eigentümer, RLS-Flags und Grants stimmen überein.

Notwendige Restore-Ergänzungen:

- Auth 2.196.0 hatte vier neuere Tabellen und `one_time_tokens.expires_at` nicht. Stabiles Auth 2.197.0 bringt das passende Schema. Kein Auth-Datensatz oder Feld wurde aus dem Dump entfernt.
- Gefiltertes Schema überspringt 19 Storage-Policies und zwei Anwendungstrigger auf `auth.users`; diese wurden aus dem vollständigen Archiv übernommen.
- Kommentarfilter im normalen CLI-Schemadump veränderte Funktionstexte. Originale Funktionsdefinitionen aus dem vollständigen Archiv wiederhergestellt; nächste Exporte mit `--keep-comments`.
- Ziel-Standardgrants ließen fünf Video-Funktionen weiter zugänglich als an der Quelle. Zusätzliche Grants widerrufen und exakte Quellrechte wiederhergestellt.

## Funktionstests und bewusste Sicherheitskorrekturen

Die Probe wurde anschließend bewusst verändert: getrennte Testkonten, Testfarbe, Testbilder und zwei Push-Trigger als Stubs. Sie darf keinen endgültigen Produktionsbestand ersetzen. Die unveränderten Quellwerte bleiben in der geprüften verschlüsselten Sicherung.

Reproduzierte Quelllücken: Ranglisten-Policy erlaubte jedem angemeldeten Nutzer Zugriff auf ganze fremde Profile einschließlich E-Mail und Geburtsdatum; Storage-Insert/Update für Sektorbilder prüfte keine Setter-/Admin-Rolle.

`20261008143000_private_profiles_and_sector_image_roles.sql` wurde nur auf die Probe angewandt. Private Profile bleiben bei Eigentümer/Admin; Rangliste nutzt den bestehenden sicheren RPC und Community einen begrenzten RPC mit ausschließlich ID/Anzeigename. Sektorbilder erfordern Setter/Admin. Web-Code ebenfalls angepasst, inklusive Setter-Namen in Operationslogs. Quelle unverändert.

Danach **39/39 API-Prüfungen** bestanden: Login aller drei Rollen, automatische Profil-/Benutzerrollenanlage, Session-Refresh, falsches Passwort, Admin-API-Schutz, Gast-Boulderanzeige, private Profilfelder, sichere Peer-Namen, Selbstbeförderung verboten, Admin-Farbverwaltung, Video-Publisher-RPC und Setter-Jobrechte, Storage-Uploadrechte und Download-Hash sowie private Feedback-Leserechte.

139 vorhandene App-Unit-Tests bestanden; zusätzlicher Hallenkarten-Test bestätigt dieselbe Geometrie nach URL-Umstellung und lehnt fremde Hosts/abweichende Dateien ab. Production-Build erfolgreich. TypeScript: 79 weiterhin offene Diagnosen außerhalb der geänderten Dateien. Keine vollständige App-, Mobilgeräte- oder Store-Abnahme.

## Private Web-Integration

Zusätzliches Frontend `/opt/kws/probe-web/source` aus Commit `3c6e234`, Caddy auf `127.0.0.1:9090`, getrennt vom bisherigen privaten Build und vom leeren Hauptziel. Auth/REST/Storage gehen ausschließlich auf die Probe-Dienste; Video auf den privaten Videodienst. Realtime/Functions und Legacy-Upload liefern bewusst 503 und sind noch nicht abgenommen. Keine echten Push-/Mail-Ausgänge.

URL-Anpassungen ausschließlich in der Probe: 1.252 geänderte Spaltenwerte, 888 Storage-, 416 Video- und 189 CDN-URL-Vorkommen, rekursiv auch JSON. Storage-Zuordnungen gegen vorhandene Objekte, Video-Dateipfade gegen veröffentlichte Dateien und CDN-Bilder gegen gesichertes Manifest geprüft. Originalwerte/SQL rootgeschützt für Rückweg erhalten. Elf bereits fehlende historische CDN-Dateien nicht erfunden; ihre ursprünglichen Logreferenzen bleiben erhalten. Auth-Nutzermetadaten enthalten keine alten Storage-URLs. Noch keine allgemeine, wiederholbare Produktions-URL-Migration.

Browser im KWS-Chromeprofil über privaten SSH-Tunnel dieses Laptops:

- Gastübersicht: 104 Boulder mit Ziel-Vorschaubildern.
- Suche „Komet“: sechs Treffer.
- Grad 6: 13 gerenderte Treffer; Entfernen des Filters wieder 104.
- Sektorübersicht: sechs Hallenbereiche und 19 Teilbereiche; alle sechs Bereichsbilder vom privaten Ziel geladen (1440 × 1080).
- Sektor Bug A öffnet vier passende Boulder.
- Boulder-Detail: HD-Video 1080 × 1920 und nach Qualitätswechsel Low 360 × 640, jeweils `readyState=4`, kein Medienfehler, Quelle eigener privater Webdienst.

Frontend-Bundle enthält weder Service-Schlüssel noch Postgres-Passwort. Bindung auf Loopback verifiziert. SSH-Tunnelprozess auf Laptop: PID 58232; Agent hat ausschließlich diesen eigenen Tunnel erstellt. Kein öffentlicher App-Zugang. API-Rollentests ersetzen weiterhin keine gerenderte angemeldete Admin-/Setter-/Nutzerrunde; diese sowie native Geräte bleiben offen.

## Offene Umschaltgates

DNS-Zugang bestätigt; bestehendes `beta`-CNAME auf Vercel und `video`-A auf alten VPS unverändert. Eigene API-Domain/TLS, SMTP-Versandzugang und Reset-Mail-Abnahme, URL-Migration mit Datei-Zuordnung, Realtime/Functions/Push, native Altbuilds, Authentifizierung/Publisher/FFmpeg-Last und offene Videojobs, kontrollierte Schreibsperre aller Quellen sowie erneuter finaler Snapshot und Dateidelta einschließlich ersetzter/gelöschter Objekte bleiben offen. Kein Cutover solange diese Prüfungen fehlen.

Benutzer hat `app@kletterwelt-sauerland.de` als Absender und `marketing@kletterwelt-sauerland.de` für Antworten gewählt. Laut MX erfolgt eingehender Mailverkehr über Microsoft 365; alte All-Inkl-Postfächer erzeugen eine KAS-Warnung zu interner Zustellung. Kein neues KAS-Postfach, keine Mail-/DNS-Änderung und kein Versand erfolgt. Alias/Empfang und kompatiblen Versandzugang mit tatsächlicher Mailadministration klären.

Quellen: [Supabase Restore](https://supabase.com/docs/guides/self-hosting/restore-from-platform), [Storage-Kopie](https://supabase.com/docs/guides/self-hosting/copy-from-platform-s3), [Auth 2.197.0](https://github.com/supabase/auth/releases/tag/v2.197.0). Tatsächliche Prüfungen: geschützte DB-/Storage-Manifeste und JSON-Nachweise auf dem VPS; öffentliche Testskripte in `ops/hostinger`.
