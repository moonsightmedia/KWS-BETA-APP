# Aktuell: V28 – technische Veröffentlichung, 17.10.2026

Live: `1a54729d849fb473`, 37 Dateien / 1.586.551 Bytes. Veröffentlicht am
17.10.2026 um 01:06:04 Europe/Berlin. Apprevision zum bewachten Deploy:
`387a0cbe758df426a0470a517313cb0615801715` (separater automatischer App-Deploy).
Die folgenden V22-/Erstdeploy-Abschnitte sind historisch.

Statisch unter `/landingpage`, `/privacy`, `/imprint`, `/community-rules` sowie
`/robots.txt`, `/sitemap.xml` und Googles HTML-Bestätigungsdatei. Letztere muss
erhalten bleiben. Nur `/landingpage` ist in der Sitemap. App-Fallback und
Rechtstexte tragen `X-Robots-Tag: noindex, follow`, ohne sie in robots.txt zu
sperren. Die App-Dateien/Authentifizierung werden nicht verändert.

`build-legal.mjs` übernimmt den gesicherten aktuellen Rechtstext aus
`docs/design/landing/legal-source-2026-10-17.json` und ergänzt den Landingbereich.
Bei fachlichen Änderungen in `src/pages/AppLegal.tsx` muss diese statische
Quelle bewusst aktualisiert und neu veröffentlicht werden. Kein juristisches
Prüfsiegel; Dienstleisterverträge sind nicht Teil dieser technischen Umsetzung.
`render-social.cjs` benötigt den lokalen Previewserver auf 4183 und rendert die
1200×630-Vorschau aus Originaldateien. Danach `build-legal.mjs` ausführen.

Publisher ersetzt ausschließlich den exakt einmal gefundenen Routenblock des
vorherigen, in LANDING-VERIFIED.json belegten Releases. Beide bekannten
Deploy-Locks, App-/Konfigurations-Hashes, Kandidatentest und Rollback bleiben
verbindlich. Zusätzlich enger Schreibmount
`/opt/kws/web-production/landing-metrics:/metrics:rw`, Modus 0700; Accessdatei
0600. Keine Änderung an API-, Video-, Datenbank- oder Gateway-Containern.

Der Caddy-Zähler schreibt nur GET `/landingpage`: feste Seite, Antwortstatus,
UTC-Zeit auf die Stunde gerundet sowie unvermeidliche konstante Log-Metadaten.
Keine Request-/Response-Header, IPs, UAs, Cookies, Referrer oder URLs/Querywerte.
Rotiert nach 24 Stunden bzw. 1MiB; maximal 31 rotierte Dateien und 744 Stunden.
Die isolierte Kandidatenprobe prüft mit künstlichen Identifikatorwerten die
Redaktion, exakte Feldauswahl und das Ausschließen aller anderen Routen.

`collect-landing.py` liest nur diesen Zähler, verwirft unerwartete Felder, zählt
200/304 nach Europe/Berlin und publiziert 31 Tageswerte atomar. Fehler behalten
den letzten Snapshot; die UI kennzeichnet nach 15 Minuten veraltete Daten.
Systemd `kws-landing-metrics.timer` aktualisiert alle fünf Minuten; Service hat
keinen Netzwerkzugriff und nur den Snapshotordner beschreibbar. Installation:
Skript im Operationsordner, beide Units unter `/etc/systemd/system`, daemon-reload,
Service starten, dann Timer aktivieren. Originale Dashboard-Dateien liegen unter
`/opt/kws/operations-dashboard/landing-before-20261016T225709Z`.

Ausgabe `/opt/kws/operations-dashboard/public/ops/landing.json`, Anzeige unter
https://supabase.kletterwelt-sauerland.de/ mit bestehender Basic-Authentifizierung.
Auch Snapshot und JS sind ohne Anmeldung HTTP401. Das sind Seitenabrufe inklusive
Bots/Tests, keine eindeutigen Besucher. Historische Besuche, QR-Herkunft und echte
Store-Klicks werden nicht erfunden. Die deaktivierten Store-Platzhalter bleiben.

