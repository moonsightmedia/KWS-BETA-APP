# Codemagic Environment Variables - Welche brauchen Sie?

## 📋 Die drei Environment Variables, die Sie brauchen

Ihre YAML verwendet diese drei Variablen für App Store Connect:

---

## 🔑 Variable 1: APP_STORE_CONNECT_PRIVATE_KEY

**Was ist das?**
- Der Inhalt Ihrer **App Store Connect API Key** (.p8 Datei)
- Das ist der private Schlüssel für die API

**Wo finden?**
- Sie haben ihn erstellt: App Store Connect → Users and Access → Integrations → App Store Connect API
- Die .p8 Datei, die Sie heruntergeladen haben

**Wie hinzufügen?**
1. **.p8 Datei öffnen** (mit Text-Editor)
2. **Kompletten Inhalt kopieren** (inkl. `-----BEGIN PRIVATE KEY-----` und `-----END PRIVATE KEY-----`)
3. **In Codemagic:** Environment variables → Neue Variable
4. **Name:** `APP_STORE_CONNECT_PRIVATE_KEY`
5. **Wert:** Den kopierten Inhalt einfügen
6. **Gruppe:** `app_store_credentials` (neu erstellen)
7. **Secret:** ✅ Aktiviert
8. **Add** klicken

---

## 🔑 Variable 2: APP_STORE_CONNECT_KEY_IDENTIFIER

**Was ist das?**
- Die **Key ID** von Ihrem App Store Connect API Key
- Eine alphanumerische ID (z.B. `3MD9688D9K`)

**Wo finden?**
- App Store Connect → Users and Access → Integrations → App Store Connect API
- In der Tabelle bei Ihrem API Key → **Key ID** Spalte

**Wie hinzufügen?**
1. **Key ID kopieren** (z.B. `3MD9688D9K`)
2. **In Codemagic:** Environment variables → Neue Variable
3. **Name:** `APP_STORE_CONNECT_KEY_IDENTIFIER`
4. **Wert:** Die Key ID einfügen
5. **Gruppe:** `app_store_credentials`
6. **Secret:** ✅ Aktiviert
7. **Add** klicken

---

## 🔑 Variable 3: APP_STORE_CONNECT_ISSUER_ID

**Was ist das?**
- Die **Issuer ID** von Ihrem Apple Developer Account
- Eine alphanumerische ID (z.B. `21d78e2f-b8ad-...`)

**Wo finden?**
- App Store Connect → Users and Access → Integrations → App Store Connect API
- **Oben über der Tabelle** → "Issuer ID" steht dort

**Wie hinzufügen?**
1. **Issuer ID kopieren** (z.B. `21d78e2f-b8ad-...`)
2. **In Codemagic:** Environment variables → Neue Variable
3. **Name:** `APP_STORE_CONNECT_ISSUER_ID`
4. **Wert:** Die Issuer ID einfügen
5. **Gruppe:** `app_store_credentials`
6. **Secret:** ✅ Aktiviert
7. **Add** klicken

---

## 📋 Zusammenfassung

| Variable Name | Was ist das? | Wo finden? |
|---------------|--------------|------------|
| `APP_STORE_CONNECT_PRIVATE_KEY` | Inhalt der .p8 Datei | App Store Connect → API Key herunterladen |
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | Key ID (z.B. `3MD9688D9K`) | App Store Connect → Keys Tabelle |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID (z.B. `21d78e2f-...`) | App Store Connect → Oben über Keys Tabelle |

**Alle drei müssen in der Gruppe `app_store_credentials` sein!**

---

## 🎯 Schritt-für-Schritt in Codemagic

### Schritt 1: Zu Environment Variables gehen

1. **In Codemagic:** App "KWS-BETA-APP" auswählen
2. **Tab "Environment variables"** klicken (neben "codemagic.yaml")

### Schritt 2: Gruppe erstellen

1. **"Select group"** → **"Create new group"**
2. **Gruppen-Name:** `app_store_credentials`
3. **Erstellen**

### Schritt 3: Variablen hinzufügen

**Für jede Variable:**

1. **Variable name** eingeben (z.B. `APP_STORE_CONNECT_PRIVATE_KEY`)
2. **Variable value** eingeben (den Wert)
3. **Select group:** `app_store_credentials` auswählen
4. **Secret:** ✅ Aktivieren (wichtig!)
5. **Add** klicken

**Wiederholen für alle drei Variablen!**

---

## 💡 Tipp

**Wenn Sie die .p8 Datei nicht mehr haben:**

1. **App Store Connect → Users and Access → Integrations → App Store Connect API**
2. **Neuen API Key erstellen** (der alte kann nicht erneut heruntergeladen werden)
3. **Key herunterladen** (.p8)
4. **Inhalt kopieren** → Environment Variable erstellen

---

## ✅ Prüfen ob alles vorhanden ist

**In Codemagic:**
1. **Environment variables** Tab
2. **Gruppe `app_store_credentials`** sollte drei Variablen enthalten:
   - ✅ `APP_STORE_CONNECT_PRIVATE_KEY`
   - ✅ `APP_STORE_CONNECT_KEY_IDENTIFIER`
   - ✅ `APP_STORE_CONNECT_ISSUER_ID`

**Falls nicht:** Erstellen Sie die fehlenden Variablen!

---

## 🎯 Nächste Schritte

1. ✅ **Drei Environment Variables erstellen** (siehe oben)
2. ✅ **Alle in Gruppe `app_store_credentials`**
3. ✅ **Secret aktiviert**
4. ✅ **Build starten**

---

**Haben Sie die drei Variablen bereits erstellt?** Falls nicht, folgen Sie der Anleitung oben! 😊

