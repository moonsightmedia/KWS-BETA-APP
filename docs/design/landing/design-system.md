# Landingpage: verbindlicher Prüfkontext

Aktuell V13: Feature-Karten und die V6-Partneranordnung sind durch die native
Scroll-Sequenz und die interaktive Partnerdarstellung ersetzt. Der vollständige
Vertrag mit Breakpoints, Szenen und Fallback steht in `feature-story.md`.
Features und Partnerschaft aus V8, Footer aus V7 bleiben erhalten. Keine neuen
Abhängigkeiten. Hero V9: auf Mobil ein vollständiges Hauptgerät, kleinere
Ansichten dahinter, Griffe unten außerhalb der Appinhalte. Dauerhaftes Schweben
global entfernt. Einmaliger Eintritt bleibt, mobil kürzer und ohne Rotieren der
Geräte; Scrolltiefe ausschließlich auf großen Geräten mit feinem Zeiger.
Die weiter unten beschriebenen V7-Schwebeschleifen sind damit aufgehoben.

Featuregestaltung V12: freistehendes Originalgerät vor diffusem grünem Farblicht,
keine dunkelblaue Bildfläche. Auswahl als vier 44px hohe Icon-Schritte
direkt unter dem Text statt raumgreifender gemeinsamer Leiste. Zugängliche Namen,
Tooltips, Tastaturwahl und synchroner Scrollfortschritt bleiben erhalten. Mobil
Mockup über Erklärung und kompakter Auswahl, kurzer Viewport bleibt statisch.

Partnerschaft V11: aktives Original farbig, Alternative per CSS grau, keine
Veränderung der SVG-Dateien. Logos plus kleiner Wechselschalter statt
„Beitrag entdecken“. Einmalige Schalterhervorhebung als Bedienhinweis, keine
automatische Auswahl und keine Dauerschleife. Größeres Mockup mit deckender
Displayunterlage; V13 ersetzt die Neigung durch eine feste Bildschirmüberblendung ohne Bewegung
des fotografischen Rahmens; schnelle Gegenwahl übernimmt die aktuelle Deckkraft.
Tastatur/Touch, schnelle Gegenwahl, reduzierte Bewegung und No-JS erhalten.

- Zweck: KWS Beta App vorstellen, Kernfunktionen zeigen, gemeinsame Entwicklung
  durch Moonsight Media und Kletterwelt Sauerland nennen. App Store/Google Play
  bleiben auf ausdrücklichen Nutzerwunsch Platzhalter, keine aktiven Downloads.
- Drei Abschnitte: Hero, Features, Zusammenarbeit. Impressum/Datenschutz im Footer.
- Farben: Aktionsgrün #36B531, starke Schrift #192436, helle neutrale Flächen.
  Grün als Fläche mit dunkelblauer Beschriftung. Kein dunkelgrüner Ersatz für die
  Markenfarbe. Normaler informativer Text mindestens 4,5:1.
- Schrift: lokale Poppins für Marketinginhalt, Teko nur kompakte Beta-Wortmarke.
- UI-Radien: 8px Controls, 12px Inhaltsflächen. Gerätehardware hat eigene echte
  Radien. Kein zufälliger Pill-/Glas-/Neon-Look.
- Echte App-Screenshots und fotografischer Frame. Bildschirmproportionen erhalten.
- V5: Header und Hero über die volle Viewportbreite, ohne äußeren Rahmen.
  Zwei dekorative 3D-Klettergriffe flankieren die Geräte. Auf kleinen Displays
  am Rand beschnitten; Haupttext und Storeflächen bleiben frei. Grafiken ohne
  Zeigerinteraktion und für Screenreader ausgeblendet.
- Referenz dient Komposition. Heller Hero mit dezentem grün-neutralem Farblicht
  wird aus der gelieferten Vorlage abgeleitet; keine neue Fremdmarkenpalette.
- KWS-Logo vom Nutzer explizit bestätigt: ursprüngliche schwarz-grüne Wortmarke
  mit Berglinie, ohne „Klettern · Bouldern · Bistro“. Keine rein grüne Wortmarke
  und keine Weltkugel als Ersatz.
- Moonsight: originales violettes Vektorlogo ohne weißen Hintergrundkasten.
- Responsive, Safe Areas, sichtbarer Tastaturfokus, reduzierte Bewegung.
- Keine erfundenen Testimonials, Kennzahlen, Preise oder Verfügbarkeit.
- V6: Zusammenarbeit als eigener vollbreiter, hell getönter Abschnitt.
  Desktop: Einführung links, zwei Partnerbeiträge rechts mit unveränderten
  Original-Logos und jeweils eigenem Websitezugang. Mobil lineare Lesereihenfolge.
  Der dunkle Footer enthält Appnavigation, Partnerwebsites, Verfügbarkeit und
  eine getrennte rechtliche Fußzeile. Das ist eine Marketinggestaltung,
  keine Änderung des gemeinsamen App-Layouts.
