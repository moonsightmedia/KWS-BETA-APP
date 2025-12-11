# Codemagic Environment Variables Setup

## 🔧 Alternative Lösung: Environment Variables verwenden

Da `use-profiles` nicht funktioniert, verwenden wir Environment Variables mit dem API Key.

---

## 📋 Schritt 1: Environment Variables in Codemagic erstellen

1. **In Codemagic:** App auswählen → **Environment variables** Tab
2. **Drei Variablen erstellen:**

### Variable 1: APP_STORE_CONNECT_PRIVATE_KEY

- **Variable name:** `APP_STORE_CONNECT_PRIVATE_KEY`
- **Variable value:** Inhalt der .p8 Datei (von App Store Connect API Key)
  - Öffnen Sie die .p8 Datei in einem Text-Editor
  - Kopieren Sie den gesamten Inhalt (inkl. `-----BEGIN PRIVATE KEY-----` und `-----END PRIVATE KEY-----`)
  - Einfügen
- **Select group:** `app_store_credentials` (neu erstellen)
- **Secret:** ✅ Aktiviert
- **Add** klicken

### Variable 2: APP_STORE_CONNECT_KEY_IDENTIFIER

- **Variable name:** `APP_STORE_CONNECT_KEY_IDENTIFIER`
- **Variable value:** Key ID (von App Store Connect, z.B. `3MD9688D9K`)
- **Select group:** `app_store_credentials`
- **Secret:** ✅ Aktiviert
- **Add** klicken

### Variable 3: APP_STORE_CONNECT_ISSUER_ID

- **Variable name:** `APP_STORE_CONNECT_ISSUER_ID`
- **Variable value:** Issuer ID (von App Store Connect, z.B. `21d78e2f-b8ad-...`)
- **Select group:** `app_store_credentials`
- **Secret:** ✅ Aktiviert
- **Add** klicken

---

## 📋 Schritt 2: YAML wurde bereits aktualisiert

Die YAML verwendet jetzt:
- ✅ `groups: - app_store_credentials`
- ✅ API Key aus Environment Variables
- ✅ Automatisches Upload zu TestFlight

---

## 📋 Schritt 3: Build starten

1. **Datei pushen** (falls noch nicht geschehen):
```bash
git add codemagic.yaml
git commit -m "Use environment variables for App Store Connect"
git push origin main
```

2. **Build starten:**
   - In Codemagic: "Start new build"
   - Sollte jetzt funktionieren!

---

## 🎯 Zusammenfassung

**Was geändert wurde:**
- ✅ YAML verwendet jetzt Environment Variables statt Integration
- ✅ API Key wird aus Variablen geladen
- ✅ Automatisches Signing sollte funktionieren

**Was Sie tun müssen:**
- ✅ Drei Environment Variables erstellen (siehe oben)
- ✅ Build starten

---

**Fragen?** Ich kann Ihnen beim Erstellen der Variablen helfen! 😊

