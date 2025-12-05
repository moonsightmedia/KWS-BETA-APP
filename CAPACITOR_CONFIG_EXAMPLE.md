# Capacitor Config für Live Reload

## Aktuelle Config (Production)

```typescript
server: {
  // Für Development: lokale URL
  // url: 'http://localhost:8080',
  // cleartext: true,
  
  // Für Production: Live-URL (optional - kann auch lokal gebaut werden)
  // url: 'https://beta.kletterwelt-sauerland.de',
},
```

## Für Live Reload ändern zu:

```typescript
server: {
  url: 'http://192.168.2.80:8080', // Ihre lokale IP-Adresse hier eintragen!
  cleartext: true, // Erlaubt HTTP (nur für Development!)
},
```

## Schritt-für-Schritt

1. **Ihre IP-Adresse finden**:
   ```bash
   npm run dev:mobile
   ```
   Das Script zeigt Ihre IP (z.B. `192.168.2.80`)

2. **Config öffnen**: `capacitor.config.ts`

3. **Ändern Sie diese Zeilen**:
   - Entfernen Sie die `//` vor `url: 'http://localhost:8080',`
   - Ersetzen Sie `localhost` mit Ihrer IP-Adresse
   - Entfernen Sie die `//` vor `cleartext: true,`

4. **Ergebnis sollte so aussehen**:
   ```typescript
   server: {
     url: 'http://192.168.2.80:8080', // Ihre IP hier!
     cleartext: true,
   },
   ```

## Wichtig

- **IP-Adresse**: Muss Ihre lokale Netzwerk-IP sein (nicht localhost!)
- **Port**: Standard ist 8080, kann aber 8081 sein wenn 8080 belegt ist
- **cleartext: true**: Nur für Development! Vor Production entfernen!

## Beispiel

Wenn `npm run dev:mobile` zeigt:
```
📱 Lokale IP: 192.168.2.80
🌐 URL: http://192.168.2.80:8080
```

Dann ändern Sie:
```typescript
// VORHER:
server: {
  // url: 'http://localhost:8080',
  // cleartext: true,
},

// NACHHER:
server: {
  url: 'http://192.168.2.80:8080',
  cleartext: true,
},
```

## Nach dem Ändern

1. Capacitor synchronisieren:
   ```bash
   npm run cap:sync
   ```

2. App neu bauen:
   ```bash
   npm run cap:build:android
   ```

3. Neue APK installieren

4. Dev Server starten:
   ```bash
   npm run dev
   ```

5. App öffnen → Lädt jetzt vom Dev Server! 🎉


