# Elf scheinbar wartende Uploads · Abgleich und Korrektur

Stand: 15.09.2026. Arbeitsverzeichnis: `KWS-BETA-APP-desktop-nav`, Branch
`codex/desktop-navigation-refresh`, HEAD unverändert `ce817e3`, Version `1.0.226`.
Kein Commit, Push, Deployment oder neuer Gerätebuild in diesem Schritt.

## Gesicherter Befund

Die echte REST-Antwort enthielt elf Upload-Protokolle, alle `uploading`,
Fortschritt 100, ohne Fehler. Vier vom 18.08.2026 und sieben vom 24.08.2026.
Alle elf referenzierten existierende Boulder. Bei jedem Boulder waren
`beta_video_status=ready`, URL und exakt die passende Upload-Sitzung hinterlegt.

| Datei | Upload-Sitzung | Datum (UTC) |
|---|---|---|
| IMG_9089.mov | 09896440-aa7b-42b8-8419-e50d5f9a08a6 | 18.08.2026 |
| IMG_9068.mov | 99bdabb4-1b2e-4543-a9de-296ecf964a03 | 18.08.2026 |
| IMG_9070.mov | db755baf-71e9-4d26-bc49-19a8f7f0f8d5 | 18.08.2026 |
| IMG_9071.mov | fcd6d987-44f6-4389-9b26-964d577a0268 | 18.08.2026 |
| IMG_9224.mov | afe4c22a-016c-4b33-8fff-2835914b1728 | 24.08.2026 |
| IMG_9212.mov | 01b69c09-c849-4ae3-a797-d55353f69d8e | 24.08.2026 |
| IMG_9213.mov | 55127c7f-977c-43d2-bb71-1e130a11e878 | 24.08.2026 |
| IMG_9214.mov | 0ea20454-e938-4d2a-b1e5-1f5f63e07a4d | 24.08.2026 |
| IMG_9215.mov | 6e361456-db27-4e1d-bfd6-d5697e28e49a | 24.08.2026 |
| IMG_9216.mov | 15d09bf3-bba2-4cb2-ac9e-441062ee36c4 | 24.08.2026 |
| IMG_9218.mov | 40b99bc7-19af-486b-817c-7ce4fc2f6e70 | 24.08.2026 |

Alle 33 gespeicherten Qualitäts-URLs (HD/SD/Low) wurden mit HEAD geprüft:
HTTP 200, `video/mp4`, positive Dateigröße. Dies ist ein Erreichbarkeitsnachweis,
kein vollständiger Abspieltest aller Videoinhalte.

Die alte Wiederherstellung machte ohne Boulder-Abgleich aus jedem Protokoll
`restoring`, überschrieb die Fehlermeldung mit „Datei neu wählen“ und behielt
100 %. Der Trigger bezeichnete alle diese Zustände als „wartend“.
Eine mögliche Ursache für die veralteten Daten ist ein verspätetes Progress-PATCH,
das nach dem Abschluss wieder `uploading` schreibt. Dieser Ablauf ist im Code
möglich; die historische Reihenfolge der Requests vom August ist nicht bewiesen.

## Produktionskorrektur

Über die vorhandene Supabase-Konsole des Projekts `pkzzxtsyxwxoraytyjau`:

- Lesender JOIN bestätigte elf passende Sitzungen.
- Eine einzelne CTE-Korrektur sperrte exakt die oben genannten Logs und Boulder.
  Voraussetzung: alle elf Logs noch `uploading`, 100 %, fehlerfrei, vor 25.08.
  aktualisiert, Dateityp Video, passender fertiger Boulder mit VPS-URL.
- Nur bei exakt elf Treffern: `upload_logs.status='completed'`,
  `updated_at=now()`. Dieser Zeitpunkt bezeichnet die Protokollkorrektur,
  nicht die tatsächliche Upload-Dauer im August.
- RETURNING lieferte elf bestätigte Änderungen. Separates Nachlesen danach:
  **11 geprüfte Logs, 11 passend abgeschlossen, weiterhin 104 Boulder**.
- Keine Logzeile, kein Boulder und keine Mediendatei gelöscht. Keine Migration,
  Rollen-/RLS-Änderung oder erneute Übertragung. Die Protokollhistorie bleibt erhalten.

## Lokale Implementierung

- `uploadRecovery.ts`: read-only, expliziter Kontofilter, stabile Pagination,
  begrenzte Boulder-Abfragepakete; Zustand nur bei eindeutigem Sitzungsnachweis
  ausgeschlossen. 100 % allein/abweichende Sitzung/fehlender Boulder bleiben prüfbar.
