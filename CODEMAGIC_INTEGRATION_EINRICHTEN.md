# App Store Connect Integration in Codemagic einrichten

## ❌ Fehler: "App Store Connect integration 'codemagic' does not exist"

Die Integration muss zuerst in Codemagic eingerichtet werden.

---

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: Zu Settings gehen

1. **In Codemagic:** App auswählen
2. **Klicken Sie auf "Settings"** (oben im Menü)
3. **Klicken Sie auf "Integrations"** (links im Menü)

---

### Schritt 2: App Store Connect Integration hinzufügen

1. **Suchen Sie nach "App Store Connect"** in der Liste
2. **Klicken Sie auf "Add"** oder **"Connect"** neben App Store Connect

---

### Schritt 3: Daten eingeben

**Sie brauchen:**

#### 3.1 Apple ID
- Ihre Apple Developer Account Email
- Beispiel: `ihre-email@example.com`

#### 3.2 App-specific password
- Gehen Sie zu: https://appleid.apple.com
- Sign-In and Security → App-Specific Passwords
- "+ Generate an app-specific password"
- Label: "Codemagic"
- Passwort kopieren (nur einmal sichtbar!)

#### 3.3 Team ID
- Gehen Sie zu: https://developer.apple.com/account
- Oben rechts: Team ID sehen (z.B. `ABC123XYZ`)
- Kopieren

---

### Schritt 4: Integration speichern

1. **Alle Daten eingeben:**
   - Apple ID
   - App-specific password
   - Team ID

2. **Integration-Name:** Lassen Sie den Standard-Namen oder ändern Sie zu `codemagic`

3. **"Save"** oder **"Connect"** klicken

**✅ Fertig!** Integration ist jetzt eingerichtet.

---

## 🔧 Alternative: Integration-Name anpassen

**Falls Sie einen anderen Namen verwenden möchten:**

### Option 1: Standard-Namen verwenden

1. **Integration erstellen** (wie oben)
2. **Standard-Namen verwenden** (z.B. `app_store_connect_xxx`)
3. **In `codemagic.yaml` ändern:**

```yaml
integrations:
  app_store_connect: app_store_connect_xxx  # Der tatsächliche Name
```

### Option 2: Namen zu "codemagic" ändern

1. **Integration erstellen**
2. **Integration-Name ändern zu:** `codemagic`
3. **Dann funktioniert die YAML wie sie ist**

---

## 📋 Nach der Einrichtung

### Schritt 1: YAML prüfen

**In `codemagic.yaml` sollte stehen:**

```yaml
integrations:
  app_store_connect: codemagic  # Oder der Name Ihrer Integration
```

### Schritt 2: Datei committen und pushen

```bash
git add codemagic.yaml
git commit -m "Fix Codemagic integration name"
git push origin main
```

### Schritt 3: In Codemagic prüfen

1. **"Check for configuration file"** klicken
2. **Fehler sollte verschwunden sein**

---

## 🎯 Zusammenfassung

**Wo einrichten:**
1. ✅ Codemagic → App auswählen
2. ✅ Settings → Integrations
3. ✅ App Store Connect → Add
4. ✅ Daten eingeben (Apple ID, Password, Team ID)
5. ✅ Integration-Name: `codemagic` (oder Standard)
6. ✅ Save

**Dann:**
- ✅ YAML sollte funktionieren
- ✅ Build kann gestartet werden
- ✅ Automatisch zu TestFlight hochladen

---

## 💡 Tipp

**Integration-Name:**
- Verwenden Sie einen einfachen Namen: `codemagic` oder `app_store_connect`
- Stellen Sie sicher, dass der Name in der YAML übereinstimmt

**Fragen?** Ich kann Ihnen bei jedem Schritt helfen! 😊

