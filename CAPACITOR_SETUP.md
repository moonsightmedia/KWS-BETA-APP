# Capacitor Setup für iOS und Android

## ✅ Bereits erledigt

- ✅ Capacitor installiert (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`)
- ✅ `capacitor.config.ts` erstellt
- ✅ iOS-Plattform hinzugefügt
- ✅ Android-Plattform vorhanden
- ✅ Build-Skripte zu `package.json` hinzugefügt
- ✅ Push-Notifications konfiguriert

## 📱 App bauen und testen

### Android

1. **Web-Assets bauen und synchronisieren:**
   ```bash
   npm run cap:sync
   ```

2. **Android Studio öffnen:**
   ```bash
   npm run cap:open:android
   ```

3. **APK bauen:**
   ```bash
   npm run cap:build:android
   ```
   Die APK liegt dann in: `android/app/build/outputs/apk/debug/app-debug.apk`

4. **Release APK bauen (für Play Store):**
   ```bash
   npm run cap:build:android:release
   ```

### iOS

1. **Web-Assets bauen und synchronisieren:**
   ```bash
   npm run cap:sync
   ```

2. **Xcode öffnen:**
   ```bash
   npm run cap:open:ios
   ```

3. **In Xcode:**
   - Wählen Sie ein Gerät oder Simulator aus
   - Klicken Sie auf "Run" (▶️)
   - Die App wird gebaut und gestartet

## 🔧 Konfiguration

### App-ID und Name

Die App-ID ist: `com.kletterwelt.beta`
Der App-Name ist: `KWS Beta App`

Diese können in `capacitor.config.ts` geändert werden.

### Push-Notifications

Push-Notifications sind bereits konfiguriert:
- Plugin installiert: `@capacitor/push-notifications`
- Konfiguration in `capacitor.config.ts`
- Code in `src/utils/pushNotifications.ts`

**Für vollständige Push-Notifications benötigen Sie:**
- **Android**: Firebase Cloud Messaging (FCM) Setup
- **iOS**: Apple Push Notification Service (APNs) Setup

Siehe `PUSH_NOTIFICATIONS_SETUP.md` für Details.

## 📝 Workflow

**Nach Code-Änderungen:**

1. Web-App bauen:
   ```bash
   npm run build
   ```

2. Mit Capacitor synchronisieren:
   ```bash
   npm run cap:sync
   ```

3. In Android Studio / Xcode testen:
   ```bash
   npm run cap:open:android  # oder
   npm run cap:open:ios
   ```

## 🚀 Deployment

### Android (Play Store)

1. Release AAB erstellen:
   ```bash
   npm run cap:build:android:release
   ```

2. AAB-Datei finden:
   `android/app/build/outputs/bundle/release/app-release.aab`

3. In Google Play Console hochladen

### iOS (App Store)

1. Xcode öffnen:
   ```bash
   npm run cap:open:ios
   ```

2. In Xcode:
   - Product → Archive
   - Organizer öffnen
   - App Store Connect hochladen

## 📚 Weitere Ressourcen

- [Capacitor Dokumentation](https://capacitorjs.com/docs)
- [Android Setup Guide](https://capacitorjs.com/docs/android)
- [iOS Setup Guide](https://capacitorjs.com/docs/ios)

