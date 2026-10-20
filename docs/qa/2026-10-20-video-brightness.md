# Gleichmäßige Videohelligkeit – 20.10.2026

## Ausgangslage und Quelle

Nutzerbeobachtung: Video auf dem iPhone sehr hell, Oberfläche daneben dunkel;
Screenshot normal, derselbe Effekt auch in Chrome. Das passt zu HDR/SDR-Mischung,
ist ohne betroffene Datei, Modell, iOS- und Buildversion noch keine Diagnose.

Frischer Git-Fetch vor Änderungen und erneut vor dem Sichern: native Integration
`origin/codex/pc-integration-android80` unverändert auf
`6d6f80ce4da719609eda15eb1c36064d9a584cb8`. Der Hauptclone liegt 20 Commits hinter
main und enthält fremde offene Änderungen; er wurde nicht verändert. Eigener
Branch `codex/consistent-video-brightness` im vorhandenen sauberen Worktree.
Der Wisch-Fix PR62 bleibt ein eigener Änderungssatz.

## Änderung

- Zentrale CSS-Regel `video { dynamic-range-limit: standard; }` für eigene
  HTML-Videos, einschließlich Detail, Feed und appinternem Vollbild. Unterstützte
  Browser begrenzen damit HDR auf den normalen Helligkeitsbereich der Oberfläche.
  Kein globaler Helligkeitseingriff am Gerät und kein CSS-Brightness-Filter.
- Server erkennt PQ/HLG sowie HDR-/Dolby-Signalisierung vor HD-Passthrough.
  Erkannte HDR-Quellen werden nicht unverändert durchgereicht.
- Tatsächliches Tone Mapping: begrenzte Zielauflösung, lineares Float-Bild,
  BT.709-Primärfarben, Hable-Tone-Mapping, SDR-Transferfunktion und 8-Bit-YUV.
  HDR-Seitendaten werden entfernt; passende SDR-Farbangaben werden gesetzt.
- Alle Ausgaben werden vor Veröffentlichung auf verbliebene HDR-Signalisierung
  geprüft. Gewohnte Auflösungen, Stummschaltung, Qualitätswahl und atomare
  Veröffentlichung bleiben erhalten. Normale SDR-Uploads behalten ihren Weg.
- Mehrdeutige HDR-Metadaten oder Dolby Vision ohne unterstützte Profile-8-Basis
  scheitern privat mit erhaltener Quelle, statt falsche Farben zu veröffentlichen.
- Docker-Build prüft die benötigten Filter. Separater CI-Workflow prüft die
  Farblogik und die vollständigen Servertests im tatsächlichen Alpine-Image.

## Prüfinventar und Ergebnisse

Zu prüfen: echte Pixelumrechnung statt bloßer Umetikettierung; PQ und HLG in
allen Qualitätsstufen; kein HDR-Passthrough; keine HDR-Signalisierung im Ergebnis;
SDR-/Ton-/Queue-/Veröffentlichungsverhalten erhalten; Begrenzung eingebettet,
nach Qualitätswechsel, im Vollbild und im Feed; Layout/Fokus/Bedienung unverändert.

- **29/29 Servertests bestanden**, einschließlich realer PQ-/HLG-Dateien in
  HD/SD/Low, veränderter Bildwerte, BT.709-Ausgabe und 8-Bit-HDR-Passthrough-Sperre.
  Bestehende Tests für Tonentfernung, Queue, Pfadgrenzen, Eigentümer, Wiederanlauf,
  Fehler und atomare Veröffentlichung eingeschlossen.
- **4/4 Farblogik-Tests bestanden**, darunter unmarkiertes SDR, kompatible
  Profile-8-Signalisierung sowie Ablehnung mehrdeutiger/Profile-5-Metadaten.
- **9/9 bestehende Player-Browsertests bestanden**: Vollbild/Fallback, Safe Areas,
  Qualitätswechsel mit Pause/Zeitlupe/Loop, Seek-Abbruch, Retry und Maussteuerung.
- Zwei gerenderte QA-Loops bei **375, 768, 1280 und 1920px**: eingebetteter Player
  und Vollbild mit Qualitätswechsel. Berechnete Begrenzung jeweils `standard`,
  kein horizontaler Overflow. Feed zusätzlich mit isolierten API-Antworten geprüft:
  beide vorbereiteten Videos ebenfalls `standard`, keine Browserfehler.
- Produktionsbuild und Native-Assetprüfung bestanden: 8 Referenzen über 6 Routen.
  ESLint der neuen Farblogik und `git diff --check` ohne Fehler. Keine neue
  Abhängigkeit im Projekt und kein Versionsbump.

Lokale Belege: `output/hdr-{server-suite,transcode-tests,player-tests,build}.log`
und `output/playwright/hdr-review/`. FFmpeg/ffprobe 9.0.2 von dem auf ffmpeg.org
verlinkten Gyan-Windows-Build lokal unter `output/hdr-tools/` verwendet; Archiv
gegen den veröffentlichten SHA-256 geprüft. Keine systemweite Installation.
Die lokalen Ergebnisse ersetzen keine Prüfung des Alpine-Containers oder des
physischen iPhone-Displays. Der separate CI-Workflow liefert die Containerprüfung.

## Rollout und verbleibende Prüfung

Diese Änderung wurde auf dem PC vorbereitet, nicht produktiv veröffentlicht.
App/Web und Videodienst haben getrennte Veröffentlichungswege. Die bestehende
Laptop-/iOS-Releaseumgebung und die Regeln des Video-Server-Runbooks verwenden.

Vor Server-Rollout CI im tatsächlichen Image abwarten. Danach einen neuen
HDR-Testupload bis zur fertigen Familie prüfen. Auf dem betroffenen iPhone bei
fester Bildschirmhelligkeit dieselbe Szene mit Original/SDR vergleichen, auch
eingebettet und im Vollbild. Direkt am Display beurteilen, bei Bedarf mit zweitem
Gerät filmen: eine Bildschirmaufnahme kann den HDR-Effekt verändern.

Bestehende veröffentlichte Familien bleiben unverändert und werden unter ihren
immutable URLs nicht ersetzt. Auf älteren iOS-Versionen bzw. in nativer
Systemwiedergabe kann die CSS-Begrenzung fehlen; dafür muss die tatsächlich
abgespielte Datei bereits SDR sein. Für einen betroffenen Altclip eine neue
Medienfamilie aus der Originaldatei erzeugen und kontrolliert zuordnen. Die
bestehende Pipeline löscht fertig verarbeitete Originale; verloren gegangene
HDR-Farbinformation lässt sich aus einer falsch konvertierten SDR-Datei nicht
zuverlässig zurückholen. Externe YouTube-/Vimeo-Player werden nicht beeinflusst.

Noch offen: betroffene Datei, iPhone/iOS, installierter Build und reale
Helligkeitsabnahme. Kein zugesagter Fix auf dem Nutzergerät ohne diese Prüfung.

## Primärquellen

- WebKit Safari26: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- FFmpeg Filterdokumentation: https://ffmpeg.org/ffmpeg-filters.html
- WebKit-Vergleichsbericht: https://bugs.webkit.org/show_bug.cgi?id=250813
- Metas gemischte HDR-/SDR-Ansichten:
  https://engineering.fb.com/2023/07/17/video-engineering/hdr-video-reels-meta/
