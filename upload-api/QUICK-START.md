# 🚀 Quick Start - All-Inkl Setup

## Was ich für dich tun kann ✅

Ich habe bereits erstellt:
- ✅ PHP Upload-Script (`upload.php`)
- ✅ PHP Delete-Script (`delete.php`)
- ✅ Konfiguration (`.htaccess`)
- ✅ Frontend-Integration (bereits im Code)
- ✅ Test-Seite (`upload-test.html`)

## Was du noch machen musst (5 Minuten)

### 1. Dateien hochladen (2 Minuten)

**Option A: Mit All-Inkl Dateimanager (einfachste Methode)**
1. Gehe zu All-Inkl Control Panel
2. Klicke auf "Dateimanager" oder "File Manager"
3. Navigiere zu: `cdn.kletterwelt-sauerland.de`
4. Erstelle Ordner `upload-api` (falls nicht vorhanden)
5. Öffne `upload-api` Ordner
6. Ziehe diese 3 Dateien per Drag & Drop hinein:
   - `upload.php`
   - `delete.php`
   - `.htaccess`
7. Erstelle Ordner `uploads` im Root-Verzeichnis

**Option B: Mit FTP-Client**
- Verbinde dich mit FTP zu All-Inkl
- Lade die 3 Dateien in `upload-api/` hoch
- Erstelle `uploads/` Verzeichnis

### 2. SSL aktivieren (1 Minute)

1. All-Inkl Control Panel → "SSL" oder "Zertifikate"
2. Aktiviere SSL für `cdn.kletterwelt-sauerland.de`
3. Fertig! (kann 5-10 Minuten dauern bis aktiv)

### 3. Environment Variable setzen (30 Sekunden)

Öffne `.env.local` und ändere:
```env
VITE_USE_ALLINKL_STORAGE=true
```

Dann Dev-Server neu starten: `npm run dev`

### 4. Testen (1 Minute)

1. Öffne `upload-api/upload-test.html` im Browser
2. Lade eine Test-Datei hoch
3. Prüfe ob es funktioniert

**ODER**

1. Öffne deine App
2. Gehe zu Setter-Bereich
3. Lade ein Test-Video hoch

## ✅ Fertig!

Wenn alles funktioniert, werden alle neuen Uploads über All-Inkl laufen und deine Supabase-Kosten reduzieren.

## 🆘 Hilfe

Falls etwas nicht funktioniert:
1. Prüfe Browser-Konsole (F12) auf Fehler
2. Teste die API direkt mit `upload-test.html`
3. Prüfe PHP Error Logs in All-Inkl Control Panel

## 📝 Checkliste

- [ ] Dateien hochgeladen (`upload.php`, `delete.php`, `.htaccess`)
- [ ] `uploads/` Verzeichnis erstellt
- [ ] SSL aktiviert
- [ ] `VITE_USE_ALLINKL_STORAGE=true` gesetzt
- [ ] Dev-Server neu gestartet
- [ ] Test-Upload erfolgreich

