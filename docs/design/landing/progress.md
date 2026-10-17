# Design-Loop: Referenzumsetzung

V11: Partneridee bestätigt; Nutzer wünscht graue Alternative, neue Wechsel-
Animation/Mockup und Bedienerklärung ohne „Beitrag entdecken“. Zustände, größerer
Frame und Schalter umgesetzt. Zwei Root-QA-Loops: beide Partner bei375/768/1280/
1920 gerendert, danach320–1920 Wechsel, Graustufen, Tastatur/Touch, stabile Höhe,
Frameverhältnis, schnelle Gegenwahl und Reduced Motion geprüft. Zwischenbild
zeigte durchscheinende Verbindung; deckende Displayunterlage ergänzt und
Zwischenzustand erneut visuell geprüft. Belege output/landing-v11.
Previewserver4183 nach zwischenzeitlichem Ende wieder gestartet (Session90005).

V10: Nutzer bestätigt Scrollfunktion, lehnt bisherige Optik ab. Featuregestaltung
neu: dunkle Produktbühne, kurze große Titel, Factzeilen und gemeinsame Auswahl
unter beiden Spalten. Zwei Root-QA-Loops: Render375/768/1074/1280/1920, danach
vier Szenen vor/zurück, Freigabe, echtes Wheel, Tastatur und Fallbacks getestet.
Zusätzliche kurze Höhen bei375/768/1280 sowie320px Breite geprüft. Keine
Inhalts-/Seitenüberläufe. Vorhandene Hero-/Partner-/Footergestaltung erhalten.
Belege output/landing-v10; keine neuen unabhängigen Reviewerurteile.

V9: Mobiler Hero nach Browserkommentar bei507px neu proportioniert. Vollständiges
Hauptgerät, zwei kleinere Ansichten, Griffe unten hinter den Geräteansichten.
Alle dauerhaften Heroanimationen entfernt; mobiler Scrollversatz ebenfalls0.
Zwei QA-Loops: Render bei375/507/768/1280/1920, danach stabile Positionen nach
Eintritt, Frameproportionen und mobile0/desktopgesteuerte Tiefe bei320–1920px
gemessen. Resize von Desktop zu Mobil und Reduced Motion bestanden. output/landing-v9.

V8: Nutzer wünscht gehaltene Feature-Sequenz und visuell interaktive Partnerschaft.
Szenen-/Fallbackvertrag `feature-story.md`. Erst nativen Scrollprototyp bei vier
Breiten gebaut, dann mobile Frameproportionen korrigiert. Partnerauswahl wechselt
Bild, Verbindung und Text; mobilen Höhensprung durch kürzeren konkreten Titel
behoben. Zweiter QA-Loop: alle vier Stationen vorwärts/rückwärts, Freigabe am Ende,
echtes Wheel, direkte Tastaturauswahl, Partnerauswahl, Reduced Motion, Resize,
kurze Displays, fehlendes Bild und No-JS geprüft. Belege output/landing-v8.
Keine neuen unabhängigen Reviewerurteile; historische V4-Urteile gelten nur V4.

V7: Sichtbarere Heroanimation nach Nutzerauftrag. Gestaffelter Geräteeintritt,
rotierender Griffeintritt, geringes dauerhaftes Schweben nur im sichtbaren Hero
und stärkere Scrolltiefe einschließlich Auffächern der Außengeräte. Zwei Root-
QA-Loops: Eintritt/Schwebephase bei 375/768/1280/1920 visuell geprüft; danach
Scrollzustände und Pause/Resume sowie Reduced Motion geprüft. Allgemeine
Regression bei 320–1920px bestanden. Belege `output/landing-v7/`.

V6 (Nutzerkommentare zu Partnerschaft/Footer/Bewegung): Partnerbereich neu als
asymmetrische Einführung mit zwei zugeordneten Partnerbeiträgen; vollständiger
dunkler Footer; ergänzende Web-Animations-/IntersectionObserver-Logik und
Desktop-Tiefenbewegung. Zwei Root-QA-Loops abgeschlossen: Layout zunächst bei
375/768/1280/1920, danach Detailkorrekturen und Verhalten bei 320–1920px.
Tablet-Überschrift bekam ein fehlendes Leerzeichen, Fußzeilentext wurde größer.
Reduced Motion einschließlich Livewechsel, kein-JS-Pfad, Anker/Fokus und
Dekorausfall geprüft. Keine neuen unabhängigen Reviewerurteile für V6.
Screenshots und Prüfscript: `output/landing-v6/`.

