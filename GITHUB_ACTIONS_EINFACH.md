# GitHub Actions für iOS - Einfach erklärt

## 🎯 Die einfache Lösung

**Sie arbeiten normal auf `main`** - keine Branch-Wechsel nötig!

**iOS-Builds starten Sie einfach über GitHub UI** - wenn Sie sie brauchen.

---

## ✅ So funktioniert's:

### 1. Normal entwickeln (auf main)

```bash
# Sie arbeiten ganz normal auf main
git checkout main
# ... Code ändern ...
git add .
git commit -m "Feature: Neue Funktion"
git push origin main
```

**→ Kein iOS-Build, keine Störung!**

---

### 2. iOS-Build starten (wenn gewünscht)

**Über GitHub UI:**

1. Gehen Sie zu: `https://github.com/IHR-USERNAME/IHR-REPO/actions`
2. Klicken Sie auf **"Build iOS App"** (links)
3. Klicken Sie auf **"Run workflow"** (rechts oben)
4. Wählen Sie Branch: **`main`** (oder `ios-build` falls vorhanden)
5. Klicken Sie auf **"Run workflow"**
6. **Fertig!** Build läuft jetzt

**Das war's!** Keine Branch-Wechsel, keine Komplikationen.

---

## 📋 Workflow im Detail

### Was passiert beim Build?

1. ✅ GitHub startet einen Mac in der Cloud
2. ✅ Lädt Ihren Code vom gewählten Branch (`main`)
3. ✅ Installiert alle Dependencies
4. ✅ Baut die iOS-App
5. ✅ Speichert das Ergebnis

**Dauer:** 5-10 Minuten

---

## 💡 Praktische Beispiele

### Beispiel 1: App aktualisieren und iOS-Build

```bash
# 1. Normal entwickeln
git checkout main
# ... Code ändern ...
git add .
git commit -m "Fix: Button-Farbe"
git push origin main

# 2. Auf GitHub gehen
# → Actions → Build iOS App → Run workflow → main → Run workflow
# → Warten 5-10 Minuten
# → Build-Artefakte herunterladen
```

### Beispiel 2: Nur iOS-Build ohne Code-Änderungen

```bash
# 1. Auf GitHub gehen
# → Actions → Build iOS App → Run workflow → main → Run workflow
# → Fertig!
```

**Kein Git-Befehl nötig!**

---

## 🎯 Vorteile dieser Lösung

| Vorteil | Beschreibung |
|---------|-------------|
| ✅ **Einfach** | Arbeiten Sie normal auf `main` |
| ✅ **Kontrolle** | Builds nur wenn Sie sie wollen |
| ✅ **Keine Störung** | Keine automatischen Builds |
| ✅ **Flexibel** | Build von jedem Branch möglich |
| ✅ **Schnell** | Ein Klick auf GitHub |

---

## 🔄 Vergleich: Vorher vs. Jetzt

### ❌ Vorher (mit Branch-Wechsel):

```bash
# Entwickeln auf main
git checkout main
# ... Code ändern ...
git push origin main

# iOS-Build starten
git checkout ios-build      # ← Umständlich!
git merge main              # ← Extra Schritt!
git push origin ios-build   # ← Noch ein Schritt!
```

### ✅ Jetzt (einfach):

```bash
# Entwickeln auf main
git checkout main
# ... Code ändern ...
git push origin main

# iOS-Build starten
# → Einfach auf GitHub klicken!
```

---

## 📱 So starten Sie einen Build

### Schritt-für-Schritt:

1. **Gehen Sie zu GitHub:**
   ```
   https://github.com/IHR-USERNAME/IHR-REPO
   ```

2. **Klicken Sie auf "Actions"** (oben im Menü)

3. **Klicken Sie auf "Build iOS App"** (links in der Liste)

4. **Klicken Sie auf "Run workflow"** (rechts oben, blauer Button)

5. **Wählen Sie Branch:**
   - Normalerweise: `main`
   - Falls Sie einen `ios-build` Branch haben: können Sie auch den wählen

6. **Klicken Sie auf "Run workflow"** (grüner Button)

7. **Warten Sie 5-10 Minuten**

8. **Build-Artefakte herunterladen:**
   - Scrollen Sie nach unten
   - Klicken Sie auf "ios-build" unter "Artifacts"
   - Datei wird heruntergeladen

---

## 🚨 Wichtige Hinweise

### Build-Artefakte:

- Werden **7 Tage** gespeichert
- Laden Sie wichtige Builds rechtzeitig herunter
- Nach 7 Tagen werden sie automatisch gelöscht

### Kosten:

- **Öffentliche Repos:** ✅ Komplett kostenlos
- **Private Repos:** 2000 Minuten/Monat kostenlos
- Ein Build dauert ~5-10 Minuten
- = ~200-400 Builds/Monat kostenlos

### Build-Status:

- 🟡 **Gelb** = Läuft noch
- 🟢 **Grün** = Erfolgreich
- 🔴 **Rot** = Fehler (Logs prüfen)

---

## 🔧 Troubleshooting

### Build schlägt fehl?

1. **Logs prüfen:**
   - Auf Build-Seite → Klicken Sie auf den fehlgeschlagenen Schritt
   - Scrollen Sie durch die Logs
   - Suchen Sie nach Fehlermeldungen

2. **Häufige Fehler:**
   - **"pod install failed"** → CocoaPods Problem
   - **"xcodebuild failed"** → Code-Fehler
   - **"npm ci failed"** → Dependencies Problem

### Build läuft zu lange?

- Normal: 5-10 Minuten
- Wenn länger: Prüfen Sie die Logs, welcher Schritt hängt

### Artefakte nicht sichtbar?

- Warten Sie bis Build komplett fertig ist
- Prüfen Sie, ob "Upload build artifacts" erfolgreich war

---

## 📚 Zusammenfassung

**Ihr Workflow:**

1. ✅ Entwickeln Sie normal auf `main`
2. ✅ Wenn iOS-Build nötig: Auf GitHub → Actions → Run workflow
3. ✅ Warten Sie 5-10 Minuten
4. ✅ Build-Artefakte herunterladen
5. ✅ Fertig!

**Das war's!** Keine Branch-Wechsel, keine Komplikationen, einfach und effektiv! 🎉

---

**Fragen?** Schauen Sie in die Logs oder fragen Sie mich! 😊

