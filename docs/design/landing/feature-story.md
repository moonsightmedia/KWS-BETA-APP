# Feature-Sequenz und interaktive Partnerschaft – V13

V12 Gestaltung: freistehendes Smartphone mit weichem grünem Farblicht statt der
dunkelblauen Bildfläche. Vier kleine, 44px hohe Icon-Schritte sitzen direkt
beim Text; keine Auswahlleiste über beide Spalten. Beschriftung im zugänglichen
Namen und Tooltip, aktive Funktion zusätzlich in der Textüberschrift.
Der Scrollfortschritt bleibt als dünne Linie unter den Schritten sichtbar.
Überschrift „Beta im Detail.“ ordnet ein, der jeweilige Featuretitel führt.
Mobil: Smartphone über Erklärung und integrierter Auswahl. Statischer Pfad,
Szenenreihenfolge und Scrollvertrag aus V8 bleiben unverändert.

Richtung: Die App wird beim Scrollen verständlich; die Partnerschaft zeigt sichtbar,
welche Beiträge im gemeinsamen Produkt zusammenkommen. Auftrag: Browserkommentare
vom 15.10.2026 zu V7. Die bisherige Curely-Kartenanordnung ist hierfür ersetzt.

## Storyboard

| Station | Aussage rechts | Echte App-Ansicht links | Übergang / Abschluss |
|---|---|---|---|
| 01 Boulder | Auswahl mit Fotos, Schwierigkeit, Farbe und Hallenbereich | app-native-boulders.webp | Erste Station beim Eintritt |
| 02 Beta | Lösung direkt beim Boulder ansehen | app-detail.webp | Bildschirm und Erklärung wechseln gemeinsam |
| 03 Fortschritt | Versuche, Tops, Flashes und Statistiken | app-statistics-demo.webp | Sichtbare Kennzeichnung als Beispieldaten |
| 04 Schraubplan | Neue Boulder zeitlich und räumlich einordnen | app-schedule.webp | Letztes Viertel, anschließend verlässt der Abschnitt den Viewport |

Keine Video-Frames, neue Bildgenerierung oder externen Mediendienste nötig.
Vorhandener fotografischer Frame bleibt unverändert über den Screenebenen.
Native Aufnahme 1000×2174; Webaufnahmen 780×1600; WebP. Alle vier Bilder sind
auch in der statischen Lesefassung ihren Texten zugeordnet.

## Scrollvertrag

360svh Abschnitt mit 100svh sticky Inhalt, vier gleichmäßig verteilte Stationen.
Fortschritt leitet sich ausschließlich aus dem nativen Seitenscroll ab. Kein
Wheel-/Touch-Abfangen und kein zweiter Scrollcontainer. Buttons springen per
normalem Smooth Scroll in die gewählte Station. Links/Rechts und Home/Ende sind
zusätzlich bedienbar. Rückwärtsscrollen kehrt die Sequenz um. Nach Station vier
löst sich der Sticky-Inhalt von selbst. Mobile Browserhöhe wird über die tatsächlich
gerenderte Sticky-Höhe statt einer angenommenen Bildschirmhöhe verrechnet.

Unter 360px Breite, unter 740px mobiler bzw. 700px sonstiger Höhe und bei Reduced
Motion: normale vollständige Liste. Ohne JavaScript derselbe lesbare Grundzustand.
Mobil im Sticky-Modus: Smartphone oben, Text und Auswahl darunter. Keine verzerrten
Screens; Seitenverhältnis des Frames in der Browserprüfung gemessen.

## Partnerschaft

Aktuell V11: aktives Logo farbig, Alternative grau; Wechsel tauscht die Werte.
Kein „Beitrag entdecken“ mehr. Logos bleiben bedienbar, ein kleiner Schalter
unter dem vergrößerten Mockup bietet einen zweiten Weg. Er wird beim ersten
sichtbaren Erscheinen einmal hervorgehoben, ohne die Auswahl zu wechseln. Hover
und Fokus machen die Alternative deutlicher. Beschriftete zugängliche Controls,
Screenreader-Hinweis und Statusmeldung ergänzen die visuelle Bedienung.

