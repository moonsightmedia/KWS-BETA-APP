# Codemagic YAML Setup - Schritt für Schritt

## ✅ Ich habe die `codemagic.yaml` Datei erstellt!

Die Datei ist jetzt im Projekt-Root erstellt. Jetzt müssen Sie sie nur noch committen und pushen.

---

## 📋 Schritt 1: Datei prüfen

Die `codemagic.yaml` Datei wurde erstellt mit:
- ✅ iOS Workflow konfiguriert
- ✅ Automatisches Signing
- ✅ Automatisches Upload zu TestFlight
- ✅ Capacitor-spezifische Konfiguration

---

## 📋 Schritt 2: Email-Adresse anpassen (optional)

**In `codemagic.yaml` finden Sie:**

```yaml
email:
  recipients:
    - your-email@example.com # Ersetzen Sie mit Ihrer Email
```

**Ändern Sie:** `your-email@example.com` zu Ihrer echten Email-Adresse

**Oder:** Lassen Sie es erstmal so - können Sie später in Codemagic UI ändern.

---

## 📋 Schritt 3: Datei committen und pushen

### Option A: Über Terminal (empfohlen)

```bash
# 1. Datei hinzufügen
git add codemagic.yaml

# 2. Committen
git commit -m "Add Codemagic configuration for iOS builds"

# 3. Pushen
git push origin main
```

### Option B: Über VS Code / Editor

1. **Datei speichern** (`codemagic.yaml`)
2. **Git:** Datei hinzufügen (Stage)
3. **Commit:** "Add Codemagic configuration"
4. **Push:** Zu GitHub pushen

---

## 📋 Schritt 4: In Codemagic prüfen

1. **Gehen Sie zurück zu Codemagic**
2. **Klicken Sie auf "Check for configuration file"** (oben rechts)
3. **Codemagic erkennt automatisch die `codemagic.yaml`**

**✅ Fertig!** Workflow ist jetzt konfiguriert.

---

## 📋 Schritt 5: App Store Connect Credentials einrichten

**Bevor Sie bauen können:**

1. **In Codemagic:** App auswählen → **"Settings"** → **"Groups"**
2. **"app_store_credentials"** Gruppe erstellen (oder vorhandene verwenden)
3. **App Store Connect Integration hinzufügen:**
   - Apple ID
   - App-specific password
   - Team ID

**Oder einfacher:**

1. **Settings** → **"Integrations"**
2. **"App Store Connect"** → **"Add"**
3. **Daten eingeben** (wie vorher erklärt)

---

## 📋 Schritt 6: Ersten Build starten

1. **In Codemagic:** App auswählen
2. **"Start new build"** klicken
3. **Workflow auswählen:** "iOS Workflow"
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

---

## 🔧 Was die YAML-Datei macht

### Konfiguration:

- **Instance:** Mac Mini M1 (schnell und kostenlos)
- **Node:** Version 20
- **Xcode:** Latest stable
- **CocoaPods:** Default

### Build-Schritte:

1. ✅ Dependencies installieren (`npm ci`)
2. ✅ Web-App bauen (`npm run cap:sync`)
3. ✅ CocoaPods installieren
4. ✅ Code signing einrichten
5. ✅ iOS-App bauen
6. ✅ Archive erstellen
7. ✅ IPA exportieren

### Publishing:

- ✅ Email-Benachrichtigungen
- ✅ Automatisches Upload zu TestFlight
- ✅ Beta-Gruppe: "Internal Testing"

---

## 💡 Tipps

### Tipp 1: Automatische Builds aktivieren

**In Codemagic UI:**
- Workflow → **"Triggers"**
- **"On push"** aktivieren
- Branch: `main`
- ✅ Automatisch bei jedem Push!

### Tipp 2: Build-Artefakte

- ✅ IPA-Dateien werden gespeichert
- ✅ Herunterladen für Backup möglich
- ✅ 7 Tage verfügbar

### Tipp 3: Email anpassen

**In `codemagic.yaml`:**
```yaml
email:
  recipients:
    - ihre-email@example.com
```

**Oder in Codemagic UI:**
- Settings → Email-Benachrichtigungen

---

## 🔧 Troubleshooting

### "Configuration file not found"

**Lösung:**
- ✅ Prüfen Sie, ob `codemagic.yaml` im Root-Ordner ist
- ✅ Datei zu GitHub gepusht?
- ✅ "Check for configuration file" Button klicken

### "Code signing failed"

**Lösung:**
- ✅ App Store Connect Integration eingerichtet?
- ✅ Team ID korrekt?
- ✅ Bundle ID übereinstimmt: `com.kletterwelt.beta`

### "CocoaPods install failed"

**Lösung:**
- ✅ Prüfen Sie `ios/App/Podfile`
- ✅ CocoaPods Version in YAML anpassen (falls nötig)

---

## 📚 Nächste Schritte

1. ✅ **Datei committen und pushen**
2. ✅ **In Codemagic prüfen**
3. ✅ **App Store Connect Credentials einrichten**
4. ✅ **Build starten**
5. ✅ **In TestFlight prüfen**

---

## 🎉 Fertig!

**Ihre `codemagic.yaml` ist:**
- ✅ Erstellt
- ✅ Konfiguriert für Capacitor
- ✅ Bereit für iOS-Builds
- ✅ Automatisches Upload zu TestFlight

**Jetzt nur noch pushen und loslegen!** 🚀

---

**Fragen?** Ich kann Ihnen beim Pushen helfen! 😊

