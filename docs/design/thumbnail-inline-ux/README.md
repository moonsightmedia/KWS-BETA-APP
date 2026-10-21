# Vorschaubild als Teil des Boulderformulars

**Fortsetzung:** Der aktuelle lokale Stand ist jetzt in der vollständigen echten App unter `http://127.0.0.1:5343/setter/edit` integriert. Siehe `docs/qa/2026-10-21-thumbnail-real-app.md`. Diese separate HTML-Seite bleibt nur als historischer Interaktionsentwurf erhalten.

Lokaler Interaktionsentwurf auf Nutzerauftrag vom 21.10.2026. Nicht für einen Release freigegeben. Die produktiven Komponenten und Speicherwege bleiben auf dem bisherigen Stand.

## Ansehen

```powershell
node node_modules/vite/bin/vite.js --config docs/design/thumbnail-inline-ux/vite.config.ts
```

[Vorschau öffnen](http://127.0.0.1:5342/docs/design/thumbnail-inline-ux/index.html)

Oben zwischen Erstellen und Bearbeiten wechseln. Die Beispieldaten werden ausschließlich unter `kws-design:thumbnail-inline:v1` im lokalen Browser gespeichert. Das aktuelle Foto, die ausgewählten Regionen und neue Konturen werden gemeinsam gespeichert und nach Neuladen wieder angezeigt.

## Richtung

Farben wählen, das Ergebnis unmittelbar darunter korrigieren und den Boulder einmal speichern. Das Bild selbst ist Vorschau und Arbeitsfläche zugleich. Ein zusätzlicher Einstieg in den Griffeditor oder eine separate Vorschau-Bestätigung entfällt.

- **Erstellen:** Beispielvorschlag ist schon vorbereitet. Farbwechsel passt die Auswahl an. Korrektur durch direktes Antippen; Freihandkontur wird beim Loslassen geschlossen und ergänzt.
- **Bearbeiten:** Gespeicherte Bildauswahl sofort wiederverwenden. Öffnen/Neuladen löst weder Erkennung noch eine neue Auswahl aus. Zusätzliche Griffe direkt ergänzen.
- **Werkzeuge:** Antippen als Standard, Kontur als direkte Alternative. Rückgängig und Originalvergleich bleiben erreichbar. Vergrößern dient präzisen Korrekturen und verwendet denselben Entwurf.
- **Speichern:** Ein gemeinsamer Abschluss für Formulardaten, Foto und Auswahl. Ladezustand und Fehler bleiben sichtbar; Abbrechen und Moduswechsel schützen ungespeicherte Änderungen.
- **Leere Auswahl/Volumen:** Originalfoto sichtbar, keine leere Maske. Der Volumenwechsel zerstört die vorherige Auswahl nicht.

## Referenzen und Gestaltung

Flussreferenz ist das bestehende Setterformular mit gemeinsamem Speichern; der bisherige Griffeditor liefert Originalvergleich, Rückgängig und Geometrie als vertraute Werkzeuge. Übernommen werden die KWS-Tokens, Poppins, Beta-Marke, gemeinsamen Buttons/Inputs/Select/Switch/Dialog und 4/8/12px-Radien. Zusätzliche Freigabestufen, große Anleitungen und verschachtelte Karten entfallen. Mobil eine Lesespalte, auf breiten Displays ein begrenztes Formular. Der Speicherfuß bleibt sichtbar, die große Bildansicht hat einen eigenen begrenzten Dialog.

Das reale Beispielbild stammt aus dem bereits öffentlich verwendeten Appfoto von Kühner Wurm: `https://video.kletterwelt-sauerland.de/videos/21b1248b-5cf4-4492-aecd-e5ba2c139121/IMG_0322-7d8e6317-b7f5-40e0-ae9b-5b89066cd72d.jpg`. Die lokalen Beispielkonturen sind von Hand vorbereitet und keine Modellabnahme. Namen, Sektor und Formulardaten sind in diesem Entwurf Beispieldaten. Eigene Fotos lassen sich lokal einsetzen und manuell umranden.

## Umfang und technische Folgerung

Dieser Entwurf importiert keinen App-Root, Auth-/Backendclient oder Releaseplugin. CSP sperrt externe Verbindungen. Keine API-Schreibaktionen, kein Push, kein PR, kein Versionswechsel und keine Veröffentlichung.

Die echte spätere Integration muss Vorschlag, korrigierte Geometrie und fertiges Thumbnail gemeinsam mit dem Original speichern. Bestehende Geometrie hat Vorrang vor einer erneuten Erkennung. Für historische Varianten ohne gespeicherte Maske muss der aktuelle Bildstand erhalten bleiben, während die fehlende Bearbeitungsgrundlage vorbereitet wird; deren erste Rekonstruktion darf das bestehende Bild nicht stillschweigend ersetzen. Diese Aufbereitung und die Server-/Uploadintegration sind nicht Teil des lokalen Entwurfs. Die eigenständige nachträgliche Sammelprüfung behält ihre bisherige ausdrückliche Online-Freigabe.

Verifikation und Screenshots: `output/thumbnail-inline-ux/` und `docs/qa/2026-10-21-thumbnail-inline-ux-local.md`.
