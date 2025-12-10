# Android App-Icon Setup

## Option 1: Online-Tool (Empfohlen - am einfachsten)

### Android Asset Studio (Google)

1. **Öffnen Sie:** https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. **Logo hochladen:** Klicken Sie auf "Image" und wählen Sie `public/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png`
3. **Anpassen:**
   - **Padding:** 20% (damit das Logo nicht zu nah am Rand ist)
   - **Background Color:** #FFFFFF (weiß) oder #36B531 (Ihr Grün)
   - **Shape:** Square (Quadrat) oder Circle (Kreis)
4. **Download:** Klicken Sie auf "Download" → ZIP-Datei wird heruntergeladen
5. **Extrahieren:** Entpacken Sie die ZIP-Datei
6. **Kopieren:** Kopieren Sie alle `mipmap-*` Ordner in `android/app/src/main/res/`
   - Die ZIP enthält einen `res` Ordner
   - Kopieren Sie alle `mipmap-*` Ordner aus `res/` nach `android/app/src/main/res/`

### Icon Kitchen (Alternative)

1. **Öffnen Sie:** https://icon.kitchen/
2. **Logo hochladen:** Ziehen Sie das Logo in den Browser
3. **Anpassen:** Wählen Sie Größe, Padding, Hintergrund
4. **Download:** Laden Sie die ZIP-Datei herunter
5. **Kopieren:** Wie oben beschrieben

## Option 2: ImageMagick installieren (für automatische Generierung)

### Windows

1. **Download:** https://imagemagick.org/script/download.php#windows
2. **Installieren:** Führen Sie den Installer aus
3. **Prüfen:** Öffnen Sie PowerShell und testen Sie:
   ```powershell
   magick -version
   ```
4. **Icons generieren:**
   ```bash
   node scripts/generate-android-icons.cjs
   ```

### macOS

```bash
brew install imagemagick
```

### Linux

```bash
sudo apt-get install imagemagick
```

## Option 3: Manuell mit einem Bildbearbeitungsprogramm

1. **Öffnen Sie** `public/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png` in einem Bildbearbeitungsprogramm
2. **Erstellen Sie Icons** in folgenden Größen:
   - **mipmap-mdpi:** 48x48px
   - **mipmap-hdpi:** 72x72px
   - **mipmap-xhdpi:** 96x96px
   - **mipmap-xxhdpi:** 144x144px
   - **mipmap-xxxhdpi:** 192x192px
3. **Speichern Sie** als `ic_launcher.png` in den jeweiligen Ordnern:
   - `android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
   - `android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
   - etc.
4. **Wiederholen Sie** für `ic_launcher_round.png` (gleiche Größen)
5. **Erstellen Sie** `ic_launcher_foreground.png` (108x108px, Logo zentriert auf transparentem Hintergrund)

## Nach dem Icon-Setup

1. **APK neu bauen:**
   ```bash
   npm run cap:build:android
   ```
   Oder in Android Studio: Build → Build APK(s)

2. **App installieren** und Icon prüfen

3. **Falls das Icon nicht angezeigt wird:**
   - Prüfen Sie, ob alle Größen vorhanden sind
   - Prüfen Sie `android/app/src/main/AndroidManifest.xml` - sollte `android:icon="@mipmap/ic_launcher"` enthalten

## Empfohlene Icon-Spezifikationen

- **Format:** PNG (32-bit)
- **Hintergrund:** Weiß (#FFFFFF) oder Ihr Grün (#36B531)
- **Padding:** 20% (Logo sollte nicht zu nah am Rand sein)
- **Transparenz:** Für foreground icons (adaptive icons)

## Adaptive Icons (Android 8.0+)

Android verwendet adaptive Icons, die aus zwei Teilen bestehen:
- **Foreground:** Das Logo (108x108px, zentriert)
- **Background:** Einfarbiger Hintergrund

Die XML-Dateien in `mipmap-anydpi-v26/` kombinieren diese Teile automatisch.

