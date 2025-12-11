# iOS App Build Guide

## Voraussetzungen

1. **macOS** (erforderlich für iOS-Entwicklung)
   - iOS-Apps können nur auf macOS gebaut werden
   - Xcode benötigt macOS

2. **Xcode** installiert
   - Download aus dem Mac App Store
   - Während der Installation: Command Line Tools installieren
   - Öffnen Sie Xcode einmal, um die Lizenz zu akzeptieren

3. **CocoaPods** installiert (für Dependencies)
   ```bash
   sudo gem install cocoapods
   ```

4. **Apple Developer Account** (für Geräte-Tests und App Store)
   - Kostenlos: TestFlight und Geräte-Tests
   - Bezahlt ($99/Jahr): App Store Veröffentlichung

## Erste Einrichtung

### 1. CocoaPods Dependencies installieren

```bash
cd ios/App
pod install
cd ../..
```

**Wichtig:** Nach jeder Änderung an `Podfile` oder neuen Plugins:
```bash
cd ios/App
pod install
cd ../..
```

### 2. Web-App bauen und synchronisieren

```bash
npm run cap:sync
```

Dies macht automatisch:
- Web-App bauen (`npm run build`)
- Assets nach iOS kopieren
- Capacitor Plugins aktualisieren

## App bauen und testen

### Option 1: Über Xcode (Empfohlen)

1. **Xcode öffnen:**
   ```bash
   npm run cap:open:ios
   ```
   
   Oder manuell:
   ```bash
   open ios/App/App.xcworkspace
   ```
   
   **Wichtig:** Öffnen Sie `.xcworkspace`, nicht `.xcodeproj`!

2. **In Xcode:**
   - Warten Sie auf "Indexing" (unten in der Statusleiste)
   - Wählen Sie ein Gerät oder Simulator aus (oben links)
   - Klicken Sie auf "Run" (▶️) oder drücken Sie `Cmd+R`
   - Die App wird gebaut und gestartet

### Option 2: Über Terminal (für CI/CD)

```bash
# Web-App bauen und synchronisieren
npm run cap:sync

# Xcode-Build über Terminal
cd ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  build
```

## App auf Gerät installieren

### Voraussetzungen

1. **Apple Developer Account** einrichten:
   - Xcode → Preferences → Accounts
   - Apple ID hinzufügen
   - Team auswählen

2. **Signing & Capabilities** konfigurieren:
   - In Xcode: Projekt auswählen → Target "App" → "Signing & Capabilities"
   - "Automatically manage signing" aktivieren
   - Team auswählen
   - Bundle Identifier prüfen: `com.kletterwelt.beta`

3. **Gerät verbinden:**
   - iPhone/iPad per USB verbinden
   - Gerät entsperren und "Diesem Computer vertrauen" bestätigen
   - In Xcode: Gerät auswählen (oben links)

4. **App installieren:**
   - Run-Button (▶️) klicken
   - Erste Installation: Gerät-Einstellungen → Allgemein → VPN & Geräteverwaltung
   - Entwickler-App vertrauen

## Push Notifications für iOS einrichten

### 1. Apple Developer Portal

1. **App ID konfigurieren:**
   - https://developer.apple.com/account/resources/identifiers/list
   - App ID `com.kletterwelt.beta` auswählen oder erstellen
   - Push Notifications aktivieren

2. **APNs Key erstellen:**
   - Keys → "+" → Key Name: "KWS Beta Push Key"
   - Push Notifications aktivieren
   - Key erstellen und `.p8` Datei herunterladen (nur einmal!)
   - Key ID notieren

3. **Provisioning Profile erstellen:**
   - Profiles → "+" → iOS App Development
   - App ID auswählen
   - Certificate auswählen
   - Geräte auswählen
   - Profil erstellen und herunterladen

### 2. Firebase Console

1. **iOS-App hinzufügen:**
   - Firebase Console → Project Settings → Add App → iOS
   - Bundle ID: `com.kletterwelt.beta`
   - App hinzufügen

