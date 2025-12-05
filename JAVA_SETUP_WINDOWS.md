# Java Setup auf Windows

## ⚠️ Wichtig: Java-Version

**Für Android-Builds wird Java 17 oder 21 empfohlen!**

Java 25 ist zu neu und kann Probleme mit Android Gradle Plugin verursachen.

**Empfohlene Downloads:**
- **Java 21 (LTS)**: https://adoptium.net/temurin/releases/?version=21
- **Java 17 (LTS)**: https://adoptium.net/temurin/releases/?version=17

## Java ist installiert, aber nicht erkannt?

Das bedeutet, dass Java nicht im PATH ist oder JAVA_HOME nicht gesetzt ist.

## Lösung: Java konfigurieren

### Schritt 1: Java-Installationspfad finden

Java ist normalerweise installiert in einem dieser Ordner:
- `C:\Program Files\Java\jdk-XX` (XX = Versionsnummer)
- `C:\Program Files\Eclipse Adoptium\jdk-XX`
- `C:\Program Files (x86)\Java\jdk-XX`

**Schnell finden:**
1. Windows-Taste + R
2. `cmd` eingeben und Enter
3. Folgenden Befehl ausführen:
   ```cmd
   dir "C:\Program Files\Java" /s /b | findstr java.exe
   ```

### Schritt 2: JAVA_HOME setzen

**Option A: Über Systemsteuerung (Empfohlen)**

1. Windows-Taste → "Umgebungsvariablen" suchen
2. "Umgebungsvariablen bearbeiten" öffnen
3. Unter "Systemvariablen" → "Neu" klicken
4. Variablenname: `JAVA_HOME`
5. Variablenwert: Pfad zu Java (z.B. `C:\Program Files\Java\jdk-17`)
6. OK klicken

**Option B: Über PowerShell (Temporär für diese Session)**

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$env:PATH += ";$env:JAVA_HOME\bin"
```

**Option C: Über CMD (Temporär für diese Session)**

```cmd
set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%PATH%;%JAVA_HOME%\bin
```

### Schritt 3: PATH aktualisieren

1. In den Umgebungsvariablen → "Path" auswählen → "Bearbeiten"
2. "Neu" klicken
3. `%JAVA_HOME%\bin` hinzufügen
4. OK klicken

### Schritt 4: Terminal neu starten

**Wichtig**: Nach dem Setzen der Umgebungsvariablen müssen Sie:
- Cursor/Terminal komplett schließen
- Neu öffnen
- Dann funktioniert `java -version`

### Schritt 5: Prüfen

```powershell
java -version
```

Sollte jetzt die Java-Version anzeigen.

## Alternative: Chocolatey verwenden

Falls Sie Chocolatey haben:

```powershell
choco install openjdk11
```

Das setzt JAVA_HOME automatisch.

## Schnelltest

Nach dem Neustart des Terminals:

```powershell
# Java-Version prüfen
java -version

# JAVA_HOME prüfen
echo $env:JAVA_HOME
```

Wenn beides funktioniert, können Sie APKs bauen!

