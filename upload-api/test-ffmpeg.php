<?php
/**
 * Test Script: Prüft ob FFmpeg auf All-Inkl verfügbar ist
 * 
 * Lade diese Datei hoch und öffne sie im Browser:
 * https://cdn.kletterwelt-sauerland.de/upload-api/test-ffmpeg.php
 */

header("Content-Type: text/html; charset=utf-8");
?>
<!DOCTYPE html>
<html>
<head>
    <title>FFmpeg Test - All-Inkl</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .test { margin: 15px 0; padding: 10px; border-left: 4px solid #ddd; }
        .success { background: #d4edda; border-color: #28a745; color: #155724; }
        .error { background: #f8d7da; border-color: #dc3545; color: #721c24; }
        .warning { background: #fff3cd; border-color: #ffc107; color: #856404; }
        .info { background: #d1ecf1; border-color: #17a2b8; color: #0c5460; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .result { margin-top: 20px; padding: 15px; border-radius: 4px; }
        .result.success { background: #d4edda; border: 2px solid #28a745; }
        .result.error { background: #f8d7da; border: 2px solid #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 FFmpeg Verfügbarkeits-Test</h1>
        <p>Dieses Script prüft, ob FFmpeg auf deinem All-Inkl Server verfügbar ist.</p>
        
        <?php
        $results = [];
        $allTestsPassed = true;
        
        // Test 1: exec() verfügbar?
        echo '<div class="test">';
        echo '<h3>Test 1: PHP exec() Funktion</h3>';
        if (function_exists('exec')) {
            echo '<div class="success">✅ exec() ist verfügbar</div>';
            $results['exec'] = true;
        } else {
            echo '<div class="error">❌ exec() ist NICHT verfügbar</div>';
            echo '<p>Die exec() Funktion ist deaktiviert. Kontaktiere All-Inkl Support um sie zu aktivieren.</p>';
            $results['exec'] = false;
            $allTestsPassed = false;
        }
        echo '</div>';
        
        // Test 2: shell_exec() verfügbar?
        echo '<div class="test">';
        echo '<h3>Test 2: PHP shell_exec() Funktion</h3>';
        if (function_exists('shell_exec')) {
            echo '<div class="success">✅ shell_exec() ist verfügbar</div>';
            $results['shell_exec'] = true;
        } else {
            echo '<div class="error">❌ shell_exec() ist NICHT verfügbar</div>';
            echo '<p>Die shell_exec() Funktion ist deaktiviert. Kontaktiere All-Inkl Support um sie zu aktivieren.</p>';
            $results['shell_exec'] = false;
            $allTestsPassed = false;
        }
        echo '</div>';
        
        // Test 3: FFmpeg im PATH finden
        echo '<div class="test">';
        echo '<h3>Test 3: FFmpeg im System-PATH finden</h3>';
        if ($results['shell_exec']) {
            $ffmpegPath = trim(shell_exec('which ffmpeg 2>/dev/null') ?: '');
            if ($ffmpegPath) {
                echo '<div class="success">✅ FFmpeg gefunden bei: <code>' . htmlspecialchars($ffmpegPath) . '</code></div>';
                $results['ffmpeg_path'] = $ffmpegPath;
            } else {
                echo '<div class="warning">⚠️ FFmpeg nicht im PATH gefunden</div>';
                $results['ffmpeg_path'] = null;
            }
        } else {
            echo '<div class="error">❌ Kann nicht prüfen (shell_exec() nicht verfügbar)</div>';
            $results['ffmpeg_path'] = null;
        }
        echo '</div>';
        
        // Test 4: FFmpeg in Standard-Pfaden suchen
        echo '<div class="test">';
        echo '<h3>Test 4: FFmpeg in Standard-Pfaden suchen</h3>';
        $commonPaths = [
            '/usr/bin/ffmpeg',
            '/usr/local/bin/ffmpeg',
            '/opt/ffmpeg/bin/ffmpeg',
            '/bin/ffmpeg',
        ];
        
        $foundPaths = [];
        foreach ($commonPaths as $path) {
            if (file_exists($path)) {
                $foundPaths[] = $path;
            }
        }
        
        if (!empty($foundPaths)) {
            echo '<div class="success">✅ FFmpeg gefunden in folgenden Pfaden:</div>';
            echo '<ul>';
            foreach ($foundPaths as $path) {
                echo '<li><code>' . htmlspecialchars($path) . '</code></li>';
            }
            echo '</ul>';
            if (!$results['ffmpeg_path']) {
                $results['ffmpeg_path'] = $foundPaths[0];
            }
        } else {
            echo '<div class="warning">⚠️ FFmpeg nicht in Standard-Pfaden gefunden</div>';
        }
        echo '</div>';
        
        // Test 5: FFmpeg ausführen
        echo '<div class="test">';
        echo '<h3>Test 5: FFmpeg ausführen</h3>';
        if ($results['exec'] && $results['ffmpeg_path']) {
            $output = [];
            $returnCode = 0;
            exec(escapeshellarg($results['ffmpeg_path']) . ' -version 2>&1', $output, $returnCode);
            
            if ($returnCode === 0 && !empty($output)) {
                echo '<div class="success">✅ FFmpeg funktioniert!</div>';
                echo '<pre>' . htmlspecialchars(implode("\n", array_slice($output, 0, 5))) . '</pre>';
                $results['ffmpeg_works'] = true;
            } else {
                echo '<div class="error">❌ FFmpeg gefunden, aber Ausführung fehlgeschlagen</div>';
                echo '<pre>Return Code: ' . $returnCode . "\n";
                echo htmlspecialchars(implode("\n", $output)) . '</pre>';
                $results['ffmpeg_works'] = false;
                $allTestsPassed = false;
            }
        } else {
            echo '<div class="warning">⚠️ Kann nicht testen (exec() nicht verfügbar oder FFmpeg nicht gefunden)</div>';
            $results['ffmpeg_works'] = false;
        }
        echo '</div>';
        
        // Zusammenfassung
        echo '<div class="result ' . ($allTestsPassed && $results['ffmpeg_works'] ? 'success' : 'error') . '">';
        echo '<h2>📊 Zusammenfassung</h2>';
        
        if ($allTestsPassed && isset($results['ffmpeg_works']) && $results['ffmpeg_works']) {
            echo '<p><strong>✅ Alles OK! FFmpeg ist verfügbar und funktioniert.</strong></p>';
            echo '<p>Du kannst jetzt <code>process-video-qualities.php</code> hochladen und verwenden.</p>';
        } else {
            echo '<p><strong>❌ FFmpeg ist nicht verfügbar oder funktioniert nicht.</strong></p>';
            echo '<h3>Nächste Schritte:</h3>';
            echo '<ol>';
            if (!$results['exec'] || !$results['shell_exec']) {
                echo '<li><strong>Kontaktiere All-Inkl Support:</strong> Bitte um Aktivierung von <code>exec()</code> und <code>shell_exec()</code></li>';
            }
            if (!$results['ffmpeg_path'] || !isset($results['ffmpeg_works']) || !$results['ffmpeg_works']) {
                echo '<li><strong>Kontaktiere All-Inkl Support:</strong> Frage ob FFmpeg installiert werden kann</li>';
            }
            echo '<li><strong>Alternative:</strong> Die App funktioniert auch ohne Kompression - Original-Videos werden hochgeladen</li>';
            echo '</ol>';
        }
        echo '</div>';
        
        // PHP Info (optional, für Debugging)
        if (isset($_GET['phpinfo'])) {
            echo '<div class="test">';
            echo '<h3>PHP Konfiguration (nur für Debugging)</h3>';
            echo '<pre>';
            echo 'PHP Version: ' . phpversion() . "\n";
            echo 'max_execution_time: ' . ini_get('max_execution_time') . "\n";
            echo 'memory_limit: ' . ini_get('memory_limit') . "\n";
            echo 'disable_functions: ' . ini_get('disable_functions') . "\n";
            echo '</pre>';
            echo '</div>';
        } else {
            echo '<p><a href="?phpinfo=1">PHP Konfiguration anzeigen</a></p>';
        }
        ?>
    </div>
</body>
</html>

