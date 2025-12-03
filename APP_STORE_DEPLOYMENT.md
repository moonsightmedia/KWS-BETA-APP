# App Store Deployment Guide

## Übersicht

Diese App ist als PWA (Progressive Web App) konfiguriert und kann sowohl als Web-App unter `beta.kletterwelt-sauerland.de` genutzt werden als auch in den App Stores (Play Store / App Store) veröffentlicht werden.

## Voraussetzungen

- ✅ PWA Manifest konfiguriert (`public/manifest.webmanifest`)
- ✅ Service Worker implementiert (`public/service-worker.js`)
- ✅ HTTPS erforderlich (für PWA-Funktionalität)
- ✅ Domain: `beta.kletterwelt-sauerland.de`

## Schritt 1: App-Icons generieren

Für die App Stores werden verschiedene Icon-Größen benötigt:

### Android (Play Store)
- **App Icon**: 512x512px (PNG, 32-bit)
- **Feature Graphic**: 1024x500px (PNG)
- **Screenshots**: Mindestens 2, verschiedene Gerätegrößen

### iOS (App Store)
- **App Icon**: 1024x1024px (PNG, ohne Transparenz)
- **Screenshots**: 
  - iPhone: 6.7", 6.5", 5.5" Display
  - iPad: 12.9", 11" Display

### PWA Icons (bereits im Manifest)
- 192x192px
- 512x512px

**Aktuelles Logo**: `/public/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png`

## Schritt 2: PWA zu Native App konvertieren

### Option A: PWABuilder (Microsoft) - Empfohlen für Anfänger

1. **Installation**:
   ```bash
   npm install -g @pwabuilder/cli
   ```

2. **App analysieren**:
   ```bash
   pwabuilder https://beta.kletterwelt-sauerland.de
   ```

3. **Native Apps generieren**:
   - PWABuilder erstellt automatisch Android (APK/AAB) und iOS (Xcode-Projekt)
   - Folgen Sie den Anweisungen im PWABuilder Dashboard

### Option B: Bubblewrap (Google) - Für Android

1. **Installation**:
   ```bash
   npm install -g @bubblewrap/cli
   ```

2. **Projekt initialisieren**:
   ```bash
   bubblewrap init --manifest https://beta.kletterwelt-sauerland.de/manifest.webmanifest
   ```

3. **Android App erstellen**:
   ```bash
   bubblewrap build
   ```

### Option C: Capacitor (Ionic) - Für iOS und Android

1. **Installation**:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npm install @capacitor/android @capacitor/ios
   ```

2. **Capacitor initialisieren**:
   ```bash
   npx cap init "KWS Beta App" "com.kletterwelt.beta"
   ```

3. **Plattformen hinzufügen**:
   ```bash
   npx cap add android
   npx cap add ios
   ```

4. **App bauen**:
   ```bash
   npm run build
   npx cap sync
   ```

5. **In IDE öffnen**:
   ```bash
   npx cap open android  # Android Studio
   npx cap open ios      # Xcode
   ```

## Schritt 3: App Store Metadaten vorbereiten

### Play Store (Android)

**App-Informationen**:
- **App-Name**: Kletterwelt Sauerland Beta App
- **Kurzbeschreibung**: Boulder-Übersicht mit Beta-Videos, Statistiken und Wettkämpfen
- **Vollständige Beschreibung**: 
  ```
  Die offizielle Beta-App der Kletterwelt Sauerland. 
  
  Features:
  - Aktuelle Boulder-Übersicht mit Beta-Videos
  - Detaillierte Statistiken und Schwierigkeitsgrade
  - Wettkampf-Modus mit Live-Rangliste
  - Admin-Tools für Setter
  - Offline-Funktionalität
  
  Für Kletterer, die immer auf dem neuesten Stand sein wollen!
  ```

**Kategorien**: Sport, Lifestyle

**Kontakt-Informationen**:
- Entwickler: Kletterwelt Sauerland
- E-Mail: [Ihre E-Mail]
- Website: https://beta.kletterwelt-sauerland.de

### App Store (iOS)

**App-Informationen**:
- **App-Name**: KWS Beta App
- **Untertitel**: Boulder & Wettkämpfe
- **Beschreibung**: (siehe Play Store)

**Kategorien**: Sport, Lifestyle

**Altersfreigabe**: 4+ (keine problematischen Inhalte)

## Schritt 4: Privacy Policy

Für beide Stores wird eine Privacy Policy URL benötigt. Erstellen Sie eine Seite mit:

- Welche Daten werden gesammelt?
- Wie werden Daten verwendet?
- Werden Daten an Dritte weitergegeben?
- Cookie-Richtlinien
- Kontaktinformationen

**Empfohlene URL**: `https://beta.kletterwelt-sauerland.de/privacy`

## Schritt 5: Testing vor Veröffentlichung

### PWA-Funktionalität testen

1. **Installation testen**:
   - Chrome/Edge: "Zur Startseite hinzufügen"
   - Safari (iOS): "Zum Home-Bildschirm"
   - Firefox: "Als App installieren"

2. **Offline-Funktionalität**:
   - App offline starten
   - Navigieren zwischen Seiten
   - Service Worker Cache prüfen

3. **Update-Mechanismus**:
   - Service Worker Update testen
   - Cache-Invalidierung prüfen

### Native App Testing

1. **Android**:
   - Verschiedene Geräte testen
   - Verschiedene Android-Versionen
   - Performance testen

2. **iOS**:
   - Verschiedene iPhone-Modelle
   - Verschiedene iOS-Versionen
   - iPad-Kompatibilität

## Schritt 6: Veröffentlichung

### Play Store

1. Google Play Console Account erstellen (Einmalige Gebühr: 25$)
2. App erstellen und Metadaten hochladen
3. APK/AAB hochladen
4. Store-Listing vervollständigen
5. Zur Überprüfung einreichen

### App Store

1. Apple Developer Account erstellen (Jährliche Gebühr: 99$)
2. App in App Store Connect erstellen
3. Xcode-Projekt konfigurieren
4. App signieren und hochladen
5. Store-Listing vervollständigen
6. Zur Überprüfung einreichen

## Wichtige Hinweise

- **HTTPS ist Pflicht**: PWA funktioniert nur mit HTTPS
- **Service Worker**: Muss im Root-Verzeichnis liegen (`/service-worker.js`)
- **Manifest**: Muss im Root-Verzeichnis liegen (`/manifest.webmanifest`)
- **Icons**: Sollten optimiert sein (keine zu großen Dateien)
- **Updates**: Native Apps müssen manuell aktualisiert werden, Web-App aktualisiert sich automatisch

## Nützliche Tools

- **PWABuilder**: https://www.pwabuilder.com/
- **Bubblewrap**: https://github.com/GoogleChromeLabs/bubblewrap
- **Capacitor**: https://capacitorjs.com/
- **PWA Asset Generator**: https://github.com/onderceylan/pwa-asset-generator

## Support

Bei Fragen zur App Store Veröffentlichung:
- PWABuilder Dokumentation: https://docs.pwabuilder.com/
- Google Play Console Hilfe: https://support.google.com/googleplay/android-developer
- Apple App Store Connect Hilfe: https://developer.apple.com/support/app-store-connect/

