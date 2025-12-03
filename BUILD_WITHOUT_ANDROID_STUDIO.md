# APK/AAB ohne Android Studio bauen

## ✅ Was Sie in Cursor machen können

**Fast alles!** Android Studio ist nur für diese Dinge wirklich nötig:
- Emulator zum Testen (kann auch auf echtem Gerät testen)
- Debugging mit Breakpoints
- UI-Designer (brauchen Sie nicht, da Web-App)

## 📋 Voraussetzungen (ohne Android Studio)

Sie brauchen nur:
1. **Java JDK** (Version 11 oder höher)
   - Download: https://adoptium.net/ (OpenJDK)
   - Oder: `choco install openjdk11` (mit Chocolatey)
   - Prüfen: `java -version`

2. **Android SDK** (optional, nur wenn Sie ADB brauchen)
   - Download: https://developer.android.com/tools/releases/platform-tools
   - Oder: Android Studio installiert es automatisch

**Das war's!** Gradle ist bereits im Projekt enthalten (`android/gradlew.bat`).

## 🚀 APK direkt in Cursor bauen

### Debug APK (zum Testen)

```bash
npm run cap:build:android
```

Das erstellt eine APK in:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Diese APK können Sie direkt auf einem Android-Gerät installieren!

### Release AAB (für Play Store)

```bash
npm run cap:build:android:release
```

Das erstellt ein AAB in:
```
android/app/build/outputs/bundle/release/app-release.aab
```

**Wichtig**: Für Release benötigen Sie einen Signing Key (Keystore). Siehe unten.

## 📱 APK auf Gerät installieren

### Option 1: USB (ADB)

1. **ADB installieren** (Android Debug Bridge):
   - Teil von Android SDK Platform Tools
   - Download: https://developer.android.com/tools/releases/platform-tools
   - Oder: Android Studio installiert es automatisch

2. **USB-Debugging aktivieren** auf Android-Gerät:
   - Einstellungen → Über das Telefon → 7x auf "Build-Nummer" tippen
   - Einstellungen → Entwickleroptionen → USB-Debugging aktivieren

3. **APK installieren**:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Option 2: Per E-Mail/Cloud

1. APK auf Google Drive/Dropbox hochladen
2. Auf Android-Gerät öffnen
3. Installieren (muss "Unbekannte Quellen" erlauben)

## 🔐 Release AAB signieren (für Play Store)

Für den Play Store brauchen Sie einen signierten AAB. Das können Sie auch ohne Android Studio machen:

### 1. Keystore erstellen

```bash
keytool -genkey -v -keystore kws-beta-release.keystore -alias kws-beta -keyalg RSA -keysize 2048 -validity 10000
```

Sie werden nach Passwort, Name, etc. gefragt.

### 2. Keystore konfigurieren

Erstellen Sie `android/keystore.properties`:
```properties
storeFile=../kws-beta-release.keystore
storePassword=IHRE_PASSWORT
keyAlias=kws-beta
keyPassword=IHRE_PASSWORT
```

**WICHTIG**: Fügen Sie `keystore.properties` zu `.gitignore` hinzu!

### 3. build.gradle anpassen

Die Datei `android/app/build.gradle` muss angepasst werden. Ich kann das für Sie machen, wenn Sie möchten.

## 🛠️ Was Sie alles in Cursor machen können

### ✅ Konfigurationen ändern

- **App-Name**: `android/app/src/main/res/values/strings.xml`
- **App-Icon**: Icons in `android/app/src/main/res/mipmap-*/` ersetzen
- **Version**: `android/app/build.gradle` → `versionCode` und `versionName`
- **Permissions**: `android/app/src/main/AndroidManifest.xml`
- **Theme-Farben**: `android/app/src/main/res/values/colors.xml`

### ✅ Code ändern

- Web-App Code in `src/` ändern
- `npm run cap:sync` ausführen
- APK neu bauen

### ✅ Testing

- APK auf echtem Gerät installieren
- Testen
- Bei Problemen: Logs mit `adb logcat` ansehen

## 📋 Workflow ohne Android Studio

```bash
# 1. Code ändern (in Cursor)
# ... Ihre Änderungen ...

# 2. App bauen und synchronisieren
npm run cap:sync

# 3. APK bauen
npm run cap:build:android

# 4. Auf Gerät installieren
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 5. Testen und wiederholen
```

## 🐛 Debugging ohne Android Studio

### Logs ansehen

```bash
# Alle Logs
adb logcat

# Nur Ihre App
adb logcat | grep "KWS\|Capacitor"

# Logs in Datei speichern
adb logcat > app-logs.txt
```

### App neu installieren

```bash
# App deinstallieren
adb uninstall com.kletterwelt.beta

# Neu installieren
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## ⚠️ Wann Sie Android Studio doch brauchen

- **Emulator**: Zum Testen ohne echtes Gerät
- **Visual Debugging**: Breakpoints setzen
- **Gradle Sync Probleme**: Wenn Gradle nicht funktioniert
- **Native Plugins**: Wenn Sie native Android-Features hinzufügen wollen

## 💡 Tipp

Für den Anfang reicht es völlig aus, APKs in Cursor zu bauen und auf einem echten Gerät zu testen. Android Studio können Sie später installieren, wenn Sie es wirklich brauchen.

