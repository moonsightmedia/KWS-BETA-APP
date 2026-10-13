# Store-Abschlussprüfungen vom 13. Oktober 2026

## Apple und Bilder

Apple Developer live neu geladen: weiterhin Janosch Althoff als Einzelperson, Organisationsmigration in Bearbeitung und Mitgliedschaftsleistungen vorübergehend deaktiviert. Kein neuer Signierungsversuch während dieser bestätigten Sperre.

Alle drei iPhone- und alle drei iPad-Bildvorschauen sind jetzt vollständig gerendert, keine Cloud-Platzhalter mehr. Jeweils Originalansichten Übersicht, Filter und Detail. Nachweise unter `test-results/apple-store-2026-10-13/{iphone,ipad}-screenshots-ready.jpg`; Dateien aus geprüftem Lauf `38254354855` bleiben unverändert und auf dem NAS erhalten.

Gmail-Fallprüfung aktualisiert nach Nutzerkorrektur: Der Auftraggeber hat die UG-Nachweise am 12. Oktober bereits eingereicht. Apple bestätigt den Eingang mit „We received your documents.“ vom 12. Oktober um 15:37:52 Uhr Europe/Berlin, Nachricht `1a13055829db0f4f`. Die vorherige Aussage eines unbestätigten Uploads ist damit überholt; die Bestätigung wurde zuvor übersehen. Apple kündigt Prüfung und baldige Rückmeldung an, ohne feste Bearbeitungsfrist. Zum separaten Supportfall `102994128035` weiterhin keine bestätigte Wiederfreigabe gefunden. Keine privaten Dokumente selbst hochgeladen oder in Git gespeichert. UG-Organisationsprüfung und die nachfolgend beschriebene DSA-Händlerverifizierung unter Janosch sind getrennte Vorgänge.

## Händlerangaben

Öffentlichen Händlerkontakt unter Janosch Althoff mit geschäftlicher c/o-Anschrift und Moonsight-Kontakt vorbereitet. Der Auftraggeber hat die zusätzliche öffentliche Nutzung seiner bisherigen Review-Mobilnummer ausdrücklich freigegeben; die Nummer bleibt ausschließlich im autorisierten Apple-Formular. E-Mail-Adresse über den autorisierten Moonsight-Mail-Zugang und Telefonnummer mit dem vom Nutzer bereitgestellten SMS-Code bestätigt. Erfolg durch Apples Wechsel zu den Dokumentennachweisen geprüft; keine Codewerte gespeichert oder ausgegeben. Dokumentensprache Deutsch ausgewählt. Aktueller Dialog **Nachweis des Namens** verlangt Geschäfts- oder Gerichtsunterlagen, die den Namen bestätigen: PDF, JPEG oder PNG, maximal 10 MB. Keine Dokumente hochgeladen, endgültige Händlerverifizierung noch offen. Der zuvor gespeicherte Nicht-Händlerstatus gilt damit nicht als abschließend korrigiert. Keine neue Vereinbarung verbindlich bestätigt. Anschließend verlangt die Chrome-Erweiterung ein Update und stoppt weitere Steuerung einschließlich des neuen Screenshot-Nachweises; letzter Namensnachweis-Dialog ist per AX-Zustand geprüft. [Apple: DSA-Händleranforderungen](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/).

## Löschablauf – Fehler behoben und echter Backend-Durchlauf

Der bestehende Operator las die Produktionsdatenbank `postgres`, verwendete aber noch API-Port 9090 des isolierten Migrationstests. Korrigiert auf Produktionsgateway 9082. Die Regression bildet beide unterschiedlichen Backends ab; falsches Routing kann nicht mehr als erfolgreicher Test durchgehen. Fünf Operator-, vier Pfad- und drei Client-API-Prüfungen bestanden.

Serverdatei vor Änderung mit dem führenden Git-Stand abgeglichen, alte Fassung geschützt gesichert und neue Fassung SHA256-identisch installiert: `911347222c035f327cb801dc525ba8803f0d517df768870e1ad92131d94881f9`. Keine Änderung des Web-Releases für diese Operator-Korrektur erforderlich.

Danach `verify-account-erasure-e2e.py` gegen echte Produktions-Auth, Storage und PostgreSQL ausgeführt. Zwei ausschließlich generierte Wegwerf-Konten unter `example.invalid`, keine bestehende Testadresse und keine zusätzlichen Mitarbeiterrechte. Je ein eigener Avatar sowie private Begehung, Favorit, Projektmarkierung und Notiz. Der Nutzer hat die Verwendung generierter Testadressen ausdrücklich gewählt.

