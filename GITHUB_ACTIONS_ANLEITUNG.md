# GitHub Actions für iOS Build - Schritt für Schritt

## 🎯 Was ist GitHub Actions?

**GitHub Actions** ist ein kostenloser Service von GitHub, der automatisch Code ausführen kann - wie ein Computer in der Cloud, den Sie nicht selbst besitzen müssen.

**Für Sie bedeutet das:**
- ✅ Sie haben keinen Mac → GitHub hat Macs in der Cloud
- ✅ Sie pushen Code → GitHub baut automatisch Ihre iOS-App
- ✅ Sie laden das fertige Build herunter → Fertig!

---

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: Workflow-Datei hochladen

Die Workflow-Datei ist bereits erstellt (`.github/workflows/ios-build.yml`). Sie müssen sie nur zu GitHub pushen:

```bash
# 1. Alle neuen Dateien hinzufügen
git add .

# 2. Änderungen speichern
git commit -m "Add GitHub Actions workflow for iOS builds"

# 3. Zu GitHub hochladen
git push origin main
```

**Was passiert jetzt?**
- GitHub erkennt automatisch die `.github/workflows/ios-build.yml` Datei
- Der Workflow wird aktiviert
- Bei jedem Push wird automatisch ein Build gestartet

---

### Schritt 2: Build starten

Sie haben **zwei Möglichkeiten**:

#### Option A: Automatisch (bei jedem Push)

Jedes Mal, wenn Sie Code pushen, startet automatisch ein Build:

```bash
git add .
git commit -m "Update app"
git push origin main
# → Build startet automatisch!
```

#### Option B: Manuell starten

1. Gehen Sie zu: `https://github.com/IHR-USERNAME/IHR-REPO`
2. Klicken Sie auf den Tab **"Actions"** (oben)
3. Klicken Sie auf **"Build iOS App"** (links)
4. Klicken Sie auf **"Run workflow"** (rechts oben)
5. Wählen Sie den Branch (`main`)
6. Klicken Sie auf **"Run workflow"**

**Was passiert jetzt?**
- GitHub startet einen virtuellen Mac
- Installiert alle Dependencies
- Baut Ihre iOS-App
- Speichert das Ergebnis

---

### Schritt 3: Build-Status prüfen

1. Gehen Sie zu: `https://github.com/IHR-USERNAME/IHR-REPO/actions`
2. Sie sehen eine Liste aller Builds
3. Klicken Sie auf den neuesten Build (oben)
4. Sie sehen den Build-Status:
   - 🟡 **Gelb** = Läuft noch
   - 🟢 **Grün** = Erfolgreich
   - 🔴 **Rot** = Fehler

**Während des Builds sehen Sie:**
```
✓ Checkout code
✓ Setup Node.js
✓ Install dependencies
✓ Build web app and sync Capacitor
✓ Install CocoaPods dependencies
✓ Build iOS app (Simulator)
✓ Upload build artifacts
```

---

### Schritt 4: Build-Artefakte herunterladen

Nach erfolgreichem Build:

1. Scrollen Sie nach unten auf der Build-Seite
2. Sie sehen einen Abschnitt **"Artifacts"**
3. Klicken Sie auf **"ios-build"**
4. Die Datei wird heruntergeladen (ZIP-Datei)

**Was ist drin?**
- `.app` Datei (iOS-App für Simulator)
- `.xcarchive` (falls Archive erstellt wurde)

---

## 🔍 Was macht der Workflow genau?

Die Datei `.github/workflows/ios-build.yml` enthält alle Schritte:

```yaml
1. Checkout code          # Lädt Ihren Code herunter
2. Setup Node.js          # Installiert Node.js 20
3. Install dependencies   # npm ci (installiert alle Packages)
4. Build web app          # npm run cap:sync (baut Web-App + sync)
5. Install CocoaPods      # pod install (iOS Dependencies)
6. Build iOS app          # xcodebuild (baut die iOS-App)
7. Upload artifacts       # Speichert das Ergebnis
```

**Das alles passiert automatisch auf einem Mac in der Cloud!**

---

## 💡 Praktische Beispiele

### Beispiel 1: App aktualisieren und neu bauen

