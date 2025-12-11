# TestFlight ohne Mac - Die einfache Lösung (wie Expo)

## 🎯 Sie haben Recht!

Mit **Expo EAS Build** können Sie ohne Mac zu TestFlight hochladen. Für **Capacitor** gibt es ähnliche Services!

---

## ✅ Kostenlose Optionen (wie Expo EAS Build)

### Option 1: Codemagic (Empfohlen - wie Expo)

**Vorteile:**
- ✅ **Kostenlos** für öffentliche Repos
- ✅ **Kein Mac nötig**
- ✅ **Automatisches Upload zu TestFlight**
- ✅ **Einfaches Setup** (ähnlich wie Expo EAS)
- ✅ **Speziell für Mobile Apps**

**Setup:**
1. Account erstellen: https://codemagic.io/signup
2. GitHub Repository verbinden
3. Apple Developer Account verbinden
4. Build starten → Automatisch zu TestFlight!

**Kosten:**
- ✅ Öffentliche Repos: **Kostenlos**
- 💰 Private Repos: Ab $75/Monat

---

### Option 2: Bitrise

**Vorteile:**
- ✅ **Kostenlos** für öffentliche Repos
- ✅ **Kein Mac nötig**
- ✅ **Automatisches Upload zu TestFlight**
- ✅ **Sehr mächtig**

**Setup:**
1. Account erstellen: https://www.bitrise.io/
2. GitHub Repository verbinden
3. Apple Developer Account verbinden
4. Workflow konfigurieren
5. Build starten → Automatisch zu TestFlight!

**Kosten:**
- ✅ Öffentliche Repos: **Kostenlos**
- 💰 Private Repos: Ab $36/Monat

---

### Option 3: Appcircle

**Vorteile:**
- ✅ **Kostenlos** für öffentliche Repos
- ✅ **Kein Mac nötig**
- ✅ **Automatisches Upload zu TestFlight**
- ✅ **Einfaches Setup**

**Setup:**
1. Account erstellen: https://appcircle.io/
2. GitHub Repository verbinden
3. Apple Developer Account verbinden
4. Build starten → Automatisch zu TestFlight!

**Kosten:**
- ✅ Öffentliche Repos: **Kostenlos**
- 💰 Private Repos: Ab $29/Monat

---

## 🎯 Vergleich: Expo vs. Diese Services

| Feature | Expo EAS Build | Codemagic/Bitrise/Appcircle |
|---------|----------------|----------------------------|
| **Ohne Mac** | ✅ Ja | ✅ Ja |
| **Kostenlos** | ✅ Ja* | ✅ Ja* |
| **TestFlight Upload** | ✅ Ja | ✅ Ja |
| **Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Für Capacitor** | ❌ Nein | ✅ Ja |

*Für öffentliche Repos

---

## 📋 Empfehlung: Codemagic

**Warum Codemagic?**
- ✅ Sehr ähnlich zu Expo EAS Build
- ✅ Speziell für Mobile Apps optimiert
- ✅ Einfaches Setup
- ✅ Gute Dokumentation
- ✅ Kostenlos für öffentliche Repos

---

## 🚀 Schnellstart mit Codemagic

### Schritt 1: Account erstellen

1. Gehen Sie zu: https://codemagic.io/signup
2. Mit GitHub anmelden
3. Account erstellen

### Schritt 2: App hinzufügen

1. **"Add application" klicken**
2. **GitHub Repository auswählen:** `moonsightmedia/KWS-BETA-APP`
3. **App hinzufügen**

### Schritt 3: Apple Developer Account verbinden

1. **Settings → Integrations**
2. **Apple Developer Account hinzufügen:**
   - Apple ID Email
   - App-spezifisches Passwort
   - Team ID
3. **Speichern**

### Schritt 4: Workflow konfigurieren

Codemagic erkennt automatisch Capacitor-Projekte!

