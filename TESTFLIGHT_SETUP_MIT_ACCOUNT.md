# TestFlight Setup - Sie haben bereits einen Apple Developer Account

## 🎯 Perfekt! Dann können wir direkt loslegen

Da Sie bereits einen Apple Developer Account haben, müssen wir nur noch:

1. ✅ Certificates & Provisioning Profiles erstellen
2. ✅ GitHub Secrets konfigurieren
3. ✅ Workflow testen

---

## 📋 Schritt 1: Certificates & Provisioning Profiles erstellen

### Option A: Mit Mac (einmalig, kann auch Freund machen)

**Auf einem Mac:**

1. **Xcode öffnen**
2. **Xcode → Preferences → Accounts**
3. **Apple ID hinzufügen** (Ihre Developer Account Email)
4. **Team auswählen**
5. **"Manage Certificates" klicken**
6. **"+" → "Apple Distribution"**
7. **Certificate wird automatisch erstellt**

**Provisioning Profile:**

1. **Xcode → Target "App" → Signing & Capabilities**
2. **"Automatically manage signing" aktivieren**
3. **Team auswählen**
4. **Xcode erstellt automatisch Provisioning Profile**

**Export:**

```bash
# Certificate exportieren
# Keychain Access → Certificate finden → Rechtsklick → Export → .p12

# Provisioning Profile finden
# ~/Library/MobileDevice/Provisioning Profiles/
```

---

### Option B: Ohne Mac (über Developer Portal)

**Certificate erstellen:**

1. **Gehen Sie zu:** https://developer.apple.com/account/resources/certificates/list
2. **"+" klicken**
3. **"Apple Distribution" wählen**
4. **Certificate Request erstellen:**
   - Keychain Access → Certificate Assistant → Request Certificate
   - Oder: Online-Tool verwenden
5. **CSR hochladen**
6. **Certificate herunterladen (.cer)**

**Zu .p12 konvertieren:**

**Sie brauchen einen Mac dafür** (oder Freund):
- Certificate doppelklicken → Wird zu Keychain hinzugefügt
- Keychain Access → Certificate exportieren → .p12
- Passwort setzen

**Provisioning Profile:**

1. **Gehen Sie zu:** https://developer.apple.com/account/resources/profiles/list
2. **"+" klicken**
3. **"App Store" wählen**
4. **App ID auswählen:** `com.kletterwelt.beta`
5. **Certificate auswählen** (das Distribution Certificate)
6. **Profil herunterladen** (.mobileprovision)

---

## 📋 Schritt 2: App Store Connect Setup

1. **Gehen Sie zu:** https://appstoreconnect.apple.com
2. **My Apps → "+" → Neue App**
3. **App-Informationen:**
   - Name: "KWS Beta App"
   - Primäre Sprache: Deutsch
   - Bundle ID: `com.kletterwelt.beta`
   - SKU: `kws-beta-app` (beliebig, eindeutig)

4. **App speichern**

---

## 📋 Schritt 3: App-spezifisches Passwort erstellen

1. **Gehen Sie zu:** https://appleid.apple.com
2. **Anmelden**
3. **"Sign-In and Security"**
4. **"App-Specific Passwords"**
5. **"Generate an app-specific password"**
6. **Label:** "GitHub Actions"
7. **Passwort kopieren** (nur einmal sichtbar!)

**Wichtig:** Dieses Passwort ist NICHT Ihr normales Apple ID Passwort!

---

## 📋 Schritt 4: Team ID finden

1. **Gehen Sie zu:** https://developer.apple.com/account
2. **Oben rechts:** Team ID sehen (z.B. `ABC123XYZ`)
3. **Kopieren**

---

## 📋 Schritt 5: Base64 Encoding

**Sie brauchen:**

1. **Certificate (.p12 Datei)**
2. **Provisioning Profile (.mobileprovision Datei)**

**Encoding:**

### Auf Windows (PowerShell):

```powershell
# Certificate
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.p12")) | Out-File certificate_base64.txt

# Provisioning Profile
[Convert]::ToBase64String([IO.File]::ReadAllBytes("profile.mobileprovision")) | Out-File profile_base64.txt
```

**Dann:**
- Dateien öffnen
- Inhalt kopieren (ohne Leerzeilen)

### Auf Mac/Linux:

```bash
base64 -i certificate.p12 -o certificate_base64.txt
base64 -i profile.mobileprovision -o profile_base64.txt
```

---

## 📋 Schritt 6: GitHub Secrets konfigurieren

1. **Gehen Sie zu:** `https://github.com/moonsightmedia/KWS-BETA-APP/settings/secrets/actions`
2. **"New repository secret" für jedes Secret:**

### Benötigte Secrets:

