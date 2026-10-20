# API-Proxy, mobile Karten und Desktop-Einführung

Basis: main181001d. Reihenfolge: Proxyreparatur, PR72 (768d088), PR71
(6ffa408). Beide Featurezweige wurden unverändert zusammengeführt; ihre
Produktdateien überschneiden sich nicht. PR69 und PR4 bleiben separat.

## Produktionsproxy: Ursache und gesicherte Reparatur

Echte Chromium-Anfragen scheiterten vor dem Eingriff mit
`HeaderDisallowedByPreflightResponse` für `accept-profile`. Der bestehende
Caddy-Proxy erlaubte Supabase die beiden Schemaheader `accept-profile` und
`content-profile` nicht. Die Reparatur ergänzt ausschließlich diese Header.
Die vier bestehenden Origins, Routen, Authentifizierung und RLS bleiben gleich.

Operator: `ops/hostinger/fix-supabase-schema-cors.py`; sechs Regressionstests
prüfen exakten Diff, Idempotenz, Eingabegrenzen, Inodeerhalt und Rücknahme bei
Validierungs-/Nachprüfungsfehlern. Wiederherstellbare Originalkopie vor Änderung,
Caddy-Validierung vor kurzem Containerneustart, anschließender Healthcheck.

Am20.10.2026 um20:21:39UTC erfolgreich auf srv2044594 angewandt. Originalhash
`4b621f0c70bd2d9f3705eefad61022bbfa3c15b207f6b55364fbf493ab37f734`, danach
`2b2e0c5bd4f362a53357730965091733a9846431c8a33c2a6d8fa52134e0e159`.
Serverbeleg `/opt/kws/production/SUPABASE-SCHEMA-CORS-VERIFIED.json`, Original
unter `/opt/kws/production/cors-backups/20261020T202139352614Z/API.Caddyfile`.
Alle vier bestehenden Origins bestehen GET-/PATCH-Preflights; eine fremde Origin
erhält weiterhin keine CORS-Freigabe. Keine Datenbankmigration erforderlich.

Echte Browsernachprüfung: Profile (`id,first_name,last_name,full_name,email`),
Boulder (`*`) und Sektoren (`*`) antworten mit200; die vorher blockierten
Preflights mit204. Keine CORS-Fehler oder Konsolenfehler. Die Startseite lädt
wieder ihre Profildaten; Boulderansicht zeigt139 Boulder. Abgebrochene Medien-
Requests beim Seitenwechsel wurden getrennt von CORS-Fehlern betrachtet.

## Releaseprüfung

350 funktionale Node-Tests und sechs Proxy-Sicherheitstests bestanden. Die
Kartenintegration besteht7 neue und23 bestehende Browserprüfungen; die
Einführung zehn Profile mit110 Schritten. ESLint: null Fehler, drei bestehende
Fast-Refresh-Warnungen im Settereditor. Der neue Desktop-
Test nutzt gebündeltes Chromium und einen selbst verwalteten lokalen Server;
er ist zusätzlich im regulären Web-Workflow verankert.

Die Karten-Fixtures erhalten getrennte Vite-Cacheverzeichnisse. Ein vorheriger
Parallellauf hatte durch den gemeinsamen Abhängigkeitscache504-Fehler erzeugt;
mit der regulären Konfiguration und unveränderten Assertions bestehen danach
alle sieben mobilen Tests. Kein Testfehler wurde durch gelockerte Assertions
oder Überspringen einer Ansicht umgangen.

Der projektweite TypeScript-Lauf meldet weiterhin61 Diagnosen auf bestehender
Fehlerbasis (Exit2). Er wird ausdrücklich nicht als bestandener Typecheck
ausgewiesen. Browserprüfungen verwenden Chromium und emulierte Touch-Eingaben;
ein physisches iPhone oder Android-Gerät wurde dabei nicht geprüft.

Zielversion1.0.253, vorbereiteter Android-Versionscode86. Web-App und Landingpage
werden gemeinsam über PR, CI und main veröffentlicht. Tatsächliche Freigabe und
Verfügbarkeit werden nach dem abgeschlossenen Lauf dokumentiert.
