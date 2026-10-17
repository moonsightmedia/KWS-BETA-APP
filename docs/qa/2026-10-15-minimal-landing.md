# Beta-App-Landingpage – Fassung 13 mit Nutzerkorrekturen

Stand: 15.10.2026. Vorschau `/landing/?v=11#gemeinsam`, nicht veröffentlicht.

## Ergänzungen in V13

Featureauswahl: vier bestehende Outline-Icons statt Zahlen; zugängliche Namen,
Tooltips, Fokus und44px Touchziele bleiben erhalten. Keine neue Dependency.
Partnerwechsel: feste Smartphonegeometrie statt12°-Drehung und verschobenen
Screens.360ms Überblendung auf derselben Ebene. Vor Abbruch wird die gerenderte
Deckkraft gelesen; Gegenwahl startet dort und springt nicht auf0/1 zurück.

Zwei gerenderte Prüfphasen bei375/768/1280/1920px; zusätzlich985×781 und1074px.
Gezielter Animationstest: Rahmenposition und Maße unverändert (<0,1px), keine
Screen-/Rahmentransformation, sechs Wechsel nach je50ms mit Deckkraftsprung
<0,001, zuletzt genau ein vollständig sichtbarer Screen und keine Restanimation.
Zwischenbilder des Wechsels und alle vier Iconansichten visuell kontrolliert.

Regression: vier Features vorwärts/rückwärts, Mausrad, Direktauswahl mit Tastatur,
Sticky-Austritt, Partnerschalter/Logos, Graustufen, konstante Abschnittshöhe,
Reduced Motion live, No-JS, kurze Viewports und ausgefallenes Statistikbild.
Keine Laufzeit-/HTTP-Fehler. JS-Syntax und Whitespace geprüft.
Artefakte: `output/landing-v13/`. Lokal, kein Deployment/Produktionsbuild.
Keine neue unabhängige Jury; historische V4-Urteile gelten weiter nur dort.

## Ergänzungen in V12

Nutzerkorrekturen: blaue Featurefläche entfernt, diffuse grüne Beleuchtung und
leichter Geräteschatten, kompakte vierteilige Direktauswahl beim Text statt
vollbreiter Leiste. Partnerwechsel mittig ohne Zusatzlabel. Sachlicher Titel,
neu gegliedertes Beitragspanel mit Partnerfarbe und konkreten Aufgaben.

Zwei Root-QA-Loops bei375/768/1280/1920px, zusätzlich985px (781px hoch)
und1074px. Loop1 fand mobilen Überlauf durch die gedrehte Lichtfläche sowie
7px Platzmangel der Statistikstation bei375×740; Rotation entfernt und mobile
Zeilenverteilung angepasst. Loop2 bestätigt offene Bildfläche, 212×44px
Auswahl, zentrierten Schalter (<1px Abweichung), entfernte Zusatzbeschriftung,
lesbare Beiträge und kein horizontaler Überlauf.

Funktionsprüfung: alle vier Stationen vorwärts/rückwärts, natürliches Freigeben
des Sticky-Abschnitts, Mausrad, direkte Tastaturauswahl/Home/End, Partnerwahl,
Graustufenwechsel, schnelle Gegenwahl, gleiche Abschnittshöhe, Gerätemaße,
Reduced Motion einschließlich Livewechsel, No-JS und fehlendes Statistikbild.
Zusätzlich320×812,375×740,768×700,1280×700 und375×600 geprüft.
Keine Laufzeit- oder HTTP-Fehler. Lokale Playwright-Scripts und Screenshots:
`output/landing-v12/`. JS-Syntax und Text-Whitespace geprüft. Keine neue
Dependency, kein Produktionsbuild oder Deployment; Storeflächen bleiben Platzhalter.
Keine neue unabhängige Designjury; die alten V4-Urteile bleiben historisch.

## Ergänzungen in V11

