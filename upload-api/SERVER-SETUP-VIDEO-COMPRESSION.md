# Archiv: Server-Setup für Videokomprimierung

Die frühere synchrone PHP-/FFmpeg-Idee für All-Inkl ist stillgelegt. Die Endpunkte `process-video-qualities.php` und `test-ffmpeg.php` antworten absichtlich mit HTTP 410 und dürfen nicht als Produktionspfad verwendet werden.

Der aktuelle Upload-, Queue-, FFmpeg- und Speicherpfad läuft auf dem Hostinger-VPS. Siehe `docs/video-transcoding-architecture.md` und `hostinger-video-server/README.md`.
