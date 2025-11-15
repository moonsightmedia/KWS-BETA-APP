# All-Inkl Upload API

Diese PHP-Scripts ermöglichen das Hochladen und Löschen von Beta-Videos und Sektor-Bildern auf All-Inkl.

## Installation

1. **Upload-Verzeichnis erstellen:**
   - Erstelle auf deinem All-Inkl Server das Verzeichnis `uploads/` im Root-Verzeichnis der Subdomain
   - Setze die Berechtigungen auf 755

2. **PHP-Scripts hochladen:**
   - Lade `upload.php`, `delete.php` und `.htaccess` in das `upload-api/` Verzeichnis hoch
   - Beispiel: `/www/htdocs/w011eb93/cdn.kletterwelt-sauerland.de/upload-api/`

3. **Verzeichnisstruktur:**
   ```
   upload-api/
   ├── upload.php
   ├── delete.php
   ├── .htaccess
   └── uploads/
       ├── videos/
       └── sectors/
           └── {sectorId}/
   ```

4. **Berechtigungen setzen:**
   ```bash
   chmod 755 upload-api/
   chmod 644 upload-api/*.php
   chmod 755 upload-api/uploads/
   ```

5. **Environment Variables in der App setzen:**
   ```env
   VITE_USE_ALLINKL_STORAGE=true
   VITE_ALLINKL_API_URL=https://cdn.kletterwelt-sauerland.de/upload-api
   ```

## Features

- ✅ Chunked Upload für große Dateien (>5MB)
- ✅ Progress Tracking
- ✅ Automatische Verzeichnisstruktur
- ✅ Sicherheitsprüfungen
- ✅ CORS Support
- ✅ Fehlerbehandlung

## API Endpunkte

### POST /upload.php
Upload einer Datei (Video oder Bild)

**Headers:**
- `X-File-Name`: Dateiname
- `X-File-Size`: Dateigröße in Bytes
- `X-File-Type`: MIME-Type
- `X-Chunk-Number`: Chunk-Nummer (optional, für Chunked Upload)
- `X-Total-Chunks`: Gesamtanzahl Chunks (optional)
- `X-Upload-Session-Id`: Session-ID für Chunked Upload (optional)
- `X-Sector-Id`: Sektor-ID (optional, für Sektor-Bilder)

**Body:**
- `file` oder `chunk`: Die hochzuladende Datei

**Response:**
```json
{
  "success": true,
  "url": "https://cdn.kletterwelt-sauerland.de/uploads/videos/filename.ext",
  "fileName": "filename.ext",
  "fileSize": 1234567
}
```

### POST /delete.php
Löschen einer Datei

**Body:**
```json
{
  "url": "https://cdn.kletterwelt-sauerland.de/uploads/videos/filename.ext"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## Sicherheit

- ✅ Dateityp-Validierung
- ✅ Dateigrößen-Limits
- ✅ Directory Traversal Protection
- ✅ Sichere Dateinamen-Generierung
- ✅ CORS-Konfiguration

## Troubleshooting

**Problem: Upload schlägt fehl**
- Prüfe PHP `upload_max_filesize` und `post_max_size` in `.htaccess`
- Prüfe Verzeichnis-Berechtigungen (755 für Verzeichnisse, 644 für Dateien)
- Prüfe PHP Error Logs

**Problem: CORS Fehler**
- Prüfe `.htaccess` CORS-Header
- Stelle sicher, dass die Domain in den Headers erlaubt ist

**Problem: Chunked Upload funktioniert nicht**
- Prüfe, ob alle Chunks in der richtigen Reihenfolge hochgeladen werden
- Prüfe Session-ID wird korrekt übergeben

