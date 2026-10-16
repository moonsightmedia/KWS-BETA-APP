# Apple: Organisationsumstellung und neuer Release

## Direkt bestätigt am 16. Oktober

- Mitgliedschaft jetzt Organisation **Moonsight Media UG haftungsbeschraenkt**, Team unverändert. Der bisherige Migrationshinweis ist verschwunden; Zertifikate und Profile wieder angeboten.
- Neue Developer-Lizenzvereinbarung: ausgegeben 14. Oktober, akzeptiert 16. Oktober. Apple bestätigt sowohl Organisationsübertragung als auch Vertragsannahme per E-Mail. Keine erneute Annahme durch den Agenten.
- App Store Connect führt Janosch als veralteten Rechtsträger ohne Verträge und die UG als neuen Rechtsträger. Vertrag für kostenlose Apps ab 16. Oktober **Aktiv**. Separater Hinweis zum Vertrag für gebührenpflichtige Apps; dieser ist für die beauftragte kostenlose App nicht beauftragt.
- Firmenadresse wird unveränderbar aus D&B übernommen: doppelte Hausnummer/ungewöhnliche Ortsformatierung vorhanden. Eine Korrektur wird laut Formular über D&B vorgenommen; keine Änderung an diesen Stammdaten durch den Agenten.

## Releasequelle und laufende Prüfungen

Der seit dem 13. Oktober geprüfte Stand wurde inzwischen um weitere freigegebene Produktänderungen auf main ergänzt. Deshalb wird kein alter Hostinger-Zweig ausgeliefert. Exakt gepinnter Releasequellstand: **282f6ca17488cb36ee70f9cca09d50875c0498ec** (main), Paketversion 1.0.239.

Dieser enthält das originale Kletterwelt-Icon, den bisherigen Bitratenfix und Encoder **1.2.4** mit zusätzlicher nativer Tonentfernung. Gegenüber Encoder 1.2.3 ist Produktcode geändert; frühere Simulatorergebnisse allein gelten daher nicht als Abnahme dieses Builds.

- Vollständige native Prüfung beider Simulatorfamilien: [38898191367](https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38898191367), einschließlich zusätzlichem realem Tonentfernungstest.
- Signierter Hostinger-Build **90**: [38898195340](https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38898195340).
- Beide Abläufe ausdrücklich mit demselben Commit als branch-Input gestartet; Backend hostinger im signierten Build. Keine produktive Web-/Datenbankänderung.
- Signierter Lauf abgeschlossen: **Erfolg**, Build 90 zu Apple hochgeladen. Apple zeigt Build 90 als **Bereit zur Übermittlung**, bestehende interne Gruppe KWS Team bereits zugeordnet; keine neue Einladung oder Testanweisung versendet, keine Installation behauptet.
- Vollständige Simulatorprüfung **erfolgreich**: auf iPhone 17 Pro und iPad Pro 13-inch (M5), iOS 26.4.1, jeweils fünf Tests bestanden, null Fehler oder übersprungene Tests. Originale Ergebnisse und Quellcommit heruntergeladen und gelesen. Neben Quellschutz/Abbruch/Bitrate/Gastansicht auch echte Tonentfernung mit erhaltener Originaldatei bestanden.
- Belastende 2560×1440/60-fps-Quelle ergibt auf beiden Simulatoren 640×360, 24 fps, 1,5 Sekunden, 807901 Bytes, 4302074 bit/s Video und 4308805 bit/s Gesamt, drei Versuche. Grenzen unverändert.
- Beide originalen Gastübersichten visuell geprüft: 114 geladene Boulder, Bilder und Navigation vorhanden. Bisherige Storebilder bleiben repräsentativ und wurden nicht ersetzt.

## IPA-Prüfung und unabhängige Kopie

Heruntergeladenes Original: 34.245.783 Bytes, SHA256 `28cc313280f88baf40295dc0e4ffcac03c676d50a2f0d96699924ef3d24c3618`. Bundle `com.kletterwelt.beta`, Version 1.0, Build 90. 13 eingebettete JS/JSON/HTML-Dateien geprüft: Hostinger-API, Video-Endpunkt und Recovery vorhanden; keine PEM-Privatschlüsselmarker, Supabase-Secret-Keys oder Service-Role-JWTs gefunden. Das ist eine gezielte Artefaktprüfung, keine pauschale Sicherheitsgarantie.

Native Plugin-/Tonentfernungsselektoren vorhanden, die entfernte ungeeignete H.264-Einstellung nicht enthalten. Die kurze Versionszeichenfolge ist in der optimierten Mach-O-Datei nicht als zusammenhängender String enthalten; Encoder 1.2.4 wird über den gepinnten Quellstand belegt. Enthaltenes Profil: richtige Team-/Bundle-Zuordnung und get-task-allow=false; CMS-Inhalt inspiziert, keine separate kryptographische Profilprüfung unter Windows behauptet.

Beide kompilierten iPhone-/iPad-Icons aus Apples CgBI-PNG-Format für die Sichtprüfung dekodiert, gegen das genehmigte Original verglichen und als Kletterwelt-Logo bestätigt. Originaldateien unverändert erhalten. Prüfnachweis lokal unter `output/apple-release-20261016/build-90/IPA-VERIFIED.json`.

