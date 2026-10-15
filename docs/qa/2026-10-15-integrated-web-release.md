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
- 25 Trainingsmodell-/Verlaufstests bestanden.
- Node-Tests für Sitzungstransport, Kalender, Volumen, Farben und native
  Tonentfernung bestanden. Native Tests sind Bridge-Mocks, keine Gerätetests.
- 26 Video-Backendtests mit echtem FFmpeg bestanden.
- 11 Sitzungs-/Upload-Browserfälle mit echtem installierten SDK und echter
  UploadProvider-Integration bestanden, einschließlich Ablauf zwischen Chunks
  und vor abschließendem Thumbnail-PATCH sowie Entwurfserhalt nach Neuanmeldung.
- 14 Schraubplanfälle bestanden: Gast, Kalender/Tastatur, Persistenz, Berlin/DST,
  500er-Pagination, Lade-/Fehler-/Leerzustand und Rückwege.
- 12 Home-Layoutfälle320/375/430/768/1280/1920px bei100% und150% Schrift bestanden.
  Die erste150%-Prüfung fand den überstehenden Abschnittstitel; Umbruch korrigiert
  und alle12 erneut bestanden. Lange ungetrennte Testnamen bleiben innerhalb.
- 46 Trainings-Browserfälle und17 Volumen-/Audio-Browserfälle bestanden.
  MP4/AAC und WebM/Opus werden real im Browser remuxt; Videopakete unverändert,
  keine Audiostreams. Fehler und Abbruch laden keine Originaldatei mit Ton hoch.
- 22 Rücknavigation-/Profilfoto-Regressionsfälle bestanden.
- 4 zusätzliche Tests am tatsächlichen App-Router/Providerbaum375/768/1280/1920px
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

Die erste Server-Vorabprüfung stoppte beim abgeleiteten Image: Docker deutet
eine nackte lokale sha256-ID in FROM als Registrynamen. Es fand noch keine
DB-Migration oder Dienstumschaltung statt. Der Operator bindet nun einen
eindeutigen lokalen Sicherungstag an das inspizierte Image, prüft dessen ID
und verwendet ihn ohne Pull. Der fehlgeschlagene geschützte Stagingordner
bleibt als Diagnosebeleg erhalten; der nächste Gitstand bekommt einen neuen.

## Produktiv bestätigt15.10.2026

- PR8 nach main übernommen, anschließend Operatorfix674e2849fd6f567d590c595a100c578bf956cb22.
- Genau dieser Commit ist live. Öffentliches version.json:1.0.238,
  buildTimestamp2026-10-15T08:47:28.037Z; Entrypoint/assets/index-B8HETHow.js.
  Archiv32.373.679Bytes, SHA256334e97f871fa88d3f007d292e35021b7297ccd19ad25c2dd91b87a906e8db08d.
- BackendVERIFIED healthy, vollständiges DB-Backup1.638.730Bytes. Bestehende
  Boulderanzahl und RLS unverändert, Spalteboolean/NOTNULL/defaultfalse.
  TranscoderSHA2560fbf015b2344c36eddaa98e2a254b2a6ab7e26ab22f73b9c0ae1988c61f6f489.
- Alter Webstand unter/opt/kws/web-production/previous-source-20261015T084728Z
  erhalten; verteilter Download1 mit identischen Bytes übernommen.
- Gast-Liveprüfung375px: zwei echte Termine, Kalender19.Oktober/BugB,
  Link auf/guest?sector=Bug%20B mit8 aktuellen Bouldern. Keine Laufzeitfehler,
  keine Schreibanfragen, keine horizontale Überbreite. Erster Smoke verwendete
  irrtümlich den nur angemeldeten #boulder-results-Selektor; Gast-Header und
  echte Karten anschließend korrekt geprüft, kein Appfehler.
- Angemeldete Live-Home-Seite: nächster BugB-Termin, innerhalb Viewport,
  kein überstehendes Kindelement; AlleTermine öffnet denselben Schraubplan.
- Öffentliche Bundlemarker für Schraubplan, Volumen und Trainingschat vorhanden.
  Video/healthHTTP200, Queue0/Multipart0. Letzter GitHub-TestFlight-Lauf weiterhin
  14.Oktober12:28UTC, keine neue native Auslösung.
- Notion-Projektseite um den verifizierten Release-/Grenzstatus ergänzt.
  Lokale öffentliche Screenshots:test-results/oct15-live/.

## Grenzen des veröffentlichten Stands

Kein neuer iPhone-/Android-Build. Installierte native Apps erhalten die neuen
Clientänderungen erst mit einem späteren Store-/APK-Build. Die serverseitige
Tonentfernung betrifft danach neue Renditions, nicht vorhandene Videos.
Offene Entwürfe überstehen eine Sitzungserneuerung, aber ein Beenden/Neuladen der
App ist keine zugesicherte dauerhafte Dateisicherung. Trainingsdaten bleiben
lokal je Konto/Gerät; ein praktischer KWS-Trainerreview der Redaktion steht aus.
