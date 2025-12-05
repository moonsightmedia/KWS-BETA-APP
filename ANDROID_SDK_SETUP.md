# Android SDK Setup (ohne Android Studio)

## Problem

Der Build schlägt fehl mit: `SDK location not found`

Das bedeutet, dass das Android SDK nicht installiert ist oder nicht gefunden wird.

## Lösung: Android SDK Command Line Tools installieren

### Option 1: Command Line Tools (Empfohlen - ohne Android Studio)

1. **Download Android SDK Command Line Tools**:
   - https://developer.android.com/tools/releases/commandlinetools
   - Wählen Sie "Command line tools only" für Windows
   - Datei: `commandlinetools-win-XXXXXX_latest.zip`

2. **Entpacken**:
   - Erstellen Sie einen Ordner: `C:\Android\sdk`
   - Entpacken Sie die ZIP-Datei in `C:\Android\sdk\cmdline-tools\latest\`

3. **ANDROID_HOME setzen**:
   ```powershell
   # Temporär für diese Session
   $env:ANDROID_HOME = "C:\Android\sdk"
   $env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools\bin"
   ```

4. **SDK installieren**:
   ```powershell
   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
   ```

5. **local.properties erstellen**:
   Erstellen Sie `android/local.properties`:
   ```properties
   sdk.dir=C\:\\Android\\sdk
   ```

### Option 2: Android Studio installieren (nur für SDK)

1. Android Studio herunterladen: https://developer.android.com/studio
2. Installieren
3. Beim ersten Start: SDK wird automatisch installiert
4. SDK-Pfad finden: Android Studio → Settings → Appearance & Behavior → System Settings → Android SDK
5. Pfad kopieren (normalerweise: `C:\Users\IhrName\AppData\Local\Android\Sdk`)

6. **local.properties erstellen**:
   Erstellen Sie `android/local.properties`:
   ```properties
   sdk.dir=C\:\\Users\\IhrName\\AppData\\Local\\Android\\Sdk
   ```

### Option 3: Chocolatey (Windows Package Manager)

```powershell
# Android SDK installieren
choco install android-sdk

# Dann ANDROID_HOME setzen
$env:ANDROID_HOME = "C:\ProgramData\chocolatey\lib\android-sdk"
```

## local.properties erstellen

Nach dem SDK-Installation, erstellen Sie `android/local.properties`:

```properties
sdk.dir=C\:\\Android\\sdk
```

**Wichtig**: 
- Doppelte Backslashes (`\\`) verwenden
- Oder normale Slashes: `sdk.dir=C:/Android/sdk`

## Prüfen

```powershell
# SDK-Pfad prüfen
echo $env:ANDROID_HOME

# ADB prüfen (Android Debug Bridge)
adb version
```

## Dann APK bauen

```powershell
npm run cap:build:android
```

## Permanente Lösung

Für dauerhafte Konfiguration:

1. Windows-Taste → "Umgebungsvariablen"
2. Systemvariablen → Neu:
   - Name: `ANDROID_HOME`
   - Wert: `C:\Android\sdk` (oder Ihr SDK-Pfad)
3. Path bearbeiten → Neu hinzufügen:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools\bin`

## Minimales SDK (nur für APK-Build)

Sie brauchen mindestens:
- **Platform Tools** (ADB, etc.)
- **Android Platform** (z.B. Android 34)
- **Build Tools** (z.B. 34.0.0)

Das sind ca. 500-800 MB.