15.10.2026. Drei Stücke: Hero, Features, Partnerbereich.
Interviews bereits durch Auftrag, vorhandenes Designsystem und geliefertes
Referenzbild beantwortet. Logo-Rückfrage ausdrücklich beantwortet:
schwarz-grüne Originalmarke mit Berglinie, ohne Angebotszeile.

| Stück | Runde | Brief | System | Craft | Größte Lücke |
|---|---:|---|---|---|---|
| Hero | 1 | PASS | PASS | PASS | keine |
| Features | 1 | PASS | PASS | PASS | keine |
| Partner | 1 | PASS | PASS | FAIL | linker mobiler Logorand zu knapp |
| Partner | 2 | PASS | PASS | PASS | Clearspace im SVG und mobiler Innenabstand ergänzt |

Die drei Rollen prüften getrennt in frischen Kontexten nur ihre jeweils
zugeordneten Vorgaben und gerendertes Desktop-/Mobile-Ergebnis, keinen
Implementierungscode. Für die Partnerkorrektur wurden drei neue Reviewer
eingesetzt. Brief-/Systemrollen bestätigten Inhalt und objektive Vorgaben;
Craft verglich `bar.md`, Referenz und gerendertes Ergebnis.

Zusätzlich zwei Browser-QA-Loops und Funktionsprüfung durch den Builder:
320/375/768/1280/1452/1920 px, Bilder, Sprungziele, Platzhalter, Fokus,
Reduced Motion und ausgefallenes Hauptbild. Screenshots und lokale Prüfdaten
unter `output/landing-v4/` (nicht versioniert).
# V5: gezielte Nutzerkorrekturen

Hero und Kopfbereich jetzt über die volle Breite. Zwei transparente generierte
3D-Klettergriffe ergänzt, echte Appansichten unverändert. Zusammenarbeit um
einen Einleitungstext und die Beiträge beider Partner erweitert. Bestätigte
Logos beibehalten. Root-QA bei 320/375/768/1280/1452/1920 px: volle Breite,
kein Überlauf, Bilder geladen, Sprunglinks und Tastaturfokus funktionieren,
keine unbeabsichtigten Netzwerk-/Laufzeitfehler. Keine neue unabhängige
Design-Loop-Runde; unten dokumentierte Reviewerurteile gelten für V4.

# V12: offene Featurebühne und konkreter Partnerbeitrag

Große blaue Fläche und Auswahlleiste auf Nutzerwunsch entfernt. Farblicht,
freies Smartphone und kompakte Auswahl. Partnerschalter mittig, Zusatzlabel
entfernt, sachliche Überschrift und gemeinsames Aufgabenpanel. Zwei Root-QA-Loops
und Funktionsprüfung dokumentiert in docs/qa/2026-10-15-minimal-landing.md;
Screenshots/Scripts unter output/landing-v12. Keine neue unabhängige Jury.

# V13: Feature-Icons und ruhiger Partnerwechsel

Zahlen durch vorhandene funktionale Outline-Icons ersetzt. Hardware bleibt
beim Wechsel fest, Screens überblenden360ms; schnelle Gegenwahl setzt aktuelle
Deckkraft fort. Responsive/Bewegungs-/Tastaturregression und zwei gerenderte
Prüfphasen dokumentiert unter docs/qa/2026-10-15-minimal-landing.md.

# V14: Beta-Logo integriert16.10.2026

Neueste vorhandene V2 aus dem Ursprungscheckout rein lesend übernommen.
Primary Header, inverse Footer, Favicon und Touchicon. Vier Dateien bytegleich
verifiziert. Zwei gerenderte QA-Loops und Keyboard-/Sprungzielprüfung siehe
docs/qa/2026-10-16-landing-brand.md. Keine neue Generierung oder Dependency.

V15: KWS-Logo auf Nutzerwunsch zusätzlich zur Beta-Marke im Header, auch mobil.
Zwei responsive Prüfloops bestanden; siehe output/landing-v15 und Marken-QA.

16.10.2026: Launchvorbereitung für/landingpage. Haupt-QR im Plakatgenerator
verifiziert. Selbstständiges statisches Paket, Manifest, Caddyrouting und
Konfigurationskandidat mit echter lokaler Caddy-Prüfung. Kein Deployment; SSH
nicht erreichbar, finales Logo und Storeziele offen. Runbook unter
ops/hostinger/landingpage/README.md, Nachweis docs/qa/2026-10-16-landing-launch-preparation.md.

# V16 – Ausblick auf kommende Bereiche

