# Onboarding – Platzierung in Desktop- und Laptopfenstern

## Anlass und Quelle

Erneuter Nutzerhinweis auf unpassende Desktop-Maße. Frischer Fetch20.10.2026,
ca18:21 Europe/Berlin: PR58 inzwischen integriert; alter Featurezweig53 Commits
hinter origin/main26d460b. Neuer Zweig codex/onboarding-desktop-sizing auf diesem
aktuellen Stand im bestehenden sauberen Worktree. Der ursprüngliche gemeinsame
Ordner ist77 Commits zurück und enthält weitere fremde Player-/Feedänderungen;
seine src-Dateien werden nicht geändert.

## Befund und Korrektur

Bei1024×576 und1280×600 wurde das hohe Videomedium zuerst als zu groß für eine
vertikale Kombination eingestuft. Dadurch dockte der Hinweis oben an, obwohl
rechts daneben336px plus Abstand verfügbar waren. Die Markierung begann erst
unter dem Hinweis, sodass ein unnötig großer oberer Videoteil abgedunkelt blieb.
Das war kein Fehler der SVG-/Kontur-Skalierung aus der vorigen Korrektur.

Coachmark prüft nun zuerst den Platz rechts und links. Hohe Ziele werden nur
ohne passende seitliche Fläche angedockt. Seitliche Hinweise stehen vertikal
in der Mitte des sichtbaren Ziels und behalten16px Abstand. Der Pfeil zeigt
auch bei links platzierten Hinweisen zur Zielmitte. Safe Areas, reale Header-
und Scrollgrenzen sowie der mobile Dockmodus bleiben berücksichtigt.
Keine neue globale Schrift-/Button-/Panelgröße und keine Änderung von Nutzerdaten.
Der lokale Entwurf erhält dieselbe Coachmark-Datei.

## Zwei visuelle Loops

Loop1: Screenshots vor/nach bei1024×576,1280×600,1366×650,1920×900; zusätzlich
375×900 und768×900. Liste, Videomedium, Filter, Merken, Tracking und Wochenvorschau
geprüft. Hohe Desktop-Medien nutzen seitlichen Platz, links liegende Hinweise
haben korrekte Pfeile. Mobile Filterauswahl und Hinweis bleiben getrennt sichtbar.

Loop2: vollständiger Ablauf je Größe, tatsächliche SVG-/Konturkanten verglichen,
Panel-/Zielüberlappung und Viewport/Textüberlauf geprüft. Live-Fensterwechsel am
Videohinweis1366→1024→1366. Rückwärts-/Tastatur-/Fehlerfälle über bestehenden
Randfalltest; Safe-Area-Profile inklusive Querformat sowie vier Entwurfsabläufe.
Lokale Bildbelege in output/playwright/onboarding-desktop; Medien in den
isolierten Tests verwenden öffentliche Fixtures, externe Anfragen sind gesperrt.

## Reproduktion und Grenzen

```powershell
node node_modules/vite/bin/vite.js --config test/onboarding.vite.config.ts
# Zweite Shell:
node test/onboarding-desktop.check.cjs
node test/onboarding-edges.cjs
node test/onboarding-safe-area.check.cjs
# Mit lokalem Entwurfsserver auf5216:
node test/onboarding-draft-geometry.check.cjs
node node_modules/eslint/bin/eslint.js src/components/onboarding/Coachmark.tsx
node node_modules/vite/bin/vite.js build
```

Edge/Windows geprüft. Kein physischer iPhone-/Safari-Test und keine Änderung
an Browserzoom oder Betriebssystem-Anzeigeskalierung. Kleinere CSS-Viewports
entsprechen dem geringeren verfügbaren Platz bei vergrößerter Browserdarstellung.
Abschlussprüfung auf origin/main181001d einschließlich des parallel integrierten
App-Updates (Merge2b22233). Bestehende Version1.0.252; kein eigener Versionsbump
und kein Release. Alle sechs Platzierungsabläufe und der Produktionsbuild
wurden auf diesem kombinierten Stand erneut geprüft. Die43 Randfälle, sechs
Safe-Area-Abläufe und vier Entwurfsabläufe bestanden vor diesem abschließenden
Main-Abgleich; die Coachmark- und Gastquellen änderten sich dabei nicht.
