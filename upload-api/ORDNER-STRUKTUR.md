# Ordnerstruktur für All-Inkl Server

## 📁 Benötigte Ordnerstruktur

Auf deinem All-Inkl Server (im Root-Verzeichnis von `cdn.kletterwelt-sauerland.de`) musst du folgende Ordnerstruktur haben:

```
Root-Verzeichnis (cdn.kletterwelt-sauerland.de)
├── upload-api/
│   ├── upload.php
│   ├── delete.php
│   ├── list-videos.php
│   └── .htaccess
└── uploads/
    └── thumbnails/          ← NEU: Für Boulder-Thumbnails
```

**Wichtig:** 
- **Sektor-Bilder** werden normalerweise in **Supabase Storage** gespeichert (Bucket `sector-images`), NICHT auf All-Inkl
- Nur wenn `VITE_USE_ALLINKL_STORAGE=true` ist, werden Sektor-Bilder auch auf All-Inkl hochgeladen (dann in `uploads/sectors/{sectorId}/`)

## ✅ Zu erstellende Ordner

### 1. `uploads/` (Hauptverzeichnis)
- **Status**: Sollte bereits existieren
- **Zweck**: Hauptverzeichnis für alle Uploads
- **Berechtigungen**: 755

### 2. `uploads/thumbnails/` ⭐ NEU
- **Status**: Muss erstellt werden
- **Zweck**: Speichert alle Boulder-Thumbnail-Bilder (wenn All-Inkl Storage aktiviert ist)
- **Berechtigungen**: 755
- **Wichtig**: Dieser Ordner wird für neue Thumbnail-Uploads benötigt

### 3. `uploads/sectors/` (Optional - nur wenn All-Inkl Storage aktiviert)
- **Status**: Wird automatisch erstellt, wenn ein Sektor-Bild hochgeladen wird UND `VITE_USE_ALLINKL_STORAGE=true` ist
- **Zweck**: Speichert Sektor-Bilder auf All-Inkl (normalerweise werden sie in Supabase gespeichert)
- **Berechtigungen**: 755 (wird automatisch gesetzt)
- **Hinweis**: Standardmäßig werden Sektor-Bilder in Supabase Storage gespeichert, nicht auf All-Inkl

## 📝 Anleitung zum Erstellen

### Option A: Mit All-Inkl Dateimanager (im Browser)
1. Gehe zu All-Inkl Control Panel → "Dateimanager"
2. Navigiere zu: `cdn.kletterwelt-sauerland.de`
3. Öffne den `uploads/` Ordner
4. Klicke auf "Neuer Ordner"
5. Name: `thumbnails`
6. Erstellen

### Option B: Mit FTP-Client
1. Verbinde dich mit FTP zu All-Inkl
2. Navigiere zu: `/www/htdocs/w011eb93/cdn.kletterwelt-sauerland.de/uploads/`
3. Erstelle neuen Ordner: `thumbnails`
4. Setze Berechtigungen auf 755

## ⚠️ Wichtig

- **Videos** werden direkt in `uploads/` gespeichert (KEIN `uploads/videos/` Ordner nötig!)
- **Thumbnails** werden in `uploads/thumbnails/` gespeichert (wenn All-Inkl Storage aktiviert)
- **Sektor-Bilder** werden normalerweise in **Supabase Storage** gespeichert (Bucket `sector-images`)
  - Nur wenn `VITE_USE_ALLINKL_STORAGE=true` ist, werden sie auch auf All-Inkl in `uploads/sectors/{sectorId}/` gespeichert

## ✅ Checkliste

- [ ] `uploads/` Ordner existiert
- [ ] `uploads/thumbnails/` Ordner erstellt (nur wenn All-Inkl Storage für Thumbnails verwendet wird)
- [ ] Berechtigungen auf 755 gesetzt
- [ ] `upload-api/upload.php` ist aktualisiert (mit Thumbnail-Unterstützung)
- [ ] `VITE_USE_ALLINKL_STORAGE=true` in `.env.local` gesetzt (wenn All-Inkl Storage verwendet werden soll)

