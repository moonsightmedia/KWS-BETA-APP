# Android App Build Guide

## Voraussetzungen

1. **Android Studio** installiert
   - Download: https://developer.android.com/studio
   - Während der Installation: Android SDK, Android SDK Platform-Tools, Android Emulator installieren

2. **Java JDK** (wird normalerweise mit Android Studio installiert)
   - Empfohlen: Java 17 oder 21

## App bauen

### Option 1: Über Android Studio (Empfohlen)

1. **Web-App bauen und synchronisieren:**
   ```bash
   npm run cap:sync
   ```

2. **Android Studio öffnen:**
   ```bash
   npm run cap:open:android
   ```

3. **In Android Studio:**
   - Gradle Sync abwarten (unten in der Statusleiste)
   - Emulator starten oder physisches Gerät verbinden
   - Run-Button (▶️) klicken oder `Shift+F10`
   - Die App wird gebaut und installiert

### Option 2: APK direkt bauen (ohne Android Studio)

1. **Web-App bauen und synchronisieren:**
   ```bash
   npm run cap:sync
   ```

2. **APK bauen:**
   ```bash
   npm run cap:build:android
   ```

3. **APK finden:**
   - Pfad: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Diese APK kann direkt auf Android-Geräten installiert werden

### Option 3: Release APK für Play Store

1. **Keystore erstellen** (nur einmalig):
   ```bash
   cd android/app
   keytool -genkey -v -keystore kws-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias kws-release
   ```

2. **Keystore konfigurieren:**
   - Erstelle `android/keystore.properties`:
     ```
     storePassword=DEIN_PASSWORT
     keyPassword=DEIN_PASSWORT
     keyAlias=kws-release
     storeFile=kws-release-key.jks
     ```

3. **Release APK bauen:**
   ```bash
   npm run cap:build:android:release
   ```

4. **APK finden:**
   - Pfad: `android/app/build/outputs/apk/release/app-release.apk`

## APK auf Gerät installieren

### Per USB (ADB)

1. **USB-Debugging aktivieren** auf dem Android-Gerät:
   - Einstellungen → Über das Telefon → Build-Nummer 7x tippen
   - Einstellungen → Entwickleroptionen → USB-Debugging aktivieren

2. **Gerät verbinden** und APK installieren:
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r android\app\build\outputs\apk\debug\app-debug.apk
   ```

### Manuell

1. APK-Datei auf das Gerät kopieren (E-Mail, Cloud, USB)
2. Auf dem Gerät: Einstellungen → Sicherheit → "Apps aus unbekannten Quellen" aktivieren
3. APK-Datei öffnen und installieren

## Troubleshooting

### "Gradle Sync Failed"
- Android Studio → File → Invalidate Caches → Invalidate and Restart
- Prüfen Sie, ob Java JDK korrekt installiert ist

### "SDK not found"
- Android Studio → File → Settings → Appearance & Behavior → System Settings → Android SDK
- Prüfen Sie, ob Android SDK Platform-Tools installiert sind

### "Build failed"
- Prüfen Sie die Logs in Android Studio (Build Output)
- Stellen Sie sicher, dass `npm run build` erfolgreich war

## Nächste Schritte

Nach erfolgreichem Build können Sie:
- Die App auf Geräten testen
- Eine Release-Version für den Play Store erstellen
- Weitere Features hinzufügen

