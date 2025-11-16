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

---

## cleanup-unused-videos.js

Dieses Skript löscht Videos aus dem All-Inkl CDN, die nicht mehr in der Datenbank referenziert sind (z.B. nach mehrfacher Migration oder beim Bearbeiten von Boulders).

### Voraussetzungen

1. Installiere die benötigten Dependencies:
```bash
npm install node-fetch dotenv
```

2. Stelle sicher, dass `.env.local` die folgenden Variablen enthält:
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (wichtig: Service Role Key für Admin-Zugriff)
- `VITE_ALLINKL_API_URL` (optional, Standard: https://cdn.kletterwelt-sauerland.de/upload-api)

### Verwendung

**Dry-Run (zeigt nur an, welche Videos gelöscht würden):**
```bash
npm run cleanup:videos:dry-run
# oder
node scripts/cleanup-unused-videos.js --dry-run
```

**Tatsächliches Löschen:**
```bash
npm run cleanup:videos
# oder
node scripts/cleanup-unused-videos.js
```

**Mit automatischer Bestätigung (nur für Tests):**
```bash
node scripts/cleanup-unused-videos.js --confirm
```

### Was das Skript macht

1. Lädt alle Video-URLs aus der Datenbank (nur All-Inkl CDN URLs)
2. Listet alle Videos im CDN-Verzeichnis auf
3. Findet Videos, die im CDN sind, aber nicht in der Datenbank referenziert werden
4. Löscht diese ungenutzten Videos (nur wenn nicht im Dry-Run-Modus)
5. Zeigt eine detaillierte Zusammenfassung

### Sicherheitshinweise

- **Immer zuerst mit `--dry-run` testen!** Das zeigt, welche Videos gelöscht würden, ohne sie tatsächlich zu löschen
- Das Skript fragt vor dem Löschen nach Bestätigung (5 Sekunden Wartezeit)
- Verwende den Service Role Key nur für Scripts, nie im Frontend-Code
- Das Skript normalisiert URLs (entfernt Query-Parameter), um Duplikate zu vermeiden

### Beispiel-Ausgabe

```
🧹 Starting cleanup of unused videos...

Mode: DRY RUN (no files will be deleted)

📊 Fetching video URLs from database...
✅ Found 15 unique video URLs in database
📂 Fetching video URLs from CDN...
✅ Found 23 videos in CDN

============================================================
📊 Summary:
  Videos in database: 15
  Videos in CDN: 23
  Unused videos (to be deleted): 8
============================================================

🗑️  Unused videos:
  1. video_abc123.mp4
     https://cdn.kletterwelt-sauerland.de/uploads/video_abc123.mp4
  ...

ℹ️  DRY RUN: No videos were actually deleted.
   Run without --dry-run to actually delete these videos.
```

