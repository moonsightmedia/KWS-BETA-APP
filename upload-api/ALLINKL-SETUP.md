# All-Inkl Setup - Visuelle Anleitung

## ✅ Schritt 1: Dateien sind bereits hochgeladen!

Du hast bereits hochgeladen:
- ✅ `upload.php`
- ✅ `delete.php`
- ✅ `.htaccess`

## 📁 Schritt 2: Ordnerstruktur erstellen

### 2.1: `upload-api` Ordner erstellen

1. Klicke auf **"Neuer Ordner"** (oben links)
2. Name eingeben: `upload-api`
3. Erstellen

### 2.2: Dateien in `upload-api` verschieben

1. **Checkboxen aktivieren** bei:
   - ☑ `upload.php`
   - ☑ `delete.php`
   - ☑ `.htaccess`

2. Klicke auf **"Verschieben"** (oben oder unten)

3. Ziel eingeben: `upload-api`

4. Bestätigen

### 2.3: `uploads` Ordner erstellen

1. Klicke auf **"Neuer Ordner"**
2. Name eingeben: `uploads`
3. Erstellen

## ✅ Schritt 3: Prüfen

Die Struktur sollte so aussehen:

```
Root-Verzeichnis:
├── upload-api/
│   ├── upload.php
│   ├── delete.php
│   └── .htaccess
├── uploads/
└── index.htm (kann bleiben)
```

## 🔒 Schritt 4: SSL aktivieren

1. Gehe zurück zur Subdomain-Übersicht
2. Klicke auf **"SSL-Schutz"** → **"Bearbeiten"**
3. Aktiviere SSL
4. Warte 5-10 Minuten

## ⚙️ Schritt 5: Environment Variable

Öffne `.env.local` und ändere:
```env
VITE_USE_ALLINKL_STORAGE=true
```

Dann Dev-Server neu starten!

## ✅ Fertig!

Jetzt sollten Uploads über All-Inkl laufen! 🎉

