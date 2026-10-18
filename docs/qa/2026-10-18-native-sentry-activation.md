# Native Sentry-Aktivierung nach Betreiberfreigabe

## Freigabe und Umfang

Am18.10.2026 bestätigt der Betreiber die selbst durchgeführte Annahme des
Sentry-Datenschutzvertrags. Die angemeldete Legal-Seite zeigt Version5.1.0 als
an diesem Datum unterschrieben. Der Agent hat keinen Vertrag akzeptiert.

Die zusätzliche Erfassung gilt für neue native Fassungen. Web-Sentry bleibt
deaktiviert. Nutzungsanalyse bleibt separat wählbar; Firebase Analytics,
Werbe-ID- und IDFV-Erhebung bleiben in den nativen Manifesten ausgeschaltet.
Keine neuen API-Schlüssel oder erweiterten Rechte wurden angelegt.

## Veröffentlichte Artefakte

Quellrevision beider nativer Builds: `ff0fba2be6e597bf3b4a2fe37d9672afe32a5030`.
Dieser Mainstand hat die vollständige Web-/Monitoring-CI bestanden.

- Android1.0.248/code71:44426261Bytes, gleiche Signatur wie die bisherige
  veröffentlichte APK246. Öffentlicher Download einschließlich MIME/Byteumfang
  und vollständiger SHA256-Nachprüfung erfolgreich. Alte Downloads unverändert.
  [Android-APK](https://beta.kletterwelt-sauerland.de/downloads/KWS-Beta-Hostinger-1.0.248.apk).
  SHA256:`2e4f4986536412c791061962414d2a839782e831302beab09d2d44881cd2fa16`.
- TestFlight94, Marketingversion1.0, eingebettete Appversion1.0.248:
  [Buildlauf39154710185](https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/39154710185)
  vollständig erfolgreich, dSYM-Upload vor Apple-Upload erfolgreich.
  IPA-SHA256:`45278b7a117c82ac1ef563e5712d16d7ce384a9cf791834a8f7c9d65b67a8f76`.

Beide Artefakte auf Hostinger-Endpunkte, Recoveryformular, Quellkennung, aktivierte
native Erfassung und fehlende private Server-/FCM-Schlüssel geprüft:103 Android-
und100 iOS-Webassets. Kompilierte Android-/iOS-Firebaseflags und deaktivierte
Vendor-ID-Erhebung geprüft. TestFlight94 ist kein Nachweis einer Installation
oder der Freigabe für jeden Tester; APK-Publikation ebenfalls kein Gerätetest.

## Tatsächlicher Absturz und Datenschutz

31 gezielte Node-Tests für native Policy und Monitoring erfolgreich. Android-
App sowie Instrumentierung gebaut. Auf einem isolierten Emulator wurde eine
separate QA-Fassung derselben Quelle mit Collector-Kanaltest gestartet, ein
unbehandelter Java-Absturz ausgelöst und nach Neustart tatsächlich bei Sentry
gelesen. Der native Fehler hat den passenden Release1.0.248/Quellhash und den
aufgelösten Frame `NativeCrashProbeTest.java:40`. Die öffentliche APK ist die
separat geprüfte Produktivfassung, nicht diese Testfassung.

Gespeicherte Daten geprüft: keine Nutzer-/IP-Werte, keine HTTP-Anfragedaten,
keine Breadcrumb-Freitexte/-Daten, keine Ausnahmemeldungs-Freitexte und kein
Gerätename/-ID. Sentry normalisiert entfernte Felder teilweise als leere
Objekte/Nullwerte; das ist nicht mit tatsächlich vorhandenen Identitätswerten
zu verwechseln. Technische Geräte-/OS-Metadaten und Debugframes bleiben für die
Diagnose erhalten. Keine Aussage, dass keinerlei technische Kennung existiert.
Die Probegruppe hat eine gesonderte Testreferenz und bleibt vom Cockpitimport
ausgeschlossen. Der Emulator ist anschließend beendet; keine fremden Geräte
oder AVD-Dateien gelöscht. Produktive lokale Buildassets wiederhergestellt.

## Trennung der Zugriffe

Der Runtime-Importer behält seinen eigenen minimalen Fehler-Lesezugriff.
Der bestehende GitHub-Symbolupload-Schlüssel funktioniert unverändert; nur
die nicht geheimen Zielnamen sind auf das bestätigte KWS-Projekt ausgerichtet.
Die Konfigurationsabfrage der Client-Keys meldet weiterhin403. Das beweist
keinen defekten Symbolupload: Die beiden Funktionen benötigen unterschiedliche
[Sentry-Berechtigungen](https://docs.sentry.io/api/permissions/).
Deshalb keine zusätzlichen Leserechte vergeben, nur um diesen Probeaufruf
grün zu machen. Der tatsächlich erfolgreiche dSYM-Upload ist separat belegt.

Private Einzelbelege unter `/opt/kws/monitoring`:
`sentry-dpa-activation-verification.json`,
`native-android-crash-1.0.248-verification.json`,
`native-release-1.0.248.json` und aktualisierte `rollout-verification.json`.
Frühere Veröffentlichungsbelege bleiben erhalten. Keine Geheimniswerte in Git.

## Noch offen

- Update und echte Alltags-/Absturzabnahme auf physischem Android und iPhone.
- Tatsächliche Apple-Verarbeitung und Tester-Verfügbarkeit gesondert prüfen.
- Offizielle Store-Tagesberichte tatsächlich abrufen, normalisieren und importieren;
  Buildaggregate oder App-Instanzen sind weiterhin keine Store-Downloadzahlen.
