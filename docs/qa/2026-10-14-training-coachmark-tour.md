# Trainingseinführung am echten Interface

Nutzerkorrektur: Die Einführung soll die vorhandenen Elemente im Interface erklären und dort eingeblendet werden, anstelle eines von unten kommenden Sheets.

`TrainingTour` verwendet einen eigenen verankerten Tourdialog mit Radix-Fokussperre, Portal, Hervorhebung des echten Elements und kleinem Hinweis mit Pfeil. Keine gemeinsam für mobile Sheets verwendete Surfaceklasse. Bestehende Buttons/Tokens, KWS-Radien und Farben bleiben. Die Infohilfe in `TrainingHelp` ist weiterhin separat erreichbar.

Schritte werden aus sichtbaren markierten Controls der aktuellen Route bestimmt. Direktlinks erhalten passende Touren; die Startseite erklärt Bereichsauswahl, Einheiten und Assistent. Bibliotheken erklären Suche, Filter, Sammeln und Merken; Kinder/Orientierung ohne Erwachsenen-Add. Detailseiten erklären die Textreiter. Hinzufügen/Ersetzen/Bereits ausgewählt werden unterschiedlich erklärt. Die Tour schreibt keine Übungen, Pläne oder Favoriten. Der bisherige kontogebundene Einführungsstatus bleibt gültig; Wiederholung über „i“ → Speicherung & Einführung.

Position und Markierung folgen tatsächlichen DOM-Rechtecken sowie Scroll-/Resize-/VisualViewport-Ereignissen und ResizeObserver. Unterliegende Aktionen sind während der Erklärung gesperrt. Der Fokus liegt am aktuellen Titel, Escape schließt, Weiter/Zurück wechselt. Ausgangsscroll und Fokus am Info-Icon werden beim Schließen wiederhergestellt. Scrollen erfolgt ohne Animation, damit reduzierte Bewegung und stabile Anker berücksichtigt werden.

Prüfung:

- Gesamter UI-Lauf42/42PASS. Nach einem gefundenen Überlappungsfall auf375×560 wurde die Platzschaffung durch Scrollen korrigiert und ein gezielter Test ergänzt. Abschließend sieben betroffene Einführungsszenarien bestanden; insgesamt43 Szenarien über zwei Läufe geprüft.
- Zwei visuelle Loops375/768/1280/1920, jeweils alle fünf Kraftbibliotheks-Schritte mit20 Screenshots. Hinweis und Hervorhebung überdecken einander nicht, der Hinweis bleibt im Viewport. Zusätzliche Touren auf Startseite, Kinderbibliothek, Kinder-/Kraftdetail und leerer Favoritenliste; kurzer Handyviewport560px separat geprüft. Loop2 nach finaler Platzkorrektur neu aufgenommen.
- Tests decken Rückweg, Tastaturfokus, Escape, reale Einheit nach der Tour, unveränderte Auswahl während der Tour, Wiederholung, Konto-/Tabtrennung, Storageausfall und ausgeblendetes Training ab.
- ScopedESLint und Build erfolgreich, Version1.0.230. AppTSC vor finaler kleinen Geometriekorrektur76 bestehende Diagnosen außerhalb Training, keine betroffene Datei. Planregeln/Dosen/Quellen nicht geändert.
- Lokale Screenshots `test-results/training-help-loop1/tour/`, `training-help-loop2/tour/`, kurzer Bildschirm `test-results/training-intro-tour-home-short-final.png`. Bei der Wiederholung einer Browserprüfung zeigte eine alte REPL-Closure noch auf einen geschlossenen Tab; mit frischem Browser und direktem Ablauf erneut geprüft.

Nur lokale Vorschau auf `codex/training-ui`. Nächster Schritt: Auftraggeber startet über das „i“ die Tour erneut und prüft die Einblendungen am realen Interface.
