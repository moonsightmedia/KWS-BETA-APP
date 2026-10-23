# Entwurf 4 – Bereichsnavigation und weniger Zusatztexte

23.10.2026 · zwei bedienbare Vorschläge · synthetische Beispieldaten · unveröffentlicht

## Vorschläge

**A – direkte Bereichsleiste:**
http://127.0.0.1:5256/test/fixtures/setter-dashboard.html?design=v4

Bereichsnamen und Bestandszahlen sind direkt sichtbar. Antippen wählt den Bereich; auf engen Flächen lässt sich die Leiste horizontal verschieben. Nachbaranschnitt und Pfeile zeigen weitere Einträge. Auswahl mit Grün und Häkchen, per Tastatur Pfeiltasten/Pos1/Ende. Schnell für gezielte Sprünge auf Desktop. Die Leiste zu verschieben allein ändert den Datenfilter nicht.

**B – Swipe-Kopf:**
http://127.0.0.1:5256/test/fixtures/setter-dashboard.html?design=v4&area-ui=swipe

Ein Bereich steht mit Namen, Boulderzahl und Position im Mittelpunkt. Der Kopf lässt sich nativ horizontal wischen und rastet ein; nach dem Einrasten ändern sich Kennzahlen, Diagramme und Liste gemeinsam. Pfeile und Tastatur sind gleichwertige Alternativen. Kein Umlauf an den Enden. Vertikales Seitenscrollen bleibt frei; `data-swipe-ignore` trennt die Bereichsauswahl vom globalen Routenwechsel. Kein selbstgebauter Touch-Scroll-Ersatz, keine zusätzliche Bibliothek. Native Gesten erhalten Pinch-Zoom. Automatische Ausrichtung bei Größenwechseln springt ohne eigene Animation zur gewählten Seite.

**C – Hallenkarte als räumlicher Einstieg, noch nicht implementiert:**
Die vorhandene echte Hallenkarte könnte als zusätzliche Ansicht die Auswahl über Wandbereiche ermöglichen. Das passt zu räumlichen Fragen, beansprucht aber mehr Platz. Keine erfundene Karte oder Platzhaltergeometrie für diesen Vergleich. Empfehlung als ergänzender Zugang, nicht als dauerhafte große Fläche vor den Kennzahlen.

Empfehlung zur Diskussion: A auf Desktop, B auf Mobile. Beide sind zunächst eigenständige Varianten, noch keine freigegebene automatische Kombination. Prototyp-Links stehen am Seitenende; kein zusätzliches Auswahlmenü über dem eigentlichen Dashboard.

## Bereinigung unten

- Zusatz „23 seit mindestens 7 Tagen angelegt“ entfernt; „26 ohne Feedback“ bleibt als direkt nutzbare Auswahl.
- Allgemeiner Disclaimer zum App-Feedback entfernt.
- Wiederholtes „Kein Hinweis“ und separate Einordnungs-Spalte entfernt. Konkrete Grad-/Bewertungs-Prüfanlässe stehen kompakt beim Boulder-Namen.
- Die Alters-Zusatzangaben aus Liste/Detail entfernt. Keine altersabhängige Qualitätsdiagnose in der Oberfläche. Sterne und Schwierigkeit behalten ihre tatsächlichen Stimmenzahlen.
- Wiederholte Filter-Bedienerklärung entfernt; aktive Auswahl und Reset bleiben sichtbar. Messdefinitionen stehen weiterhin hinter dem Info-Icon.
- Nutzerpräzisierung in `docs/DESIGN.md` aufgenommen. Navigationsvorschläge ausdrücklich noch nicht als allgemeine Regel bestätigt. Historische V1–V3 bleiben erhalten.

## Verifikation

**Loop 1:** Beide Varianten gerendert und visuell geprüft bei 375/768/1280/1920 px. Kein horizontaler Dokumentüberlauf. Der erste Durchgang zeigte ein fehlendes Vier-Spaltenraster in der Entwicklungs-Vorschau; Kopf und Listenzeilen anschließend ausdrücklich auf dasselbe Raster gesetzt und die vollständige Desktopansicht erneut geprüft. Die Bereichsleiste nutzt Nachbaranschnitt/Pfeile statt einer zusätzlichen horizontalen Systemscrollbar.

**Loop 2:** A bei allen vier Breiten mit Tastatur nach Bug gewechselt; jeweils 26 Boulder, 269 Beiträge (167 Sterne/94 Einstufungen/8 Kommentare), 77 % Abdeckung. Endposition Top-Out bleibt bei weiterem Pfeil rechts erhalten, Pos1 führt zur ganzen Halle zurück. B bei allen vier Breiten mit tatsächlichen horizontalen Browser-Scrollgesten nach Bug gewechselt und dieselben Daten bestätigt. Eine Testgeste von einer ganzen Bildschirmbreite überschritt auf Tablet zwei kleinere Bereichsseiten; mit auf die Kopfbreite bezogener Geste gezielt einen Bereich gewechselt. Kein Produktfehler daraus abgeleitet.

Native Vertikalgeste über B bestätigte Dokumentscroll um 450 px bei unveränderter Bereichsauswahl. Bekannter leerer Bereich Kurze Platte per sichtbaren Pfeilen erreicht: 0 Bestand, Durchschnitt/Abdeckung unbekannt statt 0/0-Quote. Infofenster bei beiden Varianten und allen vier Breiten geöffnet/geschlossen, Fokusrückgabe bestätigt. Vorgängerprüfungen zu Datenaggregation, Pagination und Bewertungsauswertung bleiben relevant.

Abschließend REST-Fehlerzustand mit gesperrter Bereichsnavigation geprüft und danach die normale Ansicht wiederhergestellt. Komet-Detail mit Escape/Fokusrückgabe erneut geprüft. Gerenderten Seitentext auf Entfernung der Alters-Zusatzzeile, des allgemeinen Disclaimers und von „Kein Hinweis“ kontrolliert; alle drei entfernt. Beleg: `error-375.png` und finale normale Ansicht.

Technisch: zwölf Aggregations-/Reviewtests bestanden, gezieltes ESLint ohne Fehler (bestehende Fast-Refresh-Warnung am Fixture-Einstieg). TypeScript einschließlich V4/AreaNavigation: Basis 61, aktuell 61, keine neuen Diagnosen. Expliziter QA-Build erfolgreich mit bestehender Bundlegrößenwarnung. Keine neuen Pakete oder Produktivdaten verwendet. Regulärer App-Einstieg unverändert; beide Varianten nur im QA-Profil.

Belege: `output/setter-dashboard/v4/rail-*.png`, `swipe-*.png`, `rail-selected-*.png`, `swipe-selected-*.png`, `empty-area-375.png`, Buildlog und `output/setter-dashboard/typecheck-v4-comparison.json`.

Grenzen: Browsergesten und Tastatur geprüft, keine physische iPhone-/Android-Abnahme; keine echten Konten/RLS-Daten. Hallenkarte ist nur Vorschlag C. Kein Push, keine PR und keine Veröffentlichung. Nächster Schritt: Nutzer wählt A/B oder bestätigt die vorgeschlagene Desktop-/Mobile-Kombination.
