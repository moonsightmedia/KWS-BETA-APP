# All-Inkl Hybrid Storage Setup

Diese Anleitung erklärt, wie du die Hybrid-Lösung (Supabase Auth/DB + All-Inkl Storage) einrichtest.

**📌 Schnellstart:** Siehe `upload-api/QUICK-START.md` für die einfachste Anleitung!

## Schritt 1: PHP-Scripts auf All-Inkl hochladen

1. **Verzeichnisstruktur erstellen:**
   ```
   /www/htdocs/w011eb93/cdn.kletterwelt-sauerland.de/
   ├── upload-api/
   │   ├── upload.php
   │   ├── delete.php
   │   └── .htaccess
   └── uploads/
       ├── videos/
       └── sectors/
   ```

2. **Dateien hochladen:**
   - Lade die Dateien aus `upload-api/` auf deinen All-Inkl Server hoch
   - Stelle sicher, dass PHP 8.4 aktiviert ist (siehe Screenshot)

3. **Berechtigungen setzen:**
   ```bash
   chmod 755 upload-api/
   chmod 644 upload-api/*.php
   chmod 644 upload-api/.htaccess
   chmod 755 upload-api/uploads/
   ```

## Schritt 2: SSL aktivieren

1. Gehe zu deinem All-Inkl Control Panel
2. Aktiviere SSL für `cdn.kletterwelt-sauerland.de`
3. Warte bis SSL aktiviert ist (kann einige Minuten dauern)

## Schritt 3: Environment Variables setzen

1. Öffne `.env.local` in deinem Projekt
2. Setze die folgenden Variablen:
   ```env
   VITE_USE_ALLINKL_STORAGE=true
   VITE_ALLINKL_API_URL=https://cdn.kletterwelt-sauerland.de/upload-api
   ```

3. **Wichtig:** Nach Änderungen an `.env.local`:
   - Stoppe den Dev-Server (Ctrl+C)
   - Starte ihn neu: `npm run dev`

## Schritt 4: Testen

1. **Upload testen:**
   - Öffne die App im Browser
   - Gehe zum Setter-Bereich
   - Lade ein kleines Test-Video hoch (<5MB)
   - Prüfe, ob der Upload funktioniert

2. **Chunked Upload testen:**
   - Lade ein größeres Video hoch (>5MB)
   - Prüfe, ob der Progress-Balken korrekt funktioniert
   - Prüfe, ob das Video nach dem Upload verfügbar ist

3. **Delete testen:**
   - Lösche ein hochgeladenes Video
   - Prüfe, ob es wirklich gelöscht wurde

## Troubleshooting

### Problem: Upload schlägt fehl mit CORS-Fehler
**Lösung:** Prüfe `.htaccess` - CORS-Header müssen korrekt gesetzt sein

### Problem: "File size mismatch" Fehler
**Lösung:** Prüfe PHP `upload_max_filesize` und `post_max_size` in `.htaccess`

### Problem: Videos werden nicht angezeigt
**Lösung:** 
- Prüfe, ob die Dateien im `uploads/` Verzeichnis sind
- Prüfe, ob die URLs korrekt sind (https://cdn.kletterwelt-sauerland.de/uploads/...)
- Prüfe Browser-Konsole auf Fehler

### Problem: Chunked Upload funktioniert nicht
**Lösung:**
- Prüfe PHP Error Logs auf All-Inkl
- Stelle sicher, dass alle Chunks in der richtigen Reihenfolge hochgeladen werden
- Prüfe Session-ID wird korrekt übergeben

## Fallback zu Supabase

Falls All-Inkl nicht funktioniert, setze einfach:
```env
VITE_USE_ALLINKL_STORAGE=false
```

Die App fällt automatisch auf Supabase Storage zurück.

## Performance

- **Kleine Dateien (<5MB):** Direkter Upload, ähnlich wie Supabase
- **Große Dateien (>5MB):** Chunked Upload, stabil auch bei langsamer Verbindung
- **Progress Tracking:** Echtzeit-Fortschritt wird angezeigt

## Sicherheit

- ✅ Dateityp-Validierung
- ✅ Dateigrößen-Limits
- ✅ Directory Traversal Protection
- ✅ Sichere Dateinamen-Generierung
- ✅ CORS-Konfiguration

## Nächste Schritte

Nach erfolgreichem Setup:
1. Teste mit verschiedenen Dateigrößen
2. Prüfe, ob alte Supabase-Videos weiterhin funktionieren
3. Migriere ggf. bestehende Videos zu All-Inkl (optional)

