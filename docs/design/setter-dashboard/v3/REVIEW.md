# UI-Entwurf 3 – visuelle Verdichtung

23.10.2026 · lokaler Entwurf · Beispieldaten · unveröffentlicht

Vorschau: http://127.0.0.1:5256/test/fixtures/setter-dashboard.html?design=v3

Vergleich: http://127.0.0.1:5256/test/fixtures/setter-dashboard.html?design=v2

## Auftrag und Gestaltungsrichtung

Nutzerkorrektur: V2 verbessert vor allem die Informationsstruktur, die Oberfläche wirkt weiterhin nicht ausreichend optimiert. V3 ist deshalb ein eigener visueller Vorschlag. Daten, Hinweisregeln und bestehende V2 bleiben erhalten. Keine neue allgemein verbindliche Designregel beschlossen.

Richtung: kompakte, ruhige Arbeitsoberfläche mit KWS-Typografie, Markenfarben, gemeinsamen Controls und 4/8/12-px-Radien. Einheitliche Kanten und sinnvolle Gruppen statt zusätzlicher großer Karten. Der gemeinsame App-Rahmen einschließlich Wasserzeichen und Navigation bleibt erhalten.

## Konkrete Änderungen

| Visuelles Problem | Lösung |
|---|---|
| Mehrere Kopfzeilen vor dem Inhalt | Bereichsauswahl, Aktualität und Aktionen in einer Werkzeugleiste; der Entwurfsvergleich ist darin integriert. Auf kleinen Flächen eine bewusste zweite Zeile. |
| Gleichgewichtete, hohe Statistikflächen | Kompakter Kennzahlenstreifen mit leichten inneren Trennern und identischen Zahlenachsen. |
| Diagramme wirken wie unabhängige Karten | Hallenbestand und Rückmeldungen gehören zu einer gemeinsamen Übersicht. Auf Desktop hat das Bestandsdiagramm mehr Breite. |
| Wiederholte Zahlendarstellungen und viele Einzelbalken | Anzahl direkt am Gradbalken; Grad als kurze Achsenbeschriftung. Gradeinschätzung als kompakter Gesamtbalken mit benannten Prozentwerten. |
| Hohe Prüfkarte konkurriert mit der Übersicht | Flache, direkt bedienbare Hinweiszeile auf Desktop; kompakte Zeilen auf Mobile. Fehlendes Feedback bleibt getrennt. |
| Such-, Auswahl- und Sortierwerkzeuge beanspruchen mehrere Desktopzeilen | Eine gemeinsame Werkzeugzeile vor der Liste; Spaltenköpfe und Werte verwenden exakt dasselbe Raster. |
| Lange Diagrammfolge auf Mobile/Tablet | Die zusätzlichen Bewertungsdiagramme sind dort über „Bewertungen im Detail“ aufklappbar. Desktop zeigt sie direkt. Kennzahlen bleiben sichtbar. |

## Verifikation

Loop 1: Gerenderte Ansichten bei 375/768/1280/1920 px gespeichert und visuell geprüft. Erste Prüfung führte zur Korrektur der CSS-Priorität gegenüber Tailwind-Utilities, einer breiteren Tablet-Bereichswahl und der mobilen Verdichtung. Finale Breiten ohne horizontalen Dokumentüberlauf. Tabelle und Kopfzeile sind spaltengleich. Belege: `output/setter-dashboard/v3/final-*.png`.

Loop 2: Komet-Detail und Bereichsmenü bei allen vier Breiten geöffnet und gespeichert. Escape und Rückkehr des Fokus zum ursprünglichen Komet-Button bei allen vier Breiten bestätigt. Infofenster ebenfalls bei allen vier Breiten geöffnet, geschlossen und Fokusrückgabe bestätigt. Mobile Bewertungsdetails auf-/zugeklappt; Sortiermenü sichtbar im Viewport, Mindeststimmenranking gewählt. Suche ohne Treffer und Reset, Grad 5 mit 28 Treffern, Bereichsübersicht einschließlich leerer Kurzer Platte, Bereich Bug mit 26 Bouldern/269 Rückmeldungen geprüft. Fehler und bestätigter Leerbestand getrennt gerendert. Screenshot-Belege im selben Ausgabeordner.

Technik: zwölf bestehende Aggregations-/Reviewtests bestanden. Gezieltes ESLint ohne Fehler; die bestehende Fast-Refresh-Warnung am exportlosen Fixture-Einstieg bleibt. Expliziter TypeScript-Vergleich mit V3: 61 bestehende Diagnosen vorher und nachher, keine neue. Isolierter QA-Build erfolgreich, bestehende Bundlegrößenwarnung. Regulärer App-Einstieg und Produktionscode unverändert; V3 ist ausschließlich im QA-Profil eingebunden. Keine zusätzlichen Pakete.

Grenzen: synthetische Beispieldaten, keine produktiven Konten/RLS- oder nativen Hardwaretests. Fachliche Hinweisgrenzen bleiben vorläufig wie in V2 dokumentiert. Kein Push, keine PR und keine Veröffentlichung. Nächster Schritt: Nutzer beurteilt die visuelle Richtung anhand der bedienbaren V3 und des direkten V2-Vergleichs.