Rollback: erst Timer stoppen, originale Dashboard-Dateien wiederherstellen;
Web-Konfiguration und Compose aus dem aktuellen Release sichern/prüfen und unter
beiden Locks auf die dortigen before-Dateien zurückstellen. Nur `web` neu starten.
Google-Bestätigungsdatei dabei erhalten oder Verlust der Bestätigung erwarten.
Nachweise: `docs/qa/2026-10-17-landing-v28.md`, `output/landing-v28`.

## Aktualisierung V22 – aktueller Produktivstand

Seit16.10.2026,22:44:58Europe/Berlin ist e8be88d7aec27211 live.27Dateien,
1174596Bytes; Richtungswechsler und mobile Optimierung, bisherige Navbar erhalten.
Readonly-Mount jetzt /opt/kws/web-production/landing-releases/e8be88d7aec27211/public/landing:/landing:ro.
Vorheriges Release b00d7677969f2633 samt Konfigurationskopien erhalten.
Nachweise: docs/qa/2026-10-16-landing-v22.md und output/landing-v22.

publish.py unterstützt nun auch Updates mit bestehendem Landingrouting.
Stage benötigt Archiv, dessen SHA-256 und die frisch erwartete40stellige
Apprevision. Release-ID wird aus dem hashgeprüften Manifest gelesen; Apply
benötigt diese16stellige ID. Vorhandene Routen müssen identisch sein und der
aktuelle Mount genau zum gespeicherten LANDING-VERIFIED.json passen. Updates
wechseln nur diesen Mount. Hash-/Apprevision-Gates, beide Release-Locks,
Kandidatenprobe und automatischer Rollback bleiben erhalten.

Archiv output/landing-v22/release.tar.gz, SHA-256
1afcae4484e4743f6c9964e7fffcb376d60a65655eb9d7628a422d518acf05e1.
Die nachfolgenden Beschreibungen des Erstdeploys sind historisch; für den
aktuellen Mount und die Operator-Schnittstelle gilt dieser V22-Abschnitt.

# Landingpage für den bestehenden Hostinger-Webserver

Ziel: **https://beta.kletterwelt-sauerland.de/landingpage**. Stand16.10.2026.
Live seit16.10.2026,20:04Uhr Europe/Berlin. Aktueller statischer Release:
`b00d7677969f2633`, UI-Stand V21. Veröffentlichung ausdrücklich vom Nutzer
beauftragt. Aktueller Nachweis: `docs/qa/2026-10-16-landing-live.md`.

## Aktueller Betrieb und Rückfall

Die Landingpage wird unabhängig vom wechselnden App-Source gemountet:
`/opt/kws/web-production/landing-releases/b00d7677969f2633/public/landing:/landing:ro`.
Das bestehende Composefile enthält diesen zusätzlichen Mount. `routes.caddy`
verwendet `/landing` als Root und entfernt für Assets das URL-Präfix. Ein späterer
App-Source-Tausch berührt diese Dateien nicht; der aktuelle App-Updater wurde
diesbezüglich geprüft. Caddyfile/Compose liegen ohnehin außerhalb der App-Releases.
Das unten beschriebene Kopieren nach source/dist/landing ist historisch ersetzt.

`publish.py` ist der bewachte Operator für genau diesen Erstdeploy und erwarteten
App-Stand3b3e15a687c8642300fe5b741740a213807fa48e. Er sperrt beide bestehenden
Web-Release-Locks, prüft Paket/Livekonfiguration, validiert den Kandidaten im
tatsächlichen Caddy2.11.7-Image und testet ihn auf Loopback19091. Erst danach
werden Caddyfile/Compose ersetzt und ausschließlich der Webcontainer neu erstellt.
Interne Fehler stellen beide Dateien automatisch zurück. Kein API-/Video-/DB-Neustart.
Der Auto-Deploy-Timer bleibt aktiv. Kein neuer Monitoring-/Zeitplan angelegt.

