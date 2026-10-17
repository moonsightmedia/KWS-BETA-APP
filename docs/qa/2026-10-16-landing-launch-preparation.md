# Landingpage – Veröffentlichung vorbereitet

16.10.2026, keine Veröffentlichung. Haupt-QR-Ziel direkt im gewählten
Plakat-Generator und verification.json bestätigt: https://beta.kletterwelt-sauerland.de/landingpage.
Sechs Bereichscodes bleiben unverändert.

Umsetzung: absolute Asset-URLs, Canonical, OpenGraph/Twitter, eigenständiges
statisches Paket mit lokalen Fonts, Manifest/Dateihashes, Caddy-Routen und
Generator für einen geprüften Konfigurationskandidaten. Details/Deployment/Rollback:
ops/hostinger/landingpage/README.md.

Zwei Tests mit echtem lokalem Caddy2.10.2,375/768/1280/1920px visuell geprüft.
Seite direkt auf/landingpage200 mit korrekt geladenen Fonts/Bildern, keine
CSP-/HTTP-/Laufzeitfehler. Native Sprunglinks bleiben auf/landingpage inkl.Query,
Features und Partnerwahl funktionieren. Aliase308 inkl.Query, fehlendes Asset404,
No-JS vollständig lesbar. Andere App-Routen als getrennte Fixtures geprüft;
dies ist keine produktive App-Regression. Originales Produktions-Caddytemplate
mit ergänzt erzeugtem Kandidaten erfolgreich adaptiert/validiert. Bei verändertem
Fallback oder vorhandener Landingkonfiguration erzeugt der Helfer keine Datei.
Manifestprüfung bestanden. Keine neuen App-Dependencies oder App-Builds.

Live read-only perHTTPS:200/App-SPA statt Landing. HTTP308 aufHTTPS bestätigt;
Privacy/Imprint200. SSH-Handshake auf bekanntem VPS-Port22 mit Timeout gescheitert;
aktuelles Produktions-Caddyfile nicht lesbar. Kein Serverzustand verändert.
Offene Freigaben: finales Logo; bestätigte Store-URLs oder bewusstes Coming-soon;
frischer Serverabgleich und Produktiv-Smoke-Test. Keine DNS-/App-/API-/DB-Mutation.

Lokale Artefakte output/landing-release: Paket, Checksummen, Caddyvalidierung,
Smoke-Script, JSON-Nachweis und Screenshots. Caddy-Download SHA512 gegen offizielles
Releasechecksummenfile geprüft. Keine neue unabhängige Designjury.
