# Capacitor Setup - Anleitung

## ✅ Was wurde bereits gemacht

- ✅ Capacitor installiert (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)
- ✅ Capacitor initialisiert (`com.kletterwelt.beta`)
- ✅ Android-Plattform hinzugefügt
- ✅ App gebaut und synchronisiert

## 📁 Projektstruktur

```
KWS-BETA-APP/
├── android/              # Android Native Projekt
│   ├── app/
│   │   └── src/main/
│   │       └── assets/public/  # Ihre Web-App (aus dist/)
│   └── ...
├── capacitor.config.ts   # Capacitor Konfiguration
└── dist/                 # Gebaute Web-App
```

## 🚀 Nächste Schritte

### 1. Android Studio öffnen

```bash
npm run cap:open:android
```

Oder manuell:
- Android Studio öffnen
- "Open an Existing Project" wählen
- Ordner `android/` auswählen

### 2. Android Studio Setup

**Erstmalig:**
1. Android Studio lädt das Projekt
2. Gradle Sync wird automatisch ausgeführt (kann einige Minuten dauern)
3. SDK wird heruntergeladen (falls nicht vorhanden)

**Wichtig:**
- Android SDK muss installiert sein
- Mindestens Android SDK 22 (Android 5.1) erforderlich
- Empfohlen: Android SDK 33 (Android 13)

### 3. App-Icon anpassen

Das App-Icon befindet sich in:
```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png (48x48)
├── mipmap-hdpi/ic_launcher.png (72x72)
├── mipmap-xhdpi/ic_launcher.png (96x96)
├── mipmap-xxhdpi/ic_launcher.png (144x144)
└── mipmap-xxxhdpi/ic_launcher.png (192x192)
```

**Icon ersetzen:**
1. Erstellen Sie Icons in verschiedenen Größen aus Ihrem Logo
2. Ersetzen Sie die `ic_launcher.png` Dateien in den jeweiligen Ordnern
3. Auch `ic_launcher_round.png` für runde Icons (Android 7.1+)

### 4. App-Name anpassen

Der App-Name wird in `android/app/src/main/res/values/strings.xml` definiert:

```xml
<resources>
    <string name="app_name">KWS Beta App</string>
</resources>
```

### 5. App bauen und testen

**Auf Emulator:**
1. Android Studio → Run (▶️) oder `Shift+F10`
2. Emulator auswählen oder neuen erstellen
3. App wird installiert und gestartet

**Auf echtem Gerät:**
1. USB-Debugging auf dem Android-Gerät aktivieren
2. Gerät per USB verbinden
3. Gerät in Android Studio auswählen
4. Run (▶️) klicken

### 6. APK/AAB für Play Store erstellen

**Debug APK (zum Testen):**
1. Android Studio → Build → Build Bundle(s) / APK(s) → Build APK(s)
2. APK wird in `android/app/build/outputs/apk/debug/` erstellt

**Release AAB (für Play Store):**
1. Android Studio → Build → Generate Signed Bundle / APK
2. "Android App Bundle" wählen
3. Keystore erstellen (oder vorhandenen verwenden)
4. AAB wird in `android/app/build/outputs/bundle/release/` erstellt

## 🔄 Entwicklungs-Workflow

### Nach Code-Änderungen:

```bash
# 1. Web-App bauen
npm run build

# 2. Capacitor synchronisieren
npx cap sync

# 3. In Android Studio testen
npm run cap:open:android
```

**Oder alles in einem:**
```bash
npm run cap:sync
```

### Wichtige Hinweise:

- **Immer `cap sync` nach `npm run build`**: Damit die native App die neuesten Änderungen erhält
- **Service Worker**: Funktioniert in der nativen App genauso wie in der Web-App
- **Offline-Funktionalität**: Wird durch den Service Worker bereitgestellt

## 📱 Native Features hinzufügen

### Beispiel: Push-Notifications

```bash
npm install @capacitor/push-notifications
npx cap sync
```

Dann in der App verwenden:
```typescript
import { PushNotifications } from '@capacitor/push-notifications';
```

### Weitere Plugins:

- `@capacitor/camera` - Kamera-Zugriff
- `@capacitor/geolocation` - GPS
- `@capacitor/filesystem` - Dateisystem
- `@capacitor/network` - Netzwerk-Status
- `@capacitor/app` - App-Lifecycle
- `@capacitor/status-bar` - Status-Bar anpassen
- `@capacitor/splash-screen` - Splash Screen

Vollständige Liste: https://capacitorjs.com/docs/plugins

## 🎨 App anpassen

### Splash Screen

Splash Screen Bilder in:
```
android/app/src/main/res/
├── drawable/
│   └── splash.png
└── values/
    └── styles.xml  # Splash Screen Konfiguration
```

### Theme-Farben

Farben in `android/app/src/main/res/values/colors.xml`:
```xml
<resources>
    <color name="colorPrimary">#36B531</color>
    <color name="colorPrimaryDark">#2DA029</color>
    <color name="colorAccent">#36B531</color>
</resources>
```

## 🐛 Troubleshooting

### Gradle Sync Fehler
- Android Studio → File → Invalidate Caches / Restart
- `android/gradle/wrapper/gradle-wrapper.properties` prüfen

### App startet nicht
- `npx cap sync` erneut ausführen
- Android Studio → Build → Clean Project
- Android Studio → Build → Rebuild Project

### Service Worker funktioniert nicht
- Prüfen Sie, ob HTTPS aktiviert ist (in Production)
- Service Worker muss im Root-Verzeichnis liegen

## 📚 Weitere Ressourcen

- [Capacitor Dokumentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/)
- [Play Store Publishing](https://developer.android.com/distribute/googleplay/start)

## ✅ Checkliste vor Play Store Upload

- [ ] App-Icon in allen Größen ersetzt
- [ ] App-Name finalisiert
- [ ] Splash Screen angepasst
- [ ] Theme-Farben angepasst
- [ ] App auf verschiedenen Geräten getestet
- [ ] Release AAB erstellt
- [ ] Keystore sicher gespeichert
- [ ] Play Store Metadaten vorbereitet
- [ ] Privacy Policy erstellt