Partnerauswahl entsprechend Nutzerwunsch: ein Logo farbig, das andere grau;
bei Auswahl tauschen diese Zustände. Originaldateien erhalten. „Beitrag entdecken“
und „Beitrag ausgewählt“ entfernt. Größeres Mockup, kurzer räumlicher Impuls und
maskierte Bildschirmüberblendung mit folgendem Erklärungstext. Logos bleiben
bedienbar. Ein kleiner Schalter unter dem Gerät wechselt ebenfalls; einmalige
Hervorhebung beim ersten Erscheinen erklärt den Bedienweg ohne automatische
Auswahl und ohne Dauerschleife. Hover, Fokus und zugängliche Hinweise ergänzen.

Zwei Root-QA-Loops: beide Zustände bei375/768/1280/1920 gerendert angesehen,
dann320/375/768/1280/1920 aktive/inaktive Filterwerte, Toggle, Logoauswahl,
Space/Enter/Pfeile, Fokus, stabile Höhe, Frameverhältnis und kein Überlauf
bestätigt. Touch-Logo und Schalter in mobilem Browserkontext geprüft. Tatsächliche
Überblendung und Gegenwahl während der Animation getestet; danach ein sichtbarer
Screen ohne bleibende Opazität. Reduced Motion während des Wechsels cancelt und
stellt die aktive Ansicht fertig; Controls bleiben nutzbar. Ohne JS beide Beiträge,
originale Website-Links und kein toter Schalter. Keine unerwarteten HTTP-/JS-Fehler.
Zwischenbildprüfung fand durchscheinende Verbindung: deckende Displayunterlage
ergänzt und erneut gerendert geprüft. Syntax/Whitespace bestanden. Belege
`output/landing-v11/`. V10-Features, V9-Hero und Footer erhalten.

Lokaler Previewserver4183 war beendet und wurde für die Prüfung wieder gestartet.
Keine Veröffentlichung, keine neuen Abhängigkeiten/Assets, kein vollständiger Appbuild.

## Ergänzungen in V10

Die vom Nutzer bestätigte Scrollfunktion bleibt erhalten. Die Featuregestaltung
ist neu aufgebaut: dunkle Produktbühne, kürzere größere Titel, Beschreibung und
ruhige Faktzeilen. Vier Stationen in einer gemeinsamen Auswahlleiste unter Bild
und Text statt kleiner Textreiter neben dem Gerät. Aktive weiße Fläche, grünes
Nummernfeld und Scrollfortschritt. Szenenlabel folgt dem Bildwechsel. Mobil drei
Reihen für Bild, Text und Auswahl. Echte Screenshots/Frame unverändert; keine
neuen Assets, Abhängigkeiten oder Animationen. Ruhiger V9-Hero bleibt erhalten.

Zwei Root-QA-Loops: Render bei375/768/1074/1280/1920px betrachtet, danach alle
vier Szenen vorwärts/rückwärts, passendes Bild-/Textpaar, Sticky top0, korrekte
Frameproportionen, kein Inhalts- oder Seitenüberlauf, Auswahl innerhalb des
Viewports. Ende gibt den Abschnitt frei. Echtes Wheel, direkte End-/Pfeilauswahl,
Reduced Motion, No-JS und Live-Resize getestet. Zusätzlich320×812,375×740,
768×700,1280×700,375×600: kein Überlauf, bei knapper Höhe statische Liste.
Fehlende Statistikaufnahme erhält Erklärung und Auswahl. Partner-Maus-/Space-/
Pfeilauswahl, Fokus und stabile Höhe ebenfalls bestätigt. Keine unerwarteten
HTTP-/JavaScriptfehler. Syntax/Whitespace geprüft. Kein Appbuild für diese
isolierten public-Änderungen. Belege `output/landing-v10/`.

## Ergänzungen in V9