- V6 Bewegung: einmalige Einblendungen (18px/620ms, maximal 195ms Staffelung),
  Heroeintritt und begrenzte scrollabhängige Tiefe bei Geräten und Griffen nur
  auf großen Zeigergeräten. Kein Dauerschweben und kein abgefangener Scroll.
  Reduced Motion deaktiviert Effekte und Smooth Scroll auch beim Livewechsel.
  Inhalte bleiben ohne JavaScript sichtbar; Animationen sind rein ergänzend.
- V7 ersetzt die V6-Begrenzung auf statische Heroobjekte: Nutzer wünscht mehr
  sichtbare Bewegung an Mockups/Griffen. Geräte treten über 1250ms gestaffelt
  von unten/seitlich ein, Griffe über 1450ms mit Rotation. Danach begrenztes
  Schweben (Geräte 4–11px, Griffe 9–16px/3°). Scroll: Geräte bis 44px Hub,
  Seiten bis 6° aufgefächert, Griffe gegenläufig bis 125px/72px vertikal und
  32px seitlich. Mobil 40% Scrollintensität. Individuelle Transformebenen
  vermeiden Konflikte zwischen Frame, Screenshot, Eintritt und Tiefenbewegung.
  Fünf Heroanimationen pausieren außerhalb des Heros und bei verborgenem Tab.
  Livewechsel zu Reduced Motion cancelt alle und entfernt sämtliche Versätze.

V12 Partnerbereich: sachliche Überschrift „Gemeinsam entwickelt.“. Zentraler
Schalter ohne Zusatzlabel unter dem Smartphone. Ein zusammenhängendes helles
Beitragspanel mit Markenakzent, Aufgabe, Websitezugang und drei beschriebenen
Beiträgen; keine neue Logozeichnung oder Bewegungsregel.

V14 Markenintegration: originales Beta-Logo aus dem verfeinerten V2-Paket
16.10.2026 im Header und invers im Footer, dazu passendes Favicon/Touchicon.
Hallenname separat, KWS-Logo im Partnerbereich bleibt erhalten. Keine Form-,
Farb- oder Bewegungsänderung der Originaldateien. Quelle:logo-integration.md.

V16: eigener Ausblick zwischen Funktionen und Partnerschaft. Links sachliche
Einordnung, rechts drei native Details-Zeilen mit ausgeschriebenem Status und
kurzen Themen. Mobil einspaltig;44px-Mindestziele, sichtbarer Fokus, kein
JS-Zwang. Training standardmäßig geöffnet. Texte: Training und Kinderbouldern
in Entwicklung; spätere Kletterhallen-/Seilerweiterung geplant. Ohne feste
Termine und ohne Verknüpfung zur gesperrten App-Vorschau.

V17 ersetzt die V16-Akkordeonliste durch sichtbare Vorschauflächen. Training
dominiert links, geplante Seildisziplin und Kinderbereich rechts. Unter850px
lineare Komposition; auf kleinen Displays Kinderillustration unter der Kopie.
Keine neuen Klickziele oder aufklappbaren Pflichttexte; Status und Verfügbarkeit
bleiben ausgeschrieben. Vorhandene App-Konzeptillustrationen als optimierte WebP,
keine erfundenen UI-Screenshots oder neue Termine.

V18 ersetzt ausschließlich V16/V17 im Ausblick: ein zusammenhängender heller Vorschaubereich mit drei sichtbaren Themen-Tabs (Training, Kinderbouldern, Kletterhalle), Auswahl durch grünen Unterstrich und verstärkte Schrift. Mindestens44px hohe Tasten, sichtbarer Fokus und Pfeiltasten/Home/End. Echte isolierte Entwicklungsscreens für Training/Kinder, feste gerade fotografische Hardware; Kletterhalle ausdrücklich ohne vorhandene App-Ansicht. Ab601px Erklärung links und Gerät rechts, mobil Erklärung vor vollständig sichtbarem Gerät. Gleiche Panelhöhe je Breakpoint, keine horizontale Überbreite. Kurze reine190ms-Deckkraftüberblendung nur bei Benutzerwahl; keine Dauerschleife. Reduced Motion entfernt sie auch beim Livewechsel. Ohne JavaScript alle drei Inhalte sichtbar, Tabsteuerung verborgen. Status und fehlende Termine ausgeschrieben. Lokale Poppins, vorhandene Farben,12px Inhaltsradius und Original-Logos bleiben erhalten.

