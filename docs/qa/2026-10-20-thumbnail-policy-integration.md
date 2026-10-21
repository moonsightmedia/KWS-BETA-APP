# PR 69 – Bestands- und Veröffentlichungsschutz

## Aktuell verifizierter Bestand

Die öffentliche REST-Abfrage am 20.10.2026 um 20:55:53 UTC lieferte 139 Datensätze mit `id`, `thumbnail_url`, `volume_only`. Alle 139 zeigen bereits auf unveränderliche Varianten im eigenen Storage: 32 unter `confirmed-2026-10-20`, weitere 107 unter `live-confirmed-2026-10-20`. Ein Datensatz ist als `volume_only` markiert; auch dieser war bereits vor dieser Integration veröffentlicht. Es wurden ausschließlich öffentliche Metadaten gelesen, keine Fotos geladen oder zur Analyse übertragen.

Belege lokal: `output/thumbnail-integration-20261020/public-thumbnail-catalog.json` und `catalog-protection-proof.json`. Die Policy erkennt 139/139 anhand des exakten konfigurierten HTTPS-Origins, Buckets, beider beobachteter Serien, derselben Datensatz-UUID und des 20-stelligen Hex-Suffixes. Eine beliebige PNG-Datei, ein fremder Origin oder eine andere UUID genügt nicht. Für spätere Veröffentlichungen kann außerdem ein exakt passender dauerhafter Beleg verwendet werden. Die frühere PR-Angabe „107 offen“ beschreibt diesen aktuellen Bestand nicht mehr.

## Änderungen

- Bereits veröffentlichte Varianten werden angezeigt und gezählt, aber weder erneut analysiert noch zur Veröffentlichung angeboten. Bestehende IndexedDB-Entscheidungen werden dabei nicht geändert oder als neue Zustimmung erfunden. Alte, fehlende Datensatz-IDs werden nicht zugeordnet.
- Der reguläre Katalog lädt `volume_only`. Volumen, unbekannter Volumentyp und abgeschraubte Boulder bleiben geschützt. Die Upload-Dateiwahl erzwingt unabhängig von UI-Zuständen bei Volumen oder deaktiviertem Feature das Original.
- Vor Veröffentlichung werden Sitzung, Kontoinhaber, Setter-/Adminrolle, aktuelles Original, Farbe, Status und `volume_only === false` geprüft. Der SHA-256 des gespeicherten Original-Blobs muss zur Auswahl gehören. Ein dauerhafter lokaler Beleg entsteht vor dem Medienupload; anschließend ändert ein Compare-and-swap ausschließlich `thumbnail_url`, einschließlich des Volumenfilters. Konflikt- und Antwortverlustbehandlung bleiben erhalten.
- Produktions-Web verwendet den relativen authentifizierten Proxy. Native Apps und die getrennte Web-Prüfumgebung verwenden den Proxy am jeweils konfigurierten API-Origin, niemals versehentlich `https://localhost/thumbnail-focus`. Ohne explizites Featureflag und gültigen Pfad erfolgt keine Aktivierung.
- Der lokale manuelle PhotoSpace-Helfer behält Originalbytes und deren Hash, berücksichtigt die Browserorientierung und begrenzt die Vorschau wie der Dienst auf 720 Pixel. Seine Verwendung bei unbekannter Farbe/Dienstausfall wird separat im Setter-QA-Bericht geprüft.

## Verifikation

| Prüfung | Ergebnis |
| --- | --- |
| `node --test test/thumbnailPolicy.test.mjs test/thumbnailPublish.test.mjs test/thumbnailGeometry.test.mjs` | 22/22 erfolgreich |
| `npx playwright test --config test/thumbnail-policy.playwright.config.ts` | 7/7 erfolgreich, keine Retries |
| Scoped ESLint für die drei TS/TSX-Produktdateien und die eigenen UI-Testdateien | Keine Fehler oder Warnungen |
| Gesamt-Typecheck | Bestehende Projektfehler; keine Meldung für die hier geänderten Thumbnail-Dateien |
| `git diff --check` für die vier geänderten Produktdateien | Erfolgreich |

