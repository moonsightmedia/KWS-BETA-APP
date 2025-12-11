# Codemagic Alternative Lösung - Wenn use-profiles nicht funktioniert

## ❌ Problem: use-profiles findet kein Provisioning Profile

Obwohl alles vorhanden ist, funktioniert `use-profiles` nicht.

---

## 🔧 Alternative Lösung: Manuelles Signing

Falls automatisches Signing nicht funktioniert, können wir manuelles Signing verwenden.

---

## 📋 Schritt 1: Certificate & Profile manuell erstellen

### Certificate erstellen:

1. **Gehen Sie zu:** https://developer.apple.com/account/resources/certificates/list
2. **"+"** klicken → **"Apple Distribution"** wählen
3. **Certificate Request erstellen** (CSR)
4. **CSR hochladen**
5. **Certificate herunterladen** (.cer)
6. **Zu .p12 konvertieren** (auf Mac):
   - Certificate doppelklicken → Wird zu Keychain hinzugefügt
   - Keychain Access → Certificate exportieren → .p12
   - Passwort setzen

### Provisioning Profile erstellen:

1. **Gehen Sie zu:** https://developer.apple.com/account/resources/profiles/list
2. **"+"** klicken → **"App Store"** wählen
3. **App ID auswählen:** `com.kletterwelt.beta`
4. **Certificate auswählen** (das Distribution Certificate)
5. **Profil herunterladen** (.mobileprovision)

---

## 📋 Schritt 2: Environment Variables in Codemagic hinzufügen

1. **In Codemagic:** App → **Environment variables**
2. **Drei Variablen erstellen:**

**Variable 1:**
- **Name:** `APP_STORE_CONNECT_PRIVATE_KEY`
- **Wert:** Inhalt der .p8 Datei (von App Store Connect API Key)
- **Gruppe:** `app_store_credentials`
- **Secret:** ✅ Aktiviert

**Variable 2:**
- **Name:** `APP_STORE_CONNECT_KEY_IDENTIFIER`
- **Wert:** Key ID (von App Store Connect API Key)
- **Gruppe:** `app_store_credentials`
- **Secret:** ✅ Aktiviert

**Variable 3:**
- **Name:** `APP_STORE_CONNECT_ISSUER_ID`
- **Wert:** Issuer ID (von App Store Connect API Key)
- **Gruppe:** `app_store_credentials`
- **Secret:** ✅ Aktiviert

**Variable 4 (Optional - für manuelles Signing):**
- **Name:** `CERTIFICATE_BASE64`
- **Wert:** Base64-encoded .p12 Datei
- **Gruppe:** `app_store_credentials`
- **Secret:** ✅ Aktiviert

**Variable 5 (Optional - für manuelles Signing):**
- **Name:** `CERTIFICATE_PASSWORD`
- **Wert:** .p12 Passwort
- **Gruppe:** `app_store_credentials`
- **Secret:** ✅ Aktiviert

**Variable 6 (Optional - für manuelles Signing):**
- **Name:** `PROVISIONING_PROFILE_BASE64`
- **Wert:** Base64-encoded .mobileprovision Datei
- **Gruppe:** `app_store_credentials`
- **Secret:** ✅ Aktiviert

---

## 📋 Schritt 3: YAML anpassen

**Für automatisches Signing (mit API Key):**

```yaml
environment:
  groups:
    - app_store_credentials

publishing:
  app_store_connect:
    api_key: $APP_STORE_CONNECT_PRIVATE_KEY
    key_id: $APP_STORE_CONNECT_KEY_IDENTIFIER
    issuer_id: $APP_STORE_CONNECT_ISSUER_ID
    submit_to_testflight: true
    beta_groups:
      - Internal Testing
```

**Für manuelles Signing:**

```yaml
environment:
  groups:
    - app_store_credentials

scripts:
  - name: Set up code signing manually
    script: |
      # Certificate importieren
      echo "$CERTIFICATE_BASE64" | base64 --decode > certificate.p12
      security import certificate.p12 -k ~/Library/Keychains/login.keychain-db -P "$CERTIFICATE_PASSWORD" -A
      
      # Provisioning Profile installieren
      echo "$PROVISIONING_PROFILE_BASE64" | base64 --decode > profile.mobileprovision
      mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
      cp profile.mobileprovision ~/Library/MobileDevice/Provisioning\ Profiles/
```

---

## 🎯 Empfohlene Lösung

**Da die Integration vorhanden ist, versuchen wir zuerst:**

1. ✅ **YAML mit exportOptions.plist** (bereits gemacht)
2. ✅ **Build erneut starten**
3. ✅ **Falls nicht funktioniert:** Environment Variables verwenden

---

## 💡 Tipp

**Häufigstes Problem:**
- `use-profiles` funktioniert nicht richtig
- Lösung: Environment Variables mit API Key verwenden
- Oder: Manuelles Signing

---

**Fragen?** Versuchen Sie zuerst die aktualisierte YAML! 😊

