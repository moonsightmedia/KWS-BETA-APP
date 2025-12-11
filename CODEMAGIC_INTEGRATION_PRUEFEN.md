# Codemagic Integration prüfen - Schritt für Schritt

## ✅ Alles ist vorhanden, aber es funktioniert nicht?

Dann müssen wir die Integration genauer prüfen.

---

## 📋 Schritt 1: Integration-Name prüfen

**Wichtig:** Der Name in der YAML muss **genau** mit dem in Codemagic übereinstimmen!

### In YAML:
```yaml
integrations:
  app_store_connect: codemagic
```

### In Codemagic prüfen:
1. **Teams → Personal Account → Integrations**
2. **Developer Portal** → Welcher Name steht dort?
3. **Muss übereinstimmen!**

**Falls nicht:**
- ✅ Integration-Name ändern zu `codemagic`
- ✅ Oder YAML anpassen zum tatsächlichen Namen

---

## 📋 Schritt 2: Integration-Details prüfen

### In Codemagic:
1. **Teams → Personal Account → Integrations**
2. **Developer Portal** → Klicken Sie darauf
3. **Prüfen Sie:**
   - ✅ Issuer ID ist eingetragen?
   - ✅ Key ID ist eingetragen?
   - ✅ API Key (.p8) ist hochgeladen?
   - ✅ Alles korrekt?

---

## 📋 Schritt 3: Bundle ID prüfen

### In YAML:
```yaml
APP_ID: "com.kletterwelt.beta"
```

### In App Store Connect prüfen:
1. **My Apps → KWS Beta App**
2. **Bundle ID sollte sein:** `com.kletterwelt.beta`
3. **Muss übereinstimmen!**

---

## 📋 Schritt 4: App ID im Developer Portal prüfen

1. **Gehen Sie zu:** https://developer.apple.com/account/resources/identifiers/list
2. **Suchen Sie nach:** `com.kletterwelt.beta`
3. **Prüfen Sie:**
   - ✅ Existiert?
   - ✅ Capabilities sind aktiviert (falls nötig)?

---

## 🔧 Lösung: Integration explizit verwenden

Falls die automatische Integration nicht funktioniert, können wir sie expliziter verwenden:

### Option 1: Integration-Name anpassen

**Falls der Name nicht `codemagic` ist:**

1. **Integration-Name in Codemagic finden**
2. **YAML anpassen:**

```yaml
integrations:
  app_store_connect: IHR_TATSÄCHLICHER_NAME
```

---

### Option 2: Environment Variables verwenden

Falls die Integration nicht funktioniert, können wir Environment Variables verwenden:

1. **In Codemagic:** App → Environment variables
2. **Drei Variablen erstellen:**
   - `APP_STORE_CONNECT_PRIVATE_KEY` (Inhalt der .p8 Datei)
   - `APP_STORE_CONNECT_KEY_IDENTIFIER` (Key ID)
   - `APP_STORE_CONNECT_ISSUER_ID` (Issuer ID)
3. **Gruppe erstellen:** `app_store_credentials`
4. **YAML anpassen:**

```yaml
environment:
  groups:
    - app_store_credentials

publishing:
  app_store_connect:
    api_key: $APP_STORE_CONNECT_PRIVATE_KEY
    key_id: $APP_STORE_CONNECT_KEY_IDENTIFIER
    issuer_id: $APP_STORE_CONNECT_ISSUER_ID
```

---

## 🎯 Empfohlene Vorgehensweise

### Schritt 1: Integration-Name prüfen

1. ✅ **Teams → Personal Account → Integrations**
2. ✅ **Developer Portal** → Welcher Name?
3. ✅ **YAML anpassen** (falls nötig)

### Schritt 2: Build erneut starten

1. ✅ **YAML pushen** (mit korrektem Namen)
2. ✅ **Build starten**
3. ✅ **Sollte jetzt funktionieren**

### Schritt 3: Falls immer noch nicht funktioniert

1. ✅ **Environment Variables verwenden** (Option 2)
2. ✅ **Manuelles Signing** (falls nötig)

---

## 💡 Tipp

**Häufigstes Problem:**
- Integration-Name stimmt nicht überein!
- Prüfen Sie genau, welcher Name in Codemagic steht
- YAML muss exakt übereinstimmen

---

**Fragen?** Prüfen Sie zuerst den Integration-Namen! 😊

