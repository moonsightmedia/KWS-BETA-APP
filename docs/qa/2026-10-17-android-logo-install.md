# Android 1.0.63 auf Galaxy S25

Nutzerauftrag: aktuelle Beta-App auf dem eigenen Android-Handy installieren, ausdrücklich per WLAN-Debugging.

Basis ist der freigegebene main-Quellstand d0e5a6efabaef96519cca0fbc6e7deef6a982f29 mit Paketversion1.0.241. Für die direkte Geräteaktualisierung wurde Android von Versioncode62/1.0.62 auf63/1.0.63 erhöht. Keine Änderung an App-Funktionen oder freigegebenen UI-Komponenten.

Hostinger-Assets mit vorhandener öffentlicher Anon-Konfiguration gebaut und Capacitor synchronisiert. Training bleibt deaktiviert. Gradle assembleDebug erfolgreich. APK enthält beide genehmigten Logo-Konturen, mittige Hintergrundregel und eingebettete Paketversion1.0.241. Vorhandene geschützte Artefaktprüfung über64Assets bestanden: richtige API/Video/Recovery, keine privaten Credentialwerte gefunden.

Installiertes Altpaket vom Gerät gelesen und beide Signaturen mit apksigner geprüft: Zertifikat identisch. Update per adb install -r erfolgreich; kein Uninstall und kein Datenlöschen. Gerät bestätigt Version1.0.63/code63. Kaltstart Statusok, Prozess läuft. SHA256 der auf dem Gerät installierten base.apk stimmt exakt mit dem geprüften Build überein: 2bc7b27b80c3cd45bfad60b5f56f62fef26c108c417dc225c457ba65263fd151 (42.792.771Bytes).

Belege und APK lokal unter output/android-63. Generierte maschinenspezifische Capacitorpfade werden nicht eingecheckt. Dies ist die direkte Aktualisierung des vorhandenen Debug-signierten Gerätestands, kein Play-Store- oder globaler Android-Downloadrelease. Web und TestFlight bleiben unverändert.