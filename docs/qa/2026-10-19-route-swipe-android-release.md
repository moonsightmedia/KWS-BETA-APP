# Android-Veröffentlichung des Wisch-Fixes – Laptop-Übergabe

Der Nutzer hat am 19.10.2026 die Veröffentlichung ausdrücklich beauftragt und
präzisiert, dass er die **installierte Android-App** testen möchte. Build und
Google-Play-Veröffentlichung sollen mit der bestehenden Laptop-Umgebung erfolgen.
Auf dem PC werden dafür keine neuen Buildwerkzeuge installiert.

## Geprüfte Quelle

- PR: https://github.com/moonsightmedia/KWS-BETA-APP/pull/55
- Branch: `codex/intuitive-route-swipe`
- Implementierung: `46a8d6abd0d586826bb873929c1faa96aa6a6fd3`
- Basis: `4b763e5c13751d09163dd4d4b4af3f701b9a72ec` (`origin/main`).
- Änderungen und lokale Prüfungen: `docs/qa/2026-10-19-route-swipe.md`.
- Produktionsbuild, drei Gesten-Unit-Tests, bestehender Trainings-Gestentest,
  gezielte TypeScript-/ESLint-Prüfungen und beide visuellen QA-Loops bestanden.

Vor Fortsetzung Remote frisch fetchen und lokale Änderungen/Branch/Upstream
prüfen. Einen eigenen sauberen Worktree verwenden, falls der Laptop offene
Änderungen enthält. Keine dortigen Änderungen überschreiben.

## Noch auszuführen

1. Im berechtigten Play-Console-Konto den aktuellen internen Track und den
   höchsten bereits verwendeten Versionscode live prüfen. Im Repository steht
   derzeit `versionCode 77`, `versionName "1.0.250"`; daraus folgt **keine**
   verifizierte Aussage über den neuesten Console-Stand. Den nächsten freien
   Versionscode verwenden und diese Änderung vor dem finalen Build committen.
2. Bestehende Laptop-Konfiguration für Hostinger, Review-Umgebung, Monitoring
   und Upload-Signatur beibehalten. Keine neuen Schlüssel erstellen und keine
   Schutz-/Kompatibilitätsregeln ändern. Die Freigabe betrifft das interne
   Android-Update, nicht eine zusätzliche öffentliche Store-Veröffentlichung.
3. Den vorhandenen Weg `node scripts/build-play-android.mjs` verwenden.
   `KWS_ANDROID_KEYSTORE`, `KWS_ANDROID_STORE_PASSWORD`, `KWS_ANDROID_KEY_ALIAS`
   und `KWS_ANDROID_KEY_PASSWORD` ausschließlich über die Prozessumgebung setzen.
   Bitwarden-Referenzen: `KWS_PLAY_UPLOAD_KEYSTORE_BASE64` und
   `KWS_PLAY_UPLOAD_KEYSTORE_PASSWORD`; vorhandenen Alias übernehmen.
4. Das tatsächlich erzeugte AAB prüfen: Signatur, eingebettete Quellrevision,
   private Geheimnisse ausgeschlossen, Android-Manifest einschließlich optionalem
   Video-Encoder, bisherige Berechtigungsgrenzen und 16KB-Kompatibilität.
   Vorhandene native Regressionen aus der Release-Dokumentation ausführen.
5. Das geprüfte AAB in den bestehenden internen Play-Testkanal hochladen,
   verarbeiten lassen und veröffentlichen. Bestehende Tester und die öffentliche
   Store-Einreichung unverändert lassen. Den sichtbaren Release-Status und den
   tatsächlich verarbeiteten Versionscode verifizieren. Ein Upload allein ist
   keine Veröffentlichung und keine bestätigte Installation auf dem Nutzergerät.

Der Web-Release bleibt ein separater Nachweis: PR-Gates beachten, regulär nach
`main` mergen und die gemeinsame App-/Landing-Revision anhand beider
`release.json`-Dateien prüfen. Ein Web-Deployment aktualisiert das gebündelte
Android-Paket nicht. Beim PC-Übergabestand wartet der PR-Check auf einen Runner;
GitHub meldet eine Actions-Störung: https://www.githubstatus.com/.

## Verfügbarkeit und Grenzen

Code und diese Übergabe werden auf den oben genannten GitHub-Branch gepusht.
Die Obsidian-Synchronisierung konnte auf dem PC nicht bestätigt werden, weil
Obsidian nicht läuft. Für die Fortsetzung deshalb zuerst diese Git-Quelle nutzen.
Auf dem PC wurde kein neues AAB erzeugt und kein Android-Update hochgeladen.
Der Laptop ist aus der PC-Sitzung nicht als ausführbarer Remote-Host erreichbar.