Mobiler Hero entsprechend Browserkommentar bei507px überarbeitet: vollständiges
mittleres Gerät, kleinere Seitenansichten und Griffe unten hinter den Geräten.
Alle dauerhaften Schwebe-/Rotationsschleifen entfernt, auch auf Desktop. Eintritt
bleibt einmalig; mobil650/800ms und deutlich kleinere Wege. Mobile/Tablet haben
keine scrollabhängigen Geräte-/Griffbewegungen mehr. Desktop behält die durch
Scroll ausgelöste Tiefe. Responsive Stärke wird bei Resize auch dann neu gesetzt,
wenn sich der Scrollfortschritt nicht verändert hat.

Zwei Root-QA-Loops: Hero bei375/507/768/1280/1920px gerendert und angesehen.
Danach320/375/507/768/1280/1920: nach Abschluss des Eintritts null aktive Heroanimationen und
identische Gerätepositionen über weiteren200ms. Kein Überlauf, Frameproportionen
erhalten, mobiles Hauptgerät vollständig im Hero. Scrolltiefe mobil/Tablet0,
Desktop negativ; Rückwechsel zu507px setzt Versatz zurück. Reduced Motion
beendet alle Animationen, vollständige Featureliste weiterhin sichtbar. Keine
Laufzeitfehler. JavaScript-Syntax und Whitespace geprüft. Belege output/landing-v9.
Features und Partnerinteraktion aus V8 sowie Footer bleiben erhalten.

## Ergänzungen in V8

Featurebereich ersetzt durch die gewünschte gehaltene Scroll-Sequenz: vier echte
Appansichten im gleichen Smartphone links, passende Erklärung rechts. Direkte
Auswahl und Fortschrittsanzeige ergänzen den nativen Scroll. Nach der vierten
Station geht die Seite normal weiter. Mobil Smartphone über dem Text. Keine
Wheel-/Touch-Übernahme. Ohne Script, bei Reduced Motion und bei knapper Höhe
erscheinen vier vollständige Artikel mit zugehörigen Bildern.

Partnerbereich als visuelle gemeinsame App mit zwei auswählbaren Original-Logos
neu gebaut. Auswahl wechselt Verbindung, Appansicht und erklärenden Beitrag.
Maus, Touch, Enter/Space und Pfeiltasten; aria-pressed und Statusmeldung ergänzen
die sichtbare Auswahl. Separate Website-Links. Ohne Script sind die Logos Links
und beide Beiträge sichtbar. Abschnittshöhe bleibt bei der Auswahl stabil.

Neue Statistikaufnahme: echte Appkomponente mit vorhandenen synthetischen
Testdaten, explizit als Beispieldaten markiert. Keine fremden Nutzeraktivitäten
und keine generierte Appoberfläche. Quelle und Szenenvertrag stehen unter
`docs/design/landing/feature-story.md`. Temporärer Screenshotserver gestoppt.
Keine neue Dependency; ursprünglicher Checkout unangetastet.

Zwei Root-QA-Loops: Scrollprototyp und beide Partnerzustände bei
375/768/1280/1920 px gerendert angesehen. Mobile Frameproportionen korrigiert,
mobilen Partner-Höhensprung behoben. Danach alle vier Stationen vorwärts und
rückwärts geprüft: Sticky-Oberkante 0, passendes Screen/Text-Paar, Frameverhältnis
erhalten, Texte und Navigation innerhalb des Viewports. Nach dem Ende löst sich
der Inhalt. Echtes Mausrad sowie direkte Home/Ende/Pfeilauswahl erfolgreich.
Partnerauswahl mit Maus, Space und Pfeil getestet; Auswahl, Bild und Beitrag
bleiben synchron, sichtbarer Fokus, stabile Höhe.

Zusätzlich 320×812, 375×740, 768×700, 1280×700 und 375×600 geprüft. Kein
Seitenüberlauf; in unterstützten Höhen kein Inhaltsüberlauf, sonst vollständige
statische Liste. Live-Resize, Reduced Motion und No-JS geprüft. Reduced Motion
beendet Animationen, zeigt alle Features und erhält die Partnerauswahl. Fehlende
Statistikaufnahme lässt Erklärung und Auswahl nutzbar. Keine unerwarteten
HTTP-/Laufzeitfehler. JavaScript-Syntax und Whitespace geprüft. Kein Appbuild
für isolierte public-Änderungen. Prüfscripte/Screenshots: `output/landing-v8/`.
Historische unabhängige Reviewerurteile weiter unten gelten für V4.

