# Volumen-Boulder und tonlose Uploads

Stand: 14.10.2026. Implementiert im isolierten Worktree
`codex/volume-boulders-silent-video`, Basis `c4d2baf` aus
`origin/codex/hostinger-migration`. Noch nicht veröffentlicht.

## Verhalten

- Eigene strukturelle Eigenschaft `boulders.volume_only`, Default false.
  Setter-Draft `volumeOnly`, Create-Payload und Edit-Payload sind verbunden.
  Farbe und Zweitfarbe bleiben unabhängig; öffentliche Reads brauchen keine
  zusätzlichen privaten Attributzuordnungen. Bestehende RLS bleibt unverändert.
- Neue, wiederverwendbare `BoulderTypeBadge`-Kennzeichnung in Benutzer-/Gast-
  Listen, Home, Details, Setter-Edit/-Status und Upload-Stapel.
- iOS: kontrollierter Writer enthält keine Audioinputs. Original-Reuse nur
  bei null Audiotracks. Verlustfreie AVFoundation-Video-only-Kopie als Fallback.
  Der jüngste Pixelbuffer-Adaptor-/Frame-Timing-Fix bleibt erhalten.
- Android: nach Komprimierung oder bei deren Ausfall kopiert eine lokale
  MediaExtractor/MediaMuxer-Bridge nur die Videospur. Rotation bleibt erhalten.
  Kein Lesen kompletter Gallery-Videos als JS/Base64.
- Web bzw. File-Inputs: bestehende FFmpeg-WASM-Abhängigkeiten entfernen Audio
  verlustfrei mit `-map 0:v:0 -c:v copy -an`. Eigener Worker je Vorgang, begrenzte
  Laufzeit, Blob-URL-/Worker-Cleanup, kein Upload des Originals im Fehlerfall.
  Der Worker lädt den öffentlich verfügbaren, versionierten Core von unpkg;
  Benutzermedien werden nicht an diesen CDN gesendet.
- Server: HD-Streamcopy und SD-/Low-Transcodes enthalten `-an`. ffprobe lehnt
  neu erzeugte Renditions mit Audio ab. Altbestände/alte Ready-Marker bleiben
  unangetastet; keine rückwirkende Migration vorhandener Videodateien.

## Verifiziert

1. 17 isolierte Browsertests: Editor bei 375, 768, 1280, 1920 px; Umschalten
   erhält Farbwahl und Zweitfarbe; Hydration und Edit-Payload; Create-Payload mit
   zwei Farben und Flag; Grid/List bei allen vier Breiten. Zusätzlich Gast,
   Home, Detailseite, Detaildialog, Setter-Edit und -Status bei allen vier Breiten.
   Unberührte Community-Tabinhalte und Benachrichtigungen sind in dieser
   zusätzlichen Darstellungsprobe isoliert. Keine Live-DB-Writes.
2. Zwei visuelle Schleifen; Screens unter `test-results/volume-silent-20261013`.
   Controls entsprechen KWS-Tokens, keine horizontale Überbreite, kein Badge
   über dem Grad. Synthetische Sektor-/Bilddaten sind explizit Testdaten.
3. Reale Browser-Mediendateien: MP4/AAC und WebM/Opus -> null Audiotracks, eine Videospur,
   320×240. SHA-256 der kopierten Videopakete stimmt mit dem Input überein.
   Ein nicht erreichbarer Core und ein Abbruch liefern kein Original als Ersatz.
4. 7 native Bridge-/Fallback-Vertragstests, 2 Transformations-Tests und 3
   bestehende Zweifarben-Tests: erfolgreich. Bridge-Vertragstests mocken native
   APIs und ersetzen keinen AVFoundation-/Android-Gerätetest.
5. Gesamte Hostinger-Testsuite: 26 Tests erfolgreich, inklusive echter FFmpeg-
   Erzeugung aller drei Qualitäten aus Inputs mit und ohne Ton.
6. `vite build`: erfolgreich. Android `:app:compileDebugJavaWithJavac`: erfolgreich.
7. TypeScript-Vergleich gegen unverändertes HEAD: 76 bestehende Diagnosen,
   76 aktuelle, keine zusätzlichen Fehlercodes/fehlerhaften Ausdrücke.
   Der gesamte Repository-Typecheck ist damit ausdrücklich NICHT fehlerfrei.

## Offen vor Release

- Additive Migration `20261013160000_boulder_volume_only.sql` zuerst anwenden
  und Spalte/RLS/Schema-Cache prüfen; erst dann UI veröffentlichen.
- Native iOS-Tests `scripts/ios/NativeEncoderTests.swift` unter Xcode ausführen.
  Zusätzlich reales iPhone- und Android-Video mit Audio auswählen, Upload und
  ffprobe der gespeicherten HD/SD/Low-Dateien prüfen. Hier unter Windows ist
  AVFoundation nicht ausführbar; Android wurde kompiliert, nicht auf Gerät getestet.
- Server-Änderung auf Hostinger und Web-/APK-/TestFlight-Änderung koordiniert
  ausrollen. Keine Release-Versionsnummer erhöht, kein Build/Deploy ausgelöst.
- Bestehende ältere Feature-Änderungen (optionale Beta, öffentlicher Schraubplan)
  bleiben in `kws-optional-beta` und wurden nicht stillschweigend mitgezogen.
- Browser-WASM lädt beim ersten Bedarf etwa 31 MB Runtime und hält Video im RAM.
  Große Dateien und schlechte Verbindung brauchen einen Browser-/Gerätetest;
  Native Gallery-Inputs bleiben unabhängig davon im nativen Pfad.

## Reproduktion

```powershell
node --test test/nativeSilentVideo.test.mjs test/volumeBoulders.test.mjs test/boulderColors.test.mjs
node test/typecheck-volume-silent.mjs
node node_modules/@playwright/test/cli.js test --config test/volume-silent.playwright.config.ts e2e/volume-silent.spec.ts --workers=1
# im hostinger-video-server-Verzeichnis: npm ci --ignore-scripts; node --test test/*.test.js
node node_modules/vite/bin/vite.js build
# im android-Verzeichnis (nach Capacitor-Generierung): .\gradlew.bat :app:compileDebugJavaWithJavac
```

Primärreferenz für WASM-Laden und Worker-Verwendung:
[FFmpeg-WASM Usage](https://ffmpegwasm.netlify.app/docs/getting-started/usage/).