IPA auf NAS unter `Releases/iOS/90/App.ipa` kopiert und SHA256 zurückgelesen: identisch. 20 Dateien mit IPA, ursprünglichem/abschließendem IPA-Prüfbericht, beiden kompakten nativen Ergebnisnachweisen und sechs Originalbildern unabhängig archiviert, insgesamt 45.479.243 Bytes, alle SHA256 zurückgelesen. `NAS-VERIFIED.json` verified=true. Vollständige xcresult-Bundles zusätzlich lokal, keine Behauptung ihrer NAS-Archivierung.

## Store-Einreichung

Build 86 nach abgeschlossener Abnahme im Entwurf durch **90** ersetzt und gespeichert. Die zunächst vor dem Upload geladene Buildliste zeigte 90 noch nicht; nach Neuladen vorhanden. Es wurde kein alter Build eingereicht.

Apples Validierung akzeptiert das Element als bereit. Erster endgültiger Versandversuch meldet einen unerwarteten Fehler; die unabhängige App-Prüfungsseite zeigt weiterhin nur den Entwurf. Nach genau einem erneuten Versuch bestätigt Apple **1 Element übermittelt**.

**Verbindlicher Ergebnisstatus: Warten auf Prüfung**, Version **1.0 (90)**, übermittelt **16. Oktober 2026 um 14:26 Uhr Europe/Berlin**. Übermittlungskennung **c8b9ea8a-89f8-4a40-ae5b-077357674d8a**. Bestätigt auf der Detailseite `/apps/6756424260/distribution/reviewsubmissions/details/c8b9ea8a-89f8-4a40-ae5b-077357674d8a`.

Manuelle Veröffentlichung bleibt gewählt. Keine öffentliche Freigabe, keine Behauptung einer Apple-Genehmigung. Apple nennt bis zu 48 Stunden als Hinweis im Erfolgsdialog, keine eigene Terminzusage. Screenshots von gespeichertem Build, Fehlversuch, Erfolg und Wartestatus unter `output/apple-release-20261016/store-proof/`.

## DSA-Vorbereitung

Gespeicherte Ausgangseinstufung weiterhin Nicht-Händler/kein EU-Vertrieb. Händlerablauf für die UG geöffnet und die zuvor ausdrücklich freigegebenen öffentlichen Moonsight-Kontakte eingesetzt. Keine endgültige Erklärung abgegeben.

Apples eingebettetes Formular im Schritt **Angaben bestätigen** blieb leer (iframe about:blank, Weiter deaktiviert), auch visuell bestätigt. Kein Kontaktcode angefordert oder verarbeitet. Dialog abgebrochen und Seite einmal neu geladen; derselbe leere Zustand im zweiten Versuch. Benutzer um Prüfung im Vordergrund gebeten. Auf Rückmeldung zum fehlenden sichtbaren Tab das bestehende Chrome-Fenster in den Vordergrund geholt; automatisches Aktivieren des Tabs über management.tabs.update war nicht unterstützt, keine Umgehung versucht. Benutzer erhält die Anweisung, den vorhandenen App-Store-Connect-Tab zu wählen. Dies ist kein Nachweis einer abgeschlossenen Händlerverifizierung.

Nach erfolgreich übermittelter App-Version und zwischenzeitlich geschlossenem Händlerdialog den gespeicherten Status erneut geprüft: weiterhin Nicht-Händler/kein EU-Vertrieb. Ein weiterer gezielter Durchlauf mit direkten UI-Aktionen bringt denselben leeren Bestätigungsdialog. Keine endgültige Erklärung, keine Dokumentenübermittlung oder neue Kontaktcode-Anforderung bestätigt. Dieser technische Restpunkt bleibt für die öffentliche Deutschland-Freigabe offen; der bereits wartende Apple-Review wird dafür nicht zurückgezogen. Fehlerbeleg `store-proof/dsa-empty-verification.jpg`.

## Exakt nächster Schritt

Apple-Review-Ergebnis prüfen und parallel den leeren DSA-Kontaktbestätigungsdialog im bestehenden Firmenkonto lösen, korrekte Händlerverifizierung abschließen. Erst danach und nach Apple-Genehmigung die manuell geschützte Deutschland-Veröffentlichung freigeben. Kein erneuter Build erforderlich, solange keine konkrete Beanstandung oder Produktänderung vorliegt.

## Grenzen

Kein physischer Kamera-/Picker-Test, kein Testauftrag an den Routenbauer. Store-Einreichung erledigt, öffentliche Freigabe ausstehend. Händlerverifizierung vor der Deutschland-Veröffentlichung abschließen; Apple-Review kann bereits laufen. Keine Supportnachricht zum vorübergehenden Versandfehler versendet.

Quellen: sichtbare Apple-Developer-Mitgliedschaft, App Store Connect Geschäftliches/DSA, Apple-Mails 1a144590b1386f86 und 1a144592ba9397a7; exakter Gitstand und GitHub-Actions-Läufe oben.
