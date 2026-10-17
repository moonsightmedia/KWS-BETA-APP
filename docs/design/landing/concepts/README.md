# Drei Ausblick-Vorschläge16.10.2026

Auftrag: nach Recherche von zehn realen App-Websites drei konkrete Vorschläge.
Dies sind isolierte, interaktive Entwürfe, keine ausgewählte oder veröffentlichte
Landingversion. V18 und alle heutigen Appfunktionen bleiben unverändert.

Vergleich mit Desktop-/Mobilumschaltung: http://127.0.0.1:4188/

## A – Themenbühne

http://127.0.0.1:4188/a.html

Eine gemeinsame helle Themenfläche mit großer, bewusst am unteren Rand
angeschnittener echter App-Vorschau. Text links, Bild rechts; mobil zuerst
Produktbild. Kleine Themenauswahl außerhalb der Fläche. Headspace liefert das
Bedienprinzip, bestehende KWS-Farben/Typografie die Gestaltung. Platzbedarf
etwa840px Desktop, etwa920px Mobil. Root-Empfehlung aufgrund klarer Themenwahl
und guter Einbindung in die vorhandene Seite; keine Nutzerfreigabe behauptet.

## B – Mockup-Galerie

http://127.0.0.1:4188/b.html

Freistehende Geräte-/Fotogalerie mit zentralem großem farbigem Thema und
kleineren grauen Alternativen. Thema per Bild oder Auswahl darunter wählen.
Kurztext oberhalb. Things/Structured als Kompositionsprinzip, nicht als neue
Farbwelt. Vollständiges Gerät statt Bildcontainer, benötigt mehr Höhe: etwa
1080px Desktop und1020px Mobil. Hardwareposition ändert sich nur auf Wahl.

## C – Bildstrecke

http://127.0.0.1:4188/c.html

Desktop zeigt drei Themenflächen, die aktive erhält mehr Breite. Eigene
Entwicklungsansichten und Hallenfoto statt Cartoonmotive. Ab850px abwärts native
horizontale Bildstrecke mit sichtbarem Folgethema, Wischen und Pfeilen. Keine
vertikale Scrollsperre. Flightys Produktausschnitte/Apple-Cards-Prinzip angepasst
an12px-Radien. Übersichtlichste Variante für gleichzeitige Themenpräsenz.

## Gemeinsame Regeln und Eingaben

Poppins lokal, Schrift#192436, Aktionsgrün#36B531, helle neutrale Flächen,
8px-Controls,12px-Inhaltsflächen. Originaler fotografischer Geräterahmen.
Training/Kinderbouldern echte isolierte Entwicklungsscreens aus V18, nicht
veröffentlicht. Kletterhalle nur geplant, keine erfundene App-Ansicht. Termine
unbekannt. Keine automatisch wechselnden Inhalte oder Dauerbewegung.

Hallenfoto aus der offiziellen KWS-Seite, vor Verwendung visuell angesehen:
https://www.kletterwelt-sauerland.de/klettern/
https://www.kletterwelt-sauerland.de/wp-content/uploads/2022/03/PXL_20210919_064703396-scaled.jpg
Nur proportional verkleinert und WebP-exportiert; weder generiert noch retuschiert.
Lokale Entwurfsverwendung. Quellenmanifest output/landing-concepts/asset-source.json.

## Verifikation

Zwei vollständige gerenderte Schleifen375/768/1280/1920 je drei Konzepte und
drei Themen. Finale Ansichten aller vier Breiten tatsächlich visuell angesehen;
Tabletlayout C daraufhin zur größeren Bildstrecke überarbeitet. Kein horizontaler
Seitenüberlauf, Bilder/Fonts geladen, Klick und Tastatur-Pfeile/Home, direkte
Auswahl und Vergleichsumschaltung bestanden. Reduced-Motion-Pfad verwendet,
ohne JavaScript bleiben alle drei Themen lesbar. Vergleich hat getrennte
Desktop-/Mobilansichten. Keine JS-Laufzeitfehler. Lokale QA und Bilder unter
output/landing-concepts/; keine neue Abhängigkeit. Quelle bleibt ein Entwurf,
kein unabhängiger Abnahmepass und keine produktive Integration behauptet.

Aktuelle Landingfiles gegen V18-Pakethashes geprüft: unverändert. Nur isolierte
Entwürfe, Vergleich und diese Dokumentation ergänzt. Lokaler Server4188 bleibt
aktiv. Start: node output/landing-concepts/serve.cjs; Entwürfe generieren:
build.cjs, danach refine.cjs und tablet.cjs; QA: qa.cjs. Vor späterem Neuaufbau
überarbeiteten CSS-Stand bewahren. All dies sind lokale Arbeitsartefakte.

## Nutzerwahl und Integration V19

B ist am16.10.2026 vom Nutzer gewählt und in public/landing integriert. Auf
ausdrücklichen Wunsch ersetzt ein generierter Kletterhallen-Konzeptscreen das
Hallenfoto innerhalb des dritten Geräts. Alle3 Ansichten nutzen dieselbe echte
Hardware. A/C bleiben historische Alternativen. Neues Hauptziel:
http://127.0.0.1:4183/landing/?v=19&thema=climbing#ausblick. Prompt und Herkunft:
climbing-mockup.md. Die früheren Angaben „noch keine Auswahl“ sind historisch.