2. **APNs Key hochladen:**
   - Firebase Console → Project Settings → Cloud Messaging
   - APNs Authentication Key hochladen (`.p8` Datei)
   - Key ID eingeben
   - Team ID eingeben

3. **GoogleService-Info.plist herunterladen:**
   - Firebase Console → Project Settings → iOS App
   - `GoogleService-Info.plist` herunterladen
   - Nach `ios/App/App/` kopieren

### 3. Xcode konfigurieren

1. **GoogleService-Info.plist hinzufügen:**
   - In Xcode: `GoogleService-Info.plist` zu Projekt hinzufügen
   - "Copy items if needed" aktivieren
   - Target "App" auswählen

2. **Capabilities aktivieren:**
   - Xcode → Target "App" → Signing & Capabilities
   - "+ Capability" → Push Notifications hinzufügen
   - "+ Capability" → Background Modes hinzufügen
   - "Remote notifications" aktivieren

3. **Info.plist prüfen:**
   - `UIBackgroundModes` sollte `remote-notification` enthalten

## Release Build für App Store

### 1. Archive erstellen

1. **Release-Konfiguration:**
   - Xcode → Product → Scheme → Edit Scheme
   - Run → Build Configuration → Release

2. **Gerät auswählen:**
   - Oben links: "Any iOS Device" auswählen (nicht Simulator!)

3. **Archive erstellen:**
   - Product → Archive
   - Warten bis Build fertig ist

### 2. App Store Connect

1. **Archive hochladen:**
   - Organizer öffnet sich automatisch
   - Archive auswählen → "Distribute App"
   - "App Store Connect" wählen
   - "Upload" wählen
   - Optionen bestätigen
   - Hochladen

2. **In App Store Connect:**
   - https://appstoreconnect.apple.com
   - App auswählen oder erstellen
   - Neue Version hinzufügen
   - Build auswählen
   - Metadaten ausfüllen
   - Zur Review einreichen

## Troubleshooting

### "No such module 'Capacitor'"
```bash
cd ios/App
pod install
cd ../..
```

### "Command PhaseScriptExecution failed"
- Xcode → Product → Clean Build Folder (`Cmd+Shift+K`)
- `pod install` erneut ausführen

### "Signing for 'App' requires a development team"
- Xcode → Target "App" → Signing & Capabilities
- Team auswählen oder Apple ID hinzufügen

### Push Notifications funktionieren nicht
- Prüfen Sie `GoogleService-Info.plist` ist im Projekt
- Prüfen Sie APNs Key ist in Firebase hochgeladen
- Prüfen Sie Capabilities sind aktiviert
- Prüfen Sie App läuft auf physischem Gerät (Simulator unterstützt keine Push Notifications)

### "Unable to boot simulator"
- Xcode → Window → Devices and Simulators
- Simulator löschen und neu erstellen

## Nützliche Befehle

```bash
# Web-App bauen und synchronisieren
npm run cap:sync

# Xcode öffnen
npm run cap:open:ios

# CocoaPods Dependencies aktualisieren
cd ios/App && pod install && cd ../..

# Xcode Clean Build
# In Xcode: Product → Clean Build Folder (Cmd+Shift+K)

# Simulator zurücksetzen
xcrun simctl erase all
```

## Unterschiede zu Android

| Feature | Android | iOS |
|---------|---------|-----|
| Build-Tool | Gradle | Xcode |
| Dependencies | Gradle | CocoaPods |
| Signing | Keystore | Apple Developer Account |
| Push Service | FCM | APNs |
| Testen | APK installieren | Xcode Run |
| Veröffentlichung | Play Store | App Store |

## Nächste Schritte

Nach erfolgreichem Build können Sie:
- Die App auf Geräten testen
- TestFlight für Beta-Tests nutzen
- Eine Release-Version für den App Store erstellen
- Weitere Features hinzufügen


