# Drei Navbar-Entwürfe V22

Nutzerauftrag16.10.2026: drei neu durchdachte Navbars, zusätzlich zum
Richtungspfeil-Fix und zur mobilen Optimierung der bestehenden Seite.

## Ziel und Grundlagen

Die drei Ziele Funktionen, Ausblick und Über Beta müssen mit beiden Originalmarken
klar erreichbar bleiben. Bestehende Seitenstruktur als Flow-Referenz; KWS-Farben,
Poppins, Originalmarken und vorhandene Outline-Icons als visuelle Grundlage.
Keine externen UI-Bibliotheken, keine neue Bildgenerierung oder neue Wortmarke.
Unterschiede entstehen aus Informationsanordnung und Bedienung.

## A – Direkt

Beta links, originales KWS-Logo rechts. Desktop mit mittiger Navigation und
grünem CTA; mobil eine ständig sichtbare, eigene Linkzeile unter den Marken.
Kein Menüschritt. Ziel: schnelle Orientierung bei nur drei Seitenbereichen.
Abwägung: die mobile Leiste braucht124px statt72px Höhe.

## B – Floating Dock

Schwebende weiße Desktopleiste mit kleinem Radius, Schatten und dunklem CTA.
Mobil bleibt oben eine Markenleiste; die Navigation sitzt im unteren Dock mit
passenden Suche-/Ausblick-/Team-Icons. Aktiver Abschnitt und44px-Ziele bleiben.
Safe-Area-Abstand und zusätzlicher Footerraum schützen die letzten Links.
Abwägung: dauerhaft belegter Platz am unteren Bildschirmrand.

## C – Visuelles Menü

Reduzierter Kopf mit beiden Marken und Menüknopf. Die Navigation öffnet ein
visuelles Inhaltsverzeichnis: echte Screenshot-Ausschnitte für Funktionen und
Ausblick, beide Originallogos für die Partnerschaft. Desktop drei Kacheln,
mobil kompakte Zeilen mit Vorschaubildern. Escape/Fokus/Rückwahl vorhanden.
Abwägung: ein zusätzlicher Menüschritt bis zum Seitenziel.

## Vergleich und Status

Vom Repositoryroot starten:

    node docs/design/landing/concepts/navbar-v22/serve.cjs

Vergleich http://127.0.0.1:4189/ mit gleichzeitig bedienbarer Desktop- und
Mobilansicht, Handybreiten320/375/390/430 und umschaltbarem Menü beiC.
Direktvorschauen /a,/b,/c. Der Server kombiniert den eingefrorenen V22-Ausgangsstand
unter base/ mit isolierten Header-Overrides und den gemeinsamen Bild-/Fontassets.
Nutzerwahl V23: B ist ausgewählt und in die eigentliche Landingpage übernommen.
A/C bleiben historische Vorschläge; die Vergleichsseite verändert keine Produktion.

## Verifikation

Alle drei Varianten je zweimal bei320/375/768/985/1280/1920px geprüft; beide
Marken, Navigation, aktiver Bereich,44px-Ziele, Fokus/Escape und No-JS bestanden.
375/768/1280/1920px visuell angesehen. Vergleichsoberfläche auch375px ohne
horizontalen Überlauf geprüft. Reduced Motion ohne Menüanimation.
Belege und visuelle Vergleichstafel unter output/navbar-v22.
