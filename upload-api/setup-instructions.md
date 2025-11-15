# All-Inkl Setup - Schritt für Schritt

## Schritt 1: Dateien vorbereiten ✅

Die Dateien sind bereits erstellt:
- ✅ `upload.php` - Upload-Script
- ✅ `delete.php` - Delete-Script  
- ✅ `.htaccess` - Konfiguration

## Schritt 2: FTP-Zugang zu All-Inkl

1. Öffne dein All-Inkl Control Panel
2. Gehe zu "FTP-Zugänge" oder "Dateimanager"
3. Notiere dir:
   - FTP-Host: (z.B. `ftp.kletterwelt-sauerland.de`)
   - Benutzername: (z.B. `w011eb93`)
   - Passwort: (dein FTP-Passwort)

## Schritt 3: Dateien hochladen

### Option A: Mit FTP-Client (FileZilla, WinSCP, etc.)

1. Verbinde dich mit deinem FTP-Client zu All-Inkl
2. Navigiere zu: `/www/htdocs/w011eb93/cdn.kletterwelt-sauerland.de/`
3. Erstelle Verzeichnis `upload-api` (falls nicht vorhanden)
4. Lade hoch:
   - `upload.php` → `upload-api/upload.php`
   - `delete.php` → `upload-api/delete.php`
   - `.htaccess` → `upload-api/.htaccess`
5. Erstelle Verzeichnis `uploads` (falls nicht vorhanden)
6. Setze Berechtigungen:
   - `upload-api/` → 755
   - `upload-api/*.php` → 644
   - `upload-api/.htaccess` → 644
   - `uploads/` → 755

### Option B: Mit All-Inkl Dateimanager (im Browser)

1. Gehe zu All-Inkl Control Panel → "Dateimanager"
2. Navigiere zu: `cdn.kletterwelt-sauerland.de`
3. Erstelle Ordner `upload-api`
4. Öffne `upload-api` Ordner
5. Lade die 3 Dateien hoch (Drag & Drop)
6. Erstelle Ordner `uploads` im Root

## Schritt 4: SSL aktivieren

1. Gehe zu All-Inkl Control Panel
2. Suche nach "SSL" oder "Zertifikate"
3. Aktiviere SSL für `cdn.kletterwelt-sauerland.de`
4. Warte 5-10 Minuten bis SSL aktiv ist

## Schritt 5: Environment Variables setzen

1. Öffne `.env.local` in deinem Projekt
2. Ändere:
   ```env
   VITE_USE_ALLINKL_STORAGE=true
   ```
3. Speichere die Datei
4. Starte Dev-Server neu: `npm run dev`

## Schritt 6: Testen

1. Öffne die App
2. Gehe zu Setter-Bereich
3. Lade ein kleines Test-Video hoch
4. Prüfe ob Upload funktioniert

## Hilfe bei Problemen

Falls etwas nicht funktioniert:
1. Prüfe PHP Error Logs in All-Inkl Control Panel
2. Prüfe Browser-Konsole (F12) auf Fehler
3. Teste die API direkt: `https://cdn.kletterwelt-sauerland.de/upload-api/upload.php`