| Secret Name | Wert | Wo finden? |
|-------------|------|------------|
| `APPLE_ID` | Ihre Apple ID Email | Ihre Developer Account Email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-spezifisches Passwort | Schritt 3 |
| `APPLE_TEAM_ID` | Ihre Team ID | Schritt 4 (z.B. `ABC123XYZ`) |
| `APPLE_CERTIFICATE_BASE64` | Base64-encoded .p12 | Schritt 5 |
| `APPLE_CERTIFICATE_PASSWORD` | .p12 Passwort | Das Passwort beim Export |
| `APPLE_PROVISIONING_PROFILE_BASE64` | Base64-encoded .mobileprovision | Schritt 5 |
| `KEYCHAIN_PASSWORD` | Beliebiges Passwort | z.B. `github-actions-keychain-2024` |

**Wichtig:**
- Keine Leerzeichen in den Base64-Strings
- Alle Secrets müssen korrekt sein, sonst schlägt Upload fehl

---

## 📋 Schritt 7: Workflow testen

1. **Gehen Sie zu:** `https://github.com/moonsightmedia/KWS-BETA-APP/actions`
2. **"Build and Upload to TestFlight" auswählen**
3. **"Run workflow" klicken**
4. **Branch wählen:** `main`
5. **"Run workflow" klicken**
6. **Warten Sie 10-15 Minuten**

**Erfolg:**
- ✅ Build erfolgreich
- ✅ Upload zu TestFlight erfolgreich
- ✅ In App Store Connect sichtbar

**Fehler:**
- Prüfen Sie die Logs
- Häufige Probleme siehe unten

---

## 🔧 Troubleshooting

### "Invalid credentials"

**Problem:** Apple ID oder App-spezifisches Passwort falsch

**Lösung:**
- ✅ Prüfen Sie `APPLE_ID` (muss die Developer Account Email sein)
- ✅ App-spezifisches Passwort neu erstellen
- ✅ Keine Leerzeichen im Secret

---

### "Certificate not found" oder "Code signing failed"

**Problem:** Certificate oder Provisioning Profile falsch

**Lösung:**
- ✅ Certificate muss "Apple Distribution" sein (nicht Development)
- ✅ Provisioning Profile muss "App Store" sein
- ✅ Bundle ID muss übereinstimmen: `com.kletterwelt.beta`
- ✅ Certificate und Profile müssen zusammenpassen
- ✅ Base64 Encoding prüfen (keine Leerzeichen)

---

### "Team ID not found"

**Problem:** Team ID falsch

**Lösung:**
- ✅ Team ID aus Developer Portal kopieren
- ✅ Format: `ABC123XYZ` (keine Bindestriche)
- ✅ Muss mit Ihrem Developer Account übereinstimmen

---

### "Provisioning profile expired"

**Problem:** Provisioning Profile abgelaufen

**Lösung:**
- ✅ Neues Provisioning Profile erstellen
- ✅ Base64 neu encodieren
- ✅ GitHub Secret aktualisieren

---

## 📱 Nach erfolgreichem Upload

### In App Store Connect:

1. **Gehen Sie zu:** https://appstoreconnect.apple.com
2. **My Apps → KWS Beta App**
3. **TestFlight Tab**
4. **Builds** → Sie sehen Ihren neuen Build
5. **Beta-Tester hinzufügen:**
   - "Internal Testing" (bis zu 100 Tester)
   - "External Testing" (bis zu 10.000 Tester)
   - Tester per Email einladen
   - Tester installieren über TestFlight App

---

## 🎯 Workflow im Detail

### Was passiert automatisch:

1. ✅ Code auschecken
2. ✅ Dependencies installieren
3. ✅ Web-App bauen
4. ✅ CocoaPods installieren
5. ✅ Certificate importieren
6. ✅ Provisioning Profile installieren
7. ✅ iOS-App archivieren
8. ✅ IPA exportieren
9. ✅ Zu TestFlight hochladen
10. ✅ Backup-Artefakte speichern

**Dauer:** 10-15 Minuten

---

## 💡 Tipps

### Tipp 1: Certificate & Profile aufbewahren

- ✅ Speichern Sie Certificate (.p12) und Provisioning Profile sicher
- ✅ Passwörter notieren
- ✅ Erneuern Sie vor Ablauf (Certificate: 1 Jahr, Profile: 1 Jahr)

### Tipp 2: Testen Sie zuerst

- ✅ Ersten Build testen
- ✅ Prüfen Sie Logs bei Fehlern
- ✅ Dann regelmäßig verwenden

### Tipp 3: Automatische Updates

- ✅ Bei jedem Push auf `main` → Automatisch zu TestFlight?
- ✅ Workflow kann angepasst werden für automatische Builds

---

## 📚 Nächste Schritte

1. ✅ Certificates & Profiles erstellen
2. ✅ GitHub Secrets konfigurieren
3. ✅ Workflow testen
4. ✅ Beta-Tester hinzufügen
5. ✅ App testen über TestFlight

**Fragen?** Ich kann Ihnen beim Setup helfen! 😊

