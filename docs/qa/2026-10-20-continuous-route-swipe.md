# Kontinuierlicher Seitenwechsel – 20.10.2026

## Auftrag und Quelle

Der Nutzer beschreibt einen auf ungefähr 1cm begrenzten Zug, nach dem die
Nachbarseite erst beim Loslassen erscheint. Der bisherige 48px-Drag mit getrenntem
Austritt/Eintritt wird durch einen gemeinsamen, kontinuierlichen Pager ersetzt.

Frischer Fetch am 20.10.2026: native Integrationsbasis
`origin/codex/pc-integration-android80`, Commit
`6d6f80ce4da719609eda15eb1c36064d9a584cb8` (enthält den bisherigen Wisch-Fix).
Der Hauptarbeitsbaum enthält fremde offene Änderungen und wurde nicht verändert.
Eigener Branch: `codex/continuous-route-swipe` im bestehenden Swipe-Worktree.
Vor dem Sichern erneut gefetcht: Integrationsbasis unverändert, 0 ahead/0 behind.

## Verhalten

- Home, Boulder und Statistiken folgen der horizontalen Fingerbewegung 1:1.
  Links ziehen zeigt die rechts folgende Seite bereits während des Ziehens.
- Die echte Nachbarseite wird inert mit eingefrorener Router-Location vorbereitet.
  Beim Einrasten bleibt dieselbe React-/DOM-Instanz erhalten; kein zweiter Eintritt.
- Beide Inhalte gleiten von der tatsächlichen Loslassposition gemeinsam weiter.
  Dauer 140–260ms nach Restweg. Wechsel ab einem Viertel der Inhaltsbreite
  (mindestens 56px) oder einem bewussten schnellen Wisch. Halten entfernt
  veraltete Geschwindigkeit; kurze langsame Züge gleiten zurück.
- Header und Navigation stehen still. Enden haben Widerstand ohne Umlauf.
  Vertikalscroll, Pinch-Zoom und bestehende Gestenausschlüsse bleiben erhalten.
- Vorschauen sperren Interaktion und starten keinen gespeicherten Video-Feed.
  Dokument-Scroll bleibt beim Ziehen erhalten und wird erst beim Wechsel nach oben
  gesetzt. Reduced Motion verzichtet auf Bewegung, auch bei einem Livewechsel.
- Optionale Entwicklungsrouten außerhalb des Pagers behalten die unmittelbare
  Navigation. Das unveröffentlichte Training wird dadurch nicht freigeschaltet.

## QA-Inventar und Ergebnisse

Geprüfte Aussagen: 1:1-Zug über die frühere Begrenzung hinaus, sichtbare Nachbarseite,
gleiche DOM-Instanz nach Commit, richtige Richtung, feste Header/Navigation,
kurzer Zug/Gegenbewegung/Rand ohne unbeabsichtigte Navigation, Touch-Abbruch und
Vertikalscroll, Reduced Motion inklusive Livewechsel, Scroll- und Video-Isolation.
Zusätzliche Regression: Rückkehr aus Details erhält Bilder, Filter und Scrollposition.

Echte Seiten in `personal-workspace` mit Produktions-Pager und isolierten Daten.
Zwei gerenderte QA-Loops bei **375, 768, 1280, 1920px**:

1. Home, Boulder und Statistik im Ruhebild: Rahmen, Typografie, Wasserzeichen,
   Navigation, Datenzustände und Viewportgrenzen.
2. Ziehen mit sichtbarer Nachbarseite, Einrasten, Rückwärtswechsel und Rückkehr
   nach Home: Bewegung ohne Neustart, feste Navigation, kein horizontaler Overflow.

Messung bei 375px: 80px/180px Zug ergaben -80px/-180px am Ausgangsinhalt;
Nachbarseite gleichzeitig bei +295px/+195px. Kein Plateau bei 48px.
Der erste Desktop-Bildcheck fand eine leere Überdeckung durch den Hintergrund
der Vorschauseite. Korrigiert: nur der bewegte Inhalt zeichnet die Vorschaufläche.
Danach beide Loops erneut geprüft, ohne unbehandelte Browserfehler.

- `node --test test/routeSwipe.test.mjs`: **6/6 bestanden**.
- `e2e/route-swipe.spec.ts`: **8/8 bestanden**, Touch über Chromium-CDP und Maus.
- `e2e/boulder-continuity.spec.ts` mit Pager: **19/19 bestanden**.
- Produktionsbuild plus `verify-native-web-assets.mjs dist`: bestanden,
  8 Assetreferenzen über 6 Routen. Keine Versionserhöhung durch lokale Prüfung.
- ESLint der Pager-/Gestendateien: keine Fehler; bestehende Fast-Refresh-Warnung
  im Continuity-Modul. `git diff --check` ohne Inhaltsfehler.
- Gezielte TypeScript-Diagnose: neue Pager-/Kontext-/Gestendateien und App ohne
  Befunde. In Boulders bestehen bereits auf der unveränderten Basis zwei
  `Boulder.colorHex`-Typfehler; diese Aufgabe verändert die betreffenden Zeilen nicht.
- React-Review: keine React-Updates je Bewegungsframe, gemeinsame Datenabfragen,
  stabile Controller und Cleanup für Frames/Animationen/Listener, inerte Vorschau,
  zugängliche alternative Navigation.

Neue Browserregression im regulären Web-CI-Aufruf ergänzt. Lokale Belege unter
`output/playwright/continuous-route-swipe/` einschließlich `qa-contact-sheet.png`.
Logs: `output/continuous-swipe-{build,e2e,continuity,types}.log`.

## Android-Fortsetzung

Dies ist Quellcode für den nächsten nativen Build, kein bereits installiertes
Android-Update. Nutzerwahl bleibt: bestehende Buildumgebung und Play-Zugang auf
dem Laptop verwenden. Auf dem PC wurden kein AAB und kein Store-Release erzeugt.

Auf dem Laptop diesen Branch frisch fetchen und den neuen Commit in den dort
aktuellen Release-Stand übernehmen; offene Laptop-Änderungen erhalten. Dann die
bestehende Anleitung `2026-10-19-route-swipe-android-release.md` anwenden, insbesondere
den höchsten Play-Versionscode live prüfen. Die geprüfte Git-Basis enthält bereits
Code82; daraus folgt keine Aussage zum aktuellen Play-Stand. Mit bestehender
Signatur bauen, im internen Track veröffentlichen und auf dem Android-Gerät
langsamen Zug, schnellen Wisch, Loslassen und Zurückgleiten prüfen.

PR55 beschreibt den vorherigen Stand; diese Nachbesserung basiert auf der nativen
Integration. Nicht die gesamte native Integrationshistorie ungeprüft nach main
übernehmen. Kein nativer Gerätetest und keine neue Veröffentlichung bestätigt.