Rollbackdateien im Releaseordner: `Caddyfile.before` und
`docker-compose.before.yml`. Bei manuellem Rückfall zuerst prüfen, dass seit
PUBLISHED.json keine weitere Konfigurationsänderung vorliegt; beide Release-Locks
halten, beide Dateien zurückkopieren und nur `web` mit --no-deps neu erstellen.
Keine alte App-Source, Datenbank oder Medien zurückspielen. Veröffentlichungsbelege
`STAGED.json`, `PUBLISHED.json`, `publish.py` liegen im selben geschützten Ordner;
zusätzlich `/opt/kws/web-production/LANDING-VERIFIED.json`.

Aktuelles geprüftes Archiv lokal: `output/landing-online/release.tar.gz`;
SHA-2569d7773a2953bc3efddd52819f0e634e54baec9bfbbd3c849efe29ca2484be4a5.
Source/Releasepakete weiterhin im dedizierten Landingworktree, noch kein Git-Push.

## Historische Vorbereitung V16–V21

## QR-Ziel verifiziert

Der Haupt-/Download-QR im gewählten A3-Plakat enthält exakt diese HTTPS-Adresse:
`C:/Users/Janosch/.codex/worktrees/kws-sector-poster/KWS-BETA-APP/scripts/generate-selected-sector-poster.mjs:19`.
Das zugehörige `docs/print/sectors/selected-brackets/verification.json` bestätigt
sie ebenfalls. Die sechs Bereichs-QRs behalten ihre eigenen `/guest?sector=...`-Ziele.
HTTP wird live bereits mit308 auf dieselbe HTTPS-Adresse umgeleitet.

## Paket neu erstellen

Zuerst das finale Logo in `public/landing/beta-logo-primary.svg`,
`beta-logo-inverse.svg`, `beta-favicon.ico`, `beta-apple-touch-icon.png` ersetzen.
KWS-Logo nicht entfernen. Beide Marken bleiben getrennt. Bei neuen Dateinamen
auch HTML-Metadaten/Referenzen anpassen. Storelinks sind weiterhin die ausdrücklich
gewünschten deaktivierten Platzhalter; sie dürfen erst mit bestätigten Zielen
aktiv werden. Alternativ ist eine bewusst freigegebene „Bald verfügbar“-Seite möglich.

```powershell
node ops/hostinger/landingpage/build.mjs
node ops/hostinger/landingpage/verify-bundle.mjs <ausgegebenes-Verzeichnis>
```

Build ohne App-Build oder Versionsänderung:17 Landingdateien plus2 lokale
Poppins-Schriften und Lizenz, Größe siehe Manifest. URLs in HTML sind absolut
unter `/landing/`, damit CSS/Bilder auch auf der endungslosen QR-URL funktionieren.
Fonts im eigenständigen Paket liegen unter `/landing/fonts/`. SHA-256 für jede
Datei und Routingkonfiguration; Release-ID hängt von Inhalt und Routing ab.
Keine `.env`, Schlüssel, Datenbankdaten, Abhängigkeiten oder Buildtools im Paket.
Die Source-Dateien und Logos bleiben direkt austauschbar; danach neu bauen.

## Vorbereitetes Routing

`routes.caddy` wird innerhalb des bestehenden `http://:80`-Blocks des internen
Webcontainers ergänzt. `/landingpage` liefert das statische HTML mit200.
`/landing`, `/landing/`, `/landing/index.html`, `/landingpage/` leiten mit308 auf
`/landingpage` weiter, Queryparameter bleiben erhalten. Fehlende Landingassets
liefern404 statt der SPA. Cachevalidierung verhindert veraltete Logo-/CSS-Dateien.
CSP erlaubt nur die verwendeten lokalen Ressourcen. HTTPS bleibt am bestehenden
öffentlichen Gateway; kein DNS-, Datenbank-, API- oder Videoeingriff erforderlich.

```powershell
node ops/hostinger/landingpage/prepare-config.mjs <frisch-gelesenes-Caddyfile> <neuer-Kandidat>
```