```bash
# 1. Code ändern (z.B. in VS Code)
# 2. Änderungen speichern

# 3. Zu GitHub pushen
git add .
git commit -m "Fix: Button-Farbe geändert"
git push origin main

# 4. Auf GitHub gehen
# → Actions Tab → Neuester Build läuft automatisch
# → Nach 5-10 Minuten: Build fertig → Herunterladen
```

### Beispiel 2: Nur testen, ob es funktioniert

```bash
# 1. Workflow manuell starten (siehe Schritt 2, Option B)
# 2. Warten bis Build fertig ist
# 3. Artefakte herunterladen
# 4. Fertig!
```

---

## ⚙️ Workflow-Konfiguration erklärt

### Wann startet der Build?

```yaml
on:
  push:                    # Bei jedem Push
    branches: [ main ]
  workflow_dispatch:       # Oder manuell über GitHub UI
```

### Was wird gebaut?

```yaml
- Build iOS app (Simulator)     # Für iPhone Simulator
- Archive iOS app              # Für echte Geräte (nur manuell)
```

### Wo wird gespeichert?

```yaml
retention-days: 7    # Build-Artefakte werden 7 Tage gespeichert
```

---

## 🚨 Häufige Fragen

### Wie lange dauert ein Build?
- **Normalerweise:** 5-10 Minuten
- **Erstes Mal:** Kann länger dauern (Dependencies werden installiert)

### Kostet das etwas?
- **Öffentliche Repos:** ✅ Komplett kostenlos
- **Private Repos:** 2000 Minuten/Monat kostenlos, danach kostenpflichtig

### Kann ich mehrere Builds gleichzeitig haben?
- Ja, aber bei kostenlosen Accounts gibt es Limits
- Normalerweise kein Problem für einzelne Projekte

### Was passiert bei Fehlern?
- Der Build wird rot markiert
- Sie sehen die Fehlermeldung in den Logs
- Sie können den Code fixen und erneut pushen

### Kann ich den Build abbrechen?
- Ja, auf der Build-Seite gibt es einen "Cancel" Button

---

## 📱 Nächste Schritte nach dem Build

### 1. App auf iPhone testen

Für echte Geräte benötigen Sie:
- Apple Developer Account (kostenlos für Tests)
- Signing Certificates (kann automatisch erstellt werden)
- Provisioning Profile

**Workflow erweitern für Geräte-Builds:**
- Signing Secrets zu GitHub hinzufügen
- Workflow anpassen für Distribution Builds

### 2. App Store Veröffentlichung

Für App Store benötigen Sie:
- Bezahlten Apple Developer Account ($99/Jahr)
- App Store Connect Setup
- Archive hochladen

---

## 🎯 Zusammenfassung

**So einfach ist es:**

1. ✅ Code pushen → `git push origin main`
2. ✅ Auf GitHub gehen → Actions Tab
3. ✅ Build läuft automatisch (5-10 Min)
4. ✅ Artefakte herunterladen
5. ✅ Fertig!

**Das war's!** Kein Mac nötig, alles automatisch, komplett kostenlos.

---

## 🔧 Troubleshooting

### Build schlägt fehl?

1. **Logs prüfen:**
   - Auf Build-Seite → Klicken Sie auf den fehlgeschlagenen Schritt
   - Scrollen Sie durch die Logs
   - Suchen Sie nach Fehlermeldungen

2. **Häufige Fehler:**
   - **"pod install failed"** → CocoaPods Problem, prüfen Sie `Podfile`
   - **"xcodebuild failed"** → Code-Fehler, prüfen Sie die Logs
   - **"npm ci failed"** → Dependencies Problem, prüfen Sie `package.json`

3. **Lokale Tests:**
   - Versuchen Sie lokal zu bauen (falls möglich)
   - Oder: Fehler in den GitHub Logs finden und fixen

### Build läuft zu lange?

- Normalerweise 5-10 Minuten
- Wenn länger: Prüfen Sie die Logs, welcher Schritt hängt

### Artefakte nicht sichtbar?

- Warten Sie bis Build komplett fertig ist
- Prüfen Sie, ob der Schritt "Upload build artifacts" erfolgreich war
- Artefakte werden nur bei erfolgreichen Builds erstellt

---

## 📚 Weitere Ressourcen

- [GitHub Actions Dokumentation](https://docs.github.com/en/actions)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Xcode Build Commands](https://developer.apple.com/documentation/xcode)

---

**Fragen?** Schauen Sie in die Logs oder fragen Sie mich! 😊

