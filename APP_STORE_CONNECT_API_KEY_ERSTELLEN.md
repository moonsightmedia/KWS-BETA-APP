# App Store Connect API Key erstellen - Schritt für Schritt

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: Zu App Store Connect gehen

1. **Gehen Sie zu:** https://appstoreconnect.apple.com
2. **Anmelden** mit Ihrer Apple ID (Developer Account)

---

### Schritt 2: Zu Users and Access navigieren

1. **Oben rechts:** Klicken Sie auf Ihr Profil/Icon
2. **"Users and Access"** auswählen
   - Oder direkt: https://appstoreconnect.apple.com/access/users

---

### Schritt 3: Zu Integrations gehen

1. **Oben im Menü:** Klicken Sie auf **"Integrations"** Tab
2. **Oder direkt:** https://appstoreconnect.apple.com/access/integrations

---

### Schritt 4: App Store Connect API Key erstellen

1. **Suchen Sie nach:** "App Store Connect API" Sektion
2. **Oben rechts:** Klicken Sie auf **"+"** (Plus-Symbol)
   - Oder: "Generate API Key" Button

---

### Schritt 5: Key konfigurieren

1. **Name eingeben:** 
   - Beispiel: `Codemagic` oder `KWS Beta App`
   - Beschreibend, damit Sie später wissen, wofür er ist

2. **Access Level wählen:**
   - **"App Manager"** wählen (empfohlen)
   - Oder: "Admin" (falls Sie Admin-Rechte haben)
   - **Wichtig:** Muss mindestens "App Manager" sein!

3. **"Generate"** klicken

---

### Schritt 6: Key herunterladen

**WICHTIG:** Der Key kann nur **einmal** heruntergeladen werden!

1. **Nach dem Generieren:** Sie sehen den Key in der Liste
2. **Klicken Sie auf "Download API Key"** (oder Download-Symbol)
3. **Speichern Sie die .p8 Datei** sicher ab
   - Beispiel: `codemagic_api_key.p8`
   - **WICHTIG:** Diese Datei können Sie nur einmal herunterladen!

---

### Schritt 7: Informationen notieren

**Sie brauchen drei Informationen:**

1. **Issuer ID:**
   - **Wo:** Oben über der Tabelle der API Keys
   - **Format:** `21d78e2f-b8ad-...` (alphanumerisch)
   - **Kopieren Sie diese ID**

2. **Key ID:**
   - **Wo:** In der Tabelle, bei Ihrem neuen Key
   - **Format:** `3MD9688D9K` (alphanumerisch)
   - **Kopieren Sie diese ID**

3. **API Key (.p8 Datei):**
   - **Wo:** Die Datei, die Sie heruntergeladen haben
   - **Format:** `.p8` Datei
   - **Bewahren Sie diese sicher auf**

---

## 📋 Zusammenfassung der benötigten Daten

Nach dem Erstellen haben Sie:

| Was | Wo finden | Beispiel |
|-----|-----------|----------|
| **Issuer ID** | Oben über der Tabelle | `21d78e2f-b8ad-...` |
| **Key ID** | In der Tabelle | `3MD9688D9K` |
| **API Key (.p8)** | Heruntergeladene Datei | `codemagic_api_key.p8` |

---

## 🔧 Nächste Schritte

Nachdem Sie den API Key erstellt haben:

1. ✅ **Integration in Codemagic einrichten:**
   - Teams → Personal Account → Integrations
   - Developer Portal → Connect
   - Daten eingeben (Issuer ID, Key ID, .p8 Datei)

2. ✅ **Build starten:**
   - Codemagic verwendet automatisch den API Key
   - Automatisch zu TestFlight hochladen

---

## ⚠️ Wichtige Hinweise

### Key-Sicherheit:

- ✅ **Sicher aufbewahren:** Die .p8 Datei ist wie ein Passwort
- ✅ **Nicht teilen:** Niemandem geben
- ✅ **Nur einmal herunterladbar:** Falls verloren, neuen Key erstellen

### Access Level:

- ✅ **App Manager:** Ausreichend für TestFlight/App Store Upload
- ✅ **Admin:** Mehr Rechte, aber nicht nötig

### Key löschen:

- Falls Sie den Key nicht mehr brauchen: In der Liste löschen
- Neuen Key erstellen, falls nötig

---

## 💡 Tipp

**Key-Name:**
- Verwenden Sie einen beschreibenden Namen: `Codemagic` oder `KWS Beta App`
- So wissen Sie später, wofür der Key ist

**Backup:**
- Speichern Sie die .p8 Datei sicher (z.B. in einem Passwort-Manager)
- Notieren Sie Issuer ID und Key ID

---

## 🎯 Checkliste

- [ ] Zu App Store Connect gegangen
- [ ] Users and Access → Integrations geöffnet
- [ ] API Key erstellt (+ Button)
- [ ] Name eingegeben: `Codemagic`
- [ ] Access Level: `App Manager` gewählt
- [ ] Key generiert
- [ ] .p8 Datei heruntergeladen
- [ ] Issuer ID notiert
- [ ] Key ID notiert
- [ ] Alle Daten sicher gespeichert

---

**Fragen?** Ich kann Ihnen bei jedem Schritt helfen! 😊

