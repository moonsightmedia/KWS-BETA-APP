# Externe Alarme und aktueller Android-Crashnachweis

Stand: 19.10.2026, 17:00 Europe/Berlin. Betriebskonfiguration und Dokumentation,
keine Änderung am App-Code und kein neuer nativer Release.

## Externe Erreichbarkeit

- Drei stabile KWS-Projekte über die bestehende lokale, geschützte
  Operator-Verbindung geprüft. Vor und nach der Änderung frische gesunde Checks.
- Je Projekt ausschließlich `shadow → live` über serverautoritativen
  Settings-Plan/Apply. Danach Environment, Check und Integration effektiv live;
  keine SQL-Einstellungsänderung, neue Ressource, Ziel- oder Routenänderung.
- Hub bereit, keine wartenden oder festgefahrenen Benachrichtigungen, frisches
  geprüftes Backup und frischer stiller Pipeline-Canary.
- Alle drei Manifeste wiederholt strikt gültig; Init unverändert und Offline-
  Pläne ohne lokale Aktionen. CLI-Environment-Digests stimmen exakt mit der
  serverautoritativen Registry überein. 20 fokussierte HTTP-Monitor-, Watchdog-
  und Notifier-Tests bestanden. Keine Hub-Runtimeänderung in diesem Auftrag.
- Öffentliche Hub-Readiness: HTTP 200, exakt `status` und `correlationId`, ready.
- Bestehendes Google-Watchdog-Projekt im richtigen Betreiberkonto geprüft:
  genau ein zeitbasierter Trigger, aktuelle minütliche abgeschlossene Läufe.
  Historische angezeigte Triggerfehlerrate 0,22 %, nicht als null ausgegeben.
- Klar markierte, nicht als Ausfall bezeichnete Telegram-Zustellprobe: HTTP 200
  und `providerReceipt=true`. Die erste Probe wurde wegen eines CR im
  Shell-Argument mit HTTP 400 abgelehnt; kein Zustellversuch als Erfolg gezählt.
- Kein Kundendienst für den Test abgeschaltet, kein künstlicher Incident,
  kein behaupteter aktueller KWS-Ausfall-/Recovery-End-to-End-Test.
- App-/API-/Video-Healthchecks sind keine vollständigen Funktionstests.
  Prüfserver und App liegen auf verschiedenen VPS, aber bei Hostinger.

## Native Android-Erfassung

- Quelle: `1339484ff1d82821c4621e343815b1ef06feaf4d`, Version 1.0.250/code77.
- Isolierter bestehender QA-Emulator, Android 16; kein physisches Gerät.
- QA-Umgebung `native-crash-qa`, KWS-Kanal `test`, Nutzungs-Telemetrie aus.
- `:app:assembleDebug :app:assembleDebugAndroidTest`: erfolgreich.
  Der anfängliche unqualifizierte Gradle-Aufruf startete zusätzlich Tests von
  Fremd-Plugins und scheiterte an deren Duplicate-Classes-Konfiguration;
  diese fremden Testmodule wurden nicht verändert.
- Vorhandener ausschließlich instrumentierter Crash-Probe mit zufälliger
  UUID ausgelöst: Java RuntimeException beendet den Prozess, anschließend
  regulärer App-Neustart. Diesen erwarteten Absturz nicht als grüne
  Instrumentation-Ausführung umdeuten.
- Konkreter Sentry-Eingang im QA-Filter bestätigt: native Plattform Java,
  handled=false, Release stimmt exakt, aufgelöster Frame
  `NativeCrashProbeTest.java:40`.
- Konkretes gespeichertes Ereignis: Nutzer-ID und Sentry-Nutzerreferenz null,
  keine E-Mail/IP und keine gefüllten Geo-Felder; keine Requests,
  Exception-Freitexte redigiert, Breadcrumbs ohne Inhalte, Geräte-ID/-Name
  entfernt. Technische Modell-/OS-Daten bleiben vorhanden.
- 26 fokussierte Node-Tests zu Sentry-, Backend- und Monitoringregeln bestanden.
- Korrelations- und Providerbelege liegen nur in ignoriertem `output/` bzw.
  in Sentry. Kein Runtime-Secret oder Nutzerereignis in Git exportiert.
- Alle 105 zuvor vorhandenen nativen Asset-Dateien nach dem Test aus der
  eigenen Sicherung mit exakt gleichen Hashes wiederhergestellt; Emulator
  beendet. Eine rekursive Bereinigung wurde blockiert und nicht umgangen:
  zusätzliche unreferenzierte QA-Dateien bleiben lokal ignoriert erhalten.
  Auch `dist/` und das Debug-APK sind QA-Artefakte, nicht zur Veröffentlichung.
  Kein APK-/Store-/TestFlight-Release ausgelöst.

## Offene Geräteabnahme

Der Nutzer bestätigt, dass keine Testgeräte verfügbar sind. Echte Android-
und iPhone-Abstürze einschließlich Neustart, Transport, Version, symbolisierten
Frames und Datenschutz bleiben separat abzunehmen. Insbesondere ist mit dem
Android-Emulator kein iOS-Crash bestätigt. Offizielle Store-Downloadimporte
sind unverändert nicht Teil dieser Freischaltung.
