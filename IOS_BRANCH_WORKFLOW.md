# iOS Build Branch Workflow

## 🎯 Konzept

Der iOS-Build läuft **nur** auf dem separaten Branch `ios-build`, nicht auf `main`. So haben Sie volle Kontrolle:

- ✅ `main` Branch bleibt sauber (keine automatischen iOS-Builds)
- ✅ iOS-Builds nur wenn gewünscht
- ✅ Klare Trennung zwischen Entwicklung und iOS-Builds

---

## 📋 Workflow

### Schritt 1: iOS-Build Branch erstellen

```bash
# 1. Sicherstellen, dass Sie auf main sind
git checkout main

# 2. Neuen Branch erstellen
git checkout -b ios-build

# 3. Branch zu GitHub pushen
git push -u origin ios-build
```

**Einmalig:** Dieser Schritt muss nur einmal gemacht werden.

---

### Schritt 2: iOS-Build starten

Wenn Sie einen iOS-Build möchten:

#### Option A: Code von main übernehmen und bauen

```bash
# 1. Auf ios-build Branch wechseln
git checkout ios-build

# 2. Neueste Änderungen von main holen
git merge main

# 3. Zu GitHub pushen → Build startet automatisch!
git push origin ios-build
```

#### Option B: Nur iOS-spezifische Änderungen

```bash
# 1. Auf ios-build Branch wechseln
git checkout ios-build

# 2. iOS-spezifische Änderungen machen (z.B. iOS-Konfiguration)
# ... Code ändern ...

# 3. Änderungen committen und pushen
git add .
git commit -m "iOS: Update configuration"
git push origin ios-build
# → Build startet automatisch!
```

#### Option C: Manuell über GitHub UI

1. Gehen Sie zu: `https://github.com/IHR-USERNAME/IHR-REPO/actions`
2. Klicken Sie auf "Build iOS App"
3. Klicken Sie auf "Run workflow"
4. Wählen Sie Branch: `ios-build`
5. Klicken Sie auf "Run workflow"

---

## 🔄 Typischer Workflow

### Normale Entwicklung (auf main):

```bash
# Sie entwickeln normal auf main
git checkout main
# ... Code ändern ...
git add .
git commit -m "Feature: Neue Funktion"
git push origin main
# → Kein iOS-Build, nur normale Entwicklung
```

### Wenn Sie iOS-Build brauchen:

```bash
# 1. Neueste Änderungen von main holen
git checkout ios-build
git merge main

# 2. Push → iOS-Build startet automatisch
git push origin ios-build

# 3. Auf GitHub warten (5-10 Minuten)
# 4. Build-Artefakte herunterladen
```

---

## 📁 Branch-Struktur

```
main (Entwicklung)
  │
  ├── Feature-Branches
  │   └── feature/xyz
  │
  └── ios-build (iOS-Builds)
      └── Automatische Builds hier
```

**Vorteile:**
- ✅ `main` bleibt sauber
- ✅ iOS-Builds nur wenn nötig
- ✅ Klare Trennung

---

## 🎯 Praktische Beispiele

### Beispiel 1: App aktualisieren und iOS-Build

```bash
# 1. Normal entwickeln auf main
git checkout main
# ... Änderungen machen ...
git add .
git commit -m "Fix: Button-Farbe"
git push origin main

# 2. iOS-Build starten
git checkout ios-build
git merge main
git push origin ios-build
# → iOS-Build läuft jetzt!
```

### Beispiel 2: Nur iOS-Konfiguration ändern

```bash
# 1. Auf ios-build Branch
git checkout ios-build

# 2. iOS-spezifische Änderungen
# z.B. Info.plist anpassen, Signing ändern, etc.

# 3. Committen und pushen
git add .
git commit -m "iOS: Update Info.plist"
git push origin ios-build
# → Build startet automatisch
```

### Beispiel 3: Schnell testen ohne main zu ändern

```bash
# 1. Auf ios-build Branch
git checkout ios-build

# 2. Test-Änderungen machen
# ... Code ändern ...

# 3. Build starten
git add .
git commit -m "Test: iOS Build"
git push origin ios-build

# 4. Nach Test: Änderungen verwerfen oder zu main mergen
git checkout main
git merge ios-build  # Falls Änderungen behalten werden sollen
```

---

## 🔧 Branch-Verwaltung

### Branch aktualisieren (main → ios-build)

```bash
git checkout ios-build
git merge main
git push origin ios-build
```

### Branch zurücksetzen (ios-build = main)

```bash
git checkout ios-build
git reset --hard main
git push origin ios-build --force
```

⚠️ **Vorsicht:** `--force` überschreibt den Remote-Branch!

### Branch löschen (falls nicht mehr benötigt)

```bash
# Lokal löschen
git branch -d ios-build

# Auf GitHub löschen
git push origin --delete ios-build
```

---

## 📊 Workflow-Status prüfen

### Build-Status auf GitHub:

1. Gehen Sie zu: `https://github.com/IHR-USERNAME/IHR-REPO/actions`
2. Sie sehen nur Builds vom `ios-build` Branch
3. `main` Branch Builds erscheinen hier nicht

### Branch-Status lokal:

```bash
# Aktuellen Branch sehen
git branch

# Alle Branches sehen
git branch -a

# Branch-Wechsel
git checkout ios-build
git checkout main
```

---

## 💡 Tipps

### Tipp 1: Automatische Synchronisation

Sie können ein Script erstellen, das automatisch `main` → `ios-build` synchronisiert:

```bash
#!/bin/bash
# sync-ios-build.sh
git checkout ios-build
git merge main
git push origin ios-build
```

Dann einfach ausführen: `./sync-ios-build.sh`

### Tipp 2: GitHub Actions für Auto-Sync

Sie können auch einen Workflow erstellen, der automatisch `ios-build` aktualisiert, wenn `main` geändert wird (aber ohne Build zu starten).

### Tipp 3: Branch-Schutz

Auf GitHub können Sie Branch-Schutz-Regeln für `ios-build` einrichten:
- Nur bestimmte Personen können pushen
- Pull Requests erforderlich
- etc.

---

## 🚨 Wichtige Hinweise

1. **Branch synchron halten:**
   - Regelmäßig `main` → `ios-build` mergen
   - Sonst werden iOS-Builds veraltet

2. **Nicht auf ios-build entwickeln:**
   - Entwickeln Sie auf `main`
   - Nutzen Sie `ios-build` nur für Builds

3. **Build-Artefakte:**
   - Werden 7 Tage gespeichert
   - Laden Sie wichtige Builds rechtzeitig herunter

4. **Kosten:**
   - GitHub Actions Minuten werden nur für `ios-build` Branch verwendet
   - `main` Branch verbraucht keine Build-Minuten

---

## 📚 Zusammenfassung

**Workflow:**
1. ✅ Entwickeln auf `main`
2. ✅ Wenn iOS-Build nötig: `ios-build` Branch aktualisieren
3. ✅ Push → Build startet automatisch
4. ✅ Build-Artefakte herunterladen

**Vorteile:**
- ✅ Klare Trennung
- ✅ Kontrolle über Builds
- ✅ `main` bleibt sauber
- ✅ Keine ungewollten Builds

---

**Fragen?** Schauen Sie in die Logs oder fragen Sie mich! 😊

