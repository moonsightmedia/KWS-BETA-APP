# iOS App ohne Mac bauen

Da Sie keinen Mac haben, gibt es mehrere Möglichkeiten, Ihre iOS-App trotzdem zu bauen:

## 🚀 Option 1: GitHub Actions (Empfohlen - Kostenlos)

**Vorteile:**
- ✅ Komplett kostenlos für öffentliche Repositories
- ✅ Automatische Builds bei jedem Push
- ✅ Keine manuelle Einrichtung nötig
- ✅ Build-Artefakte werden gespeichert

**Nachteile:**
- ❌ Benötigt ein GitHub Repository
- ❌ Für private Repos: 2000 Minuten/Monat kostenlos, danach kostenpflichtig

### Einrichtung:

1. **Code auf GitHub pushen** (falls noch nicht geschehen):
   ```bash
   git add .
   git commit -m "Add iOS build workflow"
   git push origin main
   ```

2. **GitHub Actions aktivieren:**
   - Die Workflow-Datei `.github/workflows/ios-build.yml` ist bereits erstellt
   - GitHub erkennt sie automatisch beim Push

3. **Build starten:**
   - Gehen Sie zu: `https://github.com/IHR-USERNAME/IHR-REPO/actions`
   - Klicken Sie auf "Build iOS App"
   - Klicken Sie auf "Run workflow" → "Run workflow"
   - Der Build startet automatisch

4. **Build-Artefakte herunterladen:**
   - Nach erfolgreichem Build: Klicken Sie auf den Workflow-Run
   - Scrollen Sie nach unten zu "Artifacts"
   - Laden Sie "ios-build" herunter

### Manueller Build-Trigger:

Sie können auch manuell einen Build starten:
- GitHub Repository → Actions → "Build iOS App" → "Run workflow"

## ☁️ Option 2: Cloud-Mac-Services (Kostenpflichtig)

### MacStadium
- **Preis:** Ab ~$99/Monat
- **URL:** https://www.macstadium.com/
- Dedizierte Mac-Minimal-Instanzen
- Perfekt für regelmäßige Builds

### MacinCloud
- **Preis:** Ab ~$20/Monat
- **URL:** https://www.macincloud.com/
- Geteilte Mac-Instanzen
- Günstigste Option

### AWS EC2 Mac Instances
- **Preis:** Pay-per-use (~$1.08/Stunde)
- **URL:** https://aws.amazon.com/ec2/instance-types/mac/
- Sehr flexibel, nur zahlen was Sie nutzen

## 🔧 Option 3: Externe CI/CD Services

### Codemagic
- **Preis:** Kostenlos für öffentliche Repos, ab $75/Monat für private
- **URL:** https://codemagic.io/
- Speziell für Mobile Apps optimiert
- Sehr einfach einzurichten

### Bitrise
- **Preis:** Kostenlos für öffentliche Repos, ab $36/Monat für private
- **URL:** https://www.bitrise.io/
- Sehr mächtig, viele Features

### Appcircle
- **Preis:** Kostenlos für öffentliche Repos, ab $29/Monat für private
- **URL:** https://appcircle.io/
- Einfache Einrichtung

## 📱 Option 4: TestFlight (Für Beta-Tests)

Wenn Sie bereits einen Apple Developer Account haben ($99/Jahr):

1. **Einen Mac einmalig nutzen** (Freund/Kollege/Miet-Mac):
   - App einmalig bauen und Archive erstellen
   - Zu App Store Connect hochladen

2. **TestFlight nutzen:**
   - App Store Connect → TestFlight
   - Beta-Tester hinzufügen
   - Neue Builds können Sie dann über Xcode Cloud oder GitHub Actions erstellen

## 🎯 Empfohlener Workflow

**Für Entwicklung:**
1. Verwenden Sie GitHub Actions für automatische Builds
2. Testen Sie auf Android (können Sie lokal bauen)
3. Für iOS-Tests: Nutzen Sie TestFlight mit Builds aus GitHub Actions

**Für Veröffentlichung:**
1. GitHub Actions erstellt automatisch Archive
2. Archive zu App Store Connect hochladen (kann auch automatisiert werden)
3. Oder: Einmalig einen Mac nutzen für die finale Veröffentlichung

## 🔐 Apple Developer Account Setup

Für alle Optionen benötigen Sie:

1. **Apple Developer Account** erstellen:
   - https://developer.apple.com/programs/
   - Kostenlos für Tests, $99/Jahr für App Store

2. **Signing Certificates** erstellen:
   - Xcode kann dies automatisch machen
   - Oder: Manuell im Apple Developer Portal

3. **Provisioning Profiles** erstellen:
   - Für Development und Distribution
   - Kann auch automatisch von Xcode erstellt werden

## 📝 GitHub Actions Workflow Details

Die Workflow-Datei `.github/workflows/ios-build.yml` macht folgendes:

1. ✅ Checkt Code aus
2. ✅ Installiert Node.js und Dependencies
3. ✅ Baut Web-App und synchronisiert mit Capacitor
4. ✅ Installiert CocoaPods Dependencies
5. ✅ Baut iOS-App für Simulator
6. ✅ Erstellt Archive (wenn manuell getriggert)
7. ✅ Lädt Build-Artefakte hoch

### Workflow manuell starten:

```bash
# Code pushen
git add .
git commit -m "Update app"
git push origin main

# Dann auf GitHub:
# Actions → Build iOS App → Run workflow
```

## 🚨 Wichtige Hinweise

1. **Signing:** Für echte Geräte-Tests benötigen Sie Signing Certificates. Diese können Sie über GitHub Actions Secrets hinzufügen.

2. **Secrets konfigurieren** (für Signing):
   - GitHub Repository → Settings → Secrets and variables → Actions
   - Fügen Sie hinzu:
     - `APPLE_ID`: Ihre Apple ID
     - `APPLE_ID_PASSWORD`: App-spezifisches Passwort
     - `APPLE_TEAM_ID`: Ihre Team ID

3. **Export Options:** Für IPA-Erstellung benötigen Sie eine `exportOptions.plist` Datei.

## 💡 Tipp

**Kombinieren Sie die Optionen:**
- GitHub Actions für automatische Builds
- TestFlight für Beta-Tests
- Einmalig einen Mac nutzen (Miete oder Freund) für die finale App Store Veröffentlichung

## 📚 Nächste Schritte

1. ✅ GitHub Actions Workflow ist bereits erstellt
2. ⏭️ Code auf GitHub pushen
3. ⏭️ Workflow testen
4. ⏭️ Apple Developer Account einrichten (falls noch nicht vorhanden)
5. ⏭️ Signing konfigurieren
6. ⏭️ TestFlight Setup

Möchten Sie, dass ich Ihnen beim Setup von GitHub Actions oder einem der anderen Services helfe?