Der echte Review-Screen wurde mit synthetischen Bildbytes und abgefangenen Requests gerendert: zwei veröffentlichte Varianten, Volumen, fehlende Volumenmetadaten und ein neues Original. Nur das neue Original gelangt zur Analyse; geschützte Karten sind deaktiviert, die Zahl lokaler Entscheidungen bleibt null und es erfolgen keine Medien-/REST-Schreibvorgänge. Zwei weitere Fälle prüfen tatsächlich aufgerufene API-Origins für Native und Web-Demo. Der Fixture-Resolver verbietet den Live-Supabase-Client und Uploads; externe Requests werden blockiert bzw. synthetisch beantwortet.

Zwei Zustände bei 375, 768, 1280 und 1920 Pixeln wurden gerendert und alle acht Bilder visuell geprüft: Standardfilter sowie „Alle Bilder“, klare Schutztexte, erreichbare Filter/Aktionen, keine horizontalen Überläufe. Belege: `output/thumbnail-integration-20261020/policy-loop{1,2}-{375,768,1280,1920}.png`. Die weißen Miniaturflächen sind ausdrücklich synthetische 1-Pixel-Testbilder und kein Beleg zur Erkennungsqualität echter Boulderfotos.

## Grenzen und Betrieb

Diese Integration veröffentlicht oder migriert keine Produktionsbilder und verändert keine Nutzerauswahl. Originaldateien und Entscheidungen im Reviewablauf liegen weiterhin gerätebezogen in IndexedDB; die unveränderte ursprüngliche Medien-URL bleibt erhalten. Das ist kein zusätzlich eingerichtetes Serverbackup. Dienstinstallation, authentifizierte Proxyrouten, getrennte Review-Authentifizierung, CORS und explizite Aktivierung müssen vor Benutzung separat geprüft werden. Der Testserver verwendet ausschließlich Port 5248 und wird vom Testlauf beendet.

## Ergänzung: tatsächlicher Veröffentlichungstransport

Eine unabhängige Integrationsprüfung fand, dass der vorher injizierte Uploadtransport die Rollen-RPC und den Boulder-GET ablehnte. Der Publisher verwendet jetzt den eindeutigen RLS-GET auf die eigenen `user_roles` statt der im Livebackend überladenen `has_role`-RPC. Der echte `createUploadFetch` erlaubt dafür ausschließlich zwei weitere GET-Verträge: eigene Rollen mit festem Select/Filter/Limit sowie genau eine Boulder-UUID mit dem festen Select einschließlich Volumen. Weitere oder doppelte Queryparameter, fremde Rollenabfragen, RPCs, Fremdorigins und Rollenmutationen werden vor dem Netzwerk verworfen. Derselbe Kontoinhaber-, Tokenrefresh- und Redirectschutz gilt für Vorprüfung, Medienupload und CAS.

`test/thumbnailPublishTransport.test.mjs` transpiliert die echte Produktionsimplementierung und prüft die vollständige erlaubte Abfolge mit synthetischem Transport, Expiry mit einmaligem Refresh, Kontowechsel nach jedem Teilschritt, Wechsel bei abgewiesenem Token, fehlende Rollen und die engen Negativrouten. Zusammen mit den bestehenden Publisher- und SessionRecovery-Tests sind 41 Fälle erfolgreich. Scoped ESLint und diff-check sind erfolgreich. Es erfolgte dabei keine Verbindung zu produktiven Konten oder Medienendpunkten.

Der abschließende gemeinsame Lauf einschließlich `uploadAuthentication`, Policy und Geometrie besteht 77/77 Fälle. Ein unabhängiger Agent hat die neue Allowlist gelesen und die acht Echttransportfälle erneut erfolgreich ausgeführt.
