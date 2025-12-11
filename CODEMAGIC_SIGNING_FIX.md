# Codemagic Signing Fehler beheben

## ❌ Fehler: "requires a provisioning profile"

Der Fehler zeigt, dass Codemagic kein Provisioning Profile findet.

---

## 🔍 Mögliche Ursachen

### 1. Integration nicht richtig eingerichtet

**Problem:** Die App Store Connect Integration ist nicht korrekt konfiguriert.

**Lösung:**
1. ✅ Prüfen Sie: Teams → Personal Account → Integrations
2. ✅ Developer Portal Integration sollte verbunden sein
3. ✅ API Key sollte hochgeladen sein

---

### 2. Bundle ID stimmt nicht überein

**Problem:** Die Bundle ID in der YAML stimmt nicht mit der in App Store Connect überein.

**Lösung:**
- ✅ Prüfen Sie: `APP_ID: "com.kletterwelt.beta"` in YAML
- ✅ Prüfen Sie: Bundle ID in App Store Connect ist `com.kletterwelt.beta`
- ✅ Müssen übereinstimmen!

---

### 3. Kein Provisioning Profile vorhanden

**Problem:** Es existiert noch kein Provisioning Profile für diese Bundle ID.

**Lösung:**
- ✅ Codemagic erstellt automatisch Profiles
- ✅ Aber: App muss in App Store Connect existieren
- ✅ Bundle ID muss registriert sein

---

## 🔧 Lösungen

### Lösung 1: Integration prüfen

1. **Teams → Personal Account → Integrations**
2. **Developer Portal** sollte verbunden sein
3. **API Key** sollte hochgeladen sein
4. **Integration-Name** sollte `codemagic` sein (oder passend zur YAML)

---

### Lösung 2: Bundle ID prüfen

**In YAML:**
```yaml
APP_ID: "com.kletterwelt.beta"
```

**In App Store Connect:**
- App sollte existieren mit Bundle ID: `com.kletterwelt.beta`

**Müssen übereinstimmen!**

---

### Lösung 3: App in App Store Connect prüfen

1. **Gehen Sie zu:** https://appstoreconnect.apple.com
2. **My Apps → KWS Beta App**
3. **Prüfen Sie:** Bundle ID ist `com.kletterwelt.beta`
4. **Falls nicht:** App bearbeiten oder neue App erstellen

---

### Lösung 4: Manuelles Signing (falls automatisch nicht funktioniert)

Falls automatisches Signing nicht funktioniert, können Sie manuell:

1. **Certificate & Profile erstellen** (im Developer Portal)
2. **Als Environment Variables hinzufügen** (in Codemagic)
3. **In YAML verwenden:**

```yaml
environment:
  groups:
    - app_store_credentials

scripts:
  - name: Set up code signing
    script: |
      # Manuelles Signing
      security import certificate.p12 -k ~/Library/Keychains/login.keychain-db
      # Profile installieren
      mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
      cp profile.mobileprovision ~/Library/MobileDevice/Provisioning\ Profiles/
```

---

## 🎯 Empfohlene Vorgehensweise

### Schritt 1: Integration prüfen

1. ✅ Teams → Personal Account → Integrations
2. ✅ Developer Portal verbunden?
3. ✅ API Key hochgeladen?

### Schritt 2: Bundle ID prüfen

1. ✅ YAML: `APP_ID: "com.kletterwelt.beta"`
2. ✅ App Store Connect: Bundle ID ist `com.kletterwelt.beta`
3. ✅ Müssen übereinstimmen!

### Schritt 3: Build erneut starten

1. ✅ YAML wurde aktualisiert
2. ✅ Build erneut starten
3. ✅ Sollte jetzt funktionieren

---

## 💡 Tipp

**Falls es immer noch nicht funktioniert:**

1. ✅ Prüfen Sie die Build-Logs genau
2. ✅ Welche Bundle ID wird verwendet?
3. ✅ Welches Provisioning Profile wird gesucht?
4. ✅ Existiert das Profile im Developer Portal?

**Oder:**

- ✅ Erstellen Sie manuell ein Provisioning Profile
- ✅ Als Environment Variable hinzufügen
- ✅ Manuelles Signing verwenden

---

**Fragen?** Prüfen Sie zuerst die Integration und Bundle ID! 😊

