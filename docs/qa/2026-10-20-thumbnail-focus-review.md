# Startgriff-Integration und Bestandsprüfung – 20.10.2026

Ausgangsbasis: `fd18040` (aktuelles origin/main nach Fetch). Der ältere lokale
Prototyp auf13dd14c lag24 Commits zurück und bleibt unangetastet. Dieser PR
übernimmt gezielt die Thumbnail-Funktion; die früheren lokalen Kartenexperimente
sind kein Bestandteil dieses PRs.

## Umfang

- Echter Uploadeditor und bestehender Bouldereditor verwenden dieselbe kompakte
  Griffvorschau nach der Farbe; BatchUpload und SetterEditPage übertragen die
  gerenderte Auswahl über die bestehende Medienqueue. Kein neuer Uploaddialog.
- Konfigurierter, authentifizierter CPU-Service; Loopback-Profil für lokale Tests.
  Keine Gewichte, Nutzerbilder, Konfigurationstoken oder Prüfauswahlen im Git.
- Geschützte Route `/setter/thumbnails`; lokales Operatorprofil unter
  `/thumbnail-review-local`. Lokale Datenprofile verwenden echte Anmeldung, keine
  Rollen- oder Session-Stubs. Telemetrie, Sentry und Monitoring sind dort aus.
- IndexedDB hält Analysen, Korrekturentwürfe, Bestätigungen und Originaldateien.
  Online-Publikation nutzt die bestehende kontogebundene Medienübertragung und
  einen bedingten Thumbnail-PATCH. Keine automatischen Online-Bestätigungen.

## Reale Bestandsdaten

Live-Website und öffentlicher Datenhost wurden neu gelesen; die Hostreferenz war
im frisch geladenen Webbundle vorhanden. Pagination lieferte104 Datensätze, alle
mit Status `haengt`. Alle104 Originalfotos wurden lokal geladen.98 Analysen liefen
durch, davon82 mit Startvorschlägen und16 ohne Auswahl.6 Fotos (Pink/Mint) haben
keine Farbautomatik und wurden als manuelle Fälle erhalten. Kein Downloadfehler.
Diese Zahlen messen Verfügbarkeit von Vorschlägen, **keine Erkennungsgenauigkeit**.

Sechs echte frühere Nutzerkorrekturen wurden anhand des Foto-SHA-256 der richtigen
Katalogzeile zugeordnet. Sie ändern nur die Prüfvorschau, nicht den Algorithmus
oder die Onlinebilder. Die dafür genutzten23 Entwicklungsfotos sind kein Holdout.
Maskenränder bleiben Modellschätzungen, keine vollständig annotierte Grundwahrheit.

Die Live-DB hatte `volume_only` noch nicht. Der kompatible Katalog enthält dieses
Feld deshalb nicht. Vor einem Produktionsrollout müssen Schema und Volumenfälle
abgeglichen werden. Die Neu-Uploadvorschau lässt „Nur Volumen“ unverändert.

## Verifikation

- Releasebuild erfolgreich; bestehende große-Chunks-/Browserslist-Hinweise.
- TypeScript:67 Ausgangsdiagnosen und67 aktuelle Diagnosen, keine neue Diagnose-
  Gruppe. Unterschiede in ausführlichen generischen Fehlermeldungen betreffen
  ausschließlich unveränderte UploadContext/useCompetitionBoulders-Dateien.
  Der gesamte bestehende TS-Check ist damit weiterhin nicht grün.
- ESLint für die vier neuen TS/TSX-Kernmodule ohne Befund.
-8 Publikationsregressionen: explizite Bestätigung, Session/Rolle, Konto/Backend,
  Originalbeleg, CAS-Rennen, veränderte Farbe/Status, Speicherfehler und Wiederaufnahme nach verlorener
  erfolgreicher PATCH-Antwort. Ausschließlich injizierte Testtransporte.
-7 Python-Tests: HTTP-Guards, kein Dateiserver, kapazitätsbedingtes429,
  Authentifizierungsfehler, leere Bildfläche, farbunabhängige Tippsegmentierung
  und Pagination über100 Zeilen hinaus.
-33 bestehende Playwright-Tests aus `setter-quick-actions.spec.ts` und
  `designmotion-four.spec.ts` bestanden. Namenfokus, Validierung, Speichersperren,
  Rückwege und die vorhandenen Setter-Aktionen bleiben erhalten.
- Lokale Browser-Smokes mit echten104 Fotos: Entwurf schließen/neuladen/öffnen,
  mehrere Startgriffe, An-/Abwahl, Rückgängig, Originalmodus sperrt Bestätigung,
  Bestätigen, erneut laden, Filtern und JSON-Export. Zwei pinke Startgriffe wurden
  über den echten CPU-Dienst per Tipp ergänzt, bestätigt und nach Reload erhalten.
- Je zwei visuelle QA-Loops für Grid, Korrektursheet und echten Editor bei375,
  768,1280 und1920px. Keine Seitenüberläufe und keine JavaScriptfehler. Mobile
  Suche, Dialoginnenabstände, Scrollbereich und Navigationsabstand wurden danach
  korrigiert und erneut geprüft. Tastaturbedienung und Reduced Motion erfasst.

Die erste App-Smoke-Runde hatte durch die geladene Produktivkonfiguration
Telemetrie-POSTs ausgelöst. Danach wurden alle Telemetrie-/Monitoring-Flags im
lokalen Profil explizit abgeschaltet. Die erneut ausgeführten Browser-Smokes
verzeichneten null externe Schreibversuche und blockierten solche zusätzlich
vor dem Netzwerk. Es wurden keine produktiven Boulder-/Medienänderungen im Test
vorgenommen. Ein echter Online-Publikationstest benötigt eine Setteranmeldung
und eine Nutzerbestätigung konkreter Bilder; dieser Schritt wurde nicht simuliert
als bereits online erfolgreich dargestellt.

## Betrieb

Setup, Gewichte/Hashes, Flag, Serviceauth, Wiederaufnahme und Rücksetzen stehen in
`services/thumbnail-focus/README.md`. Die Funktion ist standardmäßig aus; der PR
installiert keinen Dienst und aktiviert kein Produktionsflag. Kein Merge/Deploy.
Die serverseitige Speicherung eines zusätzlichen Rohfotos für neue Uploads und
ein geräteübergreifender Prüfspeicher sind nicht Teil dieser ersten Integration.
