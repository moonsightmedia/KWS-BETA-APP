# Codemagic Setup - Schritt für Schritt

## 🚀 Los geht's!

Diese Anleitung führt Sie durch das komplette Setup von Codemagic für Ihre Capacitor-App.

---

## 📋 Schritt 1: Codemagic Account erstellen

1. **Gehen Sie zu:** https://codemagic.io/signup
2. **Klicken Sie auf "Sign up with GitHub"**
3. **Autorisieren Sie Codemagic** (GitHub-Zugriff gewähren)
4. **Account erstellen** (keine Kreditkarte nötig!)

**✅ Fertig!** Sie sind jetzt angemeldet.

---

## 📋 Schritt 2: App hinzufügen

1. **Nach dem Login:** Sie sehen das Dashboard
2. **Klicken Sie auf "Add application"** (großer Button)
3. **Wählen Sie "GitHub"** als Git-Provider
4. **Repository auswählen:** `moonsightmedia/KWS-BETA-APP`
5. **Klicken Sie auf "Add application"**

**Codemagic erkennt automatisch:**
- ✅ Capacitor-Projekt
- ✅ iOS & Android Plattformen
- ✅ Erstellt automatisch Workflows

**✅ Fertig!** Ihre App ist jetzt in Codemagic.

---

## 📋 Schritt 3: Apple Developer Account verbinden

### 3.1 App-spezifisches Passwort erstellen

1. **Gehen Sie zu:** https://appleid.apple.com
2. **Anmelden** mit Ihrer Apple ID
3. **"Sign-In and Security"** → **"App-Specific Passwords"**
4. **"+ Generate an app-specific password"**
5. **Label:** "Codemagic"
6. **Passwort kopieren** (nur einmal sichtbar!)

**Wichtig:** Dieses Passwort ist NICHT Ihr normales Apple ID Passwort!

### 3.2 Team ID finden

1. **Gehen Sie zu:** https://developer.apple.com/account
2. **Oben rechts:** Team ID sehen (z.B. `ABC123XYZ`)
3. **Kopieren**

### 3.3 In Codemagic verbinden

1. **In Codemagic:** App auswählen → **"Settings"** → **"Integrations"**
2. **"App Store Connect"** → **"Add"**
3. **Daten eingeben:**
   - **Issuer ID:** Lassen Sie leer (wird automatisch erkannt)
   - **Key ID:** Lassen Sie leer (wird automatisch erkannt)
   - **Private Key:** Lassen Sie leer (wird automatisch erkannt)
   - **Oder:** Verwenden Sie **"API Key"** Methode (empfohlen)

**API Key Methode (Empfohlen):**

1. **App Store Connect:** https://appstoreconnect.apple.com
2. **Users and Access** → **Keys** → **"+"**
3. **Key Name:** "Codemagic"
4. **Access:** "App Manager" oder "Admin"
5. **Key erstellen**
6. **Key ID kopieren**
7. **Private Key herunterladen** (.p8 Datei)

**Dann in Codemagic:**
- **Issuer ID:** Aus App Store Connect (oben rechts)
- **Key ID:** Die kopierte Key ID
- **Private Key:** Inhalt der .p8 Datei einfügen

**Oder einfacher - App-spezifisches Passwort:**

1. **In Codemagic:** "App Store Connect" → "Add"
2. **Methode:** "App-specific password"
3. **Apple ID:** Ihre Developer Account Email
4. **App-specific password:** Das Passwort von Schritt 3.1
5. **Team ID:** Die Team ID von Schritt 3.2
6. **"Save"**

**✅ Fertig!** Apple Developer Account ist verbunden.

---

## 📋 Schritt 4: Workflow konfigurieren

### 4.1 iOS Workflow erstellen

1. **In Codemagic:** App auswählen → **"Workflows"**
2. **"+ Add workflow"** → **"iOS"**
3. **Workflow-Name:** "iOS TestFlight"

### 4.2 Build-Konfiguration

**Codemagic erstellt automatisch eine Konfiguration, aber Sie können anpassen:**

**Environment:**
- **Xcode version:** Latest stable (oder spezifische Version)
- **CocoaPods version:** Latest
- **Node version:** 20.x

**Build scripts:**

Codemagic erkennt automatisch Capacitor, aber Sie können prüfen:

```yaml
scripts:
  - name: Install dependencies
    script: |
      npm ci
      
  - name: Build web app
    script: |
      npm run cap:sync
      
  - name: Install CocoaPods
    script: |
      cd ios/App
      pod install
      
  - name: Build iOS app
    script: |
      xcodebuild build-for-testing \
        -workspace ios/App/App.xcworkspace \
        -scheme App \
        -destination "generic/platform=iOS"
        
  - name: Archive iOS app
    script: |
      xcodebuild archive \
        -workspace ios/App/App.xcworkspace \
        -scheme App \
        -archivePath build/App.xcarchive \
        -destination "generic/platform=iOS"
        
  - name: Export IPA
    script: |
      xcodebuild -exportArchive \
        -archivePath build/App.xcarchive \
        -exportPath build/ipa \
        -exportOptionsPlist exportOptions.plist
```