Der Generator überschreibt nichts. Er stoppt, wenn der geprüfte SPA-Fallback
abweicht oder Landingrouting bereits existiert. Er protokolliert Ausgangs- und
Kandidatenhash. Der getestete Kandidat basiert auf der versionierten Vorlage
`ops/hostinger/prepare-production-web.sh`, **nicht** auf frisch gelesenem Serverstand.

## Veröffentlichung nach finaler Freigabe

1. SSH-Verbindung zum bekannten VPS über den gerätespezifischen Schlüssel und
   den bestehenden geprüften Host-Key wiederherstellen; Host-Key-Prüfung beibehalten.
2. Frischen Serverstand abgleichen: `/opt/kws/web-production/Caddyfile`,
   `SOURCE.json`, Compose-Mounts und bestehendes `source/dist/landing` prüfen.
   Kein Überschreiben bei geändertem Webrelease oder parallel laufendem Deployment.
3. Finale Marken-/Storefassung bauen und Paket prüfen. Paket in ein neues
   `/opt/kws/web-production/landing-releases/<release-id>` übertragen; dort nochmals
   alle Manifest-Hashes prüfen. Keine Veröffentlichung allein durch Übertragung.
4. Aktuelles Caddyfile und gegebenenfalls altes `source/dist/landing` vollständig
   sichern; Pfade, Release und Hashes im Deploymentnachweis festhalten.
5. Kandidaten aus dem frischen Server-Caddyfile erzeugen; im tatsächlich laufenden
   Caddy-Image adaptieren/validieren. Die lokale Prüfung ist kein Ersatz dafür.
6. Paket ausschließlich nach `source/dist/landing` übernehmen, bei bestehender
   Landingversion Verzeichnis atomar tauschen. Keine anderen Dist-Dateien überschreiben.
   Danach geprüften Caddy-Kandidaten einsetzen und ausschließlich den Webcontainer
   neu erstellen (dessen Admin-API ist deaktiviert); API/DB/Video nicht anfassen.
7. Inneren Port9091 sowie öffentliche HTTPS-URL prüfen: echte Landing-HTML-Marker,
   MIME, Fonts/Bilder, fehlendes Asset404, Redirects/Query, CSP und Interaktionen.
   `/`, `/auth`, `/guest?sector=Bug%20A`, `/privacy`, `/imprint`, vorhandene Downloads
   und API/Video auf unverändertes Verhalten prüfen. Gedruckten Haupt-QR physisch
   mit iOS und Android testen. Beide Stores nur nach Eintragen der echten Links.
8. Bei Fehlern ausschließlich gesichertes Caddyfile und vorheriges Landingverzeichnis
   wiederherstellen und denselben Webcontainer neu erstellen. Appdaten und übrige
   Dist-Dateien bleiben erhalten. Nach erfolgreichem Smoke-Test Freigabe dokumentieren.

Die Landingdateien müssen vor dem nächsten vollständigen App-Webrelease in Git
integriert sein; sonst würde ein neuer App-Build die nur hochkopierten Assets
verlieren. Kein blindes Kopieren des alten Dist-Verzeichnisses über einen neueren
Apprelease. Das Caddyfile liegt außerhalb der wechselnden Source-Releases.

## Tatsächlich geprüft / offen

- Offline: Caddy2.10.2 aus offiziellem Release, ZIP gegen dessen SHA-512 geprüft.
  Echte Routen mit Caddy, CSP, alle Assets/Fonts, Native-Anker, Features, Partnerwahl,
  No-JS, Aliase/Query,404 und isolierte App-Routenfixtures bestanden.
-375/768/1280/1920px zweimal gerendert, Screenshots visuell geprüft.
- Paketintegrität und Ablehnung abweichender/doppelter Serverkonfiguration geprüft.
- Live: HTTP308→HTTPS; `/landingpage` liefert200 mit App-SPA-Marker statt Landing.
  `/privacy` und `/imprint` liefern200; keine juristische Inhaltsprüfung behauptet.