- Eigener authentifizierter Löschantrag über dieselbe RPC wie die App; Wiederholung erzeugt keinen neuen Vorgang und verschiebt die Sieben-Tage-Frist nicht.
- Plan enthält genau die eigene Datei, keine gemeinsamen Medien, keine aktiven eigenen Uploads und keine weiteren Blocker. Ausführung mit dem erneut geprüften Plan-Hash.
- Videodienst bei null aktiven Upload-Jobs kurz gestoppt, danach wieder gestartet; nachgelagert `running healthy` bestätigt. Keine Sicherheitsprüfung des Operators umgangen.
- Eigenes Auth-Konto, Profil, Rollen, private Aktivitäten/Notiz und Avatar entfernt. Anmeldung abgewiesen; alter JWT kann keine neue Storage-Datei anlegen.
- Kontrollkonto, seine Datei und seine privaten Aktivitäten bleiben während der Löschung erhalten. Fremde Konten sehen die eigene Notiz nicht.
- Alle 45 vorherigen Konten und 2389 Storage-Objekte sowie vorhandenen Begehungen erhalten. Anschließend auch die ausschließlich generierten Kontrollfixtures entfernt.
- Original-Bestätigung tatsächlich über TLS an einen auf Loopback gebundenen SMTP-Testeingang übertragen; Empfänger ist die generierte Testadresse, Antworten an Marketing. Nur dieser Testprozess nutzt den Eingang und dessen eigenes Zertifikat; produktive SMTP-Konfiguration und Systemvertrauen unverändert.

**Grenze:** Keine Zustellung an einen externen Mailanbieter geprüft. Der Backend-Durchlauf verwendet die echte App-RPC, aber keine neue native Bedienabnahme des Löschdialogs. Der frühere UI-Abbruch-/Antrags-/Fehlerdurchlauf und der Backend-Nachweis werden getrennt geführt.

Maschinenbericht: `test-results/apple-store-2026-10-13/account-erasure-e2e-report.json`; geschützter Serverbericht unter `/var/lib/kws-account-deletion/kws-erasure-qa-72a9eac5893b41139f220dcc9fb3fe4f/REPORT.json`. Keine Passwörter oder Token in Berichten.

## Native Videoprüfung

CI-Testziel ergänzt, ohne ein zusätzliches Testziel in der ausgelieferten App oder neue Signing-Einstellungen einzurichten. Es ruft den tatsächlichen iOS-Encoder über Capacitor-Aufrufe auf und verwendet echte AVFoundation-Videodateien: Größen-/FPS-Begrenzung, Decodierung der Ausgabeframes, veränderte Picker-Metadaten, ungültige Datei, Abbruch vor Encoding und temporäre Dateibereinigung. Öffentliche Gastansichten werden weiterhin nativ geprüft.

Erster Lauf `38368095452` scheiterte am neuen Testcode: Capacitor-Callbacks sind optional. In `a77e2c7` korrigiert. Lauf `38369702835`: iPhone drei von vier Tests bestanden, darunter öffentliche Gastansichten, Abbruch und ungültige/veränderte Quelle; große Videokomprimierung stürzt ab. Log weist die tatsächliche App-Methode `UploadMasterEncoderPlugin.encodeLoadedAsset` aus: `AverageNonDroppableFrameRate` wird für H.264 nicht unterstützt. Der iPad-Durchlauf dieses überholten Laufs wurde nach Start des korrigierten Laufs abgebrochen, kein Ergebnis behauptet.

