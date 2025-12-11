# Codemagic Automatisches Code Signing aktivieren

## ✅ Lösung: Automatisches Code Signing in Codemagic UI

Das Problem ist, dass `use-profiles` nicht funktioniert. Die Lösung: Automatisches Code Signing direkt in Codemagic UI aktivieren!

---

## 📋 Option A: Automatisches Code Signing aktivieren (Empfohlen)

### Schritt 1: Zu Codemagic gehen

1. **In Codemagic:** App auswählen → **Workflow** auswählen
2. **Oben:** Tab **"Distribution"** oder **"Code signing"** klicken

### Schritt 2: iOS Code Signing aktivieren

1. **Suchen Sie nach:** "iOS code signing" oder "Code signing"
2. **"Automated code signing"** aktivieren
3. **Apple Developer Credentials hinzufügen:**
   - Integration auswählen: `codemagic` (oder Ihre Integration)
   - Oder: Apple Developer Account Daten eingeben

### Schritt 3: Build starten

1. **"Start new build"** klicken
2. **Codemagic generiert automatisch:**
   - ✅ Provisioning Profiles
   - ✅ export_options.plist
   - ✅ Signing-Konfiguration

**✅ Fertig!** Sollte jetzt funktionieren!

---

## 📋 Option B: exportOptions.plist anpassen

**Falls Option A nicht verfügbar ist:**

Ich habe die `exportOptions.plist` bereits angepasst mit:
- ✅ `method: app-store` (für TestFlight/App Store)
- ✅ `signingStyle: automatic` (automatisches Signing)

**Die Datei ist jetzt:**
- ✅ Im Repository: `ios/App/exportOptions.plist`
- ✅ YAML verwendet sie bereits

---

## 📋 Option C: YAML vereinfachen

**Falls die exportOptions.plist Probleme macht:**

Ich habe die YAML bereits angepasst, um die Datei zu verwenden. Falls das nicht funktioniert, können wir sie entfernen:

```yaml
- name: Build IPA
  script: |
    xcode-project build-ipa \
      --workspace "$XCODE_WORKSPACE" \
      --scheme "$XCODE_SCHEME"
```

**Dann verwendet Codemagic Default-Einstellungen.**

---

## 🎯 Empfohlene Vorgehensweise

### Schritt 1: Automatisches Signing in UI aktivieren

1. ✅ **Codemagic → Workflow → Distribution/Code signing**
2. ✅ **"Automated code signing"** aktivieren
3. ✅ **Apple Developer Credentials** hinzufügen
4. ✅ **Build starten**

### Schritt 2: Falls nicht verfügbar

1. ✅ **YAML wurde bereits angepasst**
2. ✅ **exportOptions.plist wurde angepasst**
3. ✅ **Build erneut starten**

---

## 💡 Warum sollte das funktionieren?

**Automatisches Signing in Codemagic UI:**
- ✅ Erstellt automatisch Provisioning Profiles
- ✅ Konfiguriert Signing richtig
- ✅ Funktioniert besser als `use-profiles`

**Das ist die empfohlene Methode!**

---

## 📚 Nächste Schritte

1. ✅ **Automatisches Signing in UI aktivieren** (Option A)
2. ✅ **Falls nicht verfügbar:** YAML wurde bereits angepasst
3. ✅ **Build starten**
4. ✅ **Sollte jetzt funktionieren!**

---

**Haben Sie "Automated code signing" in Codemagic UI gefunden?** 😊

