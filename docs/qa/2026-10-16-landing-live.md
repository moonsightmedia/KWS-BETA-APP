# Landingpage veröffentlicht

Nutzerauftrag16.10.2026: jetzt online bringen. Erfolgreich veröffentlicht
18:04:17UTC /20:04:17Europe/Berlin unter
https://beta.kletterwelt-sauerland.de/landingpage.

## Server und Release

SSH mit bestehendem Geräteschlüssel/striktem bekanntem Hostkey erfolgreich.
Host srv2044594. App-Revision3b3e15a687c8642300fe5b741740a213807fa48e frisch
geprüft und unverändert. Laufender Caddy2.11.7, gepinntes Image
caddy@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f.
UI V21, statischer Releaseb00d7677969f2633,27Dateien/1170354Bytes.
Der gegenüber V21 geänderte Releasehash entsteht ausschließlich aus dem
unabhängigen Caddy-Dateiroot; sämtliche sichtbaren Assets bleiben bytegleich.

Eigener statischer Readonly-Mount außerhalb source/dist, daher unabhängig von
künftigen App-Sourcewechseln. Frischer App-Updater geprüft: verwendet vorhandenes
Composefile und ersetzt nur die Source. Caddy/Compose vorab gesichert. Beide
vorhandenen Release-Locks berücksichtigt. Nur Webcontainer neu erstellt;
Startzeit und Laufzustand sämtlicher anderen Container unverändert bestätigt.
Keine DNS-, Datenbank-, API-, Video-, Account- oder Inhaltsdatenänderung.

## Prüfungen

- Server: Paket-SHA/Dateihashes, Kandidatenvalidierung im echten Image,
  separater Loopback-Smoke19091 vor Freischaltung; danach gleiche Prüfungen9091.
- Öffentlich: HTTPS200, HTTP308→HTTPS, HTML bytegleich zum Paket und passende CSP.
- Alle27Dateien inklusive HTML/Fonts/Favicon/Bilder hashgeprüft; Alias308 mit
  Query-Erhalt, fehlendes Landingasset404.
- /,/auth,/guest?sector=Bug%20A,/privacy,/imprint,/reset-password,/auth/callback
  weiter App-SPA200 mit unverändertem HTMLhash. Interner Test zusätzlich community-rules.
-375/768/1280/1920px gerendert und visuell angesehen: beide Marken, mobile
  Navigation, keine horizontalen Überläufe; keine CSP-/Laufzeit-/Netzwerkfehler.
- Drei Ausblickthemen, Partnerwechsel, alle vier fixierten Featurekapitel,
  mobile Menüauswahl und ohne JavaScript lesbare Navigation/Inhalte bestanden.
- Bestehender APK-Download über öffentliche HEAD-Anfrage zusätzlich geprüft.

Lokale Belege output/landing-online: live.cjs,live-results.json,
server-published.json,live-top-*.png,live-menu-*.png, Release und Archiv.
Geschützte Serverbelege im Releaseordner: STAGED.json,PUBLISHED.json und
vorherige Caddy-/Compose-Konfiguration. Rollbackablauf im Ops-README.

Keine physische QR-/iPhone-/Android-Abnahme behauptet. Die bereits verifizierte
QR-Zieladresse ist jetzt tatsächlich die Landingpage. Storeflächen bleiben
ausdrücklich gewünschte Bald-verfügbar-Platzhalter; keine Stores veröffentlicht.
Trainings-Releasesperren der App bleiben unberührt. Kein Git-Commit/Push in diesem
Schritt; veröffentlichte Dateien sind unabhängig von der App serverseitig erhalten.
