# PR 69 – Settereditor und Griffvorschau

## Umfang

Integration auf `codex/thumbnail-focus-integration-oct20`, Merge `acbdeb6`, anschließend gezielte Robustheitskorrekturen an `SetterThumbnailFocus.tsx`. Die automatisch zusammengeführten Aufrufer `SetterBoulderEditorDialog`, `BatchUpload` und `SetterEditPage` wurden gelesen: Upload und Stapelvorschau verwenden denselben `thumbnailUploadFile`-Vertrag, neue Dateiauswahl verwirft die alte Maske. Bestehende Medien-URLs bleiben beim normalen Bearbeiten erhalten. Vorher vollständig gelesen: `docs/DESIGN.md`; neue gemeinsame Regeln ergänzt der Hauptagent.

Die PR-72-Hochformatkarte im Editor, ihr kompakter Wrapper und ihre Orientierungsparameter bleiben erhalten. PR-70-Name/Fokus, feste Aktionen, Verwerfenschutz, Uploadabschluss und Fehlerbehandlung wurden nicht ersetzt.

## Ergänzungen

- Volumenmodus ignoriert vorhandene Fokuswerte und sperrt Reaktivierung durch Auswahl, Undo und Automatikreset. Der gemeinsame Uploadhelfer erzwingt zusätzlich das Original; dieser Helfer gehört zum parallelen Bibliotheksauftrag.
- Undo kann auch zur unveränderten Originaldatei vor der ersten manuellen Korrektur zurückkehren. Ein wiederhergestellter Stand beendet laufende Operationen.
- „Kontur nachzeichnen“ funktioniert ohne vorhandenen Detektorvorschlag: unbekannte Farbe oder fehlgeschlagener Dienst können den gemeinsamen lokalen PhotoSpace-Helfer verwenden. Dieser verändert die Originaldatei nicht und erzeugt keine Serveranfrage. Eine unvollständige Kontur sperrt Speichern bis Übernehmen oder Abbrechen.
- Werkzeugzeile darf auf schmalen Flächen umbrechen. Die kompakte Vorschau steht nach der Farbe; gezielte Auswahl öffnet eine größere Zeichenfläche innerhalb des bestehenden Dialogscrollbereichs.

## Tests

Alle Befehle aus dem Repository-Stamm mit `node node_modules/@playwright/test/cli.js`:

| Konfiguration / Auswahl | Ergebnis |
| --- | --- |
| `test --config test/thumbnail-setter.playwright.config.ts --workers 1` vor Ergänzung des neunten Falls | 8/8, 18,8 s |
| dieselbe Konfiguration mit `-g "real editor blocks"` | ergänzter neunter Fall 1/1, 6,0 s |
| `test --config test/thumbnail-setter-disabled.playwright.config.ts --workers 1` | 1/1, 6,3 s |

Damit zehn gezielte Fälle erfolgreich ausgeführt: vier Breiten des echten Editors einschließlich Kartenwahl; Mehrfachwahl/Tippkorrektur/Undo/Original; unbekannte Farbe und Kontur mit Punkt-zurück; Dienstausfall und lokale Kontur; Volumeninvariante; Speichersperre im echten Editor sowie Originalvergleich ohne Übernahme; deaktiviertes Feature mit normalem Speichern ohne Analyseanfrage.

Die Tests verwenden eine ausdrücklich gezeichnete 360×480-Beispielgrafik, lokale Hook-Fixtures, aufgezeichneten In-Memory-Zustand und abgefangene Analyseanfragen. Externe Anfragen werden blockiert. Keine Nutzerkonten, echten Boulderfotos oder produktiven Schreibvorgänge. Testserver verwenden getrennte Caches und Ports 5244/5245.

Gezieltes ESLint über die vier Produktdateien und die erste Test-/Fixture-Gruppe: null Fehler; drei bestehende Fast-Refresh-Warnungen im gemeinsamen Editor und eine entsprechende Fixture-Warnung. `git diff --check` für die neuen Änderungen erfolgreich. Gesamt-Typecheck und Releasebuild sind Aufgabe des Hauptagenten.

## Zwei gerenderte QA-Loops

Bei 375, 768, 1280 und 1920 px wurden beide Loops geprüft:

1. Farbe, anschließende kompakte Griffvorschau, Titel, Safe Area, feste Footeraktionen und fehlender horizontaler Überlauf.
2. Große Auswahl, ausgewählte Kandidaten, Abwahl und Undo, erreichbare Konturaktion, Scrollbereich und unverdeckte Footeraktionen.

Bildbelege: `output/thumbnail-setter/loop1-editor-{375,768,1280,1920}.png`, `loop2-editor-{375,768,1280,1920}.png`. Zusätzlich alle vier `map-{Breite}.png` angesehen: Hochformat auf allen Editorbreiten, aufrechte Labels, Auswahl und rechts angeordnete Zoom-/Resetwerkzeuge. Die gezeichneten farbigen Rechtecke sind Testgriffe, kein Nachweis realer Modellerkennungsqualität.

## Grenzen

Die Prüfung bestätigt Editor-/Dateivertrag und Interaktionsverhalten im isolierten Chromium. Modellqualität, echter authentifizierter VPS-Dienst, produktive Bestandsprüfung und Android-/iPhone-Hardware werden dadurch nicht abgenommen. Keine produktiven Bilder oder Entscheidungen wurden in diesem Teilauftrag bestätigt oder übernommen. Kein Commit/Index-/Branchwechsel oder Deployment durch den Setter-Agenten.
