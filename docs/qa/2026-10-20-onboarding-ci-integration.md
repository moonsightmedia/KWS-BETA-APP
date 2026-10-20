# PR71 – Desktop-Einführung nach Integration in die App

Prüfdatum: 20.10.2026. Integrierter Stand beim Lauf: `164f711` nach
Proxykorrektur und PR72/PR71-Integration durch den Release-Verantwortlichen.

## CI-tauglicher Prüflauf

`CI=true node test/onboarding-desktop.check.cjs` verwendet das von Playwright
installierte Chromium ohne Edge-/Desktop-Abhängigkeit. Der Aufruf startet seinen
eigenen isolierten Vite-Server auf 127.0.0.1:5220 und beendet Browser und Server
im `finally`, auch bei einem Testfehler. Ein belegter Port wird nicht übernommen;
andere Server werden nicht gestoppt. Output-/Testartefakte lösen keine
Vite-Neuladungen aus.

Die ursprünglichen Geometrieassertionen sind erhalten: keine Überdeckung von
Hinweis und Ziel, Viewportabstände, kein Textüberlauf, echte Spotlight-Geometrie,
rechte Videoplatzierung ab1024px ohne Docking, erhaltene Video-Hervorhebung,
16px-Abstand, Pfeilausrichtung sowie Resize1366→1024→1366.

## Ergebnis

- **EXIT0**, zehn vollständige Profile mit insgesamt **110 Tour-Schritten**.
- Loop1 mit Klickaktivierung: 375×900,768×900,1024×576,1280×600,1366×650,1920×900.
- Loop2 mit Keyboard-Enter an den echten Touraktionen: 375×900,768×900,
  1280×600,1920×900.
- Keine JavaScript-Ausnahmen in den zehn Profilen. Kein gemessener Hinweis
  überdeckt seine Hervorhebung. Alle ursprünglichen Assertions bestanden.
- Nach dem Abschluss kein Listener mehr auf dem ausschließlich eigenen Port5220.
- Node-Syntaxprüfung und `git diff --check` bestanden.

Beide gerenderten Schleifen wurden bei den vier Pflichtbreiten visuell geprüft:
kompakte Erklärung, unverdecktes Ziel, passende Pfeile und lesbare mobile
Filterhinweise. Die kurzen Desktopprofile zeigen die Videoerklärung rechts
neben dem Medium. Kein neuer Defekt im geprüften Umfang gefunden.

## Belege

Log/aggregierte Messdaten:
`output/onboarding-desktop-ci-20261020/regression.log` und `proof.json`.

Screenshots/Messdaten:
`output/playwright/onboarding-desktop/after-{Breite}-{Schritt}.png`,
`after-{Breite}.json`, `loop2-{Breite}-{Schritt}.png`, `loop2-{Breite}.json`.
Visuell geprüft insbesondere:

- `after-375-discover.png`, `after-375-beta.png`, `after-375-filter-color.png`;
- `after-768-beta.png`, `after-1024-beta.png`, `after-1280-beta.png`,
  `after-1280-filter-color.png`, `after-1920-beta.png`;
- `loop2-375-filter-grade.png`, `loop2-768-filter-show.png`,
  `loop2-1280-filter-color.png`, `loop2-1920-filter-results.png`.

Die App läuft mit den vorhandenen isolierten Beispieldaten und blockiert externe
Anfragen. Dies bestätigt weder Produktionsdatenänderungen noch native
Geräte-/HDR-Abnahme oder einen Store-Release. GitHub-Linux-CI wird vom regulären
Release-Workflow separat ausgeführt; lokal ist der echte Chromiumlauf mit
gesetztem CI-Modus verifiziert. Keine Branch-, Index-, Commit- oder
Workflowänderung in diesem Prüfauftrag vorgenommen.
