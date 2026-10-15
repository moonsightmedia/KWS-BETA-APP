# Übungsillustrationen und Anzeigeeinstellungen

Branch `codex/training-ui`, lokale Vorschau Port5184, 13.10.2026. Diese Nutzerkorrektur ersetzt die Vorgabe großer individueller SVG-Bilder aus dem früheren Kinder-/Iconbericht.

## Ergebnis

Rasterillustrationen wieder als Hauptbilder in Bibliothek, Details und Einheiten. Passende Boulder-Grundbewegungen können mehrere Lernaufgaben illustrieren. Kleine eigene Symbole bleiben für Themenfilter und Wiedereinstiegsorientierung; redundante Symbole neben Karten-/Detailmetadaten und nummerierten Einheiteneinträgen entfernt. Zwölf eigene Kinderszenen ergänzt.

Zwei lokale, kontogebundene Schalter unter Profil → Trainingseinstellungen: Training anzeigen und Kinderbouldern anzeigen. Ganze Trainingsnavigation samt horizontalem Wechsel wird ausgeblendet; Kinderkacheln, Bibliothekssegment und Kinderfavoriten getrennt verborgen. Direkte Links zeigen eine verständliche deaktivierte Ansicht mit Einstellungslink. Einstellungen bleiben erreichbar. Trainingsdaten, einschließlich Kinderfavoriten, bleiben unverändert; Reaktivierung zeigt sie erneut. Tabs desselben Browsers erhalten Speicheränderungen. Andere Geräte synchronisieren nicht. Speicherfehler werden sichtbar und als Auswahl nur für das aktuelle Fenster benannt.

## Bildprüfung

Root und unabhängiger Prüfer haben 41 Bildkacheln, Einzel-Overrides und Bereichsmotive samt echten Komponenten-Zuschnitten geprüft: Anatomie, Kontaktpunkte, Geräte, Motivpassung, freie Fallbereiche, Nachbarfragmente und abgeschnittene Personen. Gefundene Probleme behoben:

- Dead Bug: fehlender/unklarer Arm und anschließend Gegenläufigkeit; aktives Einzelbild zeigt gestreckten Arm und gegenüberliegendes gestrecktes Bein.
- Bandpress: beide Bandstränge bis zu den Handgriffen nachvollziehbar.
- Geräteatlas: vollständigere Komposition; ungleich hohe generierte Reihen mit individuell geprüften quadratischen CSS-Crops statt verzerrtem Gleichraster. Kein Kopf-/Fingerboard-/Bankanschnitt oder Nachbarkachelrest im Endstand.
- Kinderbereich: wartendes Kind im Fallbereich entfernt. Gespräch auf zwei stabilen Hockern außerhalb der Wand statt am Wandfuß. Spiegelspiel zeigt die kleine Armidee bei unterstütztem Stand. Alle zwölf echten Detailzuschnitte erneut geprüft.
- Knie-Seitstütz und Zwei-Kurzhantel-Bankdrücken behalten bereits geprüfte Einzelbild-Overrides; fehlerhafte alte Atlaszellen bleiben ungenutzt.

Keine weiteren eindeutigen Bildartefakte im geprüften Endstand erkannt. Schematische Orientierung und redaktionelle Bildprüfung, keine Trainer-/klinische Freigabe. Prompt-/Dateiprovenienz in `public/training/README.md`; Originale bleiben im Codex-Generationsordner.

## Verifikation

23 Inhalts-/Plan-/Storage-/Historyprüfungen bestanden. Die vollständige UI-Suite mit27 Szenarien bestanden (1,4Minuten), inklusive Bilder statt SVG-Ersatz, Kita/Schule, Navigation, getrennte Gates, Kontoisolation, Datenerhalt, Reaktivierung, Tabs und Speicherfehler. Ein alter Fixture-Test erwartete den entfernten Ersatzseitenlink „Training öffnen“; auf den echten Hauptnavigationslink angepasst und nachgeprüft. Screenshots warten auf dekodierte Bilder; kein leerer Kinderbildplatz als Endstand.

Zwei visuelle/Interaktionsprüfungen bei375/768/1280/1920px, Root plus unabhängige Bild-/Einstellungsprüfung. Keine geprüften Überbreiten oder PageErrors. Scoped ESLint und diff-check sauber. Build mit Training-Vorschauflag erfolgreich, Version1.0.230 unverändert. App-Typecheck weiterhin76 bestehende Diagnosen außerhalb des neuen Trainings-/Settings-/Preferencescodes, einschließlich vorhandener Query-onError-Diagnose in App.tsx.

Nur isolierte lokale Browserkonten geprüft; keine produktive Cloud-/KI-/Native-Abnahme, kein Push/Merge/Deploy. Nächster Schritt: Auftraggeber prüft die wiederhergestellten Grafiken und beide Anzeigeeinstellungen lokal; vor Veröffentlichung fachlicher Hallen-/Kinderreview.
