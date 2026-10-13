# Store-Abschlussprüfungen vom 13. Oktober 2026

## Apple und Bilder

Apple Developer live neu geladen: weiterhin Janosch Althoff als Einzelperson, Organisationsmigration in Bearbeitung und Mitgliedschaftsleistungen vorübergehend deaktiviert. Kein neuer Signierungsversuch während dieser bestätigten Sperre.

Alle drei iPhone- und alle drei iPad-Bildvorschauen sind jetzt vollständig gerendert, keine Cloud-Platzhalter mehr. Jeweils Originalansichten Übersicht, Filter und Detail. Nachweise unter `test-results/apple-store-2026-10-13/{iphone,ipad}-screenshots-ready.jpg`; Dateien aus geprüftem Lauf `38254354855` bleiben unverändert und auf dem NAS erhalten.

Gmail-Fallprüfung: zum Supportfall `102994128035` nur Eingangsbestätigungen gefunden. Apples Organisationsmail vom 12. Oktober verlangt Identitäts-, Beschäftigungs-/Vertretungs- und Unternehmensnachweise. Ein zwischenzeitlicher Upload dieser Dokumente wurde nicht verifiziert; keine Dokumente eigenständig hochgeladen. Keine Freigabe oder Zusage einer Bearbeitungsfrist gefunden.

## Händlerangaben

Öffentlichen Händlerkontakt unter Janosch Althoff mit geschäftlicher c/o-Anschrift und Moonsight-Kontakt vorbereitet. Der Auftraggeber hat die zusätzliche öffentliche Nutzung seiner bisherigen Review-Mobilnummer ausdrücklich freigegeben; die Nummer bleibt ausschließlich im autorisierten Apple-Formular. Nach Eingabe zeigt Apple die E-Mail-Codeprüfung. Bestätigung direkt im Apple-Dialog angefragt; Telefonnummer, Nachweise und endgültige Erklärung sind noch nicht abgeschlossen. Der bisher gespeicherte Nicht-Händlerstatus gilt daher noch nicht als korrigiert. Keine neue Vereinbarung verbindlich bestätigt. [Apple: DSA-Händleranforderungen](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/).

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

Lauf `38372040203` aus `4d754e1` läuft ohne diesen Absturz, scheitert jedoch bei der Validierung des komprimierten Videos. Deshalb in `a29a81d` bewegte Texturen statt flacher Testbilder und ausschließlich numerische Validierungsdiagnosen ergänzt; die vorhandenen Qualitätsgrenzen bleiben erhalten. Lauf `38374632731`: iPhone weiterhin drei von vier Tests bestanden, großer Videotest abgewiesen; Diagnose 49 gezählte Puffer bei 1,5 Sekunden und etwa 20,4 Mbit/s. Die Frame-Zählung erfasste Puffer statt tatsächlicher Samples, einschließlich leerer Marker. `d24ae59` zählt tatsächliche Samples und setzt die Dauer ausgewählter Videoframes ausdrücklich auf die Ausgabe-Bildrate, bei unverändertem Präsentationszeitpunkt; Audiosamples bleiben unverändert. Test erwartet zusätzlich die tatsächlich zurückgegebenen Größenlimits. Fokussierter iPhone-/iPad-Encoderlauf `38377358377` aktiv, noch kein Komprimierungserfolg behauptet. Build 86 enthält diese Korrekturen nicht. Physische Kamera, tatsächlicher Foto-Picker und reale TestFlight-Installation bleiben unbestätigt. [Apple: Sample-Puffer können null oder mehrere Samples enthalten](https://developer.apple.com/documentation/coremedia/cmsamplebuffer), [Apple: Bitratenwirkung benötigt Frame-Timing](https://developer.apple.com/documentation/videotoolbox/kvtcompressionpropertykey_averagebitrate).

## Sicherung

Vor der echten Löschprobe frische verschlüsselte Sicherung `20261013T083605Z.tar.age`: 4278 entschlüsselte Dateien/Hashes, 2389 Storage-Versionen und 448 Medienreferenzen geprüft. Danach neue Sicherung `20261013T084154Z.tar.age` mit dem neuen Löschvermerk: 4279 Dateien, 2389 Storage-Versionen und 448 Medienreferenzen. Zusätzlich echte isolierte Wiederherstellung bestanden: 78 Tabellen, 17649 Zeilen, zwei Sequenzen, Vault-Entschlüsselung und alle Dateihashes exakt, Produktion unverändert. NAS-Übertragung des verschlüsselten Satzes läuft; noch keine abgeschlossene unabhängige Kopie behauptet. Einmalige Übertragung richtet keine regelmäßige NAS-Sicherung ein.
