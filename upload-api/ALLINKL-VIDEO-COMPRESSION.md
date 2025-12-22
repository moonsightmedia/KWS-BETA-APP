# Video-Kompression bei All-Inkl Shared Hosting

## ⚠️ Wichtige Einschränkungen bei All-Inkl Shared Hosting

Bei **Shared Hosting** (wie All-Inkl) gibt es typischerweise folgende Einschränkungen:

1. **FFmpeg ist oft NICHT verfügbar** - Shared Hosting bietet meist keine FFmpeg-Installation
2. **`exec()` und `shell_exec()` sind oft deaktiviert** - Aus Sicherheitsgründen
3. **Kein SSH-Zugang** - Du kannst keine Pakete selbst installieren
4. **Begrenzte Ressourcen** - CPU/Memory-Limits für PHP-Scripts

## ✅ Option 1: All-Inkl Support kontaktieren (ERSTE WAHRSCHENLICHKEIT)

**Schritt 1:** Kontaktiere den All-Inkl Support
- Support-Ticket erstellen
- Frage: "Ist FFmpeg auf meinem Shared Hosting verfügbar?"
- Frage: "Sind `exec()` und `shell_exec()` PHP-Funktionen aktiviert?"

**Mögliche Antworten:**
- ✅ **"Ja, FFmpeg ist verfügbar"** → Perfekt! Weiter mit Schritt 2
- ❌ **"Nein, FFmpeg ist nicht verfügbar"** → Siehe Option 2 oder 3
- ⚠️ **"exec() ist deaktiviert"** → Bitte um Aktivierung (oft möglich gegen Aufpreis)

## ✅ Option 2: Kompression weglassen (EINFACHSTE LÖSUNG)

Falls FFmpeg nicht verfügbar ist, kannst du **nur das Original-Video** hochladen:

**Vorteile:**
- ✅ Funktioniert sofort
- ✅ Keine Server-Konfiguration nötig
- ✅ Upload startet sofort

**Nachteile:**
- ❌ Größere Dateien
- ❌ Längere Upload-Zeiten
- ❌ Mehr Speicherplatz nötig

**Implementierung:**
- Die App lädt bereits das Original hoch
- Falls Kompression fehlschlägt, wird das Original verwendet (Fallback ist bereits implementiert)
- Du musst nichts ändern - es funktioniert bereits!

## ✅ Option 3: Externer Kompressions-Service

Falls All-Inkl FFmpeg nicht unterstützt, kannst du einen **externen Service** verwenden:

### Option 3a: Cloud Functions (z.B. Vercel, Netlify)
- Erstelle eine separate API mit FFmpeg
- Diese API komprimiert Videos
- All-Inkl lädt nur das Original hoch

### Option 3b: Separater VPS/Server
- Miete einen kleinen VPS (z.B. bei Hetzner, DigitalOcean)
- Installiere FFmpeg dort
- Rufe die Kompression-API von All-Inkl aus auf

### Option 3c: Supabase Edge Functions
- Nutze Supabase Edge Functions für Kompression
- Läuft auf Supabase-Servern (nicht auf All-Inkl)

## ✅ Option 4: Testen ob FFmpeg verfügbar ist

**Test-Script erstellen:**

Erstelle eine Datei `test-ffmpeg.php`:

```php
<?php
header("Content-Type: text/plain");

echo "Testing FFmpeg availability...\n\n";

// Test 1: Check if exec() is available
if (function_exists('exec')) {
    echo "✅ exec() is available\n";
} else {
    echo "❌ exec() is NOT available\n";
}

// Test 2: Check if shell_exec() is available
if (function_exists('shell_exec')) {
    echo "✅ shell_exec() is available\n";
} else {
    echo "❌ shell_exec() is NOT available\n";
}

// Test 3: Try to find FFmpeg
$ffmpegPath = trim(shell_exec('which ffmpeg 2>/dev/null') ?: '');
if ($ffmpegPath) {
    echo "✅ FFmpeg found at: $ffmpegPath\n";
    
    // Test 4: Try to run FFmpeg
    $output = [];
    $returnCode = 0;
    exec("$ffmpegPath -version 2>&1", $output, $returnCode);
    
    if ($returnCode === 0) {
        echo "✅ FFmpeg is working!\n";
        echo "Version: " . $output[0] . "\n";
    } else {
        echo "❌ FFmpeg found but not working\n";
    }
} else {
    echo "❌ FFmpeg not found in PATH\n";
    
    // Try common paths
    $commonPaths = [
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg',
        '/opt/ffmpeg/bin/ffmpeg',
    ];
    
    foreach ($commonPaths as $path) {
        if (file_exists($path)) {
            echo "✅ Found FFmpeg at: $path\n";
            break;
        }
    }
}
?>
```

**Test durchführen:**
1. Lade `test-ffmpeg.php` auf All-Inkl hoch
2. Öffne: `https://cdn.kletterwelt-sauerland.de/upload-api/test-ffmpeg.php`
3. Prüfe die Ausgabe

## 📋 Empfohlene Vorgehensweise

### Schritt 1: Test-Script ausführen
- Erstelle `test-ffmpeg.php` und teste es
- Prüfe ob FFmpeg verfügbar ist

### Schritt 2: Basierend auf Ergebnis

**Falls FFmpeg verfügbar:**
1. ✅ Lade `process-video-qualities.php` hoch
2. ✅ Teste Video-Upload
3. ✅ Fertig!

**Falls FFmpeg NICHT verfügbar:**
1. ✅ Kontaktiere All-Inkl Support
2. ✅ Frage nach FFmpeg-Installation
3. ✅ Falls nicht möglich: Nutze Option 2 (nur Original) oder Option 3 (externer Service)

## 🔧 Aktuelle Implementierung

**Gute Nachricht:** Die App funktioniert bereits ohne Kompression!

- ✅ Original-Video wird hochgeladen
- ✅ Falls Kompression fehlschlägt → Original wird verwendet
- ✅ Keine Fehler, alles funktioniert

**Du musst also nichts ändern** - die Kompression ist ein "Nice-to-have", aber nicht zwingend notwendig.

## 💡 Empfehlung

1. **Teste zuerst** ob FFmpeg verfügbar ist (Test-Script)
2. **Falls ja:** Nutze server-seitige Kompression
3. **Falls nein:** 
   - Kontaktiere All-Inkl Support
   - Falls nicht möglich: Nutze nur Original-Videos (funktioniert bereits!)

Die App funktioniert in beiden Fällen! 🎉

