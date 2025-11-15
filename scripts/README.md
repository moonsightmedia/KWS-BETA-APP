# Migration Scripts

## migrate-videos-to-allinkl.js

Dieses Skript überträgt alle Videos von Supabase Storage zu All-Inkl CDN.

### Voraussetzungen

1. Installiere die benötigten Dependencies:
```bash
npm install node-fetch form-data dotenv
```

2. Stelle sicher, dass `.env.local` die folgenden Variablen enthält:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_ALLINKL_API_URL` (optional, Standard: https://cdn.kletterwelt-sauerland.de/upload-api)

### Verwendung

```bash
node scripts/migrate-videos-to-allinkl.js
```

### Was das Skript macht

1. Findet alle Boulder mit Supabase-Video-URLs
2. Lädt Videos von Supabase herunter
3. Lädt Videos zu All-Inkl hoch (mit Chunked Upload für große Dateien)
4. Aktualisiert die Datenbank mit den neuen All-Inkl-URLs
5. Zeigt eine Zusammenfassung der Migration

### Hinweise

- Das Skript überspringt Videos, die bereits bei All-Inkl liegen
- Fehlerhafte Videos werden protokolliert, aber die Migration wird fortgesetzt
- Große Videos werden in 5MB-Chunks hochgeladen

