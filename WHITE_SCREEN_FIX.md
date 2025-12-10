# Weißer Bildschirm Fix - Checkliste

## Problem
Die App zeigt einen weißen Bildschirm, wenn sie als installierte APK läuft, funktioniert aber in Android Studio.

## Behobene Probleme

### ✅ 1. Crossorigin Attribute entfernt
- **Problem:** `crossorigin` Attribute auf `<script>` und `<link>` Tags verursachen Probleme in Capacitor
- **Fix:** Vite-Plugin erstellt, das `crossorigin` automatisch entfernt
- **Dateien:**
  - `vite-plugin-remove-crossorigin.ts` - Plugin erstellt
  - `vite.config.ts` - Plugin hinzugefügt
  - `dist/index.html` - Keine `crossorigin` Attribute mehr
  - `android/app/src/main/assets/public/index.html` - Aktualisiert

### ✅ 2. Network Security Config hinzugefügt
- **Problem:** Android benötigt explizite Netzwerk-Sicherheitskonfiguration für HTTPS
- **Fix:** `network_security_config.xml` erstellt
- **Dateien:**
  - `android/app/src/main/res/xml/network_security_config.xml` - Erstellt
  - `android/app/src/main/AndroidManifest.xml` - Referenz hinzugefügt

### ✅ 3. Relative Pfade konfiguriert
- **Problem:** Absolute Pfade (`/assets/...`) funktionieren nicht in Capacitor
- **Fix:** `base: './'` in `vite.config.ts`
- **Status:** Bereits konfiguriert ✅

## Nächste Schritte

1. **APK neu bauen:**
   ```bash
   npm run cap:build:android
   ```
   Oder in Android Studio: Build → Build APK(s)

2. **APK installieren:**
   - Alte Version deinstallieren (falls vorhanden)
   - Neue APK installieren

3. **Testen:**
   - App öffnen
   - Prüfen, ob Daten geladen werden
   - Falls weiterhin weißer Bildschirm → Logs prüfen (siehe unten)

## Debugging

### Logs anzeigen (während App läuft):

**Per ADB:**
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" logcat -c
# App öffnen
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" logcat | Select-String -Pattern "chromium|WebView|Capacitor|ERROR|FATAL|console"
```

**Chrome DevTools:**
1. Chrome öffnen: `chrome://inspect`
2. Gerät auswählen
3. App auswählen → "inspect"
4. Console-Tab zeigt JavaScript-Fehler

### Häufige Probleme

**Weißer Bildschirm bleibt:**
- Prüfen Sie die Console-Logs (Chrome DevTools)
- Prüfen Sie, ob Assets geladen werden (Network-Tab)
- Prüfen Sie, ob Supabase-Requests erfolgreich sind

**Assets werden nicht geladen:**
- Prüfen Sie `dist/index.html` - Pfade sollten relativ sein (`./assets/...`)
- Prüfen Sie, ob `base: './'` in `vite.config.ts` gesetzt ist

**Supabase-Requests schlagen fehl:**
- Prüfen Sie Network Security Config
- Prüfen Sie, ob `.env.production` korrekt ist
- Prüfen Sie Logs für CORS- oder Netzwerkfehler

## Bekannte Fixes

Alle bekannten Fixes wurden angewendet:
- ✅ Relative Pfade (`base: './'`)
- ✅ Network Security Config
- ✅ Crossorigin Attribute entfernt
- ✅ Service Worker deaktiviert
- ✅ React Query Cache-Clearing auf Reload

Die APK sollte jetzt funktionieren!

