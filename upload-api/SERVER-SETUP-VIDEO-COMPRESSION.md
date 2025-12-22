# Server-Setup für Video-Kompression

## Übersicht
Die Video-Kompression läuft jetzt **server-seitig** statt im Browser. Dafür muss FFmpeg auf dem Server installiert sein.

## Schritt 1: FFmpeg installieren

### Prüfen ob FFmpeg bereits installiert ist:
```bash
ffmpeg -version
```

Falls FFmpeg **nicht** installiert ist:

### Option A: All-Inkl Shared Hosting (empfohlen)
1. Kontaktiere den All-Inkl Support
2. Bitte um Installation von FFmpeg
3. Warte auf Bestätigung

**Alternative:** Falls All-Inkl FFmpeg nicht unterstützt, kannst du einen VPS oder einen anderen Hosting-Anbieter verwenden.

### Option B: VPS/Server mit SSH-Zugang
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install ffmpeg

# CentOS/RHEL
sudo yum install epel-release
sudo yum install ffmpeg

# Prüfen
ffmpeg -version
```

## Schritt 2: PHP-Script hochladen

1. **Lade `process-video-qualities.php` hoch:**
   - Ziel: `/www/htdocs/w011eb93/cdn.kletterwelt-sauerland.de/upload-api/process-video-qualities.php`
   - Berechtigungen: `644`

2. **Prüfe Verzeichnisstruktur:**
   ```
   upload-api/
   ├── upload.php
   ├── process-video-qualities.php  ← NEU
   ├── delete.php
   └── uploads/
       └── final/
           └── [sectorId]/  (optional)
   ```

## Schritt 3: Berechtigungen setzen

```bash
# PHP-Script
chmod 644 upload-api/process-video-qualities.php

# Upload-Verzeichnis (muss beschreibbar sein)
chmod 755 upload-api/uploads/
chmod 755 upload-api/uploads/final/

# Falls sectorId-Unterverzeichnisse verwendet werden
chmod 755 upload-api/uploads/final/*/
```

## Schritt 4: FFmpeg-Pfad prüfen

Das Script sucht automatisch nach FFmpeg. Falls FFmpeg nicht im Standard-Pfad ist:

1. Finde den FFmpeg-Pfad:
   ```bash
   which ffmpeg
   # Oder
   whereis ffmpeg
   ```

2. Falls nötig, passe `process-video-qualities.php` an (Zeile 81):
   ```php
   // Standard (automatisch)
   $ffmpegPath = trim(shell_exec('which ffmpeg 2>/dev/null') ?: 'ffmpeg');
   
   // Falls FFmpeg woanders ist:
   $ffmpegPath = '/usr/bin/ffmpeg'; // Beispiel-Pfad
   ```

## Schritt 5: Testen

### Test 1: FFmpeg verfügbar?
Öffne im Browser:
```
https://cdn.kletterwelt-sauerland.de/upload-api/process-video-qualities.php
```

**Erwartete Antwort bei fehlendem Parameter:**
```json
{"error": "Missing video_url or video_path"}
```

**Falls FFmpeg fehlt:**
```json
{"error": "FFmpeg is not installed on the server"}
```

### Test 2: Kompression funktioniert?
1. Lade ein Video über die App hoch
2. Prüfe ob die Qualitäten erstellt werden:
   - `video_hd.mp4`
   - `video_sd.mp4`
   - `video_low.mp4`
3. Prüfe Browser-Konsole auf Fehler

## Schritt 6: PHP-Konfiguration prüfen

Stelle sicher, dass PHP folgende Funktionen erlaubt:
- `exec()` - für FFmpeg-Aufrufe
- `shell_exec()` - für FFmpeg-Pfad-Suche

Falls diese Funktionen deaktiviert sind (z.B. durch `disable_functions`):
1. Kontaktiere All-Inkl Support
2. Bitte um Aktivierung von `exec()` und `shell_exec()`
3. Oder verwende einen VPS mit voller Kontrolle

## Troubleshooting

### Problem: "FFmpeg is not installed on the server"
**Lösung:**
- FFmpeg installieren (siehe Schritt 1)
- Oder FFmpeg-Pfad manuell setzen (siehe Schritt 4)

### Problem: "Permission denied" beim Ausführen von FFmpeg
**Lösung:**
```bash
# Prüfe Berechtigungen
ls -la $(which ffmpeg)

# Falls nötig, Berechtigungen anpassen
chmod 755 $(which ffmpeg)
```

### Problem: Kompression dauert zu lange / Timeout
**Lösung:**
- Prüfe PHP `max_execution_time` in `.htaccess` oder `php.ini`
- Erhöhe Timeout falls nötig:
  ```php
  set_time_limit(600); // 10 Minuten
  ```

### Problem: "Video file not found"
**Lösung:**
- Prüfe ob das Original-Video erfolgreich hochgeladen wurde
- Prüfe Verzeichnisstruktur und Berechtigungen
- Prüfe ob `sectorId` korrekt übergeben wird

### Problem: Kompression erstellt keine Dateien
**Lösung:**
- Prüfe Schreibrechte auf `uploads/final/`
- Prüfe PHP Error Logs
- Prüfe ob genug Speicherplatz vorhanden ist

## Performance-Tipps

1. **FFmpeg Preset:** Das Script verwendet `-preset fast` für schnellere Kompression
2. **Parallel Processing:** Aktuell werden Qualitäten sequenziell erstellt (kann optimiert werden)
3. **Queue System:** Für viele Uploads könnte ein Queue-System sinnvoll sein

## Nächste Schritte

Nach erfolgreicher Installation:
1. ✅ Teste Video-Upload in der App
2. ✅ Prüfe ob Qualitäten erstellt werden
3. ✅ Prüfe Browser-Konsole auf Fehler
4. ✅ Prüfe Server-Logs bei Problemen

## Support

Falls Probleme auftreten:
1. Prüfe PHP Error Logs
2. Prüfe Browser-Konsole (F12)
3. Teste `process-video-qualities.php` direkt mit einem Test-Video
4. Kontaktiere Support falls FFmpeg nicht installiert werden kann