- SSH auf187.7.70.230:22 am16.10.2026 mit Timeout gescheitert. Keine Remote-Datei
  gelesen/geändert, keine Caddy-Rekonfiguration oder Veröffentlichung durchgeführt.
- Finales Logo ist in Arbeit. Storelinks fehlen weiterhin. Produktiv-Caddy-Version,
  aktuelle Mounts/Release und endgültige Funktion auf der Domain noch abzugleichen.

Prüfartefakte und vorbereitete ZIP unter `output/landing-release/` (lokal/ignoriert).
Canonical, Meta-Beschreibung und OpenGraph/Twitter-Metadaten liegen im HTML.
Kein zusätzliches Tracking oder Drittanbieter-Script hinzugefügt.

Offizielle Routingreferenzen:
https://caddyserver.com/docs/caddyfile/directives/handle
https://caddyserver.com/docs/caddyfile/directives/rewrite
https://caddyserver.com/docs/caddyfile/directives/redir
https://caddyserver.com/docs/caddyfile/directives/file_server

## Aktualisierung V16

Der Ausblick ist im Source enthalten. Jüngstes geprüftes Paket:
`output/landing-v16/release-final`, ZIP:`output/landing-v16/kws-landingpage-release-v16-final.zip`.
Die frühere ZIP unter output/landing-release ist historisch. Nach finalem Logo
nochmals aus dem aktuellen Source bauen; die unveröffentlichten Trainingsrouten
werden durch den Marketingausblick nicht freigegeben.

## Aktualisierung V17

Visueller Ausblick ersetzt V16. Jüngstes Paket: output/landing-v17/release,
ZIP:output/landing-v17/kws-landingpage-release-v17.zip.22Dateien einschließlich
zweier optimierter Konzeptillustrationen,834853Bytes. Alle älteren Pakete sind
historisch. Vor Veröffentlichung nach finalem Logo aus Source neu bauen.

## Aktualisierung V18

Umschaltbare echte Entwicklungsvorschau ersetzt V17. Jüngstes geprüftes Paket: output/landing-v18/release; ZIP:output/landing-v18/kws-landingpage-release-v18.zip. Release f5ec8a60bdd41f46,24Dateien,971544Bytes. Integrität verifiziert. Ältere Pakete sind historisch. Keine Veröffentlichung durchgeführt; finales Logo und Storeentscheidung bleiben vor Livegang abzugleichen. Die Trainings-Releasesperre bleibt unverändert.

## Aktualisierung V19

Nutzerwahl B als Mockup-Galerie in die Landingpage übernommen. Kletterhalle als ausdrücklich gewünschtes generiertes Konzept im selben Geräterahmen ergänzt, sichtbar als Konzeptvorschau. Jüngstes geprüftes Paket: output/landing-v19/release, ZIP:output/landing-v19/kws-landingpage-release-v19.zip. Release683b0c6789e71de7,25Dateien,1138912Bytes. Keine Publikation. Finale Logo-/Storeentscheidung und Serverzugang aus Launchvorbereitung bleiben offen; App-Releasesperren bleiben bestehen.
# Aktualisierung V20 – aktuelles Paket

Überarbeitetes, ausgewähltes DM-Sans-Logo aus beta-dm-sans-selected-2026-10-16
im Header/Footer; KWS bleibt zusätzlich sichtbar. Aktuell verifiziertes Paket:
output/landing-v20/release, ZIP:output/landing-v20/kws-landingpage-release-v20.zip.
Release01972558267ee1a2,26Dateien,1144161Bytes einschließlich Schriftlizenz.
Alle älteren Pakete sind historisch. Keine Veröffentlichung; Store-Platzhalter
bleiben wie beauftragt. Serverzugang/Routing weiterhin vor Livegang abgleichen.

## Aktualisierung V21 – aktuelles Paket

