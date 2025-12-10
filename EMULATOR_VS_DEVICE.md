# Unterschied: Emulator vs. Echtes Gerät

## Warum funktioniert es im Emulator, aber nicht auf dem Gerät?

### Im Emulator (Android Studio Debugging)

**Wie es funktioniert:**
- Android Studio lädt Assets **direkt aus dem Dateisystem**: `android/app/src/main/assets/public/`
- Beim Debugging wird keine APK installiert
- Assets werden automatisch synchronisiert, wenn Sie `npx cap sync` ausführen
- **Immer die neuesten Assets** werden verwendet

**Vorteile:**
- ✅ Schnelles Testen ohne APK-Build
- ✅ Automatische Asset-Synchronisierung
- ✅ Immer aktuelle Version

### Auf dem echten Gerät

**Wie es funktioniert:**
- Assets werden aus der **installierten APK** geladen
- Die APK ist eine ZIP-Datei, die Assets zum Zeitpunkt des Builds enthält
- Wenn Sie Assets ändern, **muss die APK neu gebaut werden**
- Alte APK kann alte Asset-Referenzen enthalten

**Probleme:**
- ❌ APK muss nach jeder Asset-Änderung neu gebaut werden
- ❌ Alte APK kann alte Assets enthalten
- ❌ Cache kann alte Versionen speichern

## Workflow für echte Geräte

**Nach jeder Änderung:**

1. **Web-App bauen:**
   ```bash
   npm run build
   ```

2. **Assets synchronisieren:**
   ```bash
   npx cap sync
   ```

3. **APK neu bauen:**
   ```bash
   cd android
   .\gradlew.bat clean assembleDebug
   ```

4. **Alte APK deinstallieren:**
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall com.kletterwelt.beta
   ```

5. **Neue APK installieren:**
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r android\app\build\outputs\apk\debug\app-debug.apk
   ```

## Häufige Fehler

**❌ Assets ändern, aber APK nicht neu bauen:**
- Problem: Alte APK enthält noch alte Asset-Referenzen
- Lösung: Immer APK neu bauen nach `npx cap sync`

**❌ Alte APK nicht deinstallieren:**
- Problem: Cache kann alte Versionen enthalten
- Lösung: Immer alte APK deinstallieren oder `-r` (replace) verwenden

**❌ Assets synchronisieren, aber nicht bauen:**
- Problem: `npx cap sync` kopiert Assets, aber APK muss neu gebaut werden
- Lösung: Nach `npx cap sync` immer APK neu bauen

## Zusammenfassung

| Aktion | Emulator | Echtes Gerät |
|--------|----------|--------------|
| Assets ändern | ✅ Automatisch | ❌ APK neu bauen nötig |
| Assets synchronisieren | ✅ Automatisch | ✅ `npx cap sync` |
| APK bauen | ❌ Nicht nötig | ✅ **Immer nötig** |
| Installation | ❌ Nicht nötig | ✅ **Immer nötig** |

**Wichtig:** Im Emulator funktioniert es, weil Android Studio Assets direkt lädt. Auf dem echten Gerät müssen Sie die APK immer neu bauen und installieren!

