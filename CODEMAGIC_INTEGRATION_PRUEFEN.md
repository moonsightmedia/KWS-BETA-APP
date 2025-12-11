# Codemagic Integration prüfen - Provisioning Profile Problem

## 🔍 Das Problem

Der Fehler `"App" requires a provisioning profile` bedeutet, dass Codemagic keine Provisioning Profiles findet oder erstellen kann.

**Ursache:** Die App Store Connect Integration ist nicht richtig konfiguriert oder Codemagic kann keine Profiles erstellen.

---

## ✅ Schritt 1: Integration prüfen

### In Codemagic:

1. **Teams** → **Personal Account** (oder Ihr Team)
2. **Integrations** Tab
3. **Developer Portal** → Sollte eine Integration namens `codemagic` zeigen

### Was prüfen:

- ✅ **Integration existiert?** (Name: `codemagic`)
- ✅ **Status:** "Connected" oder "Active"?
- ✅ **API Key hochgeladen?** (sollte ein grüner Haken sein)

**Falls nicht:** Integration neu erstellen (siehe unten)

---

## ✅ Schritt 2: Integration neu erstellen (falls nötig)

### 2.1 App Store Connect API Key erstellen

1. **App Store Connect** → **Users and Access** → **Integrations** → **App Store Connect API**
2. **"+"** klicken → Neuen Key erstellen
3. **Name:** `Codemagic API Key`
4. **Access:** `App Manager`
5. **Erstellen** → **.p8 Datei herunterladen** (nur einmal möglich!)
6. **Issuer ID** notieren (oben über der Tabelle)
7. **Key ID** notieren (in der Tabelle)

### 2.2 In Codemagic hochladen

1. **Teams** → **Personal Account** → **Integrations**
2. **Developer Portal** → **"Connect"** oder **"Add"**
3. **Name:** `codemagic` (wichtig! Muss genau so heißen)
4. **Issuer ID:** Einfügen
5. **Key ID:** Einfügen
6. **API Key (.p8):** Hochladen
7. **Save**

---

## ✅ Schritt 3: Bundle ID prüfen

### In Apple Developer Portal:

1. **developer.apple.com** → **Certificates, Identifiers & Profiles**
2. **Identifiers** → **App IDs**
3. **Suchen:** `com.kletterwelt.beta`
4. **Sollte existieren!**

**Falls nicht:**
- **"+"** klicken
- **App ID** erstellen
- **Bundle ID:** `com.kletterwelt.beta`
- **Capabilities:** Nach Bedarf aktivieren
- **Continue** → **Register**

---

## ✅ Schritt 4: App in App Store Connect prüfen

1. **App Store Connect** → **My Apps**
2. **"KWS Beta App"** sollte existieren
3. **Bundle ID:** `com.kletterwelt.beta` sollte zugewiesen sein

**Falls nicht:**
- App erstellen (wie vorher erklärt)
- Bundle ID zuweisen

---

## ✅ Schritt 5: Codemagic Workflow prüfen

### In Codemagic:

1. **Applications** → **KWS-BETA-APP**
2. **Workflows** → **iOS Workflow** → **Edit**

### Prüfen:

- ✅ **Integrations:** `app_store_connect: codemagic` sollte in YAML stehen
- ✅ **Publishing:** `auth: integration` sollte stehen

**Falls nicht:** YAML wurde bereits angepasst, sollte stimmen.

---

## 🔧 Alternative Lösung: Manuelles Signing

**Falls automatisches Signing nicht funktioniert:**

### Option A: Codemagic UI verwenden

1. **Workflow** → **Edit**
2. **Tab "Code signing"** oder **"Distribution"**
3. **"Automated code signing"** aktivieren
4. **Apple Developer Credentials:** Integration auswählen
5. **Bundle ID:** `com.kletterwelt.beta`
6. **Save**

### Option B: YAML anpassen

Falls die UI-Option nicht verfügbar ist, können wir die YAML anpassen, um manuelles Signing zu verwenden (komplizierter).

---

## 🎯 Was Sie JETZT tun sollten

1. ✅ **Integration prüfen** (Schritt 1)
2. ✅ **Falls nicht vorhanden:** Integration erstellen (Schritt 2)
3. ✅ **Bundle ID prüfen** (Schritt 3)
4. ✅ **App in App Store Connect prüfen** (Schritt 4)
5. ✅ **Build erneut starten**

---

## 💡 Häufige Probleme

### Problem 1: Integration Name stimmt nicht

**Fehler:** Integration heißt nicht `codemagic`

**Lösung:** 
- Integration umbenennen zu `codemagic`
- Oder YAML anpassen: `app_store_connect: <Ihr-Name>`

### Problem 2: API Key fehlt

**Fehler:** Integration existiert, aber API Key fehlt

**Lösung:**
- Neuen API Key erstellen (alter kann nicht erneut heruntergeladen werden)
- In Integration hochladen

### Problem 3: Bundle ID existiert nicht

**Fehler:** Bundle ID `com.kletterwelt.beta` existiert nicht

**Lösung:**
- Bundle ID in Apple Developer Portal erstellen
- App in App Store Connect erstellen

---

## 📚 Nächste Schritte

1. ✅ **Prüfen Sie alle Schritte oben**
2. ✅ **Falls alles korrekt:** Build erneut starten
3. ✅ **Falls Fehler bleibt:** Screenshot der Integration senden

---

**Haben Sie die Integration geprüft? Was sehen Sie dort?** 😊
