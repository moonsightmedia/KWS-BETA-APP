# KWS Video-Pipeline

Stand: 11. August 2026

Der gehärtete Hostinger-Dienst ist produktiv ausgerollt. Die App- und iOS-Änderungen sind im lokalen Arbeitsstand implementiert und geprüft, aber noch nicht als Web-/TestFlight-Version veröffentlicht.

## Zielbild

Videos werden zentral auf dem Hostinger-VPS unter `video.kletterwelt-sauerland.de` gespeichert und dort mit FFmpeg in drei progressive MP4-Dateien umgewandelt. Supabase speichert nur die fertigen URLs am Boulder. Vorschaubilder bleiben auf dem bestehenden All-Inkl-Endpunkt.

Es gibt keine zweite Supabase-Transcode-Queue und keinen All-Inkl-FFmpeg-Worker. Der versionierte Servercode liegt unter `hostinger-video-server/`.

## Ablauf

1. Die App wählt das Video aus. Auf iOS wird es ohne Base64-Zwischenschritt in den App-Cache kopiert.
2. Das lokale iOS-Plugin erstellt bei Bedarf mit `AVAssetReader`/`AVAssetWriter` einen kontrollierten Upload-Master: H.264/AAC, höchstens 1920 Pixel lange Kante, höchstens 30 fps und ungefähr 5 Mbit/s Video. Geeignete kleine Quellen werden nicht erneut encodiert. Ein ungültiges oder nicht mindestens zehn Prozent kleineres Ergebnis wird verworfen; dann lädt die App das Original hoch.
3. Web und native App laden Videos in 5-MiB-Blöcken an `VITE_VIDEO_API_URL`, ersatzweise an das bisherige `VITE_NATIVE_VIDEO_API_URL` oder fest an `https://video.kletterwelt-sauerland.de`. Ein Rückfall auf All-Inkl ist für Videos ausgeschlossen.
4. Der Hostinger-Dienst prüft das Supabase-JWT und die Rolle `setter` oder `admin`, bindet Upload-Session und Job an den Benutzer, prüft Chunk-Hashes und reserviert Queue- sowie Speicherplatz.
5. Der Dienst fügt die Chunks zusammen und erzeugt privat HD, SD und Low. Erst wenn alle drei Dateien mit `ffprobe` validiert sind, macht ein atomarer Ready-Marker die gesamte Familie sichtbar.
6. Die Upload-Antwort enthält zunächst `status`, `job_id`, `url` und `urls`. Die App fragt `upload-status.php` abortfähig bis `completed` ab. Erst danach schreibt sie mit einem einzelnen Boulder-PATCH `beta_video_url` und `beta_video_urls = {hd,sd,low}`.
7. Der bestehende Player wählt anhand der Verbindung eine Qualität und kann bei Pufferproblemen auf eine kleinere Variante wechseln. `beta_video_url` bleibt der HD-/Legacy-Fallback.

## Serververtrag

- `POST /upload.php`: authentifizierter, fortsetzbarer Chunk-Upload
- `GET /upload-status.php?session_id=...`: Status für Besitzer oder Admin
- `GET /jobs/:jobId`: Jobstatus für Besitzer oder Admin
- `POST /delete.php`: löscht eine vollständige Video-Familie; Besitzer oder Admin, Altbestand ohne Eigentümerdaten nur Admin
- `GET /videos/{sector}/{file}`: öffentliche Wiedergabe fertiger Dateien
- `GET /health`: nicht geheime Queue-, Kapazitäts- und Speicherwerte

Die drei Profile sind:

| Profil | maximale lange Kante | Video-Limit | Audio |
| --- | ---: | ---: | ---: |
| HD | 1920 px | 4 Mbit/s | AAC 128 kbit/s |
| SD | 1280 px | 2 Mbit/s | AAC 96 kbit/s |
| Low | 640 px | 600 kbit/s | AAC 64 kbit/s |

Alle Profile sind H.264/yuv420p, höchstens 30 fps, `faststart`, ohne übernommene Metadaten oder Kapitel und ohne Hochskalierung. Quellen ohne Audio bleiben ohne Audio. Vor dem Ready-Marker liefern neue Rendition-URLs `404` mit `no-store`; danach wird die vollständige Familie unveränderlich ausgeliefert.

## Persistenz, Sicherheit und Wiederanlauf

Session-Manifeste, Jobs und Eigentümerdaten liegen auf dem Hostinger-Datenvolume. Zustände `reserved`, `queued` und `processing` werden nach einem Neustart wieder aufgenommen. Gleichzeitige Zugriffe auf dieselbe Session sind serialisiert; identische Chunk-Wiederholungen sind idempotent, abweichende Bytes führen zu `409`.

Der Dienst begrenzt Dateigröße, Chunkzahl, Queue, parallele Multipart-Requests, aktive Sessions pro Benutzer, verwalteten Speicher und freien Plattenpuffer. Verwaltete Pfade dürfen das Datenverzeichnis nicht verlassen und keine Symlink-Kette benutzen. Unfertige Sessions werden nach einer Frist bereinigt. Veröffentlichte Videos werden absichtlich nicht automatisch gelöscht; dafür gelten der geschützte Lösch-Endpunkt sowie Speicherüberwachung und ein separates Retention-Runbook.

## Deployment und Abnahme

Der Live-Datenordner und die vorhandene `.env` dürfen bei einem Update weder ersetzt noch in Git kopiert werden. Auf einem separaten Kandidaten sind mindestens auszuführen:

```sh
npm ci
npm test
docker compose config
docker compose build
```

Danach folgen ein authentifizierter Upload mit Ton, ein Upload ohne Ton, Polling bis `completed`, Abruf aller drei Qualitätsstufen, Owner-/Admin-Negativtests, Neustart-Recovery sowie Speicher- und Queue-Prüfung. Erst anschließend wird der Live-Container mit festem Rollback aktualisiert.

Die native iOS-Implementierung lässt sich unter Windows nur statisch und über den TypeScript-/Capacitor-Build prüfen. Vor TestFlight sind deshalb ein echter Xcode-Build auf macOS und ein Upload-/Abbruch-/Wiedergabetest auf einem iPhone verpflichtend.
