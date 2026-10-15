# iOS-Encoder: gezielte Fehleranalyse am 13. Oktober

Auftrag: offenen Videofehler beheben, während Apple die bereits am 12. Oktober eingegangenen UG-Unterlagen prüft. Kein erneuter Dokumentenupload oder neuer Signierungsversuch.

## Ausgangspunkt

Lauf `38386196089` (`e747da9`): beide Simulatoren zwei Encoderprüfungen bestanden, große bewegte 2560×1440/60-fps-Quelle abgewiesen. Ausgabe 45 Frames / 1,5 Sekunden = 30 fps, etwa 20,4 Mbit/s statt maximal 4,6 Mbit/s. Die vorherigen Änderungen belegen noch keine erfolgreiche Bitratenkorrektur.

`fdcabe8` ergänzt ausschließlich numerische Fehlerdiagnosen: angeforderte Zielbitrate, tatsächliche Anzahl der Versuche und Ausgabeabmessungen. Keine Medienpfade oder Kontaktdaten. Lauf `38393540171` bestätigt auf beiden Simulatoren drei tatsächliche Versuche, zuletzt Zielwert 250000 bit/s, Ausgabe 1920×1080 und weiterhin exakt etwa 20,4 Mbit/s. Die Wiederholungslogik wurde ausgeführt; die bloße Senkung des Durchschnittsziels hat hier keinen messbaren Einfluss.

Daraufhin Encoder 1.2.1 aus `ca7da94` mit zusätzlichem VideoToolbox-Datenratenlimit geprüft: Zielbits pro Sekunde durch acht geteilt ergeben das Bytebudget für ein Zeitfenster von einer Sekunde. Lauf `38395495906`: auf beiden Simulatoren Gastansichten bestanden und zwei von drei Encoderprüfungen bestanden; die große Ausgabe bleibt unverändert zu groß. Der zusätzliche Parameter wurde akzeptiert, hat in diesem nachgewiesenen Pfad aber keinen messbaren Effekt.

Encoder 1.2.2 aus `bb5b399` ergänzt deshalb eine begrenzte Rückfallstrategie. Erst nach einer gemessenen Bitratenüberschreitung wird zusätzlich die lange Kante anhand des Verhältnisses zwischen Ziel und tatsächlicher Bitrate reduziert; Seitenverhältnis erhalten, kein Hochskalieren, keine Reduktion großer Quellen unter 640 Pixel lange Kante. Erster Versuch weiter bis 1920 Pixel; höchstens zwei Wiederholungen vom unveränderten Original. Lauf `38397671645`: beide große Ausgaben auf 640×360 reduziert, bei 30 fps aber weiterhin 4,803 Mbit/s Video und 4,811 Mbit/s Gesamt; daher korrekt abgewiesen. iPhone-Einführungstest zusätzlich beim ersten Weiter-Schritt gescheitert, iPad-Gastansicht bestanden.

## Erfolgreiche Abnahme

Encoder **1.2.3** aus `293d7e2` erhält die 640-Pixel-Untergrenze und begrenzt erst im gemessenen Rückfall bei dieser Auflösung eine höhere Bildrate zusätzlich auf 24 fps. Langsamere Quellen werden nicht beschleunigt. Erster Versuch weiter bis 1920 Pixel / 30 fps. Alle abschließenden Codec-, Zeit-, Dimensions-, Datei- und Bitratengrenzen sowie Originalschutz bleiben erhalten; Tests verlangen zusätzlich mindestens 24 fps für die 60-fps-Testquelle.

Vollständiger [Lauf 38399820535](https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38399820535) **auf beiden Simulatoren erfolgreich: jeweils vier Tests bestanden, null Fehler oder übersprungene Tests**. Modelle iPhone 17 Pro und iPad Pro 13-inch (M5), iOS 26.4.1. Originale `test-summary.json`, `source-commit.txt` und `xcodebuild.log` heruntergeladen und gelesen.

Gleiche gemessene Ausgabe auf beiden Geräten: 640×360, 24 fps, 1,5 Sekunden, 807901 Bytes, Video **4302074 bit/s**, Gesamt **4308805 bit/s**, drei Versuche. H.264-Datei spielbar, Frames tatsächlich decodiert, Spieldauer und Seitenverhältnis erhalten. Ungültige/geänderte Quelle und Abbruch bestanden; erzeugte Datei zweimal gefahrlos entfernt, Original erhalten. Gastreise mit Übersicht, Filtern und Boulder-Detail ebenfalls auf beiden Geräten bestanden. Die Qualitätsreduktion betrifft den gemessenen Rückfall; eine generelle Ausgabe in Full HD wird damit nicht zugesichert.

Der anschließende Stand `c4d2baf` ändert ausschließlich CI/Testcode; Encoder und native Uploadvorbereitung sind gegenüber dem abgenommenen Quellstand unverändert. Zusätzlicher UI-Testlauf `38400492837` prüft stabile, bedienbare Buttonpositionen vor genau einem Tap; Beide Simulator-Jobs erfolgreich abgeschlossen. Der leere Git-Diff für Encoder und native Uploadvorbereitung bestätigt denselben geprüften Produktcode. Kein produktiver Deploy oder neuer signierter Apple-Build.

## Separater iPad-Gasttest

Heruntergeladene originale Fehleranhänge von `38374632731` zeigen „104 aktuelle Boulder“ bereits geladen, aber den Einführungsdialog „Feedback & Support“ mit „Los geht’s!“ darüber. Das war kein Beweis für einen Backend-Ladefehler. Ursache des nicht geschlossenen Dialogs noch nicht nachgewiesen. Der Test prüft jetzt ausdrücklich dessen Verschwinden, bevor er die Boulder-Karten erwartet. Die Benutzeroberfläche wurde dafür nicht geändert. Vollständige Gastreise mit Filtern und Detailansicht in `38395495906` auf iPhone und iPad bestanden.

## Prüfregeln

Die bestehende belastende Videodatei, Decodierbarkeit, Spieldauer, FPS-, Dimensions- und Bitratengrenzen bleiben unverändert. Abbruch, Quellschutz und Bereinigung müssen weiterhin bestehen. Änderungen erst nach bestandenem nativen Durchlauf als korrigiert ausweisen. Simulatoren ersetzen keinen nachgewiesenen physischen Kamera-/Picker-Test und keinen neuen signierten Build.

Apple beschreibt den Unterschied zwischen Durchschnittsziel und Begrenzung über ein Zeitfenster in [QA1958](https://developer.apple.com/library/archive/qa/qa1958/_index.html). Die Einheit für DataRateLimits ist Bytes und Sekunden, keine Bits; Unterstützung des tatsächlichen Encoderpfades muss geprüft werden.

## Archivierung am 14. Oktober

Maschinenlesbarer Nachweis: output/hostinger-cutover/ios-acceptance-38399820535/NATIVE-ENCODER-VERIFIED.json. Kompakte Originalprotokolle, Testzusammenfassungen und Store-Bilder für beide Simulatoren auf dem NAS archiviert und alle SHA-256-Prüfsummen zurückgelesen. Nachweis: Releases/iOS/Acceptance/2026-10-13-encoder-1.2.3/NAS-VERIFIED.json im KWS-NAS-Projekt. Kein physischer Gerätetest und kein signierter Upload durch diese Archivierung.