- Server-Verarbeitung ohne erneuten Upload. Alte Teiluploads ohne Medien dürfen
  ausdrücklich fortgesetzt werden; unmittelbar vor Wiederaufnahme wird der
  aktuelle Boulder erneut gelesen. Lokale Datei-/Native-Dateiobjekte bleiben erhalten.
- Fehler beim Abgleich werden nicht als erfolgreiche leere Liste ausgegeben.
  Authentifizierter Abruf verwendet aktuelle Session, Abbruch und 15-s-Zeitlimit.
  Tokenwechsel startet den Restore-Effekt nicht erneut.
- Alle Progress-PATCH-Pfade in UploadContext/UploadLogger erhalten eine
  Nicht-terminal-Bedingung. Nur ausdrückliches Fortsetzen öffnet das Protokoll neu.
- Übersicht: korrekte deutsche Statusnamen, Datum, ursprünglicher Fehler,
  keine historischen Prozentbalken; feste Dialogaktionen, ein Scrollbereich,
  KWS-Tokens, Tastatur-/Escape-Fokus und native Dateiauswahl-Sperre erhalten.

## Verifikation

- 48 Node-Tests bestanden: 22 neuer Recovery-Kern, 22 Session-Kern, 4 Queue.
- Kombinierter Browserlauf: 37/37 bestanden, davon 31 vorhandene Session-/Setter-
  Regressionen und 6 neue Restore-/UI-Fälle. Anschließend erweiterte neue Suite
  8/8 bestanden (zusätzlich echter Logger mit spätem Progress-PATCH sowie
  Server-Abgleich direkt vor Dateiwiederaufnahme). Insgesamt 87 unterschiedliche Tests.
- Browser-Tests verwenden den echten UploadProvider und echte Komponenten mit
  isolierten Auth-/REST-Fixtures. Keine echten Uploads oder Dateilöschungen.
- Zwei gerenderte visuelle Loops bei 375/768/1280/1920px angesehen:
  Zustände, mobile Sheet-Geometrie, feste Aktionen, Escape/Fokus, erneutes Prüfen.
  Vorhandene gemeinsame FAB-Leiste außerdem in allen vier Breiten geprüft.
- Live-verbundene lokale App zeigt nach Neuladen „Keine offenen Uploads“.
- Gezieltes ESLint und eigenständiger Typecheck des neuen Recovery-Kerns ohne Fehler.
  Production-Build erfolgreich, kein Versionsbump. Bekannte Bundle-/Browserslist-
  Warnungen bleiben. Kein Anspruch auf einen fehlerfreien projektweiten Typecheck.
- Neuer Build wird nicht automatisch veröffentlicht. iPhone-/Android-Hintergrund-
  und echte Dateiwiederaufnahme-Tests mit Testkonto bleiben vor Release erforderlich.

Screenshots: `test-results/upload-recovery-20260915/loop{1,2}-{375,768,1280,1920}.png`.
Regressionen: `test-results/upload-recovery-20260915/setter-regression`.

## Vorfall mit lokalen Testartefakten

Beim ersten Teststart war kein eigener Playwright-outputDir gesetzt. Der Runner
begann seinen Standardordner `test-results` zu leeren und entfernte dabei auch
ältere erzeugte Vergleichsberichte/Screenshots. Nach Feststellung gestoppt.
Quellcode und produktive Daten waren nicht betroffen; Git meldete keine gelöschten
versionierten Dateien. Die Artefakte waren nicht in Git versioniert.

Fünf originale 375px-Kalender-/Statusbilder konnten aus dem noch geöffneten
Browser-Cache gebündelt und an ihren ursprünglichen Pfaden wiederhergestellt werden.
Der Kalendervergleich wurde mit diesen erhaltenen Bildern neu aufgebaut und klar
als Teilwiederherstellung gekennzeichnet. Aktuelle Setter-/Session-Belege wurden
neu erzeugt. Andere historische Vergleichsbelege sind **nicht wiederhergestellt**;
keine vollständige Wiederherstellbarkeit behaupten.

`playwright.config.ts` verwendet nun dauerhaft `test-results/playwright-artifacts`.
Akzeptierte Läufe dieser Aufgabe nutzen zusätzlich eigene eindeutige Unterordner.
Der übergeordnete Berichtsordner ist damit kein automatisches Bereinigungsziel mehr.
