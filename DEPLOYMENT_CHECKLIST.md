# Deployment Checklist

## ✅ Abgeschlossen

### Schritt 1: Branch auf main mergen
- [x] Alle Änderungen committed
- [x] Branch auf main gemerged
- [x] Auf origin/main gepusht

### Schritt 2: PWA für App Stores optimieren
- [x] Manifest-Datei optimiert
- [x] Service Worker erweitert
- [x] PWA Meta-Tags hinzugefügt
- [x] Build-Konfiguration geprüft

### Schritt 3: App Store Vorbereitung
- [x] Dokumentation erstellt (APP_STORE_DEPLOYMENT.md)
- [x] Icon-Anforderungen dokumentiert (ICON_REQUIREMENTS.md)
- [x] Icon-Generierungs-Script erstellt
- [x] README aktualisiert

## 🔄 Zu erledigen

### Schritt 4: Deployment sicherstellen

#### Web-Deployment prüfen
- [ ] HTTPS ist aktiviert (erforderlich für PWA)
- [ ] Domain `beta.kletterwelt-sauerland.de` funktioniert
- [ ] Service Worker wird geladen (`/service-worker.js`)
- [ ] Manifest wird geladen (`/manifest.webmanifest`)
- [ ] Alle Assets werden korrekt geladen

#### PWA-Funktionalität testen
- [ ] **Installation testen**:
  - [ ] Chrome/Edge: "Zur Startseite hinzufügen" funktioniert
  - [ ] Safari (iOS): "Zum Home-Bildschirm" funktioniert
  - [ ] Firefox: "Als App installieren" funktioniert
- [ ] **Offline-Funktionalität**:
  - [ ] App startet offline
  - [ ] Navigation funktioniert offline
  - [ ] Service Worker Cache funktioniert
- [ ] **Update-Mechanismus**:
  - [ ] Service Worker Update wird erkannt
  - [ ] Cache wird korrekt invalidiert
  - [ ] Neue Version wird geladen

#### Browser-Kompatibilität
- [ ] Chrome (Desktop & Mobile)
- [ ] Safari (iOS)
- [ ] Firefox
- [ ] Edge

#### Performance
- [ ] Ladezeiten akzeptabel
- [ ] Service Worker Cache funktioniert
- [ ] Bilder werden korrekt geladen
- [ ] Videos funktionieren

### Schritt 5: App Store Vorbereitung (Manuell)

#### Icons generieren
- [ ] PWA Icons (192x192, 512x512)
- [ ] Android App Icon (512x512)
- [ ] Android Feature Graphic (1024x500)
- [ ] iOS App Icon (1024x1024)
- [ ] Screenshots für beide Stores

#### PWA zu Native App konvertieren
- [ ] PWABuilder oder Capacitor einrichten
- [ ] Android App generieren
- [ ] iOS App generieren (falls gewünscht)

#### App Store Metadaten
- [ ] App-Beschreibung schreiben
- [ ] Screenshots erstellen
- [ ] Privacy Policy erstellen
- [ ] Kontaktinformationen vorbereiten

#### Testing
- [ ] Native App auf Android testen
- [ ] Native App auf iOS testen (falls gewünscht)
- [ ] Performance testen
- [ ] Offline-Funktionalität testen

## 📝 Notizen

### Aktuelle Konfiguration
- **Domain**: beta.kletterwelt-sauerland.de
- **HTTPS**: Erforderlich (muss aktiviert sein)
- **Service Worker**: `/service-worker.js` (v3)
- **Manifest**: `/manifest.webmanifest`
- **Theme Color**: #36B531 (Grün)

### Bekannte Einschränkungen
- Service Worker funktioniert nur mit HTTPS
- Native Apps müssen manuell aktualisiert werden
- Web-App aktualisiert sich automatisch

## 🚀 Nächste Schritte

1. **Icons generieren**: 
   ```bash
   node scripts/generate-icons.js
   ```
   (Benötigt ImageMagick)

2. **PWABuilder verwenden**:
   ```bash
   npm install -g @pwabuilder/cli
   pwabuilder https://beta.kletterwelt-sauerland.de
   ```

3. **Oder Capacitor einrichten**:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npm install @capacitor/android @capacitor/ios
   npx cap init
   ```

4. **Testing durchführen**:
   - PWA-Installation testen
   - Offline-Funktionalität testen
   - Verschiedene Browser testen

5. **App Stores vorbereiten**:
   - Google Play Console Account erstellen
   - Apple Developer Account erstellen (falls iOS)
   - Apps hochladen und veröffentlichen

## 📚 Weitere Ressourcen

- [APP_STORE_DEPLOYMENT.md](APP_STORE_DEPLOYMENT.md) - Vollständige Anleitung
- [ICON_REQUIREMENTS.md](ICON_REQUIREMENTS.md) - Icon-Anforderungen
- [PWABuilder Dokumentation](https://docs.pwabuilder.com/)
- [Capacitor Dokumentation](https://capacitorjs.com/docs)