Nutzer nennt Training/Kletterhalle und autorisiert Prüfung des vorhandenen
Kontexts. Trainings-/Kinderbereich anhand der Oktoberkonzepte und Entwicklungs-
QA, Seilklettern anhand des bestätigten späteren Produktpfads angekündigt.
Neue native Aufklappsektion mit Status, Ausblick-Ankern in Header/Footer.
Keine App-Freischaltung oder Veröffentlichung. Neues vorbereitetes Paket unter
output/landing-v16/release-final mit kws-landingpage-release-v16-final.zip.

# V17 – visueller Ausblick

Nutzer lehnt nüchterne Akkordeonliste ab und wünscht modernes Design. Neue
Hierarchie mit dominantem Trainingsmotiv und zwei begleitenden Themenflächen;
alle Beschreibungen sichtbar. Konzeptbilder aus bestehender Trainingsarbeit
übernommen und technisch als WebP verkleinert, zusammen60756Bytes. Zwei Root-
QA-Loops und Paketprüfung bestanden; docs/qa/2026-10-16-landing-upcoming-v17.md.

# Ausblick V18 – Runde1

Stück: ein gemeinsamer Produktvorschaubereich, drei Zustände.
Brief PASS · System PASS · Craft PASS. Größte verbleibende Craft-Lücke: mobiles
Gerät relativ klein; einzelne Apptexte weniger gut lesbar. Kein FAIL oder
unaufgelöster Regelverstoß. Zwei Root-QA-Loops, sechs Breiten und drei Themen
bestanden. Echte Entwicklungsscreens ersetzen die V17-Illustrationskarten.

# V18 – Nutzerablehnung und neue Recherche

Nutzer lehnt V18 ausdrücklich ab. Interne PASS-Urteile sind keine gestalterische
Nutzerfreigabe. Vor erneutem Build zehn reale App-Websites und Bibliotheken
untersucht. Bericht: research/2026-10-16-app-websites.md. Hauptvorschlag ist ein
kompaktes themengesteuertes Produktkarussell; noch nicht freigegeben/implementiert.

# Drei Ausblick-Vorschläge

A Themenbühne, B Mockup-Galerie, C Bildstrecke isoliert entworfen. Vergleich
localhost4188, Dokumentation concepts/README.md. Zwei gerenderte QA-Loops
375/768/1280/1920 je drei Zustände bestanden; Root hat gerenderte Ergebnisse
visuell angesehen. Noch keine Nutzerwahl, keine produktive Übernahme.

# V19 – B ausgewählt und Klettermockup generiert

Nutzerwahl B umgesetzt; ausdrücklich angefragte Kletter-Konzeptansicht mit
integriertem image_gen generiert und im identischen Telefonrahmen eingebaut.
Zwei QA-Loops, sechs Breiten und drei Themen bestanden;375/768/1280/1920 visuell
geprüft. Bestehender Hero/Features/Partner/Footer unverändert. Keine weitere
Designwahl oder Freigabe durch technische Tests behauptet. Prompt/Provenienz:
concepts/climbing-mockup.md.
# V20 – überarbeitetes Logo übernommen

Ausgewähltes DM-Sans-Paket in Header/Footer eingebaut, Lizenz mitgeliefert;
KWS-Marke erhalten. Zwei Prüfloops bei sechs Breiten und visueller Abgleich
375/768/1280/1920px bestanden. Neues Releasepaket01972558267ee1a2 verifiziert,
ZIP output/landing-v20/kws-landingpage-release-v20.zip. Keine Veröffentlichung.

# V21 – Favicon3 und Navbar

Ausgewählte VarianteC im Favicon/Touchicon. Sticky Navbar mit aktiven Abschnitten
und mobiler Aufklappnavigation; beide Marken erhalten. Feature-Sequenz auf
Navbarhöhe abgestimmt. Design-/QA-Vertrag in navigation-v21.md und
docs/qa/2026-10-16-landing-navbar-v21.md. Paket aa5fab635bbef5cd verifiziert,
output/landing-v21/kws-landingpage-release-v21.zip. Keine Publikation.

# Live-Veröffentlichung16.10.2026

V21 nach ausdrücklichem Nutzerauftrag veröffentlicht:
https://beta.kletterwelt-sauerland.de/landingpage. Releaseb00d7677969f2633,
27Dateien, unveränderte App-Revision3b3e15a. Eigenständiger Readonly-Mount statt
Appdist-Kopie schützt Landingdateien vor künftigen App-Sourcewechseln.
HTTPS/Hashes/Routing und gerenderte Interaktionen375/768/1280/1920 bestanden.
Nachweis docs/qa/2026-10-16-landing-live.md; Ops-README enthält Betrieb/Backup.
Store-Platzhalter bleiben; kein Store-Release oder Training-Release erfolgt.

