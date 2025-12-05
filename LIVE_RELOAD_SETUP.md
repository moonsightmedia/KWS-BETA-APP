# Live Reload Setup für Android (wie Expo)

## 🚀 Schnellstart

### Option 1: Automatisch (Empfohlen)

```bash
npm run dev:android
```

Das Script:
1. Findet Ihre lokale IP-Adresse
2. Zeigt einen QR-Code an
3. Aktualisiert `capacitor.config.ts` automatisch
4. Startet den Vite Dev Server
5. Synchronisiert Capacitor
6. Startet die Android App mit Live Reload

**Wichtig**: Falls Port 8080 belegt ist, verwendet Vite einen anderen Port (z.B. 8081). 
Prüfen Sie die Vite-Ausgabe und aktualisieren Sie `capacitor.config.ts` mit dem richtigen Port!

### Option 2: Manuell

```bash
# 1. QR-Code anzeigen
npm run dev:mobile

# 2. In separatem Terminal: Dev Server starten
npm run dev

# 3. Capacitor Config manuell anpassen (siehe unten)
# 4. App einmal bauen und installieren
npm run cap:build:android
```

## 📱 Einmalige Einrichtung

### Schritt 1: Lokale IP finden

```bash
npm run dev:mobile
```

Das Script zeigt:
- Ihre lokale IP-Adresse (z.B. `192.168.1.100`)
- Einen QR-Code mit der URL
- Die vollständige URL (z.B. `http://192.168.1.100:8080`)

### Schritt 2: Capacitor Config anpassen

Öffnen Sie `capacitor.config.ts` und aktivieren Sie die Development-URL:

```typescript
server: {
  url: 'http://192.168.1.100:8080', // Ihre lokale IP und Port hier eintragen
  cleartext: true, // Erlaubt HTTP (nur für Development!)
},
```

**Wichtig**: 
- Ersetzen Sie `192.168.1.100` mit Ihrer tatsächlichen IP-Adresse!
- Prüfen Sie den Port in der Vite-Ausgabe (kann 8081 sein wenn 8080 belegt ist)

### Schritt 3: App einmal bauen und installieren

```bash
npm run cap:sync
npm run cap:build:android
```

Installieren Sie die APK auf Ihrem Gerät.

### Schritt 4: Dev Server starten

```bash
npm run dev
```

Die App lädt jetzt automatisch vom Dev Server!

## 🔄 Live Reload verwenden

Nach der einmaligen Einrichtung:

1. **Dev Server starten**:
   ```bash
   npm run dev
   ```

2. **App auf Gerät öffnen**

3. **Code ändern** → Änderungen werden automatisch auf dem Gerät angezeigt! 🎉

## 📋 Wichtige Hinweise

### Voraussetzungen

- **PC und Handy müssen im gleichen WLAN sein**
- **Firewall muss Port 8080 erlauben**
- **Android App muss einmal gebaut und installiert sein**

### Sicherheit

- `cleartext: true` erlaubt HTTP (nur für Development!)
- **Nicht für Production verwenden!**
- Vor dem Release: `cleartext: true` entfernen oder auf `false` setzen

### Troubleshooting

**App lädt nicht:**
- Prüfen Sie, ob PC und Handy im gleichen WLAN sind
- Prüfen Sie die Firewall-Einstellungen
- Prüfen Sie, ob die IP-Adresse korrekt ist

**QR-Code funktioniert nicht:**
- Der QR-Code ist nur zur Referenz
- Sie müssen die URL manuell in `capacitor.config.ts` eintragen

**Live Reload funktioniert nicht:**
- Stellen Sie sicher, dass `npm run dev` läuft
- Prüfen Sie die Konsole auf Fehler
- Versuchen Sie, die App neu zu starten

## 🎯 Vergleich mit Expo

| Feature | Expo | Capacitor |
|---------|------|-----------|
| QR-Code scannen | ✅ Automatisch | ⚠️ Manuelle Konfiguration nötig |
| Live Reload | ✅ Automatisch | ✅ Nach Setup automatisch |
| Hot Reload | ✅ | ✅ |
| Native Features | ⚠️ Begrenzt | ✅ Vollständig |

## 💡 Tipps

- **IP-Adresse ändert sich?** → `npm run dev:mobile` erneut ausführen und Config aktualisieren
- **Schneller Workflow**: `npm run dev:android` verwendet alles automatisch
- **Production Build**: Vor dem Release `cleartext: true` entfernen!

