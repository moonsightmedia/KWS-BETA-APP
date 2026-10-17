# Navbar und Favicon V21

Auftrag16.10.2026: Favicon3/C übernehmen und Navbar aufwerten.

Richtung: ruhige, dauerhaft erreichbare Produktnavigation mit klarer Orientierung,
beiden Originalmarken und einem vollwertigen mobilen Menü.

## Gestaltung

Die vorhandene Seitengeometrie mit1160px-Inhalt und die bestätigte Doppelmarke
werden übernommen. Desktop88px, mobil72px; keine scrollabhängige Größenänderung.
Fläche papierweiß, bei Scrollen dezente Trennlinie/Schatten. Kurze Menüpunkte
Funktionen/Ausblick/Über Beta; aktiver Bereich dunkel mit grüner Unterlinie und
aria-current=location. CTA App entdecken bleibt am Desktop. Keine neue Schrift,
Iconbibliothek oder Abhängigkeit. Keine dekorative Daueranimation.

Mobil bis960px:44px-Schalter mit zwei Linien bzw. Schließen-Zeichen. Panel direkt
unter der Markenleiste mit drei großen Links und je einer kurzen Inhaltsangabe;
Status Bald für iOS & Android statt einer vorgetäuschten Downloadaktion.
Reihenfolge und Ziele bleiben identisch. Die alten Hero-/Feature-/Partnerinhalte
werden nicht neu gestaltet. Das Menü ist eine normale Navigationsaufklappung,
kein modaler Dialog und kein ARIA-Menü mit App-Menütastaturkonventionen.

## Zustände und Bedienung

Hover, sichtbarer Fokus, aktiver Bereich, geöffnet/geschlossen und Scrollzustand
sind gestaltet. Escape schließt und fokussiert den Schalter; Gegenklick,
Linkauswahl und Fokus außerhalb schließen ebenfalls. Auswahl fokussiert das
angesprungene Ziel. Ein Wechsel auf Desktop setzt den mobilen Zustand zurück.
180ms-Übergänge erklären Zustandswechsel; Reduced Motion deaktiviert sie.
Ohne JavaScript bleiben Links offen lesbar, mobil ohne fixierte hohe Menüfläche.
Auf kurzen Displays scrollt das Panel innerhalb der verfügbaren Höhe.

Sticky Feature-Tour liegt unter der Navbar; Fortschritt und direkte Auswahl
beziehen den Headeroffset ein. Bei knapper Höhe bleibt die vorhandene Listenform.

## Favicon

Quelle output/landing-concepts/favicons/c.svg, Nutzerwahl3. Unveränderter
Originalsymbolpfad, weiß auf#36B531, Kachelradius56/256. Exporte mit Sharp:
SVG, klassisches ICO mit32Bit-BGRA/DIB/Alphamaske in16/32/48px und180px-PNG.
Keine neue Symbolform. Versionierte Favicon-URLs verhindern die Verwechslung
mit der vorigen Browsercachedatei. Wortmarken/KWS-Logo unverändert.
Reproduzierbarer Export:output/landing-v21/export-favicon.cjs.

Prüfbelege:docs/qa/2026-10-16-landing-navbar-v21.md.