## Ergänzungen in V7

Sichtbarere Bewegung der Hero-Geräte und Griffe nach ausdrücklichem Nutzerwunsch:
gestaffelter Eintritt (Geräte von unten und seitlich, Griffe mit Rotation),
anschließend leichtes Schweben. Scrollbewegung stärker und gegenläufig; die
äußeren Geräte fächern sich bis 6° auf, das mittlere kommt leicht nach vorn.
Mobil kürzerer Eintritt und 40% Scrollintensität. Text und Storeflächen bleiben
an ihrem Ort. Keine neue Dependency und keine veränderten App-/Logoassets.

Fünf objektbezogene Heroanimationen pausieren außerhalb des sichtbaren Heros
und bei verborgenem Tab. Reduced Motion beendet auch laufendes Schweben und
entfernt Rotation, Skalierung und Tiefenversatz. No-JS-Pfad bleibt unverändert.

Zwei Root-QA-Loops: Eintritt und Schwebephase bei 375/768/1280/1920 px gerendert
und angesehen, danach Scrollzustände bei denselben Breiten. Fünf Eintritte und
fünf anschließende Schwebeanimationen gemessen. Scrollrotation und verstärkten
Griffversatz gemessen, Pause aller fünf außerhalb des Heros und Wiederaufnahme
beim Rückscrollen bestätigt. Livewechsel zu Reduced Motion: null Animationen,
keine verbleibenden Transformvariablen. Hintergrundtab-Pause ist implementiert,
jedoch nicht als realer Tabwechsel separat automatisiert geprüft.
Regression bei 320/375/768/1280/1452/1920px: volle Breite, kein Überlauf, keine
defekten Bilder, originale Logos, alle Anker und zwei Store-Platzhalter. Fokus,
No-JS und fehlendes Dekor geprüft; keine unerwarteten HTTP-/JS-Fehler.
Prüfscripte/Screenshots: `output/landing-v7/`. JavaScript-Syntax und Whitespace
geprüft; kein vollständiger Appbuild für diese isolierte public-Änderung.

## Ergänzungen in V6

Partnerbereich als vollbreiter, hell getönter Abschnitt mit Einführung links
und zwei eigenständigen Partnerbeiträgen rechts. Keine gemeinsame Logo-Box,
beide bestätigten Originalmarken bleiben erhalten. Auf Mobil folgen die Partner
linear unter der Einführung. Vollständiger dunkler Footer mit Appnavigation,
Partnerwebsites, angekündigter Verfügbarkeit, Impressum, Datenschutz, Copyright
und Rücksprung. Storeflächen bleiben zwei deaktivierte Platzhalter.

Neues `public/landing/landing.js` als Progressive Enhancement: Heroeintritt,
einmalige gestaffelte Einblendungen für Features, Partnerschaft und Footer;
beim Desktopscroll leichte Tiefenbewegung von Geräten und Griffen. Keine
Bibliothek, Daueranimation, Scrollübernahme oder zusätzliche Anfrage an Dritte.
HTML-Inhalte sind ohne Script sichtbar. Der Livewechsel zu Reduced Motion
beendet laufende Animationen, entfernt Tiefenversatz und deaktiviert Smooth Scroll.