`4d754e1` entfernt die ungeeignete Einstellung. Die Bildrate wird weiterhin über Composition-Frame-Dauer und zeitliche Sample-Auswahl begrenzt; der ExpectedSourceFrameRate-Wert bleibt als Encoder-Hinweis erhalten. Zusätzlich Writer-Konfiguration mit `canApply` vor Input-Initialisierung prüfen, damit unzulässige Einstellungen als Fehler zurückkommen. [Apple: ExpectedSourceFrameRate ist nur ein Hinweis](https://developer.apple.com/documentation/avfoundation/avvideoexpectedsourceframeratekey), [Apple: Writer-Konfiguration prüfen](https://developer.apple.com/documentation/avfoundation/avassetwriter/inputs).

Nach dem Absturzfix bleibt die Bitratenvalidierung des großen Videos zunächst erfolglos. `a29a81d` ergänzt bewegte Texturen statt flacher Testbilder und ausschließlich numerische Diagnosen. `d24ae59` zählt tatsächliche Samples statt Puffer, einschließlich leerer Marker, und berücksichtigt die Ausgabe-Frame-Dauer. [Apple: Sample-Puffer können null oder mehrere Samples enthalten](https://developer.apple.com/documentation/coremedia/cmsamplebuffer), [Apple: Bitratenwirkung benötigt Frame-Timing](https://developer.apple.com/documentation/videotoolbox/kvtcompressionpropertykey_averagebitrate).

`4c16699` ergänzt höchstens zwei Neucodierungen vom unveränderten Original mit anhand der gemessenen Überschreitung reduziertem Zielwert. Nur Bitratenüberschreitung bei bereits zulässiger Bildrate löst einen neuen Versuch aus; Abbruch und alle abschließenden Grenzen bleiben erhalten. `ab271bb` übergibt über Apples Pixelbuffer-Adapter die reinen komponierten Bilder mit ihren Präsentationszeitpunkten, ohne Source-Sample-Anhänge; Audio bleibt unverändert. `e747da9` gibt jedem erneuten Durchlauf eine neue temporäre Datei und liest die Größe per Dateistatistik, damit wiederverwendete URL-/Asset-Metadaten keine alte Ausgabe beschreiben. Änderungen noch nicht in einem signierten Build ausgeliefert. [Apple: Zielbitrate und harte Begrenzung unterscheiden sich](https://developer.apple.com/library/archive/qa/qa1958/_index.html), [Apple: Pixelbuffer-Adapter](https://developer.apple.com/documentation/avfoundation/avassetwriterinputpixelbufferadaptor).

| Lauf | Quellstand / Prüfumfang | Nachgewiesenes Ergebnis |
| --- | --- | --- |
| `38372040203` | `4d754e1`, Gastansichten + Encoder | Beide Geräte: drei bestanden, großer Videotest abgewiesen; kein H.264-Absturz mehr. |
| `38374632731` | `a29a81d`, Gastansichten + Encoder | iPhone drei bestanden, ein Fehler; iPad zwei bestanden, zwei Fehler. Beide: großes Video mit 49 Puffern bei 1,5 s und etwa 20,4 Mbit/s abgewiesen. iPad-Gastansicht zusätzlich nach Zeitüberschreitung bei „Live Hostinger boulders must load“ gescheitert; Ursache unbestätigt. |
| `38377358377` | `d24ae59`, nur Encoder | Beide: zwei bestanden, ein Fehler; echte 45 Frames = 30 fps, Bitrate zu hoch. |
| `38379326881` | `4c16699`, nur Encoder | Beide: zwei bestanden, ein Fehler; weiterhin 30 fps und etwa 20,4 Mbit/s. |
| `38381447990` | `ab271bb`, nur Encoder | Beide: zwei bestanden, ein Fehler; 45 Frames, 1,5 s und etwa 20,4 Mbit/s. |
| `38386196089` | `e747da9`, nur Encoder | Abgeschlossen: beide zwei bestanden, ein Fehler; 45 Frames, 1,5 s, 30 fps und etwa 20,4 Mbit/s, daher weiterhin abgewiesen. Keine Gastansichten in diesem Lauf. |

Eine reine Simulatorbeschränkung oder eine erfolgreiche Reparatur ist noch nicht belegt. Build 86 enthält die Korrekturen nicht und muss vor öffentlicher Einreichung ersetzt werden. Physische Kamera, tatsächlicher Foto-Picker und reale TestFlight-Installation bleiben unbestätigt; der Routenbauer wird entsprechend dem Auftrag nicht zum Testen aufgefordert.

## Sicherung

Vor der echten Löschprobe frische verschlüsselte Sicherung `20261013T083605Z.tar.age`: 4278 entschlüsselte Dateien/Hashes, 2389 Storage-Versionen und 448 Medienreferenzen geprüft. Danach neue Sicherung `20261013T084154Z.tar.age` mit dem neuen Löschvermerk: 4279 Dateien, 2389 Storage-Versionen und 448 Medienreferenzen. Zusätzlich echte isolierte Wiederherstellung bestanden: 78 Tabellen, 17649 Zeilen, zwei Sequenzen, Vault-Entschlüsselung und alle Dateihashes exakt, Produktion unverändert. Unabhängige NAS-Kopie um 09:41 UTC abgeschlossen: verschlüsseltes Archiv (2719465880 Bytes), SHA256 und beide Prüf-/Restoreberichte hashgleich, `nas-verified.json` bestätigt alle Ergebnisse. Ziel `M:\Customer\Boulder und Kletterwelt GmbH\KWS BETA APP\Backups\Production\20261013T084154Z`. Keine unverschlüsselten Daten oder Schlüssel übertragen. Einmalige Übertragung richtet keine regelmäßige NAS-Sicherung ein.

Unabhängige Entschlüsselungsidentität in Bitwarden unter `AI Shared/KWS_HOSTINGER_MIGRATION_AGE_IDENTITY` vorhanden und ohne Ausgabe des Werts mit der geschützten Serveridentität verglichen: identisch. Keine Änderung des Schlüssels oder neuer Zugang; kein Schlüssel im Bericht, im Repository oder auf dem NAS gespeichert.
