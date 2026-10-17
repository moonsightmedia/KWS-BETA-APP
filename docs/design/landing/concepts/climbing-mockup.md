# Kletterhallen-Konzeptmockup –16.10.2026

Nutzer wählt Entwurf B und bittet ausdrücklich darum, auch die Klettervariante
als Mockup zu generieren. Die gewählte Galerie B ist in die Landingpage integriert.
Alle drei Motive verwenden denselben originalen fotografischen Geräterahmen.
Training/Kinderbouldern bleiben echte Entwicklungsaufnahmen; Kletterhalle ist
ein erzeugter Entwurf, sichtbar als „Geplant · Konzeptvorschau“ markiert.
Im Bild selbst steht ebenfalls „Konzeptvorschau“. Beispielrouten und Grade
sind Konzeptinhalte und keine echten Hallen- oder Implementierungsdaten.

## Bildgenerierung

Modus: integriertes image_gen.imagegen, kein CLI/API-Fallback und keine neue
Abhängigkeit. Ein Generierungslauf, danach Bild visuell geprüft. Drei Referenzen:
vorhandene Boulder- und Trainingsansicht für KWS-Appstil; echtes Hallenfoto aus
der offiziellen Kletterwelt-Website als Bildreferenz. Kein neues Telefonrender:
erzeugt wurde nur der flache Appinhalt ohne Systemstatuszeile und ohne Hardware.
Originale Referenzdateien und Markenlogos wurden nicht verändert.

Vollständiger tatsächlich verwendeter Prompt: climbing-image-prompt.txt.
Original im Projekt: output/landing-v19/climbing-concept-original.png.
Auflösung876×1796, ursprüngliches eingebautes Tool-Ergebnis aus
C:/Users/Janosch/.codex/generated_images/01a13ec8-6bb3-78e0-b7a9-3fb9c0c298c5/exec-f7a22af5-5677-4c95-a99b-f097964e8c03.png.

Finales Website-Asset:
public/landing/roadmap-app-climbing-concept.webp
169034Bytes, technischer WebP-Export Qualität90 ohne Inhaltsänderung.
SHA-256: 0ed778d243433d5ff99c4cec13d1710cdd8aba40b226be8ed4e4376f63695853

Die Bildproportion entspricht praktisch den vorhandenen780×1600-Screens;
der gleiche Web-Screen-Rahmen und dieselbe ergänzte Statusleiste werden benutzt.
Keine neue Produktfunktion oder Trainingsroute freigegeben.

## Vorschau

http://127.0.0.1:4183/landing/?v=19&thema=climbing#ausblick
Ausgewählter ursprünglicher Einzelentwurf ebenfalls aktualisiert:
http://127.0.0.1:4188/b.html?thema=climbing

Standard ohne Themenparameter startet weiter bei Training. Der Parameter ist
nur eine lokale/öffentliche Präsentationsauswahl, kein App-Featureflag.
