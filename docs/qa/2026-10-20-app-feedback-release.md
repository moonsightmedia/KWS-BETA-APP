# App-Feinschliff vom 20.10.2026

## Umfang

- Global sortierter Videofeed statt erneuter Sektorgruppierung.
- Mobile Detail- und Feedgesten mit echtem Touch, schließbares Detailsheet,
  Rechtswischen zum bisherigen Einstieg und HD auf normalen/unbekannten Netzen.
- Nummerierte nächste Schraubtermine auf der realen Hallenkarte und NEU für
  tatsächlich neu hinzugefügte aktuelle Boulder, einschließlich Zweitsektoren.
- App-Info mit tatsächlicher nativer Version/Build, getrennten Web-/Store-Updates,
  beiden vorhandenen Marken und Website-Links.
- Avatar-Doppeltipp/-klick mit erneuter eigener Serverrollenprüfung.
- Pull-to-Refresh bestätigt Erfolg für 800ms; Mindestspinner250ms. Fehler behalten
  ihre bisherige längere Lesedauer. Kein global verkürzter Fehlerhinweis.

## Prüfung vor dem gemeinsamen Release

- `node --test test/*.test.mjs`: 350/350 bestanden.
- Karten: 9/9 neue Browser- und 14/14 bestehende Schraubplanprüfungen bestanden.
- Video: 11/11 Detail-, 27/27 Feedprüfungen und 6/6 Netz-/Fallbacktests bestanden.
- App-Info/Avatar: 53 Assertions mit `CI=true` und Playwright-Chromium bestanden.
  Ein Chromium-Touchklick mit `detail=0` wird anhand seines Pointertyps korrekt
  von einer Tastatureingabe unterschieden.
- Pull-to-Refresh: sechs Browserprüfungen mit echten CDP-Touchereignissen,
  tatsächlichem Query-Refetch, wiederholter Bedienung, horizontaler Geste und
  lesbarem Fehler statt falschem Erfolg bestanden. Zwei gerenderte QA-Loops bei
  375/768/1280/1920px angesehen; Screenshots warten auf abgeschlossene
  Toast-Einblendanimation, bevor die800ms-Bestätigung dokumentiert wird.
- Alle drei sichtbaren Teilbereiche ebenfalls in zwei gerenderten Loops über
  dieselben vier Breiten überprüft, siehe verlinkte Teilberichte.
- Gemeinsamer scoped ESLint und `git diff --check` ohne Fehler. React-Review:
  Effects räumen Listener/Abfragen auf, Fokus/Tastatur bleiben erhalten,
  Rollenwechsel liest nur eigene aktuelle Rollen, keine neuen Schreibrechte.
- Vollständiger Typecheck bleibt mit bestehenden Diagnosen rot; kein vollständiger
  grüner Typecheck und keine physische iPhone-/Android-Abnahme behauptet.
- Neue funktionale Browserprüfungen sind in den regulären Web-Workflow aufgenommen.

Teilberichte: `2026-10-20-video-feedback.md`,
`2026-10-20-map-schedule-feedback.md`, `2026-10-20-about-profile-feedback.md`.

## Google-Play-Auftritt

Die Console zeigt den korrekten Store-Namen KWS BETA APP und das grüne Beta-Symbol.
Das bereits hinterlegte512px-Asset entspricht dem freigegebenen Zeichen.
Die Console bezeichnet `com.kletterwelt.beta (unreviewed)` ausdrücklich als
temporären Namen bis zur ersten Prüfung. Ein Paketwechsel würde eine andere App
erzeugen und wird deshalb nicht vorgenommen. Googles erste Prüfung ist eine
externe Voraussetzung für den endgültigen Store-Auftritt; ein interner Neubuild
erzwingt sie nicht. Die laufenden öffentlichen Einreichungen79/99 werden erhalten.

Quelle: https://support.google.com/googleplay/android-developer/answer/9845334?hl=en

## Sicherungen und getrennte Folgeaufträge

Der Nutzer hat die zusätzliche NAS-Kopie ausdrücklich abgebrochen. Transfer ist
gestoppt. Beide verschlüsselten, erneut am endgültigen Ort vollständig gehashten
Laptop-Archive liegen unter `C:\Users\Janosch\Backups\KWS-BETA-APP`, aktueller
Stand `20261020T145122Z`; `BITTE-LESEN.txt` nennt den Wiederherstellungsweg und
nur die separate Bitwarden-Keyreferenz. Keine Schlüsselwerte im Repository.
Unvollständige NAS-Teilstände sind kein gültiges Backup. Ihre optionale Löschung
wurde vor Ausführung durch die automatische Freigabeprüfung ohne genaueren Grund
blockiert; kein alternativer Löschweg wurde versucht. Tägliche VPS-Sicherungen
und das vorherige vollständige NAS-Vorbackup bleiben bestehen.

PR69 bleibt separat und deaktiviert. Keine ungeprüften Upload-/Schemaänderungen
werden durch diesen UI-Release übernommen. Originalcheckout bleibt unberührt.

## Auslieferung

Ziel: Android85/1.0.252 und nächste TestFlight-Workflowlaufnummer102 aus demselben
exakten geprüften Quellstand, regulärer PR-/CI-/Main-Web-Release gemeinsam mit
Landingpage. Paket- und tatsächliche Store-/TestFlight-Verfügbarkeit sind noch
vor Abschluss dieses Releaseauftrags nachzuweisen.