**Oder manuell konfigurieren:**

```yaml
# codemagic.yaml (wird automatisch erstellt)
workflows:
  ios-workflow:
    name: iOS Workflow
    max_build_duration: 120
    instance_type: mac_mini_m1
    environment:
      groups:
        - app_store_credentials
      vars:
        XCODE_WORKSPACE: "ios/App/App.xcworkspace"
        XCODE_SCHEME: "App"
        APP_ID: "com.kletterwelt.beta"
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
            -workspace "$XCODE_WORKSPACE" \
            -scheme "$XCODE_SCHEME" \
            -destination "generic/platform=iOS"
      - name: Archive iOS app
        script: |
          xcodebuild archive \
            -workspace "$XCODE_WORKSPACE" \
            -scheme "$XCODE_SCHEME" \
            -archivePath build/App.xcarchive \
            -destination "generic/platform=iOS"
      - name: Export IPA
        script: |
          xcodebuild -exportArchive \
            -archivePath build/App.xcarchive \
            -exportPath build/ipa \
            -exportOptionsPlist exportOptions.plist
    publishing:
      email:
        recipients:
          - your-email@example.com
        notify:
          success: true
          failure: true
      app_store_connect:
        auth: integration
        
        # Automatisches Upload zu TestFlight
        submit_to_testflight: true
        beta_groups:
          - group name 1
          - group name 2
```

### Schritt 5: Build starten

1. **"Start new build" klicken**
2. **Branch wählen:** `main`
3. **"Start build" klicken**
4. **Warten Sie 10-15 Minuten**
5. ✅ **App wird automatisch zu TestFlight hochgeladen!**

---

## 💡 Vergleich: GitHub Actions vs. Codemagic

| Feature | GitHub Actions | Codemagic |
|---------|----------------|-----------|
| **Kostenlos** | ✅ Ja | ✅ Ja |
| **Ohne Mac** | ✅ Ja | ✅ Ja |
| **TestFlight Upload** | ⚙️ Manuell konfigurieren | ✅ Automatisch |
| **Setup** | ⚙️ Komplex (Signing) | ✅ Einfach (UI) |
| **Signing** | ⚙️ Manuell | ✅ Automatisch |

**Fazit:** Codemagic ist einfacher, ähnlich wie Expo EAS Build!

---

## 🎯 Empfehlung für Sie

**Da Sie bereits Expo-Erfahrung haben:**

1. ✅ **Codemagic nutzen** (ähnlich wie Expo EAS Build)
2. ✅ **Einfaches Setup** über UI
3. ✅ **Automatisches Upload zu TestFlight**
4. ✅ **Kein Mac nötig**
5. ✅ **Kostenlos** (wenn Repository öffentlich)

**Oder:**

- ✅ **GitHub Actions** (bereits eingerichtet, aber komplexer)
- ⚙️ Benötigt Signing-Secrets (einmalig konfigurieren)

---

## 📚 Nächste Schritte

### Mit Codemagic (Empfohlen):

1. ⏭️ Account erstellen: https://codemagic.io/signup
2. ⏭️ Repository verbinden
3. ⏭️ Apple Developer Account verbinden
4. ⏭️ Build starten
5. ✅ Fertig!

### Mit GitHub Actions (bereits eingerichtet):

1. ⏭️ Certificates & Profiles erstellen (einmalig)
2. ⏭️ GitHub Secrets konfigurieren
3. ⏭️ Workflow starten
4. ✅ Fertig!

---

## 💡 Tipp

**Für Sie:** Nutzen Sie **Codemagic** - es ist genau wie Expo EAS Build, nur für Capacitor!

**Vorteile:**
- ✅ Kein Mac nötig
- ✅ Automatisches Upload zu TestFlight
- ✅ Einfaches Setup
- ✅ Kostenlos für öffentliche Repos

**Soll ich Ihnen beim Codemagic-Setup helfen?** 😊

