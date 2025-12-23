# Video-Kompression Optionen für KWS Beta App

## 🎯 Ziel
Videos in mehreren Qualitäten (HD/SD/Low) erstellen, obwohl All-Inkl Shared Hosting keine serverseitige Kompression unterstützt.

---

## ✅ Option 1: Nur Original-Videos (AKTUELL AKTIV)
**Status:** ✅ Funktioniert bereits

**Beschreibung:**
- Videos werden direkt hochgeladen ohne Kompression
- Fallback ist bereits implementiert

**Vorteile:**
- ✅ Funktioniert sofort
- ✅ Keine zusätzlichen Kosten
- ✅ Keine Server-Konfiguration nötig

**Nachteile:**
- ❌ Größere Dateien
- ❌ Längere Upload-Zeiten
- ❌ Mehr Speicherplatz

**Aufwand:** Keine Änderungen nötig

---

## ✅ Option 2: Client-seitige Kompression (FFmpeg.wasm)
**Status:** ⚠️ Code vorhanden, aber deaktiviert

**Beschreibung:**
- Kompression läuft im Browser des Users
- Verwendet FFmpeg.wasm (WebAssembly)
- Erstellt HD/SD/Low-Varianten

**Vorteile:**
- ✅ Keine Server-Kosten
- ✅ Mehrere Qualitäten möglich
- ✅ Funktioniert ohne Server-Konfiguration

**Nachteile:**
- ❌ Kann auf iOS/Samsung problematisch sein
- ❌ Benötigt Browser-Ressourcen
- ❌ Längere Verarbeitungszeit im Browser

**Kosten:** Keine

**Aufwand:** Niedrig (Code wieder aktivieren + Fehlerbehandlung verbessern)

---

## ✅ Option 3: Cloudflare Workers mit FFmpeg
**Status:** 🔄 Neu implementieren

**Beschreibung:**
- Cloudflare Workers unterstützen FFmpeg.wasm
- Läuft auf Cloudflare Edge-Servern
- API-Endpoint für Video-Kompression

**Vorteile:**
- ✅ Professionell und zuverlässig
- ✅ Läuft auf Edge-Servern (schnell)
- ✅ Skalierbar

**Nachteile:**
- ❌ Zusätzliche Kosten
- ❌ Neue Infrastruktur nötig

**Kosten:** 
- Free Tier: 100.000 Requests/Tag
- Paid: $5/Monat + $0.50 pro Million Requests

**Aufwand:** Mittel (neue API erstellen)

**Implementierung:**
```typescript
// Cloudflare Worker Beispiel
export default {
  async fetch(request: Request) {
    // FFmpeg.wasm in Worker
    // Video komprimieren
    // Zurückgeben
  }
}
```

---

## ✅ Option 4: Supabase Edge Functions
**Status:** 🔄 Neu implementieren

**Beschreibung:**
- Nutzt dein bestehendes Supabase-Projekt
- Edge Functions können FFmpeg verwenden
- Läuft auf Supabase-Servern

**Vorteile:**
- ✅ Nutzt bestehende Infrastruktur
- ✅ Keine zusätzliche Authentifizierung nötig
- ✅ Integriert mit deiner Datenbank

**Nachteile:**
- ❌ FFmpeg.wasm kann langsam sein
- ❌ Timeout-Limits (60 Sekunden)

**Kosten:** Teil deines Supabase-Plans

**Aufwand:** Mittel (Edge Function erstellen)

---

## ✅ Option 5: Externe Video-APIs (Managed Services)

### 5a: Mux.com
**Beschreibung:**
- Upload Video → automatische Transkodierung
- Erstellt automatisch mehrere Qualitäten
- CDN-Delivery inklusive

**Vorteile:**
- ✅ Sehr professionell
- ✅ Automatische Qualitätsvarianten
- ✅ CDN-Delivery
- ✅ Analytics

**Nachteile:**
- ❌ Zusätzliche Kosten
- ❌ Externe Abhängigkeit

**Kosten:** 
- $0.01 pro Minute Video (Encoding)
- $0.015 pro GB Delivery

**Aufwand:** Niedrig (API-Integration)

