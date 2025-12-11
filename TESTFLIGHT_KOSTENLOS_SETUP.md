# TestFlight Upload ohne Mac - Kostenlose Lösung

## 🎯 Die kostenlose Lösung

**GitHub Actions** kann automatisch zu TestFlight hochladen - **komplett kostenlos** für öffentliche Repositories!

**Was Sie brauchen:**
- ✅ GitHub Repository (kostenlos)
- ✅ Apple Developer Account ($99/Jahr) - **Das ist leider Pflicht für TestFlight**
- ✅ GitHub Secrets konfigurieren (5 Minuten)

**Was Sie NICHT brauchen:**
- ❌ MacBook
- ❌ Xcode lokal
- ❌ Manuelle Uploads

---

## ⚠️ Wichtiger Hinweis

**Apple Developer Account ist Pflicht:**
- TestFlight erfordert einen **bezahlten** Apple Developer Account ($99/Jahr)
- Ohne diesen Account können Sie **keine** Apps zu TestFlight hochladen
- Das ist eine Apple-Anforderung, keine GitHub-Anforderung

**Aber:** GitHub Actions selbst ist kostenlos! ✅

---

## 📋 Schritt-für-Schritt Setup

### Schritt 1: Apple Developer Account einrichten

1. **Account erstellen:**
   - Gehen Sie zu: https://developer.apple.com/programs/
   - Registrieren Sie sich ($99/Jahr)
   - Warten Sie auf Bestätigung (1-2 Tage)

2. **App ID erstellen:**
   - App Store Connect → My Apps → "+" → Neue App
   - Bundle ID: `com.kletterwelt.beta`
   - App-Name: "KWS Beta App"

3. **Certificates erstellen:**
   - Developer Portal → Certificates → "+"
   - "Apple Distribution" wählen
   - Certificate herunterladen (`.cer` Datei)
   - Zu `.p12` konvertieren (siehe unten)

---

### Schritt 2: Certificate zu .p12 konvertieren

**Auf einem Mac** (einmalig, kann auch Freund machen):

```bash
# 1. Certificate doppelklicken → Wird zu Keychain hinzugefügt
# 2. Keychain Access öffnen
# 3. Certificate finden → Rechtsklick → Export
# 4. Als .p12 exportieren
# 5. Passwort setzen (merken!)
```

**Oder über Terminal:**

```bash
# Certificate zu .p12 konvertieren
openssl pkcs12 -export \
  -out certificate.p12 \
  -inkey privateKey.key \
  -in certificate.cer \
  -certfile AppleWWDRCA.cer
```

---

### Schritt 3: Provisioning Profile erstellen

1. **App Store Connect:**
   - App Store Connect → My Apps → Ihre App
   - App Store → "+ Version"
   - Bundle ID bestätigen

2. **Developer Portal:**
   - Certificates, Identifiers & Profiles → Profiles → "+"
   - "App Store" wählen
   - App ID auswählen: `com.kletterwelt.beta`
   - Certificate auswählen
   - Profil herunterladen (`.mobileprovision`)

---

### Schritt 4: App-spezifisches Passwort erstellen

1. **Apple ID Account:**
   - https://appleid.apple.com
   - Anmelden
   - "Sign-In and Security" → "App-Specific Passwords"
   - "+" → Name: "GitHub Actions"
   - Passwort kopieren (nur einmal sichtbar!)

---

### Schritt 5: GitHub Secrets konfigurieren

1. **Gehen Sie zu GitHub:**
   - Repository → Settings → Secrets and variables → Actions
   - "New repository secret" für jedes Secret:

**Benötigte Secrets:**

| Secret Name | Wert | Beschreibung |
|-------------|------|-------------|
| `APPLE_ID` | Ihre Apple ID Email | z.B. `name@example.com` |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-spezifisches Passwort | Von Schritt 4 |
| `APPLE_TEAM_ID` | Ihre Team ID | Aus Developer Portal (z.B. `ABC123XYZ`) |
| `APPLE_CERTIFICATE_BASE64` | Base64-encoded .p12 | Siehe unten |
| `APPLE_CERTIFICATE_PASSWORD` | .p12 Passwort | Das Passwort von Schritt 2 |
| `APPLE_PROVISIONING_PROFILE_BASE64` | Base64-encoded .mobileprovision | Siehe unten |
| `KEYCHAIN_PASSWORD` | Beliebiges Passwort | z.B. `github-actions-keychain` |

