# Direkte Griffauswahl – lokaler UX-Entwurf

Nutzerauftrag: Erstellen und Bearbeiten zeitsparend gestalten, ausdrücklich zuerst lokal entwerfen. Einstieg `docs/design/thumbnail-inline-ux/index.html`, Localhost5342, Branch `codex/thumbnail-inline-ux-local`. Keine produktiven Komponenten, Serverdaten, Versionen oder Releases verändert.

## Ergebnis

Das sichtbare Vorschaubild unter den Farben ist unmittelbar bearbeitbar. Ein Klick ändert eine Griffauswahl. Kontur wählen, am Rand entlang zeichnen, loslassen: Die neue Region wird ohne weitere Bestätigung übernommen. Rückgängig, Originalvergleich und eine vergrößerte Ansicht sind vorhanden. Der gemeinsame Speicherabschluss sichert den gesamten lokalen Boulder einschließlich Bild, Auswahl und Konturen. Ein neuer Editoraufruf verwendet den gespeicherten Stand.

Die automatische Auswahl verwendet von Hand vorbereitete Beispielregionen auf einem echten, öffentlich zugänglichen Appfoto. Keine Modellabnahme oder vollständige Produktionsintegration behauptet. Eigene Fotos können manuell korrigiert werden; der Dateiauswahlweg wurde in dieser Abnahme nicht zusätzlich automatisiert geprüft. Historische fehlende Masken werden hier nicht aufbereitet.

## Abnahme am gerenderten Entwurf

- Vorhandene Auswahl sofort sichtbar; Griff2 direkt hinzugenommen, 2→3 ohne Bestätigung.
- Gemeinsam gespeichert und anschließend wirklich neu geladen: drei Griffe unverändert sichtbar, keine Erkennung ausgelöst.
- Große Ansicht geöffnet und eine echte zusammenhängende Freihandgeste ausgeführt; neue Kontur als Griff8 direkt ausgewählt, 3→4. Anschließend Rückgängig, wieder3. Testkontur nicht als fertige Auswahl gespeichert.
- Originalvergleich ein/aus; Foto vollständig farbig ohne Auswahlüberlagerung und danach unveränderter Auswahlstand.
- Erstellen zeigt direkt vorbereitete Auswahl; Gelb/Grün passen die Beispielauswahl an, normale Namenseingabe setzt die Bildauswahl nicht zurück.
- Volumen ein/aus erhält die Auswahl. Tastatur-Leertaste wählt einen vorhandenen Griff ab und wieder an.
- Erstellen mit leerem Namen: Fehler direkt am Feld, Fokus am Namen. Gemeinsames Speichern nach Namenseingabe erfolgreich; Status wechselt zu Gespeicherte Version.
- Geänderter Name beim Moduswechsel: Verwerfen-Dialog; Weiter bearbeiten erhält den Entwurf. Zum Abschluss alle Prüfeingaben auf den gespeicherten lokalen Beispielstand zurückgeführt.
- Sauber neu geöffnete Vorschau: Kühner Wurm, Grün, drei Griffe, keine ungespeicherten Änderungen, keine Browserfehler.

Loop1: 375/768/1280/1920px gerendert und angesehen. KWS-Tokens und Poppins, Formularhierarchie, Farbauswahl, Bildmaßstab, Werkzeugleiste, sichtbarer Speicherfuß, ein Seitenscrollbereich. Kein horizontaler Überlauf beobachtet; die gemessenen Scrollbreiten bleiben innerhalb des jeweiligen Viewports. Loop2: mobile direkte Auswahl, Tablet-Originalvergleich, Desktop-Erstellen mit Feldfehler und breite gespeicherte Ansicht; zusätzlich große Freihandkorrektur und Entwurfsschutz. Kleine Korrekturen nach Sichtprüfung: Feldfehler an den Namen statt Formularende, Ausrichtung der Metadatenfelder, Konturabschluss vor Freigabe des Pointer-Capture, stabiler React-Bootstrap.

Screenshots: `output/thumbnail-inline-ux/loop1-*`, `loop2-375-direct.jpg`, `loop2-768-original.jpg`, `loop2-1280-create.jpg`, `loop2-1920-saved.jpg`, `desktop-final.jpg`. Die Aufnahmen aus dem Browser sind JPEG; die frühen loop1-Dateinamen wurden entsprechend korrigiert. Eine leere Zwischenaufnahme wurde als verworfener Captureversuch markiert. Keine Beweisbehauptung aus dieser Aufnahme.

Scoped ESLint zuletzt null Fehler/Warnings. Isolierter Vite-Build erfolgreich, ohne Release-/Versionsplugin. Nur bestehender Browserslist-Altershinweis. Keine Wiederholung der großen Produktions-Testsuite, da keine produktiven Codepfade verändert wurden. Kein physischer Gerätetest.

Die Vorschau bleibt zur lokalen Sichtabstimmung geöffnet. Nächster Schritt ist die Nutzerbewertung; Integration, Bestandsaufbereitung und Veröffentlichung sind ein späterer Auftrag.
