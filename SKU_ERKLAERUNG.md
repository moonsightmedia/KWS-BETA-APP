# Was ist eine SKU?

## 🎯 Kurze Antwort

**SKU** = **Stock Keeping Unit** (Lagerbestandseinheit)

**Einfach gesagt:** Eine **eindeutige Identifikationsnummer** für Ihre App im App Store Connect System.

---

## 📋 Was ist eine SKU?

### Definition:

Eine **SKU** ist eine **interne Referenznummer** für Ihre App in App Store Connect.

**Eigenschaften:**
- ✅ Muss **eindeutig** sein (innerhalb Ihres Accounts)
- ✅ Kann **nicht geändert** werden (nach Erstellung)
- ✅ Wird **nicht öffentlich** angezeigt (nur für Sie sichtbar)
- ✅ Wird für **interne Verwaltung** verwendet

---

## 💡 Praktische Beispiele

### Beispiel 1: Einfache SKU

```
kws-beta-app
```

### Beispiel 2: Mit Jahr

```
kws-beta-2024
```

### Beispiel 3: Mit Version

```
kws-beta-v1
```

### Beispiel 4: Mit Datum

```
kws-beta-20241211
```

---

## 🎯 Was Sie verwenden sollten

### Empfehlung für Ihre App:

**Einfach und eindeutig:**
```
kws-beta-app
```

**Oder mit Jahr:**
```
kws-beta-2024
```

**Oder mit Version:**
```
kws-beta-v1
```

---

## 📝 Regeln für SKU

### Erlaubt:
- ✅ Buchstaben (a-z, A-Z)
- ✅ Zahlen (0-9)
- ✅ Bindestriche (-)
- ✅ Unterstriche (_)

### Nicht erlaubt:
- ❌ Leerzeichen
- ❌ Sonderzeichen (@, &, *, etc.)
- ❌ Umlaute (ä, ö, ü)

### Länge:
- Mindestens: 1 Zeichen
- Maximal: 255 Zeichen
- Empfohlen: 10-50 Zeichen

---

## 🔍 Wofür wird SKU verwendet?

### Intern in App Store Connect:

1. **App-Verwaltung:**
   - Identifikation Ihrer App
   - Unterscheidung zwischen verschiedenen Apps
   - Verwaltung von Metadaten

2. **Berichte:**
   - Verkaufsberichte
   - Analytics
   - Finanzberichte

3. **Organisation:**
   - Mehrere Apps verwalten
   - Übersicht behalten

### Wichtig:

- ✅ **Nicht öffentlich sichtbar** (nur für Sie)
- ✅ **Nicht in der App Store URL**
- ✅ **Nur für interne Verwaltung**

---

## 💡 Vergleich: SKU vs. Bundle ID

| Eigenschaft | SKU | Bundle ID |
|-------------|-----|-----------|
| **Zweck** | Interne Verwaltung | App-Identifikation |
| **Sichtbar** | Nur für Sie | Öffentlich (in App Store) |
| **Änderbar** | ❌ Nein (nach Erstellung) | ❌ Nein (nach Erstellung) |
| **Format** | Beliebig (Buchstaben, Zahlen, -) | Reverse-Domain (com.xxx.yyy) |
| **Beispiel** | `kws-beta-app` | `com.kletterwelt.beta` |

---

## 🎯 Für Ihre App

### Empfohlene SKU:

```
kws-beta-app
```

**Warum?**
- ✅ Einfach und eindeutig
- ✅ Beschreibt Ihre App
- ✅ Leicht zu merken
- ✅ Keine Sonderzeichen

**Alternative:**
```
kws-beta-2024
kws-beta-v1
kws-beta-app-ios
```

---

## 📚 Zusammenfassung

**SKU = Interne Referenznummer**

- ✅ Muss eindeutig sein
- ✅ Kann nicht geändert werden
- ✅ Nicht öffentlich sichtbar
- ✅ Nur für interne Verwaltung

**Empfehlung:** Verwenden Sie `kws-beta-app` oder ähnlich!

---

## 💡 Tipp

**Einfach halten:**
- Verwenden Sie einen kurzen, beschreibenden Namen
- Keine Sonderzeichen
- Leicht zu merken

**Beispiele:**
- ✅ `kws-beta-app`
- ✅ `kws-beta-2024`
- ✅ `kws-beta-v1`
- ❌ `kws-beta-app@2024` (Sonderzeichen)
- ❌ `kws beta app` (Leerzeichen)

---

**Fragen?** Ich kann Ihnen bei der Auswahl helfen! 😊