FaviconC und neue Navbar enthalten. Jüngstes geprüftes Paket:
output/landing-v21/release, ZIP:output/landing-v21/kws-landingpage-release-v21.zip.
Release aa5fab635bbef5cd,27Dateien,1170354Bytes. Verifizierte versionierte
Favicon-URLs; bekannte Dateien werden über den URL-Pfad geprüft. Ältere Pakete
sind historisch. Keine Veröffentlichung, Store-Platzhalter und bisherige
Server-/Routingabklärung bleiben bestehen.

## Aktueller Stand V23 – veröffentlicht16.10.2026,23:10:59Europe/Berlin

Die früheren Launchvorbereitungen oben sind historische Stände. Navbar B und
Roadmap-Swipe veröffentlicht als ec17c1bab5ee7613,28Dateien/1175965Bytes.
Aktuelles Paket output/landing-v23/release-publish, Archiv release-publish.tar.gz;
SHA256 e1e538ac923f6c98dd1a1cad220d32bcd4c87bd76bd20cfb2c573fb4c3696cbb.
Produktionsnachweis output/landing-v23/server-published.json;
öffentliche QA docs/qa/2026-10-16-landing-v23.md.
Mount /opt/kws/web-production/landing-releases/ec17c1bab5ee7613/public/landing
bleibt unabhängig vom App-Source. Vorheriges e8be88d7aec27211 erhalten.
Nur Web erneuert; App3b3e15a und andere Container unverändert.

## Aktueller Stand V24 – veröffentlicht16.10.2026,23:20:52Europe/Berlin

Mobile Navbar jetzt oben als Marken-/Textnavigation; Hero bis600px ungefähr
auf halber Gerätehöhe abgeschnitten. Desktop B erhalten. Statisches Release
a8aef4930d8290e3,28Dateien/1176095Bytes; Paket output/landing-v24/release.
Archiv SHA256:0a0146ab2cd2f2e14f042609631eac70f6c1862e20162574c0154956cbcd7e8e.
Vorheriges ec17c1bab5ee7613 erhalten. Unabhängiger statischer Readonly-Mount,
App3b3e15a unverändert. Nachweis docs/qa/2026-10-16-landing-v24.md und
output/landing-v24/server-published.json. Nur Webcontainer erneuert.

## Aktueller Stand V25 – veröffentlicht16.10.2026,23:31:45Europe/Berlin

Geglätteter Roadmap-Swipe:41904f6d87fdf487,28Dateien/1178741Bytes.
Paket output/landing-v25/release, ArchivSHA256:
50b96e8b5d4af457d76f3b4232cd7ffed5aa73cea4c587e8e3eecd830375a5e7.
Vorheriges a8aef4930d8290e3 erhalten. Separater statischer Mount;nur Web neu,
App3b3e15a unverändert. Beleg docs/qa/2026-10-16-landing-v25.md und
output/landing-v25/server-published.json.

## Aktueller Stand V26 – veröffentlicht16.10.2026,23:38:39Europe/Berlin

Auch mobile obere Navbar schwebend. Release dc311b00da467a50,
28Dateien/1178969Bytes; Paket output/landing-v26/release. ArchivSHA256:
17194096f1f1f9ea8cb08f3dd50b8c321ff9412f0a8cdb1abb23883ab46e49fd.
Vorheriges41904f6d87fdf487 erhalten. Nur statischen Mount/Web aktualisiert;
App3b3e15a unverändert. QA docs/qa/2026-10-16-landing-v26.md.

## Aktueller Stand V27 – veröffentlicht16.10.2026,23:46:27Europe/Berlin

Mobile Navbar mit originalem Beta-Symbol und drei Links in einer Zeile.
Release0740cb00462bf776,29Dateien/1180091Bytes;Paket output/landing-v27/release.
ArchivSHA256:613535bc20ad976d6d99ebdbdfbd57e4aee74c5978202c49d3586bd57991ef89.
Vorheriges dc311b00da467a50 erhalten. Aktuelle App-Revision ist inzwischen
d0e5a6efabaef96519cca0fbc6e7deef6a982f29;beim statischen Release erhalten.
Nur Landingmount/Web aktualisiert;Nachweis docs/qa/2026-10-16-landing-v27.md.