# V22 – Korrekturen live, Navbarwahl offen

Richtungspfeil im Partnerwechsel und mobile Optimierung veröffentlicht als
e8be88d7aec27211. Mobil direkte Featureauswahl statt Scrollfixierung, größere
Texte/Mockups und stabile Wechselhöhen. Desktoptour unverändert erreichbar.
Lokale drei Navbar-Vorschläge A Direkt/B Floating Dock/C Visuelles Menü:
http://127.0.0.1:4189/. Quelle concepts/navbar-v22, Tests/Screenshots unter
output/navbar-v22. Keine Variante gewählt oder produktiv übernommen.
QA-/Livebericht docs/qa/2026-10-16-landing-v22.md.

# V23 – Navbar B und Roadmap-Swipe live

Nutzer wählt B. Schwebende Desktopleiste und mobiles Icon-/Textdock übernommen;
beide Marken bleiben sichtbar. Reale obere/untere Leistenhöhe bestimmt den
verfügbaren Platz für Anker und Featuretour. V22-Vorschläge unter base/ eingefroren.
Roadmap horizontal wischbar und mit Maus ziehbar, native vertikale Bewegung und
Pinch-Zoom erhalten. Themenfolge passend zu Tabs und seitlichen Vorschauen.
Touch-Taps nach Wischen zusätzlich direkt auf Pointer-Up ausgewertet; native
Kompatibilitätsklicks werden nicht vorausgesetzt. Kleine/abgebrochene Gesten
wählen kein Thema. Tastatur, Reduced Motion und No-JS bleiben erhalten.
Veröffentlicht23:10:59Europe/Berlin als ec17c1bab5ee7613,28Dateien/1175965Bytes.
QA-/Livebericht docs/qa/2026-10-16-landing-v23.md.

# V24 – mobiler Kopf und halbe Hero-Geräte

Nutzer lehnt das mobile Dock ab und wünscht nur ungefähr halbe Hero-Mockups.
Umsetzung: Beide Marken oben, darunter die drei44px-Textlinks; unterer
Bildschirmrand frei, Desktop B erhalten. Hero bis600px nach etwa53% der
Gerätehöhe abgeschnitten,3D-Griffe seitlich am Rand. Keine neuen Bilddateien,
keine JS-Änderung. Zwei Layoutloops und gerenderte375/768/1280/1920-Ansichten;
zusätzliche Crop-/Schriftvergrößerungsprüfung bestanden.
Live seit16.10.2026,23:20:52Europe/Berlin,Release a8aef4930d8290e3,
28Dateien/1176095Bytes. Nachweis docs/qa/2026-10-16-landing-v24.md.

# V25 – Roadmap-Swipe ohne Rücksprung

Nutzer präzisiert den unsauberen Übergang als seitliches Wischen. Separate
Rückfederung und dreifache kreuzende CSS-Platzwechsel durch einen kontrollierten
Übergang ersetzt. Aktuelle Loslassposition bleibt erhalten; hinteres Gerät
wird an den Außenkanten unsichtbar umgesetzt, Vordergerät früh deckend.
Kontinuität, schnelle Gegenwahl, Abbruch und reduzierte Bewegung geprüft.
Live seit16.10.2026,23:31:45Europe/Berlin als41904f6d87fdf487,
28Dateien/1178741Bytes. Nachweis docs/qa/2026-10-16-landing-v25.md.

# V26 – mobile Navbar ebenfalls schwebend

Die mobile Navbar erhält den erwarteten Floating-Look von B:12px Randabstand,
12px Radius und dezenter Schatten; oberer Abstand bleibt beim Scrollen erhalten.
Beide Marken und kompakte Textlinks bleiben. Heroabstand/Anker angepasst.
Live16.10.2026,23:38:39Europe/Berlin als dc311b00da467a50,
28Dateien/1178969Bytes. Nachweis docs/qa/2026-10-16-landing-v26.md.

# V27 – mobil nur Beta-Symbol

Nutzerwahl umgesetzt: Originales grünes Beta-Symbol und drei Links in einer
66px hohen schwebenden Zeile. Mobile Wortmarke/KWS-Headerlogo ausgeblendet;
Desktop und Partnerschaft erhalten. Originalsymbol bytegleich aus Markenpaket.
Live16.10.2026,23:46:27Europe/Berlin als0740cb00462bf776,
29Dateien/1180091Bytes; aktuelle App-Revision d0e5a6e erhalten.
Nachweis docs/qa/2026-10-16-landing-v27.md.