**Base64 Encoding:**

```bash
# Auf Mac/Linux:
base64 -i certificate.p12 -o certificate_base64.txt
base64 -i profile.mobileprovision -o profile_base64.txt

# Auf Windows (PowerShell):
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.p12")) | Out-File certificate_base64.txt
[Convert]::ToBase64String([IO.File]::ReadAllBytes("profile.mobileprovision")) | Out-File profile_base64.txt
```

**Dann:**
- Inhalt der `.txt` Dateien kopieren
- Als GitHub Secrets hinzufügen

---

### Schritt 6: Workflow aktivieren

Der Workflow `.github/workflows/ios-testflight.yml` ist bereits erstellt!

**Aktivierung:**
1. Code pushen (Workflow wird automatisch erkannt)
2. Gehen Sie zu: Actions → "Build and Upload to TestFlight"
3. "Run workflow" → Branch wählen → "Run workflow"
4. Warten Sie 10-15 Minuten
5. ✅ App wird automatisch zu TestFlight hochgeladen!

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

## 📱 Nach dem Upload

### In App Store Connect:

1. **Gehen Sie zu:** https://appstoreconnect.apple.com
2. **My Apps** → Ihre App
3. **TestFlight Tab**
4. **Builds** → Sie sehen Ihren neuen Build
5. **Beta-Tester hinzufügen:**
   - "Internal Testing" oder "External Testing"
   - Tester per Email einladen
   - Tester installieren über TestFlight App

---

## 💰 Kostenübersicht

| Service | Kosten | Notiz |
|---------|--------|-------|
| **GitHub Actions** | ✅ **Kostenlos** | Für öffentliche Repos |
| **Apple Developer Account** | 💰 **$99/Jahr** | Pflicht für TestFlight |
| **MacBook** | ❌ **Nicht nötig** | Alles automatisch! |

**Gesamt:** $99/Jahr (nur Apple Developer Account)

---

## 🔧 Troubleshooting

### Upload schlägt fehl?

**Problem:** "Invalid credentials"
- ✅ Prüfen Sie `APPLE_ID` und `APPLE_APP_SPECIFIC_PASSWORD`
- ✅ App-spezifisches Passwort neu erstellen

**Problem:** "Certificate not found"
- ✅ Prüfen Sie `APPLE_CERTIFICATE_BASE64`
- ✅ Base64 Encoding korrekt?
- ✅ Certificate nicht abgelaufen?

**Problem:** "Provisioning profile not found"
- ✅ Prüfen Sie `APPLE_PROVISIONING_PROFILE_BASE64`
- ✅ Bundle ID stimmt überein?
- ✅ Profile nicht abgelaufen?

### Build schlägt fehl?

**Problem:** "Code signing failed"
- ✅ Certificate und Provisioning Profile müssen zusammenpassen
- ✅ Team ID korrekt?
- ✅ Certificate nicht abgelaufen?

---

## 📚 Alternative: Einfacherer Workflow (ohne Signing)

Falls Signing zu kompliziert ist, können Sie auch:

1. **Build erstellen** (wie bisher)
2. **IPA manuell hochladen** (einmalig Mac-Zugang)
3. **Dann:** Nur neue Builds hochladen (automatisch)

**Aber:** Für vollautomatisches Upload brauchen Sie die Signing-Secrets.

---

## 🎯 Zusammenfassung

**Kostenlose Lösung:**
- ✅ GitHub Actions (kostenlos)
- ✅ Automatisches Upload zu TestFlight
- ✅ Kein Mac nötig

**Pflicht:**
- ⚠️ Apple Developer Account ($99/Jahr)

**Setup:**
1. Apple Developer Account erstellen
2. Certificates & Profiles erstellen
3. GitHub Secrets konfigurieren
4. Workflow starten
5. ✅ Fertig!

---

## 💡 Tipp

**Erste Schritte:**
1. Apple Developer Account erstellen ($99/Jahr)
2. Einmalig: Certificate & Profile erstellen (kann auch Freund mit Mac machen)
3. GitHub Secrets konfigurieren
4. Workflow testen
5. ✅ Dann: Vollautomatisch!

**Fragen?** Ich kann Ihnen beim Setup helfen! 😊

