# APK Update Workflow

## Problem: App funktioniert im Emulator, aber nicht auf echtem Gerät

### Ursache
- **Emulator:** Android Studio lädt Assets direkt aus dem Dateisystem → immer aktuell
- **Echtes Gerät:** Lädt Assets aus der installierten APK → muss nach Änderungen neu gebaut werden

## Kompletter Workflow für Updates

### 1. Web-App bauen
```bash
npm run build
```

### 2. Assets synchronisieren
```bash
npx cap sync
```

### 3. APK neu bauen
```bash
cd android
.\gradlew.bat clean assembleDebug
cd ..
```

### 4. Alte APK deinstallieren
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall com.kletterwelt.beta
```

### 5. WebView-Cache löschen (wichtig!)
```powershell
# WebView-Cache löschen
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell pm clear com.google.android.webview

# Oder App-Cache löschen
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell pm clear com.kletterwelt.beta
```

### 6. Neue APK installieren
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r android\app\build\outputs\apk\debug\app-debug.apk
```

## Schnell-Workflow (alles in einem)

```powershell
# 1. Build und Sync
npm run build
npx cap sync

# 2. APK bauen
cd android
.\gradlew.bat clean assembleDebug
cd ..

# 3. Alte Version entfernen und neue installieren
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall com.kletterwelt.beta
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell pm clear com.google.android.webview
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r android\app\build\outputs\apk\debug\app-debug.apk
```

## Häufige Probleme

### Problem: App lädt noch alte Assets
**Lösung:**
1. WebView-Cache löschen (siehe oben)
2. App komplett deinstallieren
3. Neue APK installieren

### Problem: "Unable to open asset URL"
**Ursache:** APK enthält alte Asset-Referenzen
**Lösung:**
1. `npm run build` → `npx cap sync` → APK neu bauen
2. Alte APK deinstallieren
3. Neue APK installieren

### Problem: Funktioniert im Emulator, aber nicht auf Gerät
**Ursache:** Emulator verwendet Assets direkt, Gerät verwendet APK
**Lösung:** Immer APK neu bauen nach Asset-Änderungen

## Verifikation

### Prüfen, ob APK korrekte Assets enthält:
```powershell
# APK extrahieren und prüfen
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
$tempDir = "$env:TEMP\apk_check"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($apkPath, $tempDir)
Get-Content "$tempDir\assets\public\index.html" | Select-String "index-.*\.js"
```

Die HTML-Datei sollte auf `index-D3sgBVsV.js` (oder die aktuelle Version) verweisen.

