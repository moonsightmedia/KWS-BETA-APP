# iOS-Encoder: gezielte Fehleranalyse am 13. Oktober

Auftrag: offenen Videofehler beheben, während Apple die bereits am 12. Oktober eingegangenen UG-Unterlagen prüft. Kein erneuter Dokumentenupload oder neuer Signierungsversuch.

## Ausgangspunkt

Lauf `38386196089` (`e747da9`): beide Simulatoren zwei Encoderprüfungen bestanden, große bewegte 2560×1440/60-fps-Quelle abgewiesen. Ausgabe 45 Frames / 1,5 Sekunden = 30 fps, etwa 20,4 Mbit/s statt maximal 4,6 Mbit/s. Die vorherigen Änderungen belegen noch keine erfolgreiche Bitratenkorrektur.

`fdcabe8` ergänzt ausschließlich numerische Fehlerdiagnosen: angeforderte Zielbitrate, tatsächliche Anzahl der Versuche und Ausgabeabmessungen. Keine Medienpfade oder Kontaktdaten. Lauf `38393540171` bestätigt im iPad-Test drei tatsächliche Versuche, zuletzt Zielwert 250000 bit/s, Ausgabe 1920×1080 und weiterhin exakt etwa 20,4 Mbit/s. Die Wiederholungslogik wurde ausgeführt; die bloße Senkung des Durchschnittsziels hat hier keinen messbaren Einfluss.

Daraufhin Encoder 1.2.1 mit zusätzlichem VideoToolbox-Datenratenlimit vorbereitet: Zielbits pro Sekunde durch acht geteilt ergeben das Bytebudget für ein Zeitfenster von einer Sekunde. Bestehende abschließende Grenzen, unveränderte Quelle und höchstens zwei Wiederholungen bleiben erhalten. Akzeptanz und Wirkung im tatsächlichen AVAssetWriter-Pfad sind noch nativ zu prüfen.

## Separater iPad-Gasttest

Heruntergeladene originale Fehleranhänge von `38374632731` zeigen „104 aktuelle Boulder“ bereits geladen, aber den Einführungsdialog „Feedback & Support“ mit „Los geht’s!“ darüber. Das war kein Beweis für einen Backend-Ladefehler. Ursache des nicht geschlossenen Dialogs noch nicht nachgewiesen. Der Test prüft künftig ausdrücklich dessen Verschwinden, bevor er die Boulder-Karten erwartet. Die Benutzeroberfläche wurde dafür nicht geändert.

## Prüfregeln

Die bestehende belastende Videodatei, Decodierbarkeit, Spieldauer, FPS-, Dimensions- und Bitratengrenzen bleiben unverändert. Abbruch, Quellschutz und Bereinigung müssen weiterhin bestehen. Änderungen erst nach bestandenem nativen Durchlauf als korrigiert ausweisen. Simulatoren ersetzen keinen nachgewiesenen physischen Kamera-/Picker-Test und keinen neuen signierten Build.

Apple beschreibt den Unterschied zwischen Durchschnittsziel und Begrenzung über ein Zeitfenster in [QA1958](https://developer.apple.com/library/archive/qa/qa1958/_index.html). Die Einheit für DataRateLimits ist Bytes und Sekunden, keine Bits; Unterstützung des tatsächlichen Encoderpfades muss geprüft werden.
