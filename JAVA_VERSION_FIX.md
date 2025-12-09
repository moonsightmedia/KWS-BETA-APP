# Java-Version Problem beheben

## Problem

Sie haben Java 25 installiert, aber Android Gradle Plugin unterstützt diese Version noch nicht vollständig.

**Fehler**: `Unsupported class file major version 69`

## Lösung: Java 17 oder 21 installieren

### Option 1: Java 21 installieren (Empfohlen)

1. **Download**: https://adoptium.net/temurin/releases/?version=21
2. **Windows x64 Installer** herunterladen
3. Installieren (überschreibt nicht Java 25, beide können parallel existieren)
4. JAVA_HOME auf Java 21 setzen (siehe unten)

### Option 2: Java 17 installieren

1. **Download**: https://adoptium.net/temurin/releases/?version=17
2. **Windows x64 Installer** herunterladen
3. Installieren
4. JAVA_HOME auf Java 17 setzen

## JAVA_HOME auf Java 17/21 setzen

### Temporär (für diese Session)

```powershell
# Für Java 21
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.1.12-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Prüfen
java -version
```

### Permanently (System-weit)

1. Windows-Taste → "Umgebungsvariablen" suchen
2. "Umgebungsvariablen bearbeiten"
3. Unter "Systemvariablen" → `JAVA_HOME` bearbeiten
4. Auf Java 17/21 Pfad ändern (z.B. `C:\Program Files\Eclipse Adoptium\jdk-21.0.1.12-hotspot`)
5. Terminal neu starten

## Prüfen

Nach dem Setzen:

```powershell
java -version
# Sollte Java 17 oder 21 anzeigen

cd android
.\gradlew.bat --version
# Sollte ohne Fehler funktionieren
```

## Dann APK bauen

```powershell
cd ..
npm run cap:build:android
```

## Alternative: Mehrere Java-Versionen verwalten

Mit **Chocolatey** können Sie mehrere Java-Versionen installieren und wechseln:

```powershell
# Java 17 installieren
choco install openjdk17

# Java 21 installieren  
choco install openjdk21

# Zwischen Versionen wechseln
choco install jenv  # Java Version Manager
```



