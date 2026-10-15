# Gemeinsamer Web-Release 1.0.238

## Umfang und Quellen

- Basis: live1.0.237, Revision1a34b1853dec3b924d4ba45efe7a214b0ba2820e.
  Dokumentationsnachtrag23bd9a3 bleibt enthalten.
- Training3c8a7a2: Bibliotheken, eigene Einheiten, lokaler Verlauf, optionale
  Wochenplanung, Einführung und Einstellungen. Explizit lokale Speicherung,
  kein verbundener KI-/Cloudservice und keine behauptete fachliche Freigabe.
- Volumen und Audio64914a6: unabhängiges volume_only-Flag, Anzeige und
  Videovorbereitung ohne Ton. Bestehende Medien werden nicht rückwirkend geändert.
- Upload-JWT59229b9: aktuelle Zugangsdaten pro Anfrage, gebündelte Erneuerung,
  eng begrenzte einmalige Wiederholung nach eindeutiger Auth-Ablehnung.
- Öffentlicher Schraubplan gezielt aus kws-optional-beta portiert. Bereits
  veröffentlichter optionaler Beta-Loop bleibt erhalten, ohne Replay-Icon.
- Home-Überbreite: NextResetCard, begrenzte Rasterspalten, Wortumbruch,
  umbrechender Abschnittskopf. Neue Komponente ersetzt die alte Terminzeile.

Keine Poster, APK-Installation oder TestFlight-Auslösung in diesem Auftrag.
Originalcheckout mit fremden lokalen Änderungen bleibt unangetastet.

## Lokale Verifikation15.10.2026

- Produktionsbuild mit aktivierter Trainingsoberfläche bestanden.
-25 Trainingsmodell-/Verlaufstests bestanden.
- Node-Tests für Sitzungstransport, Kalender, Volumen, Farben und native
  Tonentfernung bestanden. Native Tests sind Bridge-Mocks, keine Gerätetests.
-26 Video-Backendtests mit echtem FFmpeg bestanden.
-11 Sitzungs-/Upload-Browserfälle mit echtem installierten SDK und echter
  UploadProvider-Integration bestanden, einschließlich Ablauf zwischen Chunks
  und vor abschließendem Thumbnail-PATCH sowie Entwurfserhalt nach Neuanmeldung.
-14 Schraubplanfälle bestanden: Gast, Kalender/Tastatur, Persistenz, Berlin/DST,
  500er-Pagination, Lade-/Fehler-/Leerzustand und Rückwege.
-12 Home-Layoutfälle320/375/430/768/1280/1920px bei100% und150% Schrift bestanden.
  Die erste150%-Prüfung fand den überstehenden Abschnittstitel; Umbruch korrigiert
  und alle12 erneut bestanden. Lange ungetrennte Testnamen bleiben innerhalb.
-46 Trainings-Browserfälle und17 Volumen-/Audio-Browserfälle bestanden.
  MP4/AAC und WebM/Opus werden real im Browser remuxt; Videopakete unverändert,
  keine Audiostreams. Fehler und Abbruch laden keine Originaldatei mit Ton hoch.
-22 Rücknavigation-/Profilfoto-Regressionsfälle bestanden.
-4 zusätzliche Tests am tatsächlichen App-Router/Providerbaum375/768/1280/1920px
  bestanden: Training nach überspringbarer Einführung und öffentlicher Gastkalender.
- Neue Kalenderdateien scoped ESLint ohne Fehler. TypeScript bleibt bei74
  vorhandenen Diagnosen; der Upload-Vergleich meldet0 zusätzliche Diagnosen.
- Python-Operatoren kompilieren;4 bestehende Download-Erhaltungstests bestanden.
- Sichtprüfung Home/Kalender/Agenda und Trainingszustände in zwei Loops.
  Echte Produktivdaten oder Kontoinhalte wurden dabei nicht verändert.

## Rollout und Rückfall

`release-volume-silent.py` prüft Host, laufendes Image, exakte bisherige
Transcoder-Prüfsumme und bestehenden Datenmount. Ein abgeleitetes Image ersetzt
nur transcode.js, lässt Auth/API und übrige Dateien unverändert und wird vor
Umschalten mit realen Transcodertests isoliert ohne Netzwerk/Produktionsmount geprüft.
Vor additiver Spalte entsteht ein geschütztes vollständiges DB-Backup. Anzahl und
RLS bleiben unverändert. Vor Neustart müssen Queue und Multipartauslastung0 sein.
ENV/Compose/Altimage bleiben für Rollback erhalten; bei fehlerhafter Health wird
das vorherige Image wieder gestartet. Keine Medienbereinigung, keine RLS-Ausweitung.

Weboperator baut den exakten GitHub-Commit mit Trainingflag und überprüfter
Archivprüfsumme. Compare-and-swap schützt vor Überschreiben paralleler Releases;
Altstand, veröffentlichte Downloads und alte gehashte Assets bleiben erhalten.
Release gilt erst nach bestätigtem SOURCE/Build und öffentlicher Laufzeitprüfung.

## Grenzen

Kein neuer iPhone-/Android-Build. Installierte native Apps erhalten die neuen
Clientänderungen erst mit einem späteren Store-/APK-Build. Die serverseitige
Tonentfernung betrifft danach neue Renditions, nicht vorhandene Videos.
Offene Entwürfe überstehen eine Sitzungserneuerung, aber ein Beenden/Neuladen der
App ist keine zugesicherte dauerhafte Dateisicherung. Trainingsdaten bleiben
lokal je Konto/Gerät; ein praktischer KWS-Trainerreview der Redaktion steht aus.
