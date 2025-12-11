# Automatisches Code Signing in Codemagic aktivieren

## 📍 Wo finden Sie Code Signing?

**NICHT hier** (Teams → Personal Account) - das sind Account-Einstellungen!

**Sondern hier:**

---

## 📋 Schritt-für-Schritt

### Schritt 1: Zur App gehen

1. **Klicken Sie auf "Applications"** (links im Menü)
2. **Wählen Sie Ihre App:** "KWS-BETA-APP"

### Schritt 2: Zum Workflow gehen

1. **In der App:** Sie sehen Tabs oben:
   - Overview
   - Builds
   - **Workflows** ← Hier!
   - Settings
   - etc.

2. **Klicken Sie auf "Workflows"**

### Schritt 3: Workflow bearbeiten

1. **Sie sehen:** "iOS Workflow" (oder Ihren Workflow-Namen)
2. **Klicken Sie darauf** oder auf **"Edit"**

### Schritt 4: Code Signing finden

**In den Workflow-Einstellungen finden Sie:**

**Option 1: Tab "Code signing"**
- Oben im Workflow-Editor
- Tab "Code signing" klicken
- "Automated code signing" aktivieren

**Option 2: Tab "Distribution"**
- Oben im Workflow-Editor
- Tab "Distribution" klicken
- "iOS code signing" → "Automated code signing" aktivieren

**Option 3: In den Scripts**
- Scrollen Sie zu den Scripts
- Suchen Sie nach "Code signing" oder "Signing"
- "Automated code signing" aktivieren

---

## 🎯 Was Sie aktivieren müssen

**"Automated code signing"** oder **"Automatic code signing"**

**Dann:**
- ✅ Apple Developer Credentials auswählen
- ✅ Integration: `codemagic` (oder Ihre Integration)
- ✅ Bundle ID: `com.kletterwelt.beta`
- ✅ Speichern

---

## 💡 Falls Sie es nicht finden

**Alternative: Über codemagic.yaml**

Falls die UI-Option nicht verfügbar ist, können wir die YAML anpassen:

```yaml
scripts:
  - name: Set up automatic code signing
    script: |
      xcode-project use-profiles
```

**Aber:** Das haben wir schon versucht und es funktioniert nicht.

---

## 🔧 Was Sie JETZT tun sollten

1. ✅ **"Applications"** klicken (links)
2. ✅ **"KWS-BETA-APP"** auswählen
3. ✅ **"Workflows"** Tab klicken
4. ✅ **Workflow bearbeiten**
5. ✅ **"Code signing"** oder **"Distribution"** Tab suchen
6. ✅ **"Automated code signing"** aktivieren

---

**Gehen Sie zu Applications → KWS-BETA-APP → Workflows → Workflow bearbeiten!** 😊