**Beispiel:**
```typescript
// Mux API Integration
const response = await fetch('https://api.mux.com/video/v1/assets', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${muxToken}`,
  },
  body: formData
});
```

### 5b: Cloudflare Stream
**Beschreibung:**
- Ähnlich wie Mux
- Upload → automatische Transkodierung
- Integriert mit Cloudflare CDN

**Vorteile:**
- ✅ Sehr schnell (Cloudflare CDN)
- ✅ Automatische Qualitäten
- ✅ Gute Performance

**Nachteile:**
- ❌ Zusätzliche Kosten
- ❌ Externe Abhängigkeit

**Kosten:**
- $1 pro 1000 Minuten Video
- $0.01 pro GB Delivery

**Aufwand:** Niedrig (API-Integration)

### 5c: Bunny.net Video API
**Beschreibung:**
- Günstige Alternative zu Mux/Cloudflare
- Upload → Transkodierung
- CDN-Delivery

**Vorteile:**
- ✅ Sehr günstig
- ✅ Gute Performance

**Nachteile:**
- ❌ Weniger Features als Mux
- ❌ Externe Abhängigkeit

**Kosten:**
- $0.005 pro Minute Video
- $0.01 pro GB Delivery

**Aufwand:** Niedrig (API-Integration)

---

## ✅ Option 6: Vercel/Netlify Serverless Functions
**Status:** 🔄 Neu implementieren

**Beschreibung:**
- Serverless Functions mit FFmpeg
- Läuft bei Bedarf
- Pay-as-you-go

**Vorteile:**
- ✅ Free Tier verfügbar
- ✅ Skalierbar
- ✅ Keine Server-Verwaltung

**Nachteile:**
- ❌ Timeout-Limits (10 Sekunden Free, 60 Sekunden Pro)
- ❌ FFmpeg.wasm kann langsam sein

**Kosten:**
- Free Tier: 100 GB-Hours/Monat
- Pro: $20/Monat

**Aufwand:** Mittel (neue API erstellen)

---

## ✅ Option 7: Separater VPS nur für Kompression
**Status:** 🔄 Neu implementieren

**Beschreibung:**
- Kleiner VPS (z.B. Hetzner, DigitalOcean)
- Installiere FFmpeg dort
- API-Endpoint für Kompression

**Vorteile:**
- ✅ Volle Kontrolle
- ✅ Keine Timeout-Limits
- ✅ Günstig

**Nachteile:**
- ❌ Server-Verwaltung nötig
- ❌ Zusätzliche Infrastruktur

**Kosten:** ~€3-5/Monat (kleiner VPS)

**Aufwand:** Mittel-Hoch (Server-Setup + API)

**Beispiel:**
- Hetzner Cloud CX11: €3.29/Monat
- DigitalOcean Droplet: $4/Monat

---

## ✅ Option 8: All-Inkl Managed Server Upgrade
**Status:** 🔄 Server-Upgrade nötig

**Beschreibung:**
- Upgrade auf Managed Server bei All-Inkl
- FFmpeg und exec() verfügbar
- Bestehende PHP-Scripts funktionieren

**Vorteile:**
- ✅ Nutzt bestehende Infrastruktur
- ✅ Keine Code-Änderungen nötig
- ✅ Alles an einem Ort

**Nachteile:**
- ❌ Höhere Hosting-Kosten
- ❌ Server-Verwaltung

**Kosten:** ~€10-20/Monat mehr

**Aufwand:** Niedrig (nur Server-Upgrade)

---

## ✅ Option 9: Hybrid-Lösung (Client + Fallback)
**Status:** 🔄 Code anpassen

**Beschreibung:**
- Versuche Client-Kompression im Browser
- Bei Fehler/Timeout: Original hochladen
- Beste Kompatibilität

**Vorteile:**
- ✅ Funktioniert auf allen Geräten
- ✅ Optimiert wo möglich
- ✅ Keine zusätzlichen Kosten

**Nachteile:**
- ❌ Nicht alle Videos werden komprimiert
- ❌ Browser-Ressourcen nötig

**Kosten:** Keine

**Aufwand:** Niedrig (Code-Anpassung)

**Implementierung:**
```typescript
try {
  // Versuche Client-Kompression
  const compressed = await compressVideoMultiQuality(file);
  // Upload komprimierte Videos
} catch (error) {
  // Fallback: Original hochladen
  await uploadOriginal(file);
}
```

---

## 📊 Vergleichstabelle

| Option | Kosten/Monat | Aufwand | Zuverlässigkeit | Performance |
|--------|-------------|---------|-----------------|-------------|
| 1. Nur Original | €0 | Keine | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 2. Client-seitig | €0 | Niedrig | ⭐⭐⭐ | ⭐⭐⭐ |
| 3. Cloudflare Workers | €5+ | Mittel | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 4. Supabase Edge | Teil von Plan | Mittel | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 5a. Mux.com | ~€10-50 | Niedrig | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 5b. Cloudflare Stream | ~€5-30 | Niedrig | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 5c. Bunny.net | ~€3-15 | Niedrig | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 6. Vercel/Netlify | €0-20 | Mittel | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 7. Separater VPS | €3-5 | Mittel-Hoch | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 8. All-Inkl Upgrade | €10-20 | Niedrig | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 9. Hybrid | €0 | Niedrig | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 Empfehlung

### Für schnelle Lösung:
**Option 1 (Nur Original)** - Funktioniert bereits, keine Änderungen nötig

### Für beste Balance:
**Option 9 (Hybrid)** - Versucht Kompression, fällt auf Original zurück

### Für professionelle Lösung:
**Option 5a (Mux.com)** oder **Option 5b (Cloudflare Stream)** - Managed Service, sehr zuverlässig

### Für günstige Lösung:
**Option 5c (Bunny.net)** - Sehr günstig, gute Performance

### Für volle Kontrolle:
**Option 7 (Separater VPS)** - Günstig, volle Kontrolle

---

## 💡 Nächste Schritte

1. **Entscheide dich für eine Option**
2. **Ich implementiere die Lösung**
3. **Teste die Implementierung**
4. **Deploy**

Welche Option bevorzugst du?

