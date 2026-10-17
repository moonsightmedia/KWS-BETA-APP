# Navbar/Favicon V21 – Verifikation

Zwei Render-/Bedienloops bei320/375/768/960/961/985/1280/1920px.
Header, beide Logos, Menü und Hero bei375/768/1280/1920 visuell geprüft.
Keine horizontalen Überläufe, Marken bleiben getrennt und proportional.
Desktop und mobile Navigation funktionieren; Hauptaktionen mindestens44px.

Geprüft: Öffnen/Schließen, Enter/Tab/Escape, Fokusrückgabe, Fokus außerhalb,
Gegenklick, Zielauswahl, mobiler/desktop Größenwechsel, Sprungziele unter Navbar,
aktiver Bereich und Scrollzustand. Drei Ausblickthemen und Partnerauswahl weiterhin
bedienbar. Keine JavaScript-Laufzeitfehler in den beiden Hauptprüfloops.

Zusätzlicher Akzeptanzpass mit normaler Bewegung bei375/768/985/1280px,
985×781 eingeschlossen: alle vier Featurekapitel und deren Controls bleiben
unterhalb der Navbar im Viewport. Reduced Motion beim Livewechsel berücksichtigt.
Kurzes375×420-Menü bleibt intern scrollbar, ohne JavaScript sind Links nutzbar.
Klassisches ICO wird vom Browser tatsächlich als Bild dekodiert; Header bestätigt
drei Größen16/32/48. SVG, ICO, Touchicon HTTP200.

Belege output/landing-v21/{qa.cjs,qa-results.json,acceptance.cjs,
acceptance-results.json}; Screenshots top-*,menu-* und features-*-settled.png.
Zwei QA-Scriptkorrekturen betrafen einen mehrdeutigen Selector sowie das Warten
auf asynchrone Resize-/Mediaereignisse. Keine Produktfehler daraus abgeleitet.

Releasepaket aa5fab635bbef5cd,27Dateien,1170354Bytes: gebaut und Integrität
verifiziert. Bundleprüfung löst versionierte Asset-URLs über deren Pfad auf;
unbekannte Assets bleiben Fehler. Keine Publikation, Storelinks weiter Platzhalter.
