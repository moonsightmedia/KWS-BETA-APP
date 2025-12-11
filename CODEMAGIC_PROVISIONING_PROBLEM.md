# Codemagic Provisioning Profile Problem - Lösung

## ❌ Problem: "requires a provisioning profile"

Der Fehler zeigt, dass `use-profiles` kein Provisioning Profile findet.

---

## 🔍 Mögliche Ursachen

### 1. Integration nicht richtig eingerichtet

**Problem:** Die Developer Portal Integration ist nicht korrekt konfiguriert.

**Prüfen:**
1. ✅ Teams → Personal Account → Integrations
2. ✅ Developer Portal sollte verbunden sein
3. ✅ API Key sollte hochgeladen sein
4. ✅ Integration-Name sollte `codemagic` sein

---

### 2. Bundle ID existiert nicht in App Store Connect

**Problem:** Die Bundle ID `com.kletterwelt.beta` existiert nicht als App in App Store Connect.

**Prüfen:**
1. ✅ Gehen Sie zu: https://appstoreconnect.apple.com
2. ✅ My Apps → Prüfen Sie ob "KWS Beta App" existiert
3. ✅ Bundle ID sollte `com.kletterwelt.beta` sein

**Falls nicht:**
- ✅ App erstellen (wie vorher erklärt)
- ✅ Bundle ID: `com.kletterwelt.beta`

---

### 3. Integration-Name stimmt nicht überein

**Problem:** Der Name in der YAML stimmt nicht mit dem in der Integration überein.

**Prüfen:**
- ✅ YAML: `app_store_connect: codemagic`
- ✅ Integration-Name in Codemagic sollte auch `codemagic` sein

**Falls nicht:**
- ✅ Integration-Name ändern zu `codemagic`
- ✅ Oder YAML anpassen zum tatsächlichen Namen

---

## 🔧 Lösungen

### Lösung 1: Integration prüfen und korrigieren

1. **Teams → Personal Account → Integrations**
2. **Developer Portal** → Prüfen Sie:
   - ✅ Verbunden?
   - ✅ API Key hochgeladen?
   - ✅ Name ist `codemagic`?

3. **Falls nicht verbunden:**
   - ✅ "Connect" klicken
   - ✅ API Key Daten eingeben
   - ✅ Name: `codemagic`
   - ✅ Save

---

### Lösung 2: App in App Store Connect prüfen

1. **Gehen Sie zu:** https://appstoreconnect.apple.com
2. **My Apps** → Prüfen Sie:
   - ✅ Existiert "KWS Beta App"?
   - ✅ Bundle ID ist `com.kletterwelt.beta`?

3. **Falls nicht:**
   - ✅ App erstellen
   - ✅ Bundle ID: `com.kletterwelt.beta`
   - ✅ SKU: `kws-beta-app`

---

### Lösung 3: Bundle ID im Developer Portal prüfen

1. **Gehen Sie zu:** https://developer.apple.com/account/resources/identifiers/list
2. **Suchen Sie nach:** `com.kletterwelt.beta`
3. **Falls nicht vorhanden:**
   - ✅ App ID erstellen
   - ✅ Bundle ID: `com.kletterwelt.beta`

---

### Lösung 4: Manuelles Signing (falls automatisch nicht funktioniert)

Falls automatisches Signing nicht funktioniert:

1. **Certificate & Profile manuell erstellen** (im Developer Portal)
2. **Als Environment Variables hinzufügen** (in Codemagic)
3. **In YAML verwenden:**

```yaml
environment:
  groups:
    - app_store_credentials

scripts:
  - name: Set up code signing manually
    script: |
      # Certificate importieren
      security import certificate.p12 -k ~/Library/Keychains/login.keychain-db -P "$CERTIFICATE_PASSWORD"
      # Profile installieren
      mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
      cp profile.mobileprovision ~/Library/MobileDevice/Provisioning\ Profiles/
```

---

## 🎯 Empfohlene Vorgehensweise

### Schritt 1: Alles prüfen

1. ✅ **Integration:** Teams → Personal Account → Integrations → Developer Portal verbunden?
2. ✅ **App Store Connect:** App existiert mit Bundle ID `com.kletterwelt.beta`?
3. ✅ **Developer Portal:** App ID existiert mit Bundle ID `com.kletterwelt.beta`?
4. ✅ **Integration-Name:** Ist `codemagic` (oder passend zur YAML)?

### Schritt 2: Falls etwas fehlt

- ✅ Integration verbinden
- ✅ App erstellen
- ✅ App ID erstellen

### Schritt 3: Build erneut starten

- ✅ YAML wurde aktualisiert (mit Debug-Ausgabe)
- ✅ Build erneut starten
- ✅ Logs prüfen

---

## 💡 Debugging

**Ich habe Debug-Ausgabe hinzugefügt:**

```yaml
- name: Set up code signing settings on Xcode project
  script: |
    xcode-project use-profiles
    # Prüfen ob Profile gefunden wurden
    echo "Checking for provisioning profiles..."
    ls -la ~/Library/MobileDevice/Provisioning\ Profiles/ || echo "No profiles directory found"
```

**Das zeigt:**
- ✅ Ob Profile gefunden wurden
- ✅ Welche Profile vorhanden sind

---

## 📚 Nächste Schritte

1. ✅ **Alles prüfen** (Integration, App, App ID)
2. ✅ **Datei pushen** (mit Debug-Ausgabe)
3. ✅ **Build starten**
4. ✅ **Logs prüfen** (was zeigt die Debug-Ausgabe?)

---

**Fragen?** Prüfen Sie zuerst die Integration und App! 😊