Zwei gerenderte Root-QA-Loops: Layout bei 375/768/1280/1920 px angesehen,
Tablet-Leerzeichen im Titel und Footer-Lesbarkeit korrigiert. Abschließender
Verhaltensdurchlauf bei 320/375/768/1280/1452/1920 px: volle Hero-/Footerbreite,
kein Überlauf, keine defekten Bilder, korrekte Logos, alle Sprungziele vorhanden.
Heroanimation, Partner-Reveal und tatsächlichen Tiefenversatz gemessen;
Reduced Motion mit null aktiven Animationen und neutralem Versatz bestätigt,
anschließende Reaktivierung ebenfalls geprüft. Tastaturfokus, Footerlinks und
Rücksprung funktionieren. Ohne JavaScript bleiben Partner und Footer sichtbar;
fehlendes Dekor beeinträchtigt Titel und Storeflächen nicht. Keine unerwarteten
HTTP-/Laufzeitfehler. Lokale Screenshots/Prüfscripte unter `output/landing-v6/`.
Kein vollständiger Appbuild für isolierte public-Dateien. Die unabhängigen
Design-Loop-Urteile weiter unten gelten ausschließlich für V4.

## Ergänzungen in V5

Auf die drei neuen Browserkommentare hin: Hero und Header auf volle Breite
umgestellt, zwei transparente 3D-Klettergriffe neben den echten Smartphone-
Ansichten ergänzt und die Zusammenarbeit ausführlicher beschrieben. Unter den
bestätigten Logos erklären zwei kurze Absätze die Beiträge von Moonsight Media
und Kletterwelt Sauerland. Generiertes Dekor, Quelle und exakter Prompt stehen
in `docs/design/landing/hero-holds-3d.md`.

V5 wurde bei 320, 375, 768, 1280, 1452 und 1920 px geprüft: Hero beginnt bei
x=0 und entspricht exakt der Viewportbreite, kein Seitenüberlauf, alle Bilder
geladen, weiterhin vier Features, drei Hero-Geräte und zwei deaktivierte
Storebuttons. Grafiken sind dekorativ und fangen keine Zeigerereignisse ab.
Desktop-/Tablet-/Mobilansichten visuell geprüft. Navigation, Rücksprung und
Tastaturfokus funktionieren. Keine unbeabsichtigten HTTP-/JavaScriptfehler.
Screenshots und Prüfscript: `output/landing-v5/`. Die folgenden unabhängigen
Reviewerurteile dokumentieren V4; für V5 gab es keine neue unabhängige Runde.

## Auftrag und Ergebnis

Der Nutzer lieferte eine Curely-App-Landingpage als Designreferenz und bestätigte
auf Rückfrage die ursprüngliche schwarz-grüne KWS-Marke mit Berglinie, ohne
„Klettern · Bouldern · Bistro“. Diese ersetzt die falsche rein grüne Wortmarke.

Die neue Fassung übernimmt die Kompositionsprinzipien der Referenz:
heller zentrierter Hero, kurzer zweizeiliger Titel, zwei Storeflächen, darunter
statisch gestaffelte gerade Geräte. Der Featurebereich hat vier sachliche
Funktionskarten um eine zentrale Appvorschau. Die Partner stehen ohne Kasten
in einem eigenen kompakten Abschnitt. Keine Preise, Bewertungen, fremden
Brancheninhalte oder Nutzungszahlen aus der Vorlage übernommen.

Store-Buttons bleiben ausdrücklich gewünschte, deaktivierte Platzhalter mit
„Bald“-Hinweisen. Keine Verfügbarkeit behauptet. Statisches HTML/CSS, kein
JavaScript erforderlich. Der vorherige Feature-Aufklapper wurde durch die
angefragte Kartenkomposition ersetzt. Unveröffentlichte Trainingsinhalte werden
nicht beworben. Keine App-, Auth-, Backend- oder Produktionsänderung.

## Design-Loop und Prüfung

Dokumentierter Maßstab: `docs/design/landing/bar.md`.
Systemvertrag: `docs/design/landing/design-system.md`.
Reviewverlauf: `docs/design/landing/progress.md`.

Hero und Features bestanden in Runde 1 alle drei unabhängigen Rollen
(Brief/System/Craft). Partnerbereich hatte zunächst zu knappen mobilen linken
Logorand; SVG-Clearspace und mobile Abstände korrigiert. Drei frische Reviewer
bestätigten anschließend PASS/PASS/PASS. Keine fremden Reviewerdateien oder
Implementierungsänderungen durch die Reviewer.

