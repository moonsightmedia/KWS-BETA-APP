# Codemagic App Store Connect Integration - Richtig einrichten

## 📋 Wo finden Sie die Integration?

Laut [Codemagic-Dokumentation](https://docs.codemagic.io/yaml-publishing/app-store-connect/) gibt es zwei Orte:

### Für persönliche Projekte:
**Teams → Personal Account → Integrations**

### Für Team-Projekte:
**Teams → Team Name → Team integrations** (nur für Team-Admins)

---

## 📋 Schritt 1: App Store Connect API Key erstellen

**Bevor Sie die Integration einrichten können, brauchen Sie einen API Key:**

1. **Gehen Sie zu:** https://appstoreconnect.apple.com
2. **Users and Access → Integrations → App Store Connect API**
3. **"+"** klicken → Neuen API Key erstellen
4. **Name:** "Codemagic" (oder beliebig)
5. **Access:** "App Manager" wählen
6. **"Generate"** klicken
7. **Key herunterladen** (.p8 Datei) - **Nur einmal möglich!**
8. **Notieren Sie:**
   - **Issuer ID** (oben über der Tabelle)
   - **Key ID** (in der Tabelle)

---

## 📋 Schritt 2: Integration in Codemagic einrichten

### Schritt 2.1: Zu Integrations gehen

1. **In Codemagic:** Oben im Menü → **"Teams"** klicken
2. **"Personal Account"** auswählen (oder Ihr Team)
3. **"Integrations"** Tab klicken

### Schritt 2.2: Developer Portal verbinden

1. **Suchen Sie nach "Developer Portal"** in der Liste
2. **"Connect"** klicken
3. **Daten eingeben:**
   - **App Store Connect API key name:** `codemagic` (oder beliebig - das ist der Name für die YAML)
   - **Issuer ID:** Die ID von Schritt 1.8
   - **Key ID:** Die ID von Schritt 1.8
   - **API key:** Die .p8 Datei hochladen (von Schritt 1.7)
4. **"Save"** klicken

**✅ Fertig!** Integration ist jetzt eingerichtet.

---

## 📋 Schritt 3: YAML anpassen

**In `codemagic.yaml` sollte stehen:**

```yaml
integrations:
  app_store_connect: codemagic  # Der Name, den Sie in Schritt 2.2 eingegeben haben
```

**Wichtig:** Der Name muss übereinstimmen!

---

## 📋 Schritt 4: YAML prüfen

**Ihre aktuelle YAML sollte so aussehen:**

```yaml
workflows:
  ios-workflow:
    name: iOS Workflow
    integrations:
      app_store_connect: codemagic  # Muss mit dem Namen in der UI übereinstimmen
    environment:
      vars:
        # ... rest der Konfiguration
    publishing:
      app_store_connect:
        auth: integration  # Verwendet die Integration aus integrations:
        submit_to_testflight: true
        beta_groups:
          - Internal Testing
```

---

## 🔧 Falls Sie die Integration nicht finden

### Alternative: Environment Variables verwenden

Falls Sie die Integration nicht finden können, können Sie auch Environment Variables verwenden:

1. **App Settings → Environment variables**
2. **Drei Variablen erstellen:**
   - `APP_STORE_CONNECT_PRIVATE_KEY` (Inhalt der .p8 Datei)
   - `APP_STORE_CONNECT_KEY_IDENTIFIER` (Key ID)
   - `APP_STORE_CONNECT_ISSUER_ID` (Issuer ID)
3. **In YAML ändern:**

```yaml
environment:
  groups:
    - appstore_credentials  # Gruppe mit den Variablen

publishing:
  app_store_connect:
    api_key: $APP_STORE_CONNECT_PRIVATE_KEY
    key_id: $APP_STORE_CONNECT_KEY_IDENTIFIER
    issuer_id: $APP_STORE_CONNECT_ISSUER_ID
```

---

## 🎯 Empfehlung

**Verwenden Sie die Integration-Methode** (Schritt 1-3), da sie einfacher ist!

**Vorteile:**
- ✅ Einmal einrichten, überall verwenden
- ✅ Einfacher zu verwalten
- ✅ Keine Environment Variables nötig

---

## 📚 Zusammenfassung

1. ✅ **App Store Connect API Key erstellen** (App Store Connect)
2. ✅ **Integration in Codemagic einrichten** (Teams → Personal Account → Integrations)
3. ✅ **YAML prüfen** (Name muss übereinstimmen)
4. ✅ **Build starten**

---

**Fragen?** Ich kann Ihnen bei jedem Schritt helfen! 😊