V19 supersediert V18 im Ausblick: Nutzer wählt B, freistehende Mockup-Galerie.
Ein farbiges zentrales Gerät, zwei kleinere graue Geräte; kein leerer Fotoersatz.
Drei native Themen-Tabs und anklickbare Vorschaubilder; Bilder haben ergänzende
Bedienfunktion, vollständige Tastaturwahl über Tabs. Ausgeschriebene Status,
gleiche Layouthöhe je Themenwechsel, ohneJS alle Inhalte lesbar. Nur bei Auswahl
350ms Positions-/Graustufenwechsel und220ms Textüberblendung; Reduced Motion
entfernt beides. Nutzer erlaubt generierte Kletterhallen-Konzeptansicht mit
sichtbarer Kennzeichnung und Beispielrouten. Training/Kinder bleiben echte
Entwicklungsscreens, Rahmen/Logos bleiben original. Detaillierte Provenienz in
concepts/climbing-mockup.md.
# Logo-Aktualisierung V20

Ausgewählte DM-Sans-700-Wort-Bild-Marke ersetzt die bisherige V2. Primary auf
hell, originale weiße Fassung im Footer; KWS bleibt zusätzlich im Header.
Details und Quellnachweis:logo-integration.md. Sonstige Sektionen unverändert.

V23: Navbar B ausgewählt. Eigene navigation.css enthält die schwebende
Desktopleiste und bis960px das untere Dock. Oben bleiben beide Originalmarken;
die drei Ziele Funktionen/Ausblick/Über Beta sind dauerhaft sichtbar. Keine
zusätzliche Menüebene. Gemessene Leistenhöhen, Safe-Area und Footerreserve
halten Bedienelemente erreichbar. Aktiver Abschnitt mit Text und Unterstrich.
Roadmap: horizontale Gesten wechseln zyklisch in Tab-Reihenfolge, Mausziehen
ebenso; native vertikale Gesten bleiben erhalten. Kurzer Zug folgt dem Finger,
Reduced Motion entfernt ihn. Keine automatische Rotation. Themenbuttons haben
native Klick-/Tastaturbedienung und zusätzlich gegen unterdrückte Touchklicks
abgesicherte kurze Pointer-Taps; scrollende/abgebrochene Gesten zählen nicht.

V24 passt Mobile eigenständig an: ein ruhiger100px-Kopf plus Trennlinie,
oben128px-Beta-Wortmarke und88px-Hallenlogo, darunter44px hohe Textlinks.
Unteres Dock und dessen Platzreserve entfallen. Originalmarken, Poppins,
Farben und aktive Unterlinie erhalten; Desktop B unverändert. Mobil bis600px
enden die Hero-Mockups an einer harten Sektionskante nach etwa53% ihrer Höhe.
Dadurch wird die Funktionssektion früher sichtbar. Keine Bildverzerrung oder
neue Mockupgeneration; seitliche3D-Griffe und ruhiges mobiles Motionverhalten
bleiben. Ausgangsreferenz ist der kommentierte Nutzer-Screenshot des Heroendes.

V25 glättet den horizontalen Roadmapwechsel: ein360ms-Übergang aus den aktuell
gerenderten Gerätepositionen einschließlich des Finger-Offsets. Keine separate
Galerierückfederung. Das hintere Gerät wechselt unsichtbar über die äußeren
Kanten; das neue Hauptgerät wird früh deckend. Direkte Gegenwahl liest den
laufenden Zustand vor dessen Abbruch aus. Kurze/abgebrochene Gesten kehren
weich zur aktuellen Auswahl zurück. Reduced Motion und Resize beenden die
Positionsanimationen; native Vertikalgesten werden nicht übernommen.

V26: Kompakte mobile Navbar ebenfalls schwebend,12px Seitenabstand,
mindestens12px oberer Sticky-Abstand unter Berücksichtigung der Safe-Area,
12px Kartenradius und dezenter vorhandener Schatten. Die zweizeilige
Marken-/Textnavigation bleibt. Hero und Anker reservieren den tatsächlichen
Platz für die über dem Inhalt liegende Navbar; Desktop B unverändert.

V27: Mobil bis960px nur32px breites originales Beta-Symbol in44px-Linkfläche
neben drei44px-Textlinks, eine64px-Innenzeile/66px-Außenhöhe. Wortmarke/KWS
im mobilen Header ausgeblendet; beide Desktopmarken und Partnerlogos erhalten.
Schwebende12px-Ränder/Rundungen und gemessene Ankerabstände bleiben.

