# APK auf Handy installieren - Schritt für Schritt

## Schritt 1: APK bauen

### Option A: Mit Android Studio (Empfohlen)

1. **Android Studio öffnen:**
   ```bash
   npm run cap:open:android
   ```

2. **In Android Studio:**
   - Warten Sie auf Gradle Sync (unten in der Statusleiste)
   - Klicken Sie auf **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
   - Warten Sie, bis der Build fertig ist
   - Klicken Sie auf **"locate"** im Popup, um die APK zu finden
   - Oder navigieren Sie zu: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option B: Über Terminal (falls Gradle installiert)

```bash
cd android
.\gradlew.bat assembleDebug
cd ..
```

Die APK liegt dann in: `android/app/build/outputs/apk/debug/app-debug.apk`

## Schritt 2: APK auf Handy übertragen

### Methode 1: Per USB (Empfohlen)

1. **Handy per USB verbinden**
2. **USB-Debugging aktivieren** auf dem Handy:
   - Einstellungen → Über das Telefon → Build-Nummer 7x tippen
   - Einstellungen → Entwickleroptionen → USB-Debugging aktivieren
3. **APK installieren:**
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r android\app\build\outputs\apk\debug\app-debug.apk
   ```

### Methode 2: Per E-Mail oder Cloud

1. **APK-Datei finden:**
   - Pfad: `android/app/build/outputs/apk/debug/app-debug.apk`
2. **APK per E-Mail an sich selbst senden** oder in Cloud-Speicher hochladen (Google Drive, Dropbox, etc.)
3. **Auf dem Handy:**
   - E-Mail öffnen oder Cloud-App öffnen
   - APK-Datei herunterladen
   - Datei öffnen

### Methode 3: Per USB-Kabel (Dateiübertragung)

1. **Handy per USB verbinden**
2. **Auf dem PC:** APK-Datei kopieren
3. **Auf dem Handy:** Datei-Explorer öffnen → APK-Datei finden → Öffnen

## Schritt 3: APK auf Handy installieren

1. **"Apps aus unbekannten Quellen" aktivieren:**
   - Beim ersten Mal öffnen der APK erscheint eine Warnung
   - Tippen Sie auf **"Einstellungen"** oder **"Erlauben"**
   - Aktivieren Sie **"Apps aus dieser Quelle installieren"**

2. **Installation starten:**
   - Tippen Sie auf **"Installieren"**
   - Warten Sie, bis die Installation abgeschlossen ist

3. **App öffnen:**
   - Tippen Sie auf **"Öffnen"** oder finden Sie die App im App-Menü
   - App-Name: **"KWS Beta App"**

## Troubleshooting

### "APK kann nicht installiert werden"
- Prüfen Sie, ob "Apps aus unbekannten Quellen" aktiviert ist
- Prüfen Sie, ob genug Speicherplatz vorhanden ist
- Versuchen Sie, eine ältere Version zu deinstallieren, falls vorhanden

### "App ist beschädigt"
- Bauen Sie die APK neu:
  ```bash
  npm run cap:sync
  npm run cap:open:android
  ```
- In Android Studio: Build → Clean Project, dann Build → Rebuild Project

### "USB-Debugging funktioniert nicht"
- Prüfen Sie, ob USB-Debugging auf dem Handy aktiviert ist
- Prüfen Sie, ob das richtige USB-Kabel verwendet wird (Datenübertragung, nicht nur Laden)
- Versuchen Sie einen anderen USB-Port

## Schnellstart

**Alles in einem:**

1. Android Studio öffnen: `npm run cap:open:android`
2. In Android Studio: Build → Build APK(s)
3. APK finden: `android/app/build/outputs/apk/debug/app-debug.apk`
4. APK auf Handy kopieren (USB, E-Mail, Cloud)
5. Auf Handy: APK öffnen → Installieren → Öffnen

**Fertig! 🎉**