**Publishing:**

```yaml
publishing:
  email:
    recipients:
      - your-email@example.com
    notify:
      success: true
      failure: true
      
  app_store_connect:
    auth: integration  # Verwendet die verbundene Integration
    
    # Automatisches Upload zu TestFlight
    submit_to_testflight: true
    beta_groups:
      - Internal Testing  # Oder Ihre Beta-Gruppe
```

### 4.3 Signing konfigurieren

**Codemagic kann Signing automatisch machen!**

1. **In Workflow:** **"Code signing"** Tab
2. **"Automatic code signing"** aktivieren
3. **Apple Developer Account** auswählen (die Sie verbunden haben)
4. **Bundle ID:** `com.kletterwelt.beta`
5. **"Save"**

**✅ Fertig!** Workflow ist konfiguriert.

---

## 📋 Schritt 5: Ersten Build starten

1. **In Codemagic:** App auswählen
2. **"Start new build"** klicken
3. **Workflow auswählen:** "iOS TestFlight"
4. **Branch auswählen:** `main`
5. **"Start build"** klicken

**⏱️ Warten Sie 10-15 Minuten**

**Was passiert:**
- ✅ Code wird ausgecheckt
- ✅ Dependencies werden installiert
- ✅ Web-App wird gebaut
- ✅ iOS-App wird gebaut
- ✅ IPA wird erstellt
- ✅ Automatisch zu TestFlight hochgeladen!

**✅ Fertig!** Ihre App ist jetzt in TestFlight!

---

## 📱 Schritt 6: In TestFlight prüfen

1. **Gehen Sie zu:** https://appstoreconnect.apple.com
2. **My Apps** → **KWS Beta App**
3. **TestFlight Tab**
4. **Builds** → Sie sehen Ihren neuen Build!

**Beta-Tester hinzufügen:**
1. **"Internal Testing"** oder **"External Testing"**
2. **"+ Add Testers"**
3. **Email-Adressen eingeben**
4. **Einladungen senden**

**Tester installieren:**
- TestFlight App auf iPhone/iPad installieren
- Einladung akzeptieren
- App installieren

---

## 🔧 Troubleshooting

### Build schlägt fehl

**Problem:** "Code signing failed"

**Lösung:**
- ✅ Prüfen Sie, ob Apple Developer Account korrekt verbunden ist
- ✅ Bundle ID muss übereinstimmen: `com.kletterwelt.beta`
- ✅ "Automatic code signing" aktiviert?

**Problem:** "CocoaPods install failed"

**Lösung:**
- ✅ Prüfen Sie `ios/App/Podfile`
- ✅ CocoaPods Version in Codemagic anpassen

**Problem:** "Build failed"

**Lösung:**
- ✅ Logs in Codemagic prüfen
- ✅ Fehlermeldungen durchlesen
- ✅ Häufig: Dependencies oder Konfiguration

---

### Upload zu TestFlight schlägt fehl

**Problem:** "Invalid credentials"

**Lösung:**
- ✅ App-spezifisches Passwort neu erstellen
- ✅ Apple Developer Account Integration prüfen
- ✅ Team ID korrekt?

---

## 💡 Tipps

### Tipp 1: Automatische Builds

**Bei jedem Push zu `main`:**
- Workflow → **"Triggers"** → **"On push"**
- Branch: `main`
- ✅ Automatisch bauen und hochladen!

### Tipp 2: Build-Status per Email

- ✅ Email-Benachrichtigungen aktivieren
- ✅ Erfolg/Fehler per Email erhalten

### Tipp 3: Build-Artefakte

- ✅ IPA-Dateien werden gespeichert
- ✅ Herunterladen für Backup möglich

---

## 📚 Nächste Schritte

### Nach erfolgreichem Build:

1. ✅ **Beta-Tester hinzufügen**
2. ✅ **App testen über TestFlight**
3. ✅ **Feedback sammeln**
4. ✅ **Weitere Builds erstellen** (bei Updates)

### Für automatische Builds:

1. ⏭️ **Triggers konfigurieren** (bei Push)
2. ⏭️ **Automatisches Upload aktivieren**
3. ⏭️ **Dann:** Einfach Code pushen → Automatisch zu TestFlight!

---

## 🎯 Zusammenfassung

**Was Sie gemacht haben:**
1. ✅ Codemagic Account erstellt
2. ✅ App hinzugefügt
3. ✅ Apple Developer Account verbunden
4. ✅ Workflow konfiguriert
5. ✅ Build gestartet
6. ✅ App zu TestFlight hochgeladen

**Das war's!** Ihre App ist jetzt in TestFlight, ohne Mac! 🎉

---

**Fragen?** Schauen Sie in die Codemagic-Dokumentation oder fragen Sie mich! 😊