Zwei gerenderte QA-Loops. Zusätzlich 320, 375, 768, 1280, 1452 und 1920 px geprüft:
kein Seitenüberlauf, alle Bilder geladen, ein zweizeiliger H1, vier Features,
drei Hero-Geräte, zwei deaktivierte Storebuttons, keine fehlenden Sprungziele,
keine falsche Logo-Variante in Kopf/Partnerbereich. Sprunglink, Featurelink,
Partnernavigation und „Nach oben“ sowie eigener Solid-Tastaturfokus geprüft.
Reduced Motion und blockiertes Hauptbild berücksichtigt: Inhalte bleiben nutzbar.
Keine unbeabsichtigten HTTP- oder JavaScriptfehler. `git diff --check` bestanden.
Kein vollständiger Appbuild für reine public-Dateien.
Screenshots und lokale Prüfscripte: `output/landing-v4/` (nicht versioniert).

## Quellen und Assets

- Nutzerreferenz: `C:/Users/Janosch/AppData/Local/Temp/codex-clipboard-ea8d0a7a-7a10-481c-8cce-36b3d1bf97e1.png`.
- `kws-logo.svg`: NAS-Original
  `M:/Customer/Boulder und Kletterwelt GmbH/KWS NEW STYLE/Logos Neue Farbe/SVG/Wort-Bild-Marke horizontal (Full-Color).svg`.
  Originale Pfade und Farben, durch viewBox auf Namen und Berglinie beschränkt;
  darunter liegende Angebotszeile nicht dargestellt. Transparente Außenränder
  beschnitten. KWS-Logo in Kopf und Partnerbereich konsistent.
- `moonsight-color.svg`: Original a570ff_horizontal.svg vom NAS, weißes
  Artboard-Rechteck entfernt, Originalpfade/-farbe erhalten. In V4 Clearspace
  im viewBox ergänzt, damit keine Form am mobilen Bildrand anliegt.
- `iphone-frame.webp`: proportionstreuer fotografischer Natural-Titanium-Frame
  aus `https://github.com/weirdapps/mockups`, MIT-Datei liegt unter
  `public/landing/device-frame-LICENSE.txt`. Keine fremden Scripts ausgeführt.
- `app-native-boulders.webp`: vorhandener echter nativer Gast-Screenshot aus
  Printworktree `kws-sector-poster`, Quelle
  `docs/print/sectors/portrait-native-mockup/assets/native-iphone-boulders.png`.
  Statische frühere Hallenaufnahme mit 61 Bouldern, kein Livebestandversprechen.
- `app-detail.webp`, `app-schedule.webp`, `app-preview.webp`: echte öffentliche
  Webaufnahmen vom 15.10.2026. Detailboulder
  `153ed8db-2f77-4d67-b8cc-035603b75d4c` mit pausiertem Beta-Video.
- Poppins-WOFF2 aus dem bestehenden Repository.

SVG-Anpassungen sind native Exporte: keine generierte Logo-/Schriftform.
Geräteframe und Screenshot bleiben getrennte DOM-Bilder. V5 ergänzt ausschließlich
generierte dekorative Klettergriffe, keine generierten Appinhalte. Keine
neue Dependency, Kontoanmeldung oder Mutation zur Erstellung der Appvorschauen.
NAS nur gelesen. Alte falsche Logo-Datei und ungenutzte JS-Steuerung aus dem
öffentlichen Verzeichnis entfernt, lokale Vorfassungen unter output erhalten.

## Git und Verwendung

Vor Arbeit live gefetcht: `HEAD` und `origin/main` identisch (`282f6ca`), 0/0.
Eigener Worktree `kws-minimal-landing`, Branch `codex/minimal-landing`.
Ursprünglicher verschmutzter Checkout unangetastet. Kein Push/Deployment.
Lokaler MIME-korrekter Previewserver weiterhin Port4183, no-store.

Nächster Schritt: Nutzer prüft Partnerwechsel und Bedienhinweis unter
`http://127.0.0.1:4183/landing/?v=11#gemeinsam`.
