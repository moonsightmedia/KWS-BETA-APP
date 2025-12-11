# Bundle ID Fehler "Invalid identifier" beheben

## ❌ Problem: "Invalid identifier"

Die Bundle ID `com.kletterwelt.beta` wird als ungültig angezeigt.

---

## 🔍 Mögliche Ursachen

### 1. Bundle ID existiert bereits

**Problem:** Die Bundle ID wurde bereits registriert (von Ihnen oder jemand anderem)

**Lösung:**
- Prüfen Sie, ob die Bundle ID bereits existiert
- Gehen Sie zu: "All Identifiers" → Suchen Sie nach `com.kletterwelt.beta`
- Falls vorhanden: Verwenden Sie diese oder erstellen Sie eine neue

---

### 2. Format-Fehler

**Problem:** Bundle ID enthält ungültige Zeichen

**Regeln:**
- ✅ Erlaubt: Buchstaben (a-z, A-Z), Zahlen (0-9), Punkte (.), Bindestriche (-)
- ❌ Nicht erlaubt: Leerzeichen, Sonderzeichen (@, &, *, etc.)

**Ihre Bundle ID:** `com.kletterwelt.beta` ✅ Sieht korrekt aus!

---

### 3. Zu kurz oder zu lang

**Regeln:**
- Mindestens 3 Zeichen
- Maximal 155 Zeichen

**Ihre Bundle ID:** `com.kletterwelt.beta` ✅ Länge ist OK!

---

### 4. Beginnt nicht mit Buchstabe

**Regel:** Muss mit Buchstabe beginnen

**Ihre Bundle ID:** `com.kletterwelt.beta` ✅ Beginnt mit 'c'!

---

## 🔧 Lösungen

### Lösung 1: Prüfen ob Bundle ID existiert

1. **Klicken Sie auf "< All Identifiers"** (oben links)
2. **Suchen Sie nach:** `com.kletterwelt.beta`
3. **Falls vorhanden:**
   - ✅ Verwenden Sie diese Bundle ID
   - Oder: Erstellen Sie eine neue (siehe Lösung 2)

---

### Lösung 2: Neue Bundle ID erstellen

**Falls die Bundle ID bereits existiert oder nicht funktioniert:**

**Option A: Andere Variante verwenden**
```
com.kletterwelt.beta.app
com.kws.beta
com.kletterwelt.betaapp
```

**Option B: Mit Jahr/Version**
```
com.kletterwelt.beta.2024
com.kws.beta.v1
```

**Dann:**
- ✅ Neue Bundle ID in `capacitor.config.ts` ändern
- ✅ Codemagic/GitHub Actions wird automatisch die neue verwenden

---

### Lösung 3: Bundle ID Format prüfen

**Stellen Sie sicher:**
- ✅ Keine Leerzeichen
- ✅ Keine Sonderzeichen
- ✅ Beginnt mit Buchstabe
- ✅ Nur: Buchstaben, Zahlen, Punkte, Bindestriche

**Beispiel korrekt:**
```
com.kletterwelt.beta ✅
com.kws-beta ✅
com.kletterwelt.beta2024 ✅
```

**Beispiel falsch:**
```
com.kletterwelt beta ❌ (Leerzeichen)
com.kletterwelt@beta ❌ (Sonderzeichen)
123.kletterwelt.beta ❌ (beginnt mit Zahl)
```

---

## 🎯 Empfohlene Vorgehensweise

### Schritt 1: Prüfen ob existiert

1. **"< All Identifiers"** klicken
2. **Nach `com.kletterwelt.beta` suchen**
3. **Falls vorhanden:** ✅ Verwenden Sie diese!

### Schritt 2: Falls nicht vorhanden - Neue erstellen

**Versuchen Sie eine dieser Varianten:**

```
com.kletterwelt.beta.app
com.kws.beta
com.kletterwelt.betaapp
com.kletterwelt.beta.ios
```

**Dann:**
- Bundle ID eingeben
- Prüfen ob Fehler verschwindet
- "Continue" klicken

### Schritt 3: Falls immer noch Fehler

**Prüfen Sie:**
- ✅ Keine Leerzeichen vor/nach der Bundle ID
- ✅ Keine unsichtbaren Zeichen
- ✅ Format korrekt

**Tipp:** Bundle ID kopieren und in Notepad einfügen, dann neu kopieren

---

## 💡 Alternative: Wildcard verwenden

**Falls nichts funktioniert:**

1. **"Wildcard"** Radio-Button wählen
2. **Bundle ID:** `com.kletterwelt.*`
3. **Vorteil:** Funktioniert für mehrere Apps
4. **Nachteil:** Weniger spezifisch

**Aber:** Für TestFlight/App Store brauchen Sie meist "Explicit"!

---

## 🔄 Falls Bundle ID geändert wird

**Wenn Sie eine neue Bundle ID verwenden:**

1. ✅ **In `capacitor.config.ts` ändern:**
   ```typescript
   appId: 'com.kletterwelt.beta.app' // Neue Bundle ID
   ```

2. ✅ **In iOS-Projekt aktualisieren:**
   - Xcode → Target → General → Bundle Identifier
   - Oder: Codemagic macht das automatisch

3. ✅ **Neu bauen:**
   - Codemagic verwendet automatisch die neue Bundle ID

---

## 📚 Nächste Schritte

1. ⏭️ **Prüfen:** Existiert die Bundle ID bereits?
2. ⏭️ **Falls ja:** Verwenden Sie diese
3. ⏭️ **Falls nein:** Neue Variante versuchen
4. ⏭️ **Falls Fehler bleibt:** Wildcard verwenden oder Support kontaktieren

---

**Haben Sie die Bundle ID bereits in "All Identifiers" gefunden?** 😊

