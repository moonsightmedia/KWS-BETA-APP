# Onboarding – Safe Areas und Info-Einstieg, 20.10.2026

## Quelle und Umfang

Nutzerkorrektur anhand von iPhone-Screenshots: Hinweise dürfen Statusleiste / Dynamic Island nicht überdecken; die große Einführung-/Kontozeile wird durch ein kleines Info-Icon neben dem Ansichtswechsel ersetzt.

Frischer Git-Fetch am 20.10.2026: gemeinsamer Ausgangsordner main 0 voraus / 20 zurück, mit fremden offenen Player-/Feedänderungen. Änderungen an der echten App bleiben im angehängten Worktree codex/onboarding-integration. Origin/main 13dd14c wurde in den bestehenden PR-Zweig integriert (Merge a03f0f6); der Guest-Konflikt erhält neue Video-/Kartenansichten und Onboarding. Keine Änderungen an den parallelen src-Dateien im gemeinsamen Ausgangsordner.

## Umsetzung

- Coachmark misst die vier effektiven Safe Areas aus App-Variablen und CSS env(). Der sichere Visual Viewport wird mit einem vorhandenen Dialoghost geschnitten; keine doppelte Anwendung von dessen Abstand.
- Position, maximale Breite und maximale Höhe bleiben innerhalb dieses Rechtecks. ResizeObserver sowie Visual-Viewport-Ereignisse aktualisieren die Geometrie.
- Das kleine Info-Symbol (16px, zugänglich benanntes 44px-Touchziel) steht direkt links neben Liste/Grid/Video. Die beiden großflächigen Headerlinks entfallen. Konto-Vorteile bleiben im geführten Ablauf und im Detail erreichbar.
- Aktive Tour wechselt von persistierter Videoansicht zur letzten Kartenansicht, damit ihr erstes Ziel existiert.
- Fix für flache Filter: Scrollkorrekturen werden auf volle Pixel aufgerundet. Eine zuvor mögliche Rundung auf null mit anschließendem Gegenscroll konnte den Hinweis endlos neu positionieren. Dock-Scroll wird nur nach tatsächlicher Bewegung des Ziels wiederholt.
- Der lokale, getrennte Entwurf unter docs/design/onboarding im ursprünglichen Arbeitsordner erhält dieselbe Coachmark-Datei und den kompakten Info-Einstieg; dort keine produktiven Schreibzugriffe.

## Visueller Loop 1 – Hierarchie und Layout

Gerenderte App in Edge mit isolierten öffentlichen Fixtures bei 375 / 768 / 1280 / 1920px geprüft: kompakter Einstieg, KWS-Button, identische Tourtexte, Kontur/Radien, Filter, Kontovorschau und Registrierung.
Zusätzlich simulierte iPhone-Insetprofile 375×812 und 393×852 (oben59/unten34) sowie Querformat 844×390 (links/rechts59/unten21). Alle Tour-Panels bleiben mit zusätzlichem Abstand innerhalb der Safe Area; keine horizontale Überbreite. Screenshotbelege unter output/playwright/onboarding-safe-area und output/playwright/onboarding (lokal, nicht versioniert).

## Visueller Loop 2 – Verhalten und Zustände

- Sechs vollständige Safe-Area-Durchläufe inklusive aller vier Filterschritte, Speichern, Tracking, Fortschritt, Gast-Rückweg und Info-Replay: bestanden.
- Vier vollständige App-Durchläufe bei den geforderten Breiten einschließlich echter Filterauswahl, Kontovorteilen und bestehendem Registrierungsformular: bestanden.
- 43 Randfall-/Tastaturprüfungen aus onboarding-edges.cjs: bestanden. Der Test für gesperrten Speicher verwendet jetzt den erhaltenen Filter statt des entfernten Headerlinks.
- Erster Start, Abschluss über Reload, erhaltene Karten-/Filterzustände, direkte Registrierung und Nulltreffer-Rückweg: bestanden.
- Zusätzliche Browserprüfung: persistierte Videoansicht beim Erststart, Änderung der Insetvariablen ohne Resize und Replay mit Enter: bestanden.
- Lokaler Entwurf auf Port5216: Start, Überspringen, kompaktes Info-Icon und erneuter Start ohne Browserfehler geprüft.
- Die freiwillige Statistikabfrage wird im Test nach Abschluss regulär über „Ohne Statistik“ geschlossen. Während der Tour bleibt sie zurückgestellt.

## Technisch und Grenzen

ESLint der geänderten TSX-Dateien, git diff --check und direkter Vite-Produktionsbuild erfolgreich. Bestehende Bundle-/Import- und Browserslist-Hinweise. Keine zusätzlichen Abhängigkeiten oder Versionsanhebung. React-Prüfung: Listener/Observer werden bereinigt, stabile Effektabhängigkeiten, Icon benannt, vorhandene Button- und Tokenbasis wiederverwendet. Keine neuen Datenzugriffe.

Die iPhone-Insetwerte wurden in Edge simuliert. Kein physisches iPhone und keine Safari-/WebKit-Laufzeit geprüft. Keine Veröffentlichung und keine echten persönlichen Einträge.

## Reproduktion

```powershell
node node_modules/vite/bin/vite.js --config test/onboarding.vite.config.ts
# In zweiter Shell:
node test/onboarding-safe-area.check.cjs
$env:ONBOARDING_REAL_APP='1'
node test/onboarding.check.cjs
node test/onboarding-edges.cjs
node test/onboarding-app.check.cjs
node test/onboarding-empty.check.cjs
node node_modules/eslint/bin/eslint.js src/components/onboarding/Coachmark.tsx src/pages/Guest.tsx
node node_modules/vite/bin/vite.js build
```


## Nachkorrektur – Desktop-Highlight

Nutzerbild: erster Hinweis markiert den Listenswitch; Aufhellung liegt links
versetzt zur grünen Kontur. Reproduziert bei1365px: SVG-Breite1355px gegenüber
ViewBox1365px (klassische10px-Scrollleiste), X-Maßstab0,992674. Dadurch driftet
der Ausschnitt mit zunehmender X-Position. Der echte App-Flow verwendet bereits
explizite Ziele, der lokale Entwurf suchte dagegen den ersten Button in main.

Korrektur: SVG erhält explizite Pixelbreite/-höhe passend zur ViewBox. Der
Entwurf markiert die erste Fotokarte mit eigenem Anker. Coachmark beobachtet
auch die Sichtbarkeits-/Ankerattribute und misst Dialoge nach ihrer endlichen
Eintrittsanimation, damit temporäres Zoom nicht ein zweites Mal eingerechnet wird.

Verifiziert in Edge: vier vollständige Entwurfs- und vier echte App-Durchläufe
bei375/768/1280/1920px. In jedem Schritt wird der tatsächliche SVG-Ausschnitt über
getScreenCTM() auf Bildschirmkoordinaten projiziert und mit allen vier Kanten der
Kontur verglichen (Toleranz0,6CSSpx). Der erste Entwurfsanker muss die Fotokarte
sein. Alle Prüfungen bestanden; zusätzlich beide visuellen Loops mit Liste,
Detail, offenem Filter und Kontovorschau. Lokale Belege: output/playwright/
onboarding-draft-geometry und output/playwright/onboarding. Medien werden in
isolierten Browserprüfungen nicht extern geladen.

Reproduktion zusätzlich: node test/onboarding-draft-geometry.check.cjs (erfordert
den bereits dokumentierten Entwurfsserver auf5216 im ursprünglichen Arbeitsordner).