V13 Wechsel: 360ms Bildschirmüberblendung auf einer festen Ebene, unveränderter
fotografischer Frame ohne Drehung oder seitliche Verschiebung. Aktuelle gerenderte
Deckkraft wird vor dem Abbrechen gelesen und als neuer Startwert verwendet.
Kein Reset bei schneller Gegenwahl. Erklärung blendet300ms mit6px vertikalem
Versatz ein. Geclippte Screens und deckende Displayunterlage bleiben erhalten.
Reduced Motion cancelt und stellt genau einen finalen Screen dar.
Ohne JS beide Beiträge/Original-Links, kein funktionsloser Wechselschalter.

Zwei originale Logos als Auswahl mit sichtbarem Aktivzustand und aria-pressed.
Beide führen visuell zur gemeinsamen App. Auswahl wechselt Verbindung, Appansicht
und erklärenden Beitrag. Moonsight: Bedienung/Gestaltung/Entwicklung; KWS:
Boulder/Beta-Videos/Schraubplan. Separate Website-Links bleiben im aktiven Beitrag.
Mobil wandern die Logos über das zentrale Smartphone. Reservierter Inhaltsraum
verhindert einen Höhensprung bei der Auswahl. Tastatur: Enter/Space und Pfeiltasten.
Reduced Motion erhält die Auswahl, entfernt jedoch die Übergänge. Ohne JavaScript
sind beide Beiträge lesbar und die Logos normale Links auf die Partnerwebsites.

## Neue Screenshotquelle

`public/landing/app-statistics-demo.webp`: echte Statistics.tsx-Oberfläche,
15.10.2026 lokal mit existierenden synthetischen personal-hooks.ts-Fixtures
gerendert. Feste Fixturezeit 15.09.2026; keine Nutzeraktivitäten oder Kontodaten.
Playwright 390×800 mit 2× Pixeldichte, PNG-Ausgabe 780×1600, anschließend WebP.
Aufnahme und Capture-Script unter output/landing-v8. Externe Netzwerkzugriffe
während der Aufnahme blockiert. Screenshot ausdrücklich als Beispieldaten benannt.

Temporärer Vite-Server ausschließlich für die Aufnahme; keine Produktionsmutation.
Keine neue Dependency. Ignorierte node_modules-Junction nutzt vorhandene lokale
Pakete des ursprünglichen Checkouts; der ursprüngliche Checkout wurde nicht editiert.

## Nutzerkorrekturen V12

Partnerschalter exakt unter der Smartphone-Mitte; zusätzliche Beschriftung
„Die Beta App“ entfernt. Überschrift sachlich „Gemeinsam entwickelt.“.
Partnerbeitrag als gemeinsames helles Panel: Partner und Aufgabe links, kurze
Einordnung und drei konkrete Beiträge rechts. Violette/grüne Seitenlinie
kennzeichnet den aktiven Partner. Mobil untereinander mit lesbaren Aufgabenzeilen.
Beide Zustände behalten dieselbe Abschnittshöhe. Keine neue Bewegung.

V13 Featureauswahl: vorhandene Outline-Symbole search/play/progress/calendar
statt01–04. Zugängliche Namen, Tooltips,44px Touchziele und Fortschrittslinien
bleiben unverändert. Keine neue Symbolbibliothek oder Bilddatei.
# Mobile Korrektur V22 – aktueller Stand

Bis600px wird die native Scrollfixierung durch eine frei scrollende Ansicht mit
direkter Featureauswahl ersetzt. Smartphone bis210px breit, vier beschriftete
Iconziele oberhalb des Beitragstexts. Auswahl zeigt genau einen passenden Screen
und Beitrag. Tastaturpfeile/Home/End funktionieren; keine Wheel-/Touchübernahme.
Gleiche Ansicht bei reduzierter Bewegung, dann ohne Übergang. Ohne JS vollständige
Liste aller vier Beiträge. Ab601px bleibt die bestehende Desktop-/Tablet-Tour
bei ausreichender Höhe und ohne Bewegungsreduktion erhalten.

Partnerwechsel: ein einzelner Pfeil zeigt sofort nach rechts zur KWS bzw. nach
links zu Moonsight. Der zugängliche Name und Tooltip nennen den nächsten Partner.
Mobile Partnerlogos bleiben in der oberen Zeile; das zentrale Gerät ist größer,
der Schalter bleibt mittig darunter. Dekorative Verbindungslinie entfällt mobil.

