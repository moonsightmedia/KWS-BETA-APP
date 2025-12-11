# App erstellt - Nächste Schritte

## ✅ App ist jetzt in App Store Connect erstellt!

Jetzt müssen Sie Codemagic einrichten und die App zu TestFlight hochladen.

---

## 📋 Schritt 1: Codemagic Account erstellen (2 Minuten)

1. **Gehen Sie zu:** https://codemagic.io/signup
2. **Klicken Sie auf "Sign up with GitHub"**
3. **Autorisieren Sie Codemagic** (GitHub-Zugriff gewähren)
4. **Account erstellen** (keine Kreditkarte nötig!)

**✅ Fertig!** Sie sind jetzt angemeldet.

---

## 📋 Schritt 2: App zu Codemagic hinzufügen (1 Minute)

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

## 📋 Schritt 3: Apple Developer Account verbinden (5 Minuten)

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
   - **Apple ID:** Ihre Developer Account Email
   - **App-specific password:** Das Passwort von Schritt 3.1
   - **Team ID:** Die Team ID von Schritt 3.2
4. **"Save"**

**✅ Fertig!** Apple Developer Account ist verbunden.

---

## 📋 Schritt 4: iOS Workflow konfigurieren (5 Minuten)

### 4.1 Workflow erstellen

1. **In Codemagic:** App auswählen → **"Workflows"**
2. **"+ Add workflow"** → **"iOS"**
3. **Workflow-Name:** "iOS TestFlight"

### 4.2 Signing konfigurieren

**Codemagic kann Signing automatisch machen!**

1. **In Workflow:** **"Code signing"** Tab
2. **"Automatic code signing"** aktivieren
3. **Apple Developer Account** auswählen (die Sie verbunden haben)
4. **Bundle ID:** `com.kletterwelt.beta`
5. **"Save"**

**✅ Fertig!** Workflow ist konfiguriert.

---

## 📋 Schritt 5: Ersten Build starten (10-15 Minuten)

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

## 🎯 Zusammenfassung der Schritte

1. ✅ **Codemagic Account erstellen** (2 Min)
2. ✅ **App hinzufügen** (1 Min)
3. ✅ **Apple Developer Account verbinden** (5 Min)
4. ✅ **Workflow konfigurieren** (5 Min)
5. ✅ **Build starten** (10-15 Min Wartezeit)
6. ✅ **In TestFlight prüfen** (2 Min)

**Gesamtzeit:** ~25-30 Minuten (inkl. Wartezeit)

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

## 🔧 Troubleshooting

### Build schlägt fehl?

**Problem:** "Code signing failed"

**Lösung:**
- ✅ Prüfen Sie, ob Apple Developer Account korrekt verbunden ist
- ✅ Bundle ID muss übereinstimmen: `com.kletterwelt.beta`
- ✅ "Automatic code signing" aktiviert?

**Problem:** "CocoaPods install failed"

**Lösung:**
- ✅ Prüfen Sie `ios/App/Podfile`
- ✅ CocoaPods Version in Codemagic anpassen

---

### Upload zu TestFlight schlägt fehl?

**Problem:** "Invalid credentials"

**Lösung:**
- ✅ App-spezifisches Passwort neu erstellen
- ✅ Apple Developer Account Integration prüfen
- ✅ Team ID korrekt?

---

## 📚 Nächste Schritte nach erfolgreichem Build

1. ✅ **Beta-Tester hinzufügen**
2. ✅ **App testen über TestFlight**
3. ✅ **Feedback sammeln**
4. ✅ **Weitere Builds erstellen** (bei Updates)

---

## 🎉 Fertig!

**Ihre App ist jetzt:**
- ✅ In App Store Connect erstellt
- ✅ Bereit für TestFlight
- ✅ Kann zu Codemagic verbunden werden
- ✅ Kann automatisch gebaut werden

**Los geht's mit Codemagic!** 🚀

---

**Fragen?** Ich kann Ihnen bei jedem Schritt helfen! 😊

