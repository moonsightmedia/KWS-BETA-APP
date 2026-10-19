---
status: verbindlich
scope: KWS Beta App
owner: Janosch Althoff
last_verified: 2026-10-19
supersedes: docs/USER_AREA_DESIGN_GUIDE.md
---

# KWS Beta App – Designsystem und UI-Logik

Diese Datei ist die verbindliche Designreferenz für die KWS Beta App. Sie
beschreibt nicht nur die visuelle Gestaltung, sondern auch die bestätigten
Interaktions-, Navigations- und Darstellungslogiken. Neue oder überarbeitete
Oberflächen müssen diese Regeln verwenden.

## 1. Verbindlichkeit und Quellenreihenfolge

Bei UI-Arbeit gilt folgende Reihenfolge:

1. die neueste ausdrückliche Entscheidung des Nutzers,
2. diese `docs/DESIGN.md`,
3. zentrale Tokens und gemeinsame KWS-Komponenten,
4. seitenlokale Implementierungen,
5. ältere Screens und Dokumente nur als historische Referenz.

`docs/USER_AREA_DESIGN_GUIDE.md` ist durch diese Datei ersetzt. Alte
`rounded-xl`-, `rounded-2xl`-, Pill- oder direkte Farbwerte sind keine neue
Designgrundlage, nur weil sie noch an einzelnen Stellen im Code vorkommen.

Wenn eine neue Nutzerentscheidung eine wiederverwendbare UI-Regel verändert,
muss diese Datei im selben Arbeitsschritt aktualisiert werden. Ein einmaliger
visueller Sonderfall darf nicht stillschweigend zum neuen Standard werden.

## 2. Produkt- und Stilrichtung

Die App ist eine produktive Boulder-App, keine Marketing-Seite und kein
generisches Verwaltungsdashboard. Sie soll sich ruhig, direkt, hochwertig und
fotobezogen anfühlen.

Leitgedanken:

- Boulderfotos und aktuelle Halleninformationen stehen vor Dekoration.
- Weiß und sehr helle neutrale Flächen tragen die Oberfläche.
- Grün zeigt Aktivität, Auswahl und positive Zustände.
- Dunkelblau sorgt für eine einheitliche, gut lesbare Texthierarchie.
- Formen sind überwiegend eckig mit kleinen, kontrollierten Rundungen.
- Schatten schaffen Hierarchie; graue Rahmen werden sparsam verwendet.
- Inhalte bleiben kompakt. Lange Erklärtexte, große Hero-Flächen und
  überdimensionierte Statistikblöcke sind zu vermeiden.
- Gast-, Nutzer-, Profil- und Statistikbereiche gehören visuell zur selben App.

Nicht verwenden:

- übergroße Rundungen oder flächendeckende Pill-Formen,
- blaue Standardlinks oder ungestaltete Browser-Controls,
- zufällige Verläufe, Glassmorphism oder dekorative Farbflecken,
- dicke graue Kartenrahmen,
- unterschiedliche Komponenten für dieselbe Funktion auf verschiedenen Seiten,
- Farbe als einzige Information für einen Zustand.

## 3. Foundations

### 3.1 Farben

| Rolle | Verbindlicher Wert | Verwendung |
|---|---:|---|
| Markenakzent | `#36B531` / `primary` | Akzente, Icons, leichte Auswahltints; nicht als Text auf Weiß |
| Aktionsgrün | unverändertes `primary`; `primary-strong` ist nur ein Alias | gefüllte Aktionen und aktive Tabs mit dunkelblauer Beschriftung |
| Grüne Schrift | `primary-ink` | dunklere Stufe ausschließlich für lesbare grüne Texte auf hellen Flächen |
| Starke Schrift | `#192436` | Seitenüberschriften, Abschnittstitel, Kartentitel, wichtige Zahlen |
| Seitenfläche | `#F9FAF9` | angemeldete Hauptseiten und ruhige App-Hintergründe |
| Kartenfläche | `#FFFFFF` / `card` | Karten, Popover, Listenflächen |
| Sekundärfläche | `#F1F5F1` / `secondary` | inaktive Controls, Iconflächen, leichte Gruppierung |
| Bild-Platzhalter | `#EEF2EE` | Thumbnail-Hintergrund während Laden oder bei fehlendem Bild |
| Sekundärtext | `#646C71` / `muted-foreground` | Metadaten, Hilfetext, Zähler |
| Border | `#DDE7DF` / `border` | subtile Trenner und notwendige Control-Konturen |
| Gefahr | `destructive`, `hsl(5 55% 45%)` | Gefahrenhinweise auf hellem Rottint; gefüllte Löschaktionen mit Weiß |

Regeln:

- Nutzerentscheidung 16.10.2026: Dokumentierte Markenwerte und CSS-Tokens
  stimmen exakt überein. Die HSL-Werte behalten dafür ihre nötige Genauigkeit.
  `--brand-*` in `src/index.css` ist die zentrale unveränderliche Markenpalette;
  `primary`, `foreground`, `secondary`, `muted-foreground`, `border` und weitere
  semantische Tokens verweisen darauf. `brand-*`-Utilities ersetzen bisherige
  direkte Markenfarben auf bewusst festen Flächen, damit deren Verhalten auch
  innerhalb thematisierter Ansichten erhalten bleibt. Normale thematisierbare
  Controls verwenden weiterhin die semantischen Tokens.
  Das alte Textviolett `#13112B` entfällt als UI-Farbe; transparente historische
  Schattenrezepte bleiben davon unabhängig. Grifffarben, Kartenbereiche,
  Illustrationsfarben und fachlich verschiedene Zustandsfarben bleiben getrennt.
- `#192436` ist die einheitliche starke Schriftfarbe der neuen Nutzeroberfläche.
- Primärgrün wird nicht als großflächiger Seitenhintergrund eingesetzt.
- Normaler informativer Text erreicht mindestens 4,5:1 auf seiner tatsächlichen
  Fläche. Das gilt auch für Hover und ausgewählte Zustände. Keine pauschale
  Opazität auf Informationszeilen, etwa für vergangene Termine.
- Nutzerkorrektur vom 2026-09-13: Das ursprüngliche helle Markengrün bleibt auf
  Buttons und aktiven Tabs erhalten. Es wird nicht für weiße Beschriftungen
  abgedunkelt. `primary-foreground` ist auf diesen Flächen immer Dunkelblau,
  auch im Dark Mode. Der frühere Token `primary-strong` ist nur ein Alias für
  `primary`. `primary-ink` dient ausschließlich grüner Schrift, nicht Flächen.
- Fokus nutzt `ring` (dunkelblau auf hellen Flächen), ohne Größe oder Layout zu ändern.
- Weitere Grüntöne sind Tints oder semantische Hallenkartenfarben, keine zweite
  konkurrierende Markenfarbe.
- Direkte Hexwerte sollen bei neuer Arbeit nur ergänzt werden, wenn eine neue
  semantische Rolle beschlossen wurde. Wiederkehrende Werte gehören in
  `src/index.css` und `tailwind.config.ts`.
- `#13112B` wird nicht mehr als UI-Textfarbe verwendet. Historische transparente
  Schatten dürfen weiterhin auf diesem Ausgangswert beruhen.

### 3.2 Hallenkartenpalette

Nutzerfreigabe 07.10.2026: `HallMapView` verwendet die neutrale architektonische
Darstellung: graugrüner Boden (`--hall-map-floor`), weiße Wandflächen und dezente
Tiefe aus denselben gespeicherten Polygonen. Keine eingefärbten Bereichsflächen
oder Farblegende in der öffentlichen Karte. Die folgende Palette bleibt für den
Zeicheneditor und bestehende semantische Bereichsmetadaten erhalten.

Die ursprünglichen kundenorientierten Bereiche erhalten ausschließlich Grüntöne. Alle
Teilbereiche erben die Palette ihres Elternbereichs. Die fünf ursprünglichen
Bereichsfarben bleiben unverändert; neue Hauptbereiche verwenden zunächst die
ruhige Standardpalette aus `sectorAreas.ts`.

| Bereich | Standardfläche | hervorgehobene Fläche |
|---|---:|---:|
| Bug | `#55D04A` | `#2FAF2A` |
| Couch-Ecke | `#C7EE63` | `#9FD52F` |
| Top-Out | `#78D991` | `#3BBF62` |
| Lange Platte | `#9EDD3D` | `#75BC1C` |
| Grotte | `#4EC9A0` | `#1FAA7D` |

Die exakten Stroke- und Tagfarben liegen zentral in
`src/lib/sectorAreas.ts`. Sie dürfen nicht seitenlokal dupliziert werden.

### 3.3 Typografie

| Ebene | Schrift | Richtwert | Farbe |
|---|---|---:|---|
| Seitenüberschrift im App-Header | Teko, semibold | `2.15rem`, line-height `1` | `#192436` |
| persönliche Begrüßung | Poppins, semibold | `1.75–2rem` | `#192436` |
| Abschnittstitel | Poppins, semibold | `0.875rem` | `#192436` |
| Karten-/Listentitel | Poppins, semibold | `0.75–0.875rem` | `#192436` oder `foreground` |
| Fließ- und UI-Text | Poppins | `0.75–0.875rem` | `foreground` |
| Metadaten | Poppins, medium | `0.5625–0.75rem` | `muted-foreground` |
| Tool-Kicker | Poppins, semibold, uppercase | `0.625rem` | `muted-foreground` |

Regeln:

- Teko kennzeichnet primär die großen Seitentitel im gemeinsamen Header.
- Abschnittsüberschriften und alle bedienrelevanten Texte bleiben in Poppins.
- Gemeinsame Formular-/Dialog- und operative Abschnittstitel verwenden Poppins
  semibold mit 16px und normaler Zeilenhöhe. Teko wird nicht global auf h2–h4 gesetzt.
- Keine wechselnden Headerfarben zwischen Gast- und Login-Bereich.
- Sehr kleine Schrift ist nur für kurze Metadaten auf kompakten Fotokarten
  erlaubt. Bedienhandlungen und längere Texte bleiben größer.
- Überschriften sind kurz. Zusätzliche Erklärung maximal ein kompakter Satz.

### 3.3.1 Beta-Marke: Variante 03 mit Teko (16.10.2026)

Die gewählte Produktmarke ist das kompakte Zeichen aus zwei Griffformen mit
dem Schriftzug „beta“ in Teko SemiBold 600. `BetaLogo` verwendet festgelegte
Vektorkonturen; Zeichen und Schriftzug werden weder nachgesetzt noch verändert.
Das Zeichen nutzt `primary`, die Wortmarke `brand-ink`; die inverse Wortmarke
ist weiß. Der Akzent kann damit später die Farbe einer anderen Halle übernehmen.

Für die freigegebene Web-Integration gilt: vollständige farbige Marke auf Auth und in der Desktop-Seitenleiste; Header zeigen kein Produktlogo.

- Header verwenden wieder die normalen Seitentitel und Bedienelemente.
  Home zeigt mobil „Home“, auf Desktop die persönliche Begrüßung.
- Die Desktop-Seitenleiste zeigt das vollständige Logo über der Navigation; eingeklappt bleibt das Zeichen sichtbar.
- Anmeldung und Registrierung zeigen mobil ein mittiges, 128px breites Logo
  über Begrüßung und Formular auf Weiß. Desktop behält die bestehende Zweispaltigkeit.
  Ab 768px ist es 184px breit. Der bisherige Kletterwelt-Sauerland-Absender
  wird an dieser Stelle ersetzt.
- Boulder und andere Fachseiten behalten ihre Seitentitel und Werkzeuge.
- Nutzererweiterung 17.10.2026: Das Zeichen dient auf den App-Seiten als
  gemeinsamer Hintergrund: Home, Boulder, Statistiken, Profil und Unterseiten,
  Gastübersicht, Auth, Passwort-Neuvergabe, Rechtstexte sowie Setter/Admin.
  `BrandWatermark` übernimmt die freigegebene Geometrie: horizontal mittig im
  Inhaltsbereich, vertikal in der sichtbaren Bildschirmmitte, beim Scrollen
  dort gehalten. Mobil 22rem (maximal 90% der Fläche), ab md 30rem; Hallenakzent
  mit 8% Deckkraft. Die Elternfläche verwendet `relative isolate`.
  Weiße Karten, Formularflächen, Fotos, Textkontrast und Controls bleiben deckend.
  Die separate Ebene ist für Screenreader verborgen und fängt keine Eingaben ab.
  Hallenkarten/Zeicheneditor, Dialoge, Medienvollbild und TV-Aushang erhalten
  kein eigenes Wasserzeichen. Header bleiben frei vom Produktlogo.

Natives Android-App-Icon (Nutzerkorrektur 17.10.2026): Das freigegebene
Beta-Zeichen steht ohne Schrift weiß auf KWS-Grün (#36B531), entsprechend dem
Android-Motiv im Logo-Paket. Adaptive Icons verwenden identische Vorder- und
Hintergrundebenen für normale und runde Launcher. Ab API33 ist dieselbe Kontur
als monochrome Ebene für System-Theming hinterlegt. Ältere Android-Versionen
haben passende PNGs für alle fünf Dichten. Das System setzt die adaptive Maske;
keine vorgerundete Fläche oder Schatten in den adaptiven Ebenen. Änderungen
werden aus public/brand/beta-icon.svg mit scripts/generate-android-icons.cjs
reproduzierbar exportiert. Das alte KWS-Homescreen-Icon wird nicht weiterverwendet.

Die lokale Designvorschau verwendet separate Beispieldaten. Der freigegebene
Web-Release bindet nur die regulären App-Komponenten und die bestehende
Produktionskonfiguration ein; Vorschau-Fixtures werden nicht veröffentlicht.

### 3.4 Radien

Es gibt drei verbindliche KWS-Radiusstufen:

| Token | Wert | Verwendung |
|---|---:|---|
| `rounded-kws-badge` | `4px` | Badges, Nummern, Kartentags, kleine Farbfelder |
| `rounded-kws-control` | `8px` | Buttons, Inputs, Filter, Iconflächen, Listenelemente |
| `rounded-kws-card` | `12px` | Karten, Popover, Dialogflächen, große Inhaltsgruppen |

`rounded-full` ist nur für echte Kreise, Statuspunkte oder bewusst kreisförmige
Avatare zulässig. Rechteckige Badges, Switches, Filter und Buttons werden nicht
zu Pills gemacht.

Konto-Avatare in Sidebar und Profilmenü verwenden den 8-px-Controlradius,
keine Kreise. In Popovern mit 12-px-Außenradius und 8px Innenabstand haben
die inneren Menüzeilen 4px Radius. `cn` löst die KWS-Radien gegen alte
Standardklassen auf; es bleiben keine konkurrierenden Radiusklassen stehen.

### 3.5 Abstände und Größen

- Grundraster: `4px`.
- Kompakte Zwischenstufen von `6px` und `10px` sind für dichte Toolbars erlaubt.
- Mobile Seitenränder: `16px`.
- Desktop-Seitenränder: `32px`.
- Maximalbreite des normalen Seiteninhalts: `1180px`.
- Standardabstand zwischen Seitenabschnitten: etwa `20px`.
- Kompakte Karteninnenabstände: `12–16px`.
- Iconbuttons im Header und in Toolbars: `40 × 40px`.
- Primäre Touch-Aktionen: mindestens `44px` hoch; kompakte 40-px-Controls
  müssen in einer größeren, gut erreichbaren Zeile liegen.
- Gemeinsame Buttons, Inputs, Selects und Tabs sind standardmäßig 44px hoch.
  Switches behalten die kompakte 48×28px-Schiene mit 44px hoher Touchfläche.
- Mobile Inhalte erhalten ausreichend Abstand zur schwebenden Bottom-Navigation
  und zur unteren Safe Area.

### 3.6 Schatten und Konturen

| Rolle | Rezept |
|---|---|
| Standard-Surface | `0 3px 14px rgba(19,17,43,0.07)` |
| ruhige interaktive Karte | `0 3px 14px rgba(19,17,43,0.10)` |
| Hover Fotokarte | `0 7px 22px rgba(19,17,43,0.16)` |
| Popover/Toolpanel | `0 5px 18px rgba(19,17,43,0.08)` |
| kleines Badge | `0 2px 8–9px rgba(19,17,43,0.16–0.18)` |

Regeln:

- Normale Karten arbeiten bevorzugt mit Fläche und weichem Schatten statt mit
  einer sichtbaren grauen Außenlinie.
- Borders bleiben für Trenner, Formfelder, ungefüllte Filter und funktionale
  Abgrenzung erhalten.
- Fokus wird mit einem nicht layoutverändernden Ring oder Schatten gezeigt.

### 3.7 Bewegung

Landingpage-Präzisierung 15.10.2026: Im Marketing-Hero dürfen die echten
App-Mockups und dekorativen 3D-Griffe sichtbar gestaffelt eintreten und auf
Desktop beim Scrollen räumlich auseinandergehen. Nutzerkorrektur V9: kein
dauerhaftes Schweben oder Wackeln. Mobil nur ein kurzer Eintritt, anschließend
auch beim Scrollen ruhige Geräte und Griffe. Nutzerkorrektur V24: Mobil bis600px
werden die Hero-Geräte ungefähr auf halber Höhe an der Sektionskante abgeschnitten;
zwei kleinere Ansichten bleiben dahinter, die Griffe seitlich am Rand.
Text und Storeflächen bleiben ruhig. `prefers-reduced-motion` deaktiviert alle
ergänzenden Effekte auch beim Livewechsel. Diese Ausnahme gilt für die öffentliche
Landingpage, nicht für die produktiven App-Oberflächen.

Landingpage-Präzisierung 15.10.2026 (V8): Die Featurepräsentation darf als native
Scroll-Sequenz stehen bleiben: links wechselnde echte Appansichten, rechts der
zugehörige Nutzen, danach normaler Übergang zum nächsten Abschnitt. Direkte
Auswahl und Rückwärtsscrollen bleiben möglich. Keine Übernahme von Wheel/Touch.
Mobil vertikal komponieren; bei reduzierter Bewegung, knapper Höhe oder ohne
JavaScript alle Features als vollständige Liste anzeigen. Die Partnerschaft ist
eine visuelle Auswahl beider Originalmarken mit zugeordneten Beiträgen und
Appvorschau; Website-Links und eine statische Lesefassung bleiben erhalten.

Partnerschaft-Präzisierung V11: Ein aktives Original-Logo bleibt farbig, das
andere wird in der interaktiven Darstellung grau. Bei Auswahl tauscht die
Darstellung. „Beitrag entdecken“ entfällt; Logos mit Hover/Fokus und ein kleiner
Wechselschalter erklären die Bedienung. Ein einmaliger Hinweis beim Erscheinen
darf den Schalter hervorheben, ohne die Auswahl automatisch zu ändern. Mockup,
Bildwechsel und Erklärung bilden einen kurzen gesteuerten Übergang; danach Ruhe.
Reduced Motion entfernt die Übergänge, erhält aber sämtliche Bedienwege.

Landingpage-Nutzerkorrektur V12: Die Feature-Geräte stehen offen vor hellem,
diffusem Farblicht statt in einem dunkelblauen Kasten. Direktauswahl kompakt
beim Text mit mindestens44px Touchzielen; keine große Leiste unter beiden
Spalten. Der Partnerwechselschalter sitzt exakt unter der Smartphone-Mitte,
ohne zusätzliche „Die Beta App“-Beschriftung. Sachliche Überschriften und
konkrete Partneraufgaben ersetzen Werbezweizeiler.

Landingpage-Nutzerkorrektur V13: Die kompakte Featureauswahl verwendet passende
Outline-Icons (Suche, Video, Fortschritt, Kalender) mit zugänglichen Namen statt
Zahlen. Partnerwechsel als kurze Überblendung im festen Smartphone-Rahmen;
keine Bildschirmverschiebung oder Gerätedrehung. Schnelle Gegenwahl setzt
die aktuell gerenderte Deckkraft fort, statt die Animation zurückzusetzen.

- Standarddauer für kleine Zustandswechsel: `150–200ms`.
- Panels dürfen kurz von oben einblenden; keine große Show-Animation.
- Pressed-Zustände dürfen auf `0.97–0.98` skalieren.
- Hover verändert bevorzugt Farbe oder Schatten, nicht das Layout.
- `prefers-reduced-motion` ist bei neuen größeren Animationen zu beachten.
- Desktop-Sidebar und Seitenabstand bewegen sich synchron über 240ms mit
  derselben Ease-in-out-Kurve. Icons und Konto behalten ihre Position/Höhe;
  Beschriftungen werden ausgeblendet, nicht abrupt ausgetauscht. Bei reduzierter
  Bewegung wechseln beide ohne Animation (Nutzerkorrektur vom 2026-09-12).

## 4. Seitenrahmen, Header und Navigation

### 4.1 Gemeinsames Seitenlayout

Angemeldete Nutzerseiten verwenden `DashboardPageLayout`. Dadurch bleiben
Hintergrund, maximale Inhaltsbreite, Seitenabstände, Headerposition und Abstand
zur Navigation gleich.

Kanonische Struktur:

- Seitenhintergrund `#F9FAF9`,
- sticky Header oben,
- Inhalt maximal `1180px`,
- mobil `16px`, ab `md` `32px` Seitenabstand,
- mobile Bottom-Navigation wird durch Bottom-Padding berücksichtigt,
- Desktop-Sidebar verschiebt den Inhalt, ohne die Headerlogik zu verändern.

Headerzeile und Hauptinhalt teilen dieselbe zentrierte `1180px`-Geometrie.
Globale horizontale Begrenzung verwendet `overflow-x: clip`, nicht `hidden`:
`hidden` erzeugt einen unerwünschten Scrollcontainer und kann den Sticky-Header
beim vertikalen Scrollen außer Kraft setzen.

### 4.2 Header

Alle Hauptseiten und Unterseiten verwenden `DashboardHeader`.

- Titel: Teko, `2.15rem`, semibold, `#192436`.
- Hintergrund: weiß mit leichter Transparenz/Blur.
- Untere Trennlinie: sehr helles Grün-Grau.
- Oben wird `env(safe-area-inset-top)` addiert. Es gibt keinen pauschalen
  künstlichen 3-cm-Leerraum.
- Mobile Hauptseiten zeigen links dasselbe `ProfileMenu`. Auf Desktop sitzt
  der Profilzugang einmal im Fuß der Sidebar.
- Profil-Unterseiten zeigen an derselben Stelle einen 40-px-Zurückbutton.
- Rechts sitzen nur häufig verwendete Seitenaktionen.
- Die Titelzeile reserviert mobil mindestens 44px, ab `md` 56px. Unterschiedliche
  Aktionsgrößen verändern weder Headerhöhe noch Titelposition. Auf Desktop bleibt
  der Platz für eine 16px-Unterzeile auch ohne Untertitel erhalten; Home, Boulder
  und Statistiken dürfen beim Seitenwechsel nicht springen.
- Maßgeblich ist die optische Buchstabenmitte, nicht nur der Textrahmen: Teko
  erhält im gemeinsamen Header 4px optischen Versatz, ab `md` 8px. Desktop-
  Aktionen sind in der oberen 44px-Titelzeile zentriert, nicht über Titel plus
  Untertitel. Die reservierte Gesamthöhe bleibt dabei unverändert.
- Suchfelder und Filterpanels erscheinen bei Bedarf unter der Titelzeile, nicht
  dauerhaft als großer Headerblock.

Gast- und angemeldeter Bereich verwenden dieselbe Header-Typografie und starke
Schriftfarbe. Fehlende Gastfunktionen werden weggelassen, nicht durch ein
anderes Design ersetzt.

### 4.3 Navigation und Scrollposition

- Die Desktop-Sidebar ist weiß mit dunkelblauer Schrift und einer dezenten
  Trennlinie zum Inhalt. Logo oben, Navigation mittig, Konto ganz unten.
- `Einklappen` steht oberhalb des Profilbereichs; eine Trennlinie separiert
  Navigationseinstellungen und Konto (Nutzerentscheidung vom 2026-09-11).
- Die aktive Desktop-Route verwendet einen leichten Primärgrün-Tint,
  dunkelblaue Schrift, grünes Icon und `aria-current`. Große olivgrüne
  Navigationsflächen werden nicht verwendet.
- Sidebar und Profilmenü teilen `AccountAvatar`, einschließlich Foto,
  Initialen und neutralem Fallback. Die Rolle ist eine Textzeile ohne
  überlagertes Schild oder einen scheinbaren Online-Statuspunkt.
- Scrollbars sind schmal, abgerundet und neutralgrau; derselbe Token gilt für
  Browser- und Radix-Scrollbars. Grün bleibt fachlichen Aktivzuständen vorbehalten.

- Hauptreihenfolge: `Home → Boulder → Statistiken`, mit aktivierter Training-Vorschau ergänzt um `→ Training` (Nutzerentscheidung 12.10.2026).
- Training enthält die vier direkt zugänglichen Bereiche Krafttraining, Boulderübungen, Wiedereinstieg und Kinderbouldern sowie eine optionale Wochenplanung. Thematische Übungs-/Spielsuche ist hier dauerhaft sichtbar. Die Vorschau verwendet ausdrücklich gekennzeichnete Beispieldaten; Quellen liegen unter „Hintergrund“. Training-Unterseiten halten den Haupttab aktiv, eigene Formulare und Wochenansichten erhalten keinen globalen Route-Swipe.
- Training-Weiterentwicklung nach Nutzerauftrag vom 12.10.2026: Übungsillustrationen unterstützen Bibliothek, Detail und konkrete Einheiten. Auf schmaler Contentbreite bleibt der Detailkopf einspaltig (die Desktop-Seitenleiste zählt bei der Breite mit). Filter verwenden ein mobiles Sheet bzw. Desktop-Popover mit explizitem Übernehmen, verwerfbarer Auswahl und entfernbaren aktiven Filtern. Ein kompakter Plan-Assistent liegt mobil oberhalb der Hauptnavigation; er zeigt eine Frage je Gesprächsschritt und eine bearbeitbare Zusammenfassung vor der Erstellung. Vorhandene Pläne stehen ganz oben im Training-Einstieg und sind aus Unterseiten erreichbar. Die Wochenansicht zeigt konkrete Übungen und Pausen direkt, vertiefende Auswahlbegründungen aufklappbar. Lokale Speicherung wird von Cloud-Synchronisierung und verbundenen KI-Diensten klar unterschieden.
- Präzisierung 12.–13.10.2026: Filterthemen sind ruhige Textreiter mit Unterlinie; das Filterfenster zeigt native Auswahlzeilen statt großer grüner Buttonflächen. Trainingseingaben verwenden genau einen Fokusborder ohne äußeren Ring oder Ring-Offset. Eigene Einheiten sind ein kompakter Zusatzlink. Der Plan-Einstieg ist eine einzelne 56px-Chatblase (bewusste Ausnahme vom üblichen Controlradius), mobil über der Navigation; auf Desktop öffnet sie ein nichtmodales Fenster rechts unten. Im Gesprächskopf steht die bestehende KWS-Marke; wiederholte dekorative Chat-Avatare und generische Ziel-Icons entfallen. Die Katalogauswahl startet mit dem vom Nutzer genannten Hallenmaterial; weitere Geräte sind ausdrücklich zuschaltbar.
- Nutzerpräzisierung 13.10.2026: „Zuletzt trainiert“ ersetzt die festen Fußtechnik-/Brustlinks. Nur ausdrücklich als trainiert markierte Einheiten erzeugen datierte, unveränderliche Verlaufs-Snapshots; Speichern, Suchen und Merken erzeugen keinen Abschluss. Wiederholen öffnet eine unabhängige bearbeitbare Sammlungskopie und erhält den offenen Entwurf. „Rückgängig“ entfernt nur den jeweiligen Abschluss. Bibliotheken zeigen alle Treffer und ihre Zahl ohne wiederholtes Fünfer-Nachladen. Im Boulderbereich sind Format (Übung/Spiel) und motorisches Lernfeld getrennte Filterachsen. Hinzufügen sammelt im Einheitsentwurf; Öffnen → Anpassen → Speichern → optional in Woche einplanen wird sichtbar erklärt. „Wiedereinstieg“ bleibt fachliche Orientierung und hat keine pauschale Therapiedosis.
- Weitere Nutzerpräzisierung 13.10.2026: Kinderbouldern ist ein eigener vierter Bereich für Kita- und Schulkinder. Vier Bereichskacheln und Bibliothekssegmente sind mobil/Tablet 2×2, bei ausreichender Desktopbreite vier nebeneinander. Kinderspiele sind Betreuungsanleitungen mit eigenen Aufbau-/Gruppen-/Alters-/Zeithinweisen und Kita-Vereinfachungen; Kita/Schule und Thema sind getrennte Suchachsen. Kinderspiele bekommen keine Erwachsenen-Trainingsdosis und keine Einheiten-Add-/Replace-Aktion. „Gemerkte Inhalte“ fasst Übungs-, Wiedereinstiegs- und Spielkarten zusammen. Favoriten speichern kein Kinderprofil.
- Korrektur des Auftraggebers 13.10.2026: Illustrationen bleiben die großen Übungs-/Spielbilder. Kleine individuelle Symbole unterstützen nur passende Themenfilter, Funktions- oder Orientierungsstellen; kein zusätzlicher Iconzwang neben jedem Kartentitel. Profil → Trainingseinstellungen bietet getrennte Schalter für Training und Kinderbouldern. Ausblenden verändert keine gespeicherten Inhalte. Training verschwindet aus Hauptnavigation und Route-Swipe; direkte Links zeigen einen Rückweg zu den weiterhin erreichbaren Einstellungen. Ohne Kinderbereich erscheinen drei Bereichskacheln, mobil zwei Spalten. Kinderkarten und ihre Favoriten werden verborgen, beim Reaktivieren wieder sichtbar. Die Auswahl ist lokal, kontogebunden und zwischen Browser-Tabs abgestimmt; keine Cloud-/Gerätesynchronisation behaupten.
- Verständlichkeit nach Nutzerauftrag 14.10.2026: Übungs-/Spielkarten nennen ein kurzes Ziel und einen konkreten Ablauf in Alltagssprache. Ausgangsposition, Bewegung und Rückkehr sind nachvollziehbar; Begriffe beim ersten Auftreten erklären. Praktische Aufbau-/Betreuungs-/Stophinweise bleiben direkt sichtbar. Keine wiederholten Methoden-/Freigabetexte in jedem Schritt. Quellen, Auswahlbegründung und fachlicher Entwurfsstatus sind unter „Hintergrund & Quellen“ nachgeordnet. Kinderseiten zeigen ausführliche Alters-/Gruppen-/Zeitangaben erst nach dem Ablauf aufklappbar; kurze Angaben und Betreuung bleiben im Kopf. „Zur Anleitung“/„Zum Spielablauf“/„Zur Kita-Idee“ springen mit Headerabstand zur passenden Stelle. Bilder müssen die dargestellte Grundbewegung/Spielsituation unterstützen und dürfen keine falsche Griff-/Fußtechnik als Vorbild ausgeben.
- Die Bottom-Navigation und Desktop-Navigation verwenden dieselben Labels,
  Icons und Aktivzustände.
- Bei normalem Wechsel auf eine andere Route beginnt die neue Seite oben.
- Browser-Zurücknavigation darf ihre natürliche Historienposition behalten.
- Mobile Hauptseiten unterstützen horizontales Route-Swipen:
  - Wisch von rechts nach links: nächster Eintrag rechts in der Reihenfolge,
  - Wisch von links nach rechts: vorheriger Eintrag links,
  - Mindestdistanz etwa `56px`,
  - klare horizontale Gesten bewegen den Inhalt leicht mit dem Finger;
    Loslassen setzt die Richtung weich fort (90ms Austritt, 200ms Eintritt),
  - kurze/abgebrochene Gesten und die Enden der Reihenfolge gleiten in 180ms
    zurück; kein Umlauf von der letzten zur ersten Seite,
  - Header und Hauptnavigation bleiben währenddessen an ihrer Position,
  - vertikale Gesten, Pinch-Zoom, Formfelder, Dialoge, Hallenkarte und horizontale
    Scroller bleiben frei; normale Karten/Links dürfen eine Wischfläche sein,
    ein erkannter horizontaler Zug löst keinen anschließenden Kartenklick aus,
  - Reduced Motion entfernt Zug- und Wechselbewegung, auch beim Livewechsel.
  Nutzerkorrektur 19.10.2026 ersetzt damit die frühere umgekehrte Wischrichtung.
- Karte und andere komplexe Gestenflächen erhalten `data-swipe-ignore`.

## 5. Gemeinsame Komponenten

### 5.1 Surface und Karten

Für normale weiße Inhaltsflächen ist `KwsSurface` beziehungsweise
`kwsSurfaceClassName` die Ausgangsbasis:

- `rounded-kws-card`,
- weißer Hintergrund,
- Standard-Surface-Schatten,
- keine zusätzliche Außenlinie ohne funktionalen Grund.

Eine Karte wird nur eingesetzt, wenn sie eine echte funktionale Einheit bildet.
Card-in-Card ist zu vermeiden.

### 5.2 Buttons und Iconbuttons

- Standardradius: `rounded-kws-control`.
- Primär: ursprünglicher grüner Hintergrund, dunkelblaue `primary-foreground`-Schrift.
- Inaktiv/sekundär: helle Sekundärfläche, graues Icon oder dunkelblaue Schrift.
- Aktivzustand von Toolbarbuttons: Primärgrün mit dunkelblauem Icon.
- Destruktive Aktionen verwenden Rot nur dort, wo wirklich Daten oder Sitzungen
  beendet werden.
- Gleiche Aktion = gleiche Komponente und gleiche Maße auf jeder Seite.
- Iconbuttons benötigen ein verständliches `aria-label`.
- Bewertungssterne benennen ihren Wert („3 von 5 Sternen“), kennzeichnen die
  gespeicherte Auswahl mit `aria-pressed` und bieten mindestens 44 × 44px Touchfläche.

### 5.3 Badges und Tags

- Standardradius: `4px`, nicht vollrund.
- Ein Badge trägt eine kurze Information: `NEU`, Grad, Anzahl oder Status.
- Weißes Badge auf einem Foto erhält einen kleinen Schatten.
- Badges dürfen sich nicht überlappen und keine zentrale Bildinformation
  unnötig verdecken.
- Bei wenig Breite dürfen Inhalte auf zwei Zeilen verteilt werden, statt lange
  Tags ineinander laufen zu lassen.

### 5.4 Switch

Der gemeinsame Benachrichtigungsswitch hat feste Proportionen:

- Track: `48 × 28px`, Radius `8px`.
- Thumb: `20 × 20px`, Radius `4px`.
- Innenabstand in beiden Endpositionen: `4px`.
- Aktiv: ursprünglicher grüner Track, dunkelblauer Thumb für klaren Kontrast.
- Inaktiv: `switch-track` (helles Grau, etwa `#D9E0DA`), weißer Thumb;
  eine dezente innere Kontur hält die Controlgrenze erkennbar.
- Übergang: `200ms`.
- Tastaturfokus: kontrastreicher `ring`-Token ohne Layoutsprung.

Der Thumb darf den Track nicht fast vollständig ausfüllen und nicht bündig an
einer Kante sitzen.

### 5.5 Segmentsteuerung

`KwsSegmentedControl` ist die Standardlösung für kleine Ansichts- oder
Inhaltswechsel wie `Info / Track / Beta` oder Statistikzeiträume.

- äußerer Track: `rounded-kws-card`, Sekundärfläche, `4px` Padding,
- Auswahl: `rounded-kws-control`, grüner Hintergrund, dunkelblaue Schrift,
- inaktiv: Sekundärtext, leichter Hover,
- kein zusätzlicher grüner Unterstrich,
- ausgewählte Fläche und äußerer Track müssen geometrisch sauber ineinander
  sitzen.

### 5.6 Inputs und Suche

- Inputs und Suchfelder verwenden den 8-px-Controlradius.
- Nutzerfreigabe 19.10.2026: Texteingaben haben mobil mindestens 16px Schrift.
  Die bisher 14px großen Boulder-Suchfelder (Gast/angemeldet), Kommentare,
  private Tracking-Notizen, Bestätigungslink-E-Mail und HEX-Farbwerte verwenden
  `text-base md:text-sm`. Feldhöhe und Desktoptypografie bleiben erhalten.
- Die Suchfunktion der Boulderliste bleibt hinter einem Icon verborgen, da
  Boulder selten über ihren Namen gesucht werden.
- Ein geöffnetes Suchfeld liegt im Header-Unterbereich und enthält Suchicon,
  Text und Schließen-Aktion.
- Fokus erzeugt keinen grünen Rahmen um das ganze Feld. Verwendet wird ein
  zurückhaltender, nicht layoutverändernder dunkelblauer Fokusindikator.
- Auswahlfelder (`SelectTrigger`) zeigen diesen äußeren Indikator nur bei
  Tastaturbedienung (`focus-visible`). Nach Maus- oder Touch-Auswahl bleibt
  die normale Feldkontur erhalten; Fokus allein erzeugt keinen zweiten Rahmen.
- Löschen/Schließen darf die Höhe des Feldes nicht verändern.
- Suchfelder haben einen zugänglichen Namen unabhängig vom Platzhalter.
  Ergebniszahlen bei aktiver Suche oder Filterung heißen „Treffer“; sie dürfen
  nicht als ungefilterter Hallenbestand bezeichnet werden.

### 5.7 Menüs, Popover, Dialoge und Filterpanels

- große Fläche: Radius `12px`; kompakte Inline-Toolpanels dürfen Radius `8px`
  verwenden,
- weißer Hintergrund und leichter Popover-Schatten,
- Profilmenü und Benachrichtigungen teilen `kwsPopoverClassName`; ihre Köpfe
  bleiben weiß und ihre Texte dunkelblau. Keine dunklen Banner, dekorativen
  Farbwolken oder zusätzlichen Pastellpaletten für Mitteilungskategorien.
- Das Profilmenü bleibt kompakt: Konto, Profil/Einstellungen, Bereichswechsel,
  Abmelden. Der aktuelle Bereich wird mit Primärgrün-Tint und Häkchen markiert.
- Profil und Benachrichtigungen öffnen auf Mausgeräten nach kurzem Hover.
  Der Weg über den Abstand zum Menü bleibt offen; beim Verlassen schließt
  die Vorschau verzögert. Ein Klick hält sie offen, Escape und Außenklick
  schließen sie. Hover stiehlt keinen Tastaturfokus. Touch bleibt per Tippen
  bedienbar; reduzierte Bewegung wird berücksichtigt (Nutzerentscheidung
  vom 2026-09-11).
- Ungelesene Mitteilungen erhalten einen dezenten grünen Punkt mit zugänglicher
  Textalternative. Gelesene Einträge und Scrollleisten bleiben neutral.
- Bedienlabels und Mitteilungstexte sind mindestens 12px; 11px ist für kurze
  Zeitangaben zulässig. Lade-, Leer- und Fehlerzustände werden unterschieden.
- Optionen verwenden die gleichen 8-px-Controls,
- gewählte Option: Markengrün/Dunkelblau plus `aria-pressed` oder semantisches Primitive,
- keine nativen ungestalteten Select-Menüs in finalen Screens,
- auf Mobilgeräten kein zweiter vertikaler Scrollcontainer innerhalb der Seite,
- Panels wachsen im normalen Seitenfluss oder werden als klarer, einziger
  Dialog/Sheet geöffnet.
- Mobile Dialoge unter 768 px sind randbündige Bottom-Sheets: volle Breite,
  Unterkante am Bildschirmrand, ungefähr 92 dvh hoch und ausschließlich oben
  12 px gerundet. Safe Areas und reduzierte Bewegung bleiben berücksichtigt.
  Header und Aktionen bleiben sichtbar, der Inhalt dazwischen scrollt.
- Formulardialoge mit eigenem Scrollinhalt verwenden
  `DialogContent scrollLayout="contained"`, einen `flex-1 min-h-0`-Inhalt
  und nicht schrumpfende Kopf-/Fußbereiche. Der Dialograhmen scrollt dann
  nicht zusätzlich; ältere Dialoge ohne diese Struktur behalten ihren
  äußeren Scrollbereich.
- Kurze Sicherheitsbestätigungen bleiben inhaltshoch, ebenfalls volle mobile
  Breite und unten bündig. Desktopdialoge bleiben zentriert und in der Breite
  begrenzt. Dropdown-Menüs sind keine Formulardialoge und bleiben kompakt.

### 5.8 Icons

- Lucide-Icons sind Standard.
- Normaler Stroke: `1.75`, zentral über `--kws-icon-stroke` (Nutzerreferenz
  vom 15.09.2026). Nur `svg[class~="lucide"]` erhält diesen Wert; Karten,
  Diagramme und eigene SVGs behalten ihre deklarierte Kontur. Der Attributselektor
  bleibt auch im Tailwind-Build erhalten, obwohl Lucide seine Klassen selbst erzeugt.
- Gemeinsame Navigationssymbole stehen in `src/lib/appIcons.ts`: Haus für Home,
  eigener KWS-Klettergriff für Boulder, Verlauf für Statistiken, Stift für Bearbeiten, neutrale
  Personen-Outlines für Konten. Mobil/Desktop und Profilmenü teilen die Zuordnung.
- `src/components/icons/BoulderIcon.ts` ist das eigene Boulder-Symbol (Nutzerwunsch
  vom 15.09.2026): asymmetrischer Klettergriff mit einem zentrierten Schraubpunkt
  auf dem 24px-Grid. Keine zusätzliche Innenkante: das reduziert die visuelle Dichte
  bei 16–24px und gleicht das Gewicht an Home/Statistik an (Nutzerkorrektur).
  Gleiche Strichstärke/currentColor wie Lucide, keine neue Bilddatei oder
  Iconbibliothek. Label „Boulder“, Linkziel und Aktivzustand bleiben unverändert.
- Icons erklären eine Funktion und werden nicht als beliebige Dekoration
  eingesetzt.
- Nutzerfreigabe 18.10.2026: Kalender und Flash verwenden eigene KWS-Konturen
  aus `ProgressIcons.ts`, zentral über `appIcons.ts` exportiert. Wie das Boulder-
  Icon: 24px-Raster, `currentColor`, 1,75px Strichstärke und weich gerundete
  asymmetrische Konturen. Der Kalender hat einen einzelnen markierten Tag.
  Home-Wochenkarte, Statistikkennzahlen, Profil-Klettertage und Home-Schraubtermin
  teilen diese Symbole.
- Trainingsillustrationen bleiben nach Nutzerkorrektur vom 13.10.2026 die primären Karten-/Detail-/Einheitenbilder. `training-glyphs.ts` stellt eigene kleine Themen-/Orientierungssymbole bereit; sie ersetzen keine vorhandenen Rasterbilder und wiederholen nicht unnötig die Bildinformation als Metadatenicon. Boulder-Lernaufgaben dürfen eine passende Grundbewegungsillustration über `illustrationId` teilen. Kinderspiele verwenden zwölf eigene Szenen. Gemeinsame Funktionsicons wie Merken, Zurück oder Schließen behalten ihre einheitliche Zuordnung. Die eigene KWS-Kontur beträgt 1,75px; kleine grüne Motive verwenden `primary-ink`, Rasterillustrationen das Markengrün mit Schattierungen. Bilder vor Nutzung auf Anatomie, Kontaktpunkte, Geräte, Motivpassung und echte CSS-Zuschnitte prüfen; eine Bildprüfung ersetzt keine fachliche Ausführungsfreigabe.
- Icons sitzen häufig auf 32–40-px-Flächen mit 8-px-Radius.
- Berg- oder Klettericons werden nur für eine passende fachliche Aussage
  verwendet, nicht als generisches Symbol für eine Boulderanzahl.

### 5.9 Systemmeldungen und Toasts

Alle kurzzeitigen Systemmeldungen verwenden den gemeinsamen Sonner-Toaster.

- Position: oben zentriert, direkt unter `env(safe-area-inset-top)`; mobil
  bleiben links und rechts mindestens `16px` frei.
- Fläche: weiß, `rounded-kws-card`, ohne graue Außenlinie und mit ruhigem
  Popover-Schatten.
- Statusicon: `36 × 36px` auf einer eckigen 8-px-Fläche. Erfolg verwendet Grün,
  Fehler den Gefahrenton, Warnungen einen warmen Bernsteinton und neutrale
  Informationen Dunkelblau auf Sekundärfläche.
- Icon, Titel und Text vermitteln den Status gemeinsam; Farbe allein reicht
  nicht. Titel sind Poppins semibold und dunkelblau, Beschreibungen kurz und in
  `muted-foreground`.
- Fachliche Fehlermeldungen erhalten einen kurzen Titel und darunter eine
  konkrete Erklärung oder nächste Handlung, beispielsweise
  `Anmeldung fehlgeschlagen` plus Hinweis zu E-Mail und Passwort.
- Der Schließenbutton ist `32 × 32px` groß, verwendet den 8-px-Controlradius
  und sitzt auf derselben vertikalen Mittelachse wie Statusicon und Inhalt. Er
  besitzt einen sichtbaren markenkonformen Tastaturfokus.
- Statusicon, Textblock und Schließenaktion sind vertikal sauber zentriert.
  Einzeilige Meldungen dürfen nicht am oberen Rand hängen; mehrzeilige
  Beschreibungen bleiben als kompakter gemeinsamer Textblock lesbar.
- Meldungen dürfen horizontal weggewischt werden, den Viewport nicht verlassen
  und respektieren `prefers-reduced-motion`.

## 6. Boulderübersicht

### 6.1 Header-Werkzeuge

Rechts im gemeinsamen Header stehen kompakte 40-px-Buttons für:

1. Suche,
2. Hallenkarte,
3. Filter.

Suche, Karte, Filter und Sortierung sind gegenseitig exklusive Panels. Beim
Öffnen eines Panels schließen die anderen. Dadurch bleibt der Header kompakt.

Inaktive Icons sind grau auf Sekundärfläche. Aktive Werkzeuge sind grün mit
dunkelblauem Icon. Ein kleiner Zähler zeigt aktive Filter; er ersetzt keine
zugängliche Beschriftung.

### 6.2 Filterlogik

Filter für Sektoren, Schwierigkeiten und Farben sind Multi-Select:

- mehrere Sektoren dürfen gleichzeitig aktiv sein,
- mehrere Grade dürfen gleichzeitig aktiv sein,
- mehrere Griff-Farben dürfen gleichzeitig aktiv sein,
- leere Auswahl bedeutet jeweils „alle“,
- Schwierigkeit enthält `1–8` und `?` für unbekannten Grad,
- es gibt keine eigenen Optionen „Alle Grade“ oder „Alle Farben“,
- `Filter zurücksetzen` setzt alle Listen zurück und zeigt standardmäßig nur
  hängende Boulder,
- Schnellfilter sind `Neu`, `Gespeichert` und der Statusumfang,
- aktive Filter werden zusätzlich als entfernbare Chips unter dem Header
  zusammengefasst,
- die Karte und die Filter verwenden denselben Sektorfilterzustand.

Bei Farben wird die Griff-Farbe als kleines eckiges Farbfeld gezeigt. Auswahl
wird zusätzlich durch Checkmark und Textkontrast kommuniziert.

Filter und Sortierung teilen `BoulderFilterControls`, `FilterOption` und
`BoulderSortPanel` zwischen Gast- und Nutzerbereich. Die Panels verwenden
weiße 12-px-Flächen mit weichem Schatten; inaktive Optionen ruhige
Sekundärflächen ohne graue Außenlinien. Ausgewählte Optionen erhalten
Primärgrün-Tint, dunkelblaue Schrift und grünes Häkchen. Die Abschnitte
verwenden Poppins statt der Schrift für Seitentitel.

Gradzahlen stehen horizontal und vertikal im Zentrum der gesamten Schaltfläche,
auch bei Auswahl. Ihr Häkchen sitzt separat oben rechts und reserviert keinen
einseitigen Platz neben der Zahl (Nutzerkorrektur vom 2026-09-12).

Überarbeitung 15.09.2026: Kategorien sind zugängliche, animiert aufklappbare
Gruppen mit Outline-Icon und aktueller Auswahlzusammenfassung. Einklappen ändert
keine Filter. Jede Kategorie kann separat zurückgesetzt werden; andere Kategorien
bleiben aktiv. Schnellfilter im Nutzerbereich sind beschriftete Switch-Zeilen.
Grade bilden eine kompakte segmentierte Mehrfachauswahl, keinen Bereichs-Slider:
Auch nicht benachbarte Grade müssen auswählbar bleiben. Keine erfundenen Balken.

Farben stehen als benannte 32px-Muster in kompakten Zeilen. Zunächst erscheinen
sechs Farben, weitere über „Weitere Farben“. Bereits gewählte Farben bleiben
auch beim Reduzieren der Liste sichtbar. Footer: beschrifteter Reset und echte
Trefferzahl mit Ergebnisaktion. Der Kopf kündigt die aktualisierte Trefferzahl
über `aria-live="polite"` an; ausgewählte Optionen haben zusätzlich Häkchen und
`aria-pressed`. Bewegung entfällt bei Reduced Motion.

Farbfelder sind mindestens 20px groß und zeigen auch zweifarbige Griffe.
Farbnamen bleiben lesbar. Laden, Fehler mit Wiederholen-Aktion und ein
wirklich leerer Katalog sind unterscheidbar; eine fehlgeschlagene Abfrage
darf nicht als leere weiße Spalte erscheinen. Der öffentliche Farbkatalog
wird unabhängig von einer ablaufenden Nutzeranmeldung gelesen.

Gast-, Nutzer- und Setterfilter öffnen dasselbe `BoulderFilterPanel`: unter
768px ein randloses, unten bündiges Bottom-Sheet, darüber ein zentrierter
Dialog (maximal 720px breit). Genau ein Inhaltsbereich scrollt. Kopf mit
Schließen sowie Fuß mit Reset und aktueller Ergebnisanzahl bleiben erreichbar.
Auswahlen wirken sofort; Schließen verwirft sie nicht und gibt den Fokus an
den Auslöser zurück. Reset verändert keine Daten.

Grade werden als zentrierte Mehrfachauswahl gezeigt, Grifffarben als benannte
32px-Farbmuster (einschließlich zweifarbiger Muster). Auf breiten Displays
nutzen Grade und Farben jeweils die gesamte Dialogbreite. Hallenbereiche
verwenden die öffentlichen Kartennamen und gruppierte Teilbereich-Buttons.
Doppelte physische Zeilen erzeugen keinen doppelten Filter. „Alle wählen“
wählt die Teilbereiche eines Bereichs; keine Auswahl bedeutet ganze Halle.

### 6.3 Sortierung und Gruppierung

Standard ist `Neueste zuerst`.

- Boulder werden nach ihren kundenorientierten Hauptbereichen gruppiert, einschließlich neu angelegter Bereiche.
- Bei Datumssortierung bestimmt das neueste beziehungsweise älteste Element der
  Gruppe die Gruppenreihenfolge.
- Innerhalb einer Gruppe gilt dieselbe ausgewählte Sortierung.
- Ein neu eingestellter Boulder erscheint damit in seiner Bereichsgruppe oben;
  die Gruppe mit dem neuesten Boulder steht bei `Neueste zuerst` zuerst.
- Für Nicht-Datumssortierungen gilt die kanonische Bereichsreihenfolge.
- Jede Gruppe kann einzeln ein- und ausgeklappt werden.
- Neben der Sortierung gibt es `Alle einklappen / Alle ausklappen`.
- Der Gruppenkopf zeigt Bereichsname, Anzahl und eine dünne ruhige Trennlinie.

Die fünf ursprünglichen öffentlichen Bereichsnamen sind (zusätzlich eigenständig:
Kurze Platte, vormals Felsenmeer, Nutzerkorrektur 07.10.2026):

1. Bug
2. Couch-Ecke
3. Top-Out
4. Lange Platte
5. Grotte

Weitere strukturierte Hauptbereiche aus der Datenbank werden ergänzt. Teilbereiche
verwenden Kürzel mit 1–3 Großbuchstaben/Ziffern, beginnend mit einem Buchstaben
(zum Beispiel E, AA oder B2). Die ursprünglichen Zuordnungen bleiben erhalten.

Technische Altsektornamen dürfen weiterhin intern aufgelöst werden, werden aber
nicht als zusätzliche Kundenbegriffe eingeführt.

### 6.4 Ansichtswechsel

Die Ansicht kann zwischen Liste und Grid wechseln. Der Zustand wird lokal
gespeichert.

- Der Switch verwendet dieselbe 8/12-px-Segmentlogik wie andere Controls.
- Aktive Ansicht: weiße Fläche, Primärgrün und leichter Schatten.
- Inaktive Ansicht: graues Icon ohne extra Rahmen.

### 6.5 Gridkarte

- mobil immer drei Karten nebeneinander,
- Seitenverhältnis `4:5`, bewusst rechteckig statt quadratisch,
- Bild füllt die Karte ohne weiße Seitenränder,
- `object-cover`, zentrierter Ausschnitt,
- quer erkannte Thumbnails dürfen um 90° korrigiert werden,
- Gradbadge oben links: weißes Rechteck, Zahl in lesbarer Boulderfarbe,
- `NEU` oben rechts für Boulder der letzten sieben Tage,
- unten ein weißer Verlauf mit dunkelblauem Namen und öffentlichem Bereich,
- in der Metazeile nur der Hauptbereich, nicht das Teilbereichskürzel,
- Foto bleibt trotz Badges und Text als primäre Erkennung sichtbar,
- Karte: 12-px-Radius, leichter Schatten, kein grauer Außenrahmen.

Die farbige Gradzahl auf Weiß muss mindestens einen Kontrast von `4.5:1`
erreichen. Die sichtbare Farbe darf dafür abgedunkelt werden, ohne ihre
semantische Zuordnung zu verlieren.

### 6.6 Listenkarte

- Mindesthöhe ungefähr `94px`,
- Thumbnail füllt links die gesamte Kartenhöhe und reicht bis an den Kartenrand,
- Thumbnailbreite ungefähr `92px`,
- Gradbadge sitzt auf dem Thumbnail unten rechts,
- Inhalt rechts: Name, technischer Sektorverlauf falls relevant, Bewertung,
- `NEU` als kleines eckiges Tinted-Badge neben dem Namen,
- kein grauer Außenrahmen; weißer Hintergrund und weicher Schatten,
- Chevron nur als dezenter Navigationshinweis.

Auf schmalen und mittleren Flächen bleibt die Liste einspaltig. Erst wenn nach
der Desktop-Sidebar ausreichend Nutzbreite vorhanden ist, stehen zwei
Listenkarten nebeneinander. Dadurch entstehen auf großen Screens keine extrem
langen, inhaltsleeren Zeilen.

### 6.7 Thumbnailqualität

- Ein vorhandenes echtes Thumbnail hat Vorrang vor Platzhaltern.
- Bilder werden asynchron dekodiert und außerhalb des ersten sichtbaren Bereichs
  lazy geladen.
- Platzhalter verwenden `#EEF2EE` und dürfen nicht wie ein kaputtes Bild wirken.
- Zusätzliche CSS-Skalierung darf keine weißen Seitenränder erzeugen.
- Rauschen oder schlechte Bildqualität wird an der Thumbnailquelle gelöst, nicht
  durch starke Filter, die Griffe verfälschen.

## 7. Hallenkarte und Sektoren

### 7.1 Benennung

Kunden sehen die Hauptbereiche und darunter ihre Teilbereiche. Die fünf
ursprünglichen Bereiche bleiben erhalten; neu angelegte Bereiche werden ergänzt.
Beispiele: `Bug A`, `Bug B`, `Bug C`, `Bug D`.

Ohne Auswahl stehen auf der kompakten Karte nur die Teilbereichskürzel A–D bzw.
neue Kürzel. Gewählte Teilbereiche zeigen ihren Namen ausschließlich direkt an
ihrer Wandmarkierung, nicht zusätzlich auf dem Kartenboden oder in einer Legende.
Nach Abwahl/Reset erscheinen wieder nur die Kürzel. Keine „Ganze Halle“-
Erklärzeile (Nutzerkorrektur 07.10.2026). Die Kurze-Platte-A-Ausnahme bleibt erhalten.

### 7.2 Zustände

Freigegebene neutrale Darstellung (07.10.2026), ersetzt die bisherigen farbigen
Flächenzustände in `HallMapView`:

- Wandoberflächen bleiben weiß, auch bei Auswahl. Die räumliche Unterkante und
  der weiche Kontaktschatten sind rein dekorativ, niemals zusätzliche Klickflächen.
- Auswahl: Markengrün-Kontur, weißer benannter Tag und dunkelblaues Häkchen.
  Hover bleibt gestrichelt dunkelblau; Tastaturfokus separat sichtbar.
- Nicht gewählte Wände bleiben vollständig sichtbar, ohne Ausblenden/Abdunkeln.
- Keine zusätzlichen Bereichsnamen im Kartenboden; kleine weiße Teilbereich-Tags
  bleiben auch ohne Auswahl sichtbar. Gewählte Tags tragen den vollständigen
  Teilbereichsnamen direkt an der Markierung. Die ausgewählten Bereiche stehen als kompakte weiße
  Abwahlaktionen darunter. Zurücksetzen ist ein 44px-Iconbutton ohne sichtbaren
  Text; zugänglicher Name und Hover-Titel heißen „Sektorauswahl zurücksetzen“
  (Nutzerkorrektur 07.10.2026).
- Die Karte wird aus den echten Polygonen gezeichnet, nicht als generiertes Bild.
  Das gespeicherte Kartenbild bleibt Zeichenreferenz bzw. Fallback ohne Polygone.
- Die kompakte Boulderkarte rendert mit Three.js tatsächlich extrudierte
  Wandkörper, abgeschrägte Kanten, Beleuchtung und Kontaktschatten. Ihre
  schematische Dicke ist eine Tiefenhilfe, kein vermessenes 3D-Modell der Halle.
  Die feste orthografische Ansicht bleibt an den gespeicherten Polygonen
  ausgerichtet; Auswahl und Tastaturbedienung laufen über dieselbe SVG-Ebene.
- Three.js wird nur beim Öffnen der kompakten Karte nachgeladen. Bei fehlendem
  WebGL oder Kontextverlust bleibt die weiße SVG-Karte bedienbar; eine erfolgreiche
  Kontextwiederherstellung aktiviert die 3D-Wände ohne Auswahlverlust. Die Szene
  rendert nur bei Aufbau, Größenwechsel und Wiederherstellung, nicht fortlaufend.
  Geometrien, Materialien, Schattentexturen, Observer und Grafik-Kontext werden
  beim Schließen freigegeben. Editor-/Rahmenvorschauen bleiben SVG.
- Die 3D-Karte orientiert sich am freigegebenen architektonischen Referenzbild:
  sichtbar abgeschrägte weiße Wandkappen, hellgraue Seitenflächen und weiche,
  bodennahe Kontaktschatten. Gerichtetes Licht erhält die Kantenmodellierung;
  die graugrüne Bodenfläche hat eine dezente diffuse Aufhellung. Keine neuen
  Sektorformen oder erfundenen Wandhöhen: Tiefe bleibt schematisch. Der weiche
  Kontaktschatten wird einmalig aus den vorhandenen Polygonen erzeugt. Die weißen
  Wand-Tags erhalten etwas mehr Fläche und größere Kürzel, ohne benachbarte
  Markierungen zu überlagern oder zusätzliche Bodennamen einzuführen.
  SVG und 3D-Kamera teilen denselben Rand für die sichtbaren Unterkanten;
  die Klickflächen bleiben deckungsgleich mit den Wandoberflächen.
- Der Boden der kompakten Karte folgt dem Referenzentwurf: sichtbar sanftes
  Salbeigrün im Zentrum mit hellen, diffus beleuchteten Rändern, nicht nahezu
  weißes Grau. Der Verlauf sitzt am festen Kartenviewport, nicht auf der
  verschiebbaren 3D-Ebene: Zoom/Pan und WebGL-Fallback erzeugen keine Farbkante.
  Zeichen-/Rahmenvorschauen behalten ihren neutralen Boden. Das Marken-Aktionsgrün
  wird dafür nicht verändert (Nutzerkorrektur 07.10.2026).
- Neutrale Wandtrennlinien: 0,65 CSSpx mit Zoomkompensation; aktive Kontur
  1,5 CSSpx. Teilbereichsnamen stehen nur auf den Wandmarkierungen und bleiben
  auch bei gedrehter Karte aufrecht.
- In der Boulderansicht öffnet das Header-Kartenicon die Karte ohne zusätzlichen
  Liste/Karte-Umschalter. Suche, graue Kartenfläche, horizontale Abwahl-Chips und
  Ergebnisbutton passen zwischen Header und Navigation in den dynamischen Viewport.
  Kein Scrollen durch die Gestenfläche nötig. `Alle Boulder anzeigen` ohne Auswahl
  bzw. `Boulder anzeigen` mit Auswahl schließt die Karte, erhält Filter/Suche und
  zeigt den Listenbeginn direkt unter dem Header (Nutzerentscheidung 07.10.2026).
- In der viewportfüllenden Boulderkarte ist der Platz für die Auswahlzeile bereits
  ohne Auswahl reserviert. Erste Auswahl, Mehrfachauswahl, Abwahl und Zurücksetzen
  verändern weder Kartenhöhe noch Maßstab oder Position. Chips bleiben einzeilig
  horizontal scrollbar; ohne Auswahl erscheint keine zusätzliche Erklärzeile.

Bisherige farbige Darstellung (historisch, weiterhin Referenz für Zeicheneditor):

- Standardfläche: Grundton des Elternbereichs.
- Hover: nur eine gestrichelte dunkelblaue Kontur, keine Auswahlfärbung. Touch
  erzeugt keinen bleibenden Hover; Tastaturfokus erhält eine eigene Tagkontur.
- Ausgewählt: dunklere Bereichsfläche mit durchgezogener dunkelblauer Kontur,
  Markengrün-Tag mit dunkelblauer Schrift und zusätzlichem Häkchen. Sobald eine
  Auswahl besteht, treten übrige Flächen zurück. Die Bereichspalette bleibt erhalten.
- Weiße Trennlinien separieren die Flächen klar, bleiben aber fein: 1,25 CSSpx,
  unabhängig von Kartenmaß und Zoom. Abgerundete Linienverbindungen vermeiden
  spitze Ecken, ohne die gespeicherten Polygonpunkte zu verändern.
- Auswahlkonturen verwenden 1,5 CSSpx mit abgerundeten Verbindungen; Hover bleibt
  mit 1,25 CSSpx gestrichelt. Die Konturen liegen über allen farbigen Flächen,
  damit benachbarte Trennlinien keine Kanten verdecken. Tags liegen darüber.
  Nicht gewählte Flächen bleiben bei einer Auswahl mit 65% Deckkraft gut
  erkennbar (Nutzerkorrektur vom 07.10.2026). Häkchen und benannte Chips erhalten
  die eindeutige Auswahl, ohne kräftige schwarze Umrandungen zu benötigen.
- Jede sichtbare Wandkante wird nur einmal gezeichnet. Grundkarte und
  interaktive Polygone dürfen nicht als zwei versetzte Konturen übereinander
  erscheinen.
- Teilbereichs-Tags werden so positioniert und skaliert, dass sie weder einander noch
  relevante Flächenkanten überlagern.
- Auswahl ist zusätzlich als benannte, entfernbare Chips unter der Karte sichtbar;
  eine Statuszeile zählt logische Teilbereiche, nicht physische Flächen oder doppelte
  ID-/Namenskanäle. Reset stellt „Ganze Halle“ wieder her.
- Klickflächen bleiben innerhalb der echten Polygone: keine unsichtbaren breiten
  Außenkonturen, die benachbarte Sektoren abfangen. Physische Flächen desselben
  Teilbereichs bleiben bewusst gemeinsam markiert. Die bestätigte Ausnahme für
  Bug A und Kurze Platte steht in Abschnitt 7.4. Gelieferte IDs
  sind gegenüber Namensfiltern führend; explizit leere Arrays sind keine alte Auswahl.
- Mehrere Teilbereiche dürfen gleichzeitig ausgewählt werden.
- Erneutes Anklicken entfernt nur diesen Teilbereich aus der Auswahl.

### 7.3 Verhalten

- Vollständige querformatige Hallenkarten werden unter 768px im Uhrzeigersinn
  um 90° hochkant angezeigt, ab 768px bleibt die ursprüngliche Queransicht.
  Punkte, Bild und Tag-Anker teilen dieselbe Anzeigetransformation; die Tags
  bleiben aufrecht und werden im gedrehten Koordinatenraum neu positioniert.
  Auswahl und Sektor-IDs bleiben bei Größenwechsel erhalten. Bereits hochkantige
  Karten und ausdrücklich höhenbegrenzte Editor-Vorschauen werden nicht gedreht.
  Gespeicherte Kartendaten bleiben unverändert (Nutzerentscheidung 07.10.2026).
- Kartenwahl und Standard-Boulderfilter teilen denselben Zustand.
- Zählungen berücksichtigen nur aktive/hängende Boulder und zählen einen
  Boulder innerhalb derselben logischen Gruppe nur einmal.
- Interaktive Karten unterstützen Pointer, Tastatur `Enter/Space`, Pinch und
  Mausrad-Zoom.
- Zoomrahmen: ungefähr `0.82–3.0`.
- Die Karte darf weder Route-Swipes noch den normalen Seitenscroll versehentlich
  auslösen.
- Die kompakte Boulderkarte erscheint hell und rahmenarm; unter ihr stehen nur
  bei tatsächlicher Auswahl benannte Abwahlaktionen und die Auswahlzusammenfassung.

### 7.4 Bestätigte Korrektur: Bug A und Kurze Platte (07.10.2026)

- Das obere keilförmige Segment der bisher gemeinsam ausgewählten Bug-A-Form
  bleibt Bug A. Der direkt links angrenzende lange Streifen ist die eigenständige
  Kurze Platte, nicht ein zweites Bug A und nicht Lange Platte.
- Die alte Zusammenfassung von Atta-Höhle und Felsenmeer unter `bug:A` ist
  damit fachlich überholt. Im gespeicherten Karten-Snapshot gehört das obere
  Segment zu Atta-Höhle, der linke Streifen zu Felsenmeer.
- Auswahl, öffentliche Beschriftungen und Filter müssen diese beiden Bereiche
  getrennt behandeln. Technische Sektor-/Polygon-IDs, bestehende Boulder- und
  QR-Verweise bleiben erhalten; es werden keine Datensätze gelöscht.
- Umsetzungsstand: Gemeinsame App-Auflösung trennt Felsenmeer von der alten
  Bug-A-Zuordnung (auch alte strukturierte `bug:A`-Daten). Spätere ausdrückliche
  Zuordnungen zu anderen Bereichen/Kürzeln bleiben führend. Physische IDs bleiben
  unverändert. Keine Live-Datenbankmutation in diesem Schritt; die Kompatibilität
  korrigiert genau die fachlich überholte Zuordnung und übernimmt keine Bug-area-ID.
- Neutrale weiße Wandkarte mit graugrünem Boden und dezenter Tiefe ist am
  07.10.2026 anhand des Nutzerbildes zur Implementierung freigegeben.
- Kurze Platte trägt auf der kompakten Karte nur `A`, auch bei Auswahl
  (Nutzerkorrektur 07.10.2026). Vollständiger Name in Abwahl-Chip und
  zugänglicher Beschriftung; keine Zusammenfassung mit Bug A.

## 8. Gastansicht und Boulder-Detail

### Optionales Beta-Video (14.10.2026)

- Neue Boulder brauchen ein Vorschaubild und gültige Pflichtangaben. Ohne Video
  ist die ausdrückliche Auswahl „Beta später ergänzen“ erforderlich.
- Veröffentlichung erfolgt erst nach bestätigtem Vorschaubild-Upload. Kein
  echtes Video, Upload-Auftrag oder „Offizielle Beta“-Badge wird vorgetäuscht.
- Der gemeinsame Platzhalter läuft in einem 3-Sekunden-Loop. Kein Wiederholen-
  oder Aktualisieren-Icon; bei reduzierter Bewegung bleibt er statisch.
- Ein echtes Beta-Video lässt sich später ergänzen. Nach unklarer Veröffentlichung
  wird der bereits angelegte Boulder repariert, nicht erneut angelegt.

### 8.0 Login und Registrierung

Produktentscheidung 12.10.2026: Neue eigene Konten zum Start ab 16 Jahren.
Die Registrierung verlangt ein vollständiges, gültiges Geburtsdatum und erklärt
die Altersgrenze direkt am Feld. Ein Fehler bleibt dort sichtbar und erhält alle
anderen Eingaben. Die Kontoerstellung benötigt dieselbe Prüfung auf dem Server;
ein UI-Hinweis allein gilt nicht als Durchsetzung. Konten unter 16 werden später
mit geeignetem Elternablauf vorbereitet. Apples Inhaltsaltersfreigabe bleibt separat.

Login und Registrierung bilden einen gemeinsamen Auth-Flow und verwenden die
gleiche Marken-, Typografie- und Komponentenlogik wie Gast- und Nutzerbereich.

- Der Auth-Inhalt startet mobil direkt nach `env(safe-area-inset-top)` und
  scrollt als eine zusammenhängende Seite. Ein hoher Registrierungsblock darf
  nicht vertikal im Viewport zentriert werden, weil dadurch Begrüßung und Marke
  oberhalb des sichtbaren Bereichs verschwinden können.
- Kletterwelt-Sauerland-Absender, Seitentitel und kurze Einleitung bleiben am
  Beginn der Seite sichtbar; große Marketing-Hero-Flächen sind mobil zu
  vermeiden.
- Anmeldung und Registrierung wechseln über `KwsSegmentedControl` und nutzen
  dieselben 8/12-px-Radien wie die übrige App.
- Textfelder und primäre Aktionen sind mobil mindestens 44px, vorzugsweise
  48px hoch. Eingaben besitzen passende `autocomplete`- und `inputmode`-Werte.
- Passwort anzeigen, Passwort zurücksetzen, Bestätigungslink erneut senden und
  Gastzugang gehören zur gleichen hellen Auth-Surface und benötigen eigene
  Tastaturfokus-, Lade- und deaktivierte Zustände.
- Auf Desktop darf die Auth-Seite zweispaltig werden; Mobile bleibt linear und
  besitzt keinen verschachtelten vertikalen Scrollcontainer.
- Begrüßung und ergänzender Nutzenhinweis bilden auf Desktop eine gemeinsame
  vertikal zentrierte Textgruppe mit 32px Abstand. Der Zusatztext wird nicht
  unabhängig als Fußzeile an die Bildschirmunterkante verteilt.

### 8.1 Gastansicht

Die Gastansicht ist keine zweite Designwelt.

Laden, Abfragefehler und eine erfolgreich geladene leere Boulder-Liste bleiben
unterscheidbar. Ein fehlgeschlagener Boulder- oder Sektorenabruf zeigt keine
scheinbare Anzahl 0, sondern eine helle KWS-Fehlerfläche mit „Erneut versuchen“.
Während des erneuten Abrufs ist die Aktion gesperrt. Suche und Filter bleiben
erhalten; bei wirklich leeren Suchtreffern gibt es einen expliziten Reset.

- gleiche Schriftfamilien, Farben, Radien, Karten und Toolpanels,
- gleiche Such-, Sortier-, Sektor-, Grad- und Farbfilterlogik,
- Filter bleiben Multi-Select,
- keine Home-Funktion, die eine Anmeldung voraussetzt,
- Hauptnavigation enthält für Gäste `Boulder` und `Anmelden`,
- dieselbe mobile Leiste bleibt auf `/auth`, `/app/login` und `/app/register`
  sichtbar. Anmeldung und Registrierung markieren gemeinsam `Anmelden` als
  aktiven Bereich; neue Links verwenden `/app/login`. Die URL bestimmt das
  Formular unmittelbar, auch bei Zurück/Vorwärts. Callback, Passwort-Neuvergabe
  und Rechtstexte bleiben ohne Hauptnavigation,
- die Gästeübersicht wird erst nach abgeschlossener Sessionprüfung gerendert;
  eine vorhandene Anmeldung leitet `/guest` ohne gemischte Gast-/Nutzeroberfläche
  nach `/boulders` weiter,
- Klick auf einen Boulder öffnet eine funktionierende Gast-Detailansicht,
- das Zurückziel führt nachvollziehbar zur Gast-Boulderübersicht,
- Login-Aktionen sind klar, aber ersetzen nicht plötzlich Profilicons oder
  angemeldete Navigation.

Angemeldeten Nutzern vorbehaltene Tracking-, Bewertungs-, Kommentar- und
Attributaktionen werden fachlich ausgeblendet. Die übrige Detailseite behält
dieselbe visuelle Struktur.

### 8.2 Detailansicht

- Rücknavigation führt zum tatsächlichen Einstieg: Home („Neu an der Wand“)
  zurück zu Home, Boulder-/Gastübersicht zurück zur jeweiligen Übersicht.
  Während eines Detailbesuchs bleibt genau diese Ausgangsseite im Speicher:
  Bilder, Filter, Ansicht, Gruppen und Scrollposition bleiben erhalten. Andere
  Navigation und Kontowechsel geben sie frei. Direktlinks haben einen sicheren
  Rückweg zur Übersicht. Der kurze 150-ms-Eintritt entfällt bei Reduced Motion.
- Nutzerkorrektur 19.10.2026: Boulderfilter, Suche und Sortierung bleiben während
  der laufenden Sitzung auch nach einem Wechsel zu Home oder anderen Seiten
  erhalten. Das gilt für Rücknavigation und Neuladen. Konto, Gastansicht und Demo
  haben getrennte Auswahlen. Direktlinks beginnen ihre angegebene Auswahl;
  Zurück zu einem bereits besuchten Link erhält danach gesetzte weitere Filter.
  Mitteilungsansichten behalten eine eigene temporäre Auswahl. Der bewusste
  Rücksetzweg bleibt erreichbar; gesperrter Browserspeicher blockiert die Liste nicht.
- Beim Detailbesuch bleibt die Ausgangsseite auch gezeichnet und an derselben
  Dokumentposition. Die Detailseite besitzt eine eigene bildschirmfüllende
  Scrollebene. Der Hintergrund ist dabei `inert` und für Screenreader verborgen.
  Schließen entfernt nur die Vordergrundebene; kein `display:none`-Wechsel,
  erneuter Seitenaufbau oder nachträglicher Scrollsprung. Klassische Scrollleisten
  werden beim Sperren des Hintergrunds ausgeglichen. Detailtabs und Pull-to-Refresh
  beziehen sich ausschließlich auf die aktive Scrollebene.
  Die Vordergrundfläche ist ab dem ersten Frame deckend. Nutzerkorrektur19.10.:
  Bild, Video und Kopf stehen sofort an ihrer endgültigen Position; kein
  Foto-Flug, Größenmorphing oder Verschieben der Detailseite. Nur eine dezente
  150ms-Einblendung des Inhalts von92% auf100% Deckkraft; keine leere Startphase.
  Die Ausgangsseite darf dabei nicht durchscheinen. Diese Regel ersetzt den
  früheren gemeinsamen Foto-Snapshot-Übergang.
- Videos wählen ihre Netzwerkqualität vor der ersten Medienanfrage. Gleiche
  URLs oder Änderungen anderer Detaildaten dürfen Wiedergabe nicht neu starten.
  Sichtbare Bilder haben Vorrang vor einem Vorladen des gesamten Katalogs.

- Die Seite verwendet `DashboardHeader`/`DashboardPageLayout`; es gibt keinen
  eigenen fixierten Header und keinen pauschalen mobilen Top-Abstand.
- Im gemeinsamen Header steht der Seitentitel `Boulder`; Bouldername, Grad,
  Sektor und Datum bilden direkt darunter den kompakten Inhaltskopf.
- Video/Thumbnail steht in der mobilen Lesereihenfolge vor der Segmentsteuerung;
  am Desktop liegen Medium und Inhalt zweispaltig.
- Inhaltswechsel verwendet die gemeinsame Segmentsteuerung.
- Angemeldet: `Info / Track / Beta` entsprechend vorhandener Funktion.
- Gast: nur fachlich erlaubte Bereiche, typischerweise `Info / Beta`.
- Attribute stehen für angemeldete Nutzer innerhalb der bestehenden
  Info-/Bewertung-/Kommentarfläche und nicht in einer leeren Einzelkarte.
- Ausgewählte Segmentfläche und äußerer Track haben passende Radien.
- Wechsel eines Detailsegments scrollt den Inhalt kontrolliert an den Anfang.

### 8.3 Video-Overlays und Qualitätsmenü

Das Boulder-Medium verwendet eine gemeinsame helle Overlay-Familie, damit die
Bedienelemente auf wechselnden Wandfotos lesbar bleiben:

- `Offizielle Beta`: weißes Badge mit 4-px-Radius, grünem Prüficon,
  dunkelblauer Poppins-Schrift und kleinem Badge-Schatten,
- Qualität: 36px hoher weißer Trigger mit 8-px-Radius, grünem Einstellungsicon,
  kurzer Qualitätsstufe und Chevron,
- Vollbild: `36 × 36px`, weiß, 8-px-Radius und derselbe Schatten wie der
  Qualitätstrigger,
- alle Overlays verwenden deckendes Weiß mit höchstens leichter Transparenz;
  ungültige Tailwind-Opacity-Klassen, durch die das Badge transparent wird,
  sind zu vermeiden,
- das Qualitätsmenü ist ein kompaktes Toolpanel mit 8-px-Außenradius, Titel,
  kurzem Hilfetext und 40px hohen Optionen mit 4-px-Radius; Kürzel und
  Auflösung stehen getrennt,
- die gewählte Qualität erhält eine grüne Fläche, dunkelblaue Schrift und ein
  dunkelblaues Häkchen. Kreisförmige Radioindikatoren werden in diesem eckigen Toolpanel
  nicht verwendet,
- der Browser steuert Pause und Fortsetzung beim Puffern nativ. Erst ein
  anhaltender Lade-Stillstand löst automatisch genau einen Wechsel auf die
  nächstkleinere vorhandene Qualitätsstufe aus,
- der sichtbare Ladehinweis nennt knapp `Video wird geladen …` und verwendet
  keine Prozentzahl des gesamten Videos, da diese nicht den Fortschritt bis zur
  Fortsetzung beschreibt,
- im Vollbild wird das Video vollständig mit `object-contain` gezeigt,
- bei direkten Videos gehören Badge, Qualität und Vollbild in denselben
  Fullscreen-Container. So bleiben sie im Vollbild sichtbar und werden nicht
  durch doppelte seitenlokale Controls überlagert.

### 8.3.1 Produktive Integration des normalen Mobile Players – Nutzerfreigabe 19.10.2026

- Die V2-Bedienung wird in den regulären `BoulderVideoPlayer` übernommen.
  Sie gilt unter 768px sowie auf Touchgeräten (`pointer: coarse`), auch im
  Querformat. Breite Mausgeräte behalten ihre bestehende Browsersteuerung.
  Der separat entwickelte Reels-/Videofeed bleibt ausdrücklich außen vor.
- Eigene Play/Pause-, Neustart- und 5-Sekunden-Controls, präzise Zeitleiste,
  Zeitlupe 0,25×/0,5×/0,75×/1× und Loop liegen auf demselben Medienelement.
  Auf Mobilgeräten wird das vollständige Bild auch eingebettet eingepasst.
- Ein freier Bild-Tap blendet sämtliche Player-Controls ein/aus, auch bei Pause.
  Standbild, Zeit und Geometrie bleiben erhalten. Verborgene Controls sind inert.
  Bei Wiedergabe verschwindet die Bedienung nach etwa 2,5 Sekunden; Spulen,
  offene Menüs und Tastaturfokus halten sie sichtbar. Enter/Fokus zeigt sie wieder.
- Netzwerkbasierte Startqualität, manueller Qualitätswechsel mit Position und
  Pausezustand, automatischer Stall-Fallback, erzwungene Stummschaltung,
  Monitoring und Retry bleiben die bestehende Wiedergabelogik. Zeitlupe und Loop
  überstehen Qualitätswechsel. Die Controls starten oder laden keine eigene Quelle.
- Vollbild erhält dieselbe Medieninstanz. Fehlt die native Fullscreen-API,
  wird derselbe Medienhost aus begrenzenden Vorfahren in eine Viewportansicht
  verschoben; Escape, Fokusrückgabe, Safe Areas und Scrollsperre sind vorgesehen.
- Externe YouTube-/Vimeo-Einbettungen behalten ihren eigenen Freigabe-/Playerweg.
  Veröffentlichungen folgen dem regulären PR-/CI-Weg.

### 8.4 Kommentare und Track

- Kommentarzeilen und Composer zeigen das Profilfoto in derselben 8-px-
  Avatarfläche wie der Profilknopf. Ohne Foto oder bei Ladefehler bleiben
  Namensinitialen sichtbar. Eigene Kommentare und Composer nutzen den gemeinsamen
  Profilcache; fremde Fotos werden nur zu für den Betrachter sichtbaren Kommentaren
  geladen. Moderierte/gesperrte Profile behalten den neutralen Fallback.

- Der Kommentar-Composer bildet eine kompakte Zeile aus 40px-Absenderfläche,
  ruhiger Sekundärfläche, 40px-Input und 40px-Sendenbutton.
- Input und Sendenbutton verwenden 8-px-Radien; die gemeinsame Composerfläche
  darf 12px verwenden. Der deaktivierte Sendenzustand bleibt als grüne,
  deutlich abgeschwächte Aktion erkennbar.
- Track verwendet Poppins-Abschnittstitel in `0.875rem`, semibold und
  `#192436`; kleine versale Tool-Kicker sind dort keine Abschnittsüberschrift.
- Die Seite besteht aus den kompakten Bereichen `Heute`, `Markierungen` und
  `Sessionverlauf`. Ein privater Hinweis steht als ruhige Sekundärzeile davor.
- `Heute starten` erscheint genau einmal als grüne 44px-Hauptaktion im
  Heute-Bereich. Bei vorhandenem Eintrag wird daraus die sekundäre Aktion
  `Bearbeiten`.
- `Versuch +1`, `Top` und `Flash` sind kompakte, dreispaltige 48px-Aktionen mit
  8-px-Radius; erklärende Langtexte stehen nicht in jeder Schaltfläche.
- Favorit und Projekt verwenden dieselbe 44px-Controlgeometrie und
  `aria-pressed`.
- Der Sessionverlauf hat einen normalen dunkelblauen Titel und einen separaten
  kleinen Anzahlbadge. Er wiederholt nicht die Heute-Aktion. Einträge werden
  als ruhige Liste mit Trennern gezeigt; der heutige Eintrag erhält zusätzlich
  eine grüne linke Markierung.
- Das Session-Sheet verwendet helle Flächen, Poppins-Typografie, die
  4/8/12-px-Radien und liegt im Ebenensystem oberhalb der Bottom-Navigation.

## 9. Home, Statistiken und Profil

### 9.1 Home

- Header entspricht Boulder und Statistiken.
- Persönliche Begrüßung darf groß sein; ein zusätzlicher abstrakter Claim wie
  „deine Kletterwelt“ ist zu vermeiden.
- Nutzerwahl 18.10.2026: `Deine Woche` nutzt Variante A als gemeinsame
  `WeeklyProgressCard`: große Gesamtzahl „Boulder geschafft“, kleiner Verlauf
  über die letzten sieben lokalen Kalendertage und darunter „davon als Flash“
  sowie Klettertage mit eigenen KWS-Icons. Die Karte bleibt direkt nach der
  Begrüßung und vor den Boulderbereichen. Der Zeitraum endet heute, keine
  erfundenen Ziele, Trends oder Erfolgswerte.
- Ein Boulder zählt im Zeitraum einmal. Der Verlauf ordnet ihn seinem ersten
  erfolgreichen Tag innerhalb dieses Zeitraums zu; wiederholte Tops erhöhen
  die Balken nicht. Flashes sind Teil der Gesamtzahl. Klettertage zählen auch
  Tage mit protokollierten Versuchen ohne Top. Lade-/Fehlerzustände zeigen
  keine scheinbaren Nullzahlen; leere Daten erhalten einen kurzen Hinweis.
- `Neu an der Wand` verwendet dieselbe kanonische Gridkarte wie die
  Boulderübersicht.
- Nutzerfreigabe 18.10.2026: Nach dem unveränderten Start-/Session-Ladescreen
  mit Beta-Logo lädt Home im normalen Seitenrahmen. `WeeklyProgressSkeleton`
  reserviert oben die Geometrie der Wochenkarte mit neutralen Platzhaltern für
  Gesamtzahl, sieben Tage und Metadaten. Das gilt auch, wenn nur die persönlichen
  Daten noch fehlen. Boulder-/Sessionbereiche verwenden passende Platzhalter;
  keine scheinbaren Nullwerte oder erfundene Aktivität. Reduzierte Bewegung
  deaktiviert das Pulsieren. Keine zusätzliche Mindestwartezeit für Home-Daten.
- Schraubtermine und Rückblicke bleiben kompakte, scannbare Flächen.
- Home-Terminkarten begrenzen Gridspalten mit `minmax(0,1fr)` und Gridkinder
  mit `min-w-0`. Lange Sektornamen dürfen umbrechen; Datum und Zeitbadge teilen
  eine umbruchfähige Metazeile unter dem Titel, nicht dessen knappen Restplatz.
  Karte und Nachbarsektion bleiben auch bei vergrößerter Schrift im Seitenrand.
- Wenig Text; jede Sektion beantwortet eine konkrete Nutzerfrage.

### 9.2 Statistiken

- Header und Seitenrahmen entsprechen Home/Boulder.
- Zeit- und Datengrundlagen verwenden `KwsSegmentedControl`, keinen grünen
  Unterstrich.
- Kennzahlen werden als kompakte Streifen oder ruhige Karten gezeigt.
- Diagramme erhalten klare Titel, kurze Erklärung und ausreichend Kontrast.
- Balken der Gradverteilung verwenden den 4-px-Badgeradius; Fortschrittsleisten
  nutzen höchstens `2px` und keine vollrunden Kapselenden.
- Farben sind semantisch, nicht dekorativ; Haupttext bleibt dunkelblau.

### 9.3 Profil und Unterseiten

Ungespeicherte Änderungen an Name und E-Mail werden bei interner Navigation
einschließlich Zurück mit „Änderungen verwerfen?“ geschützt. „Weiter bearbeiten“
und Escape erhalten den Entwurf; „Verwerfen“ führt zum gewählten Ziel. Beim
Neuladen/Schließen greift der Browserhinweis. Nach erfolgreichem Speichern oder
Rückkehr zu den ursprünglichen Werten erscheint keine Warnung. Automatisch
gespeicherte Profilbilder bleiben davon unabhängig.

Profil, Sidebar und Kontomenü lesen das Profilbild aus demselben kontogebundenen
Profil-Cache. Ein gespeichertes Entfernen (`avatar_url = null`) hat Vorrang vor
alten Kontometadaten. Speichern aktualisiert alle sichtbaren Avatare sofort;
eine verzögerte Metadatensynchronisierung darf kein altes Foto zurückbringen.
Auswählen/Hochladen und Entfernen des Profilbilds speichern sofort ausschließlich
das Bild. Name und E-Mail bleiben unabhängige Entwürfe bis „Speichern“; ein
Profilbild-Upload speichert sie nicht mit. Auswahlvorschau, laufender Upload,
bestätigter Erfolg und Fehler bleiben unterscheidbar. Währenddessen sind weitere
Fotoaktionen gesperrt. Erfolg benötigt eine bestätigte eigene Profilzeile.

Kontolöschung steht im bearbeitbaren Profil als eigene ruhige Fläche mit
destruktiver Aktion. Eine zugängliche Rückfrage nennt den Umfang und die
Bearbeitungsfrist (Marketing, spätestens sieben Tage). Erst eine bestätigte
Serverantwort ersetzt die Aktion durch den eingegangenen Antrag mit genauer
Frist. Fehler bleiben im geöffneten Dialog sichtbar; wiederholtes Absenden
erzeugt keinen zweiten Vorgang. Mobile Rückfragen verwenden das gemeinsame
Confirmation-Surface-Verhalten. In der Administration stehen offene Anträge
bei den Benutzern; ein Ladefehler darf nicht als leere Warteschlange erscheinen.
Nutzerkorrektur 18.10.2026: Die vollständige Warteschlange öffnet über
„Löschanträge“ als eigene Ansicht der Benutzerverwaltung, mit Rückweg zur Liste.
Die Admin-Warteschlange zeigt keinen allgemeinen Marketing-Erklärungstext;
maßgeblich sind der Vorgangsstatus und die jeweilige Frist.
Die reguläre Benutzerliste beginnt mit ihren Filtern statt einer leeren
Löschkarte. Oben im Adminbereich steht ausschließlich bei bestätigten offenen
Anträgen ein kompakter Anzahlhinweis mit direktem Link zur Warteschlange.
Die Warteschlange bleibt auch ohne Anträge über die Benutzerverwaltung erreichbar;
Laden und Fehler erscheinen dort ausdrücklich und werden nicht als Null gezählt.

- Dasselbe `ProfileMenu` muss aus Home, Boulder und Statistiken erscheinen.
- Profilübersicht, Bearbeiten, Benachrichtigungen, Sektoren und „Über die App“
  verwenden `DashboardPageLayout` und denselben Zurückbutton.
- Ein vorhandener Stift im Profil öffnet die Bearbeitung; es braucht keine
  zusätzliche redundante Menüzeile „Profil bearbeiten“.
- Einstellungsgruppen sind weiße KWS-Surfaces mit internen Trennern.
- Icons sitzen auf kleinen eckigen Sekundärflächen.
- Benachrichtigungen verwenden den gemeinsamen eckigen Switch.
- Sektorkarten zeigen sinnvolle Bereichs-/Teilbereichsinformationen und keine
  unpassenden Bergicons als Boulderanzahl.

### 9.4 Farbenverwaltung

- Die Übersicht zeigt kompakte Grifffarben: Farbvorschau, Name, vollständige
  HEX-Werte und gegebenenfalls den Status Inaktiv. Die Listenposition vermittelt
  die Reihenfolge; technische Sortierwerte stehen nur im Editor.
  Mobil/Tablet einspaltig, ab 1280px zwei kompakte Spalten in Lesereihenfolge.
- Eine primäre Aktion „Neue Farbe“; Bearbeiten öffnet denselben responsiven Editor.
  Keine dauerhaft offene Feldwand und keine funktionslosen Drag-Griffe.
- Die gesamte Farbzeile ist ein zugänglicher Bearbeiten-Button mit großer
  Farbvorschau und Chevron. Suche/Statusfilter stehen außerhalb der Liste,
  Trefferzahl und „Reihenfolge“ darunter. Keine zusätzliche äußere Card oder
  graue Zeilentrenner um die einzelnen Farbflächen (Überarbeitung 14.09.2026).
- „Reihenfolge“ öffnet einen kompakten, immer einspaltigen Sortierdialog mit
  allen Farben, unabhängig von Suche/Statusfilter. 44px-Ziehgriffe unterstützen
  Maus und Touch; Pfeilbuttons und Pfeiltasten/Pos1/Ende sind gleichwertige
  Alternativen. Nur am Griff wird Touch-Scroll gesperrt; lange Listen scrollen
  beim Ziehen am Rand automatisch. Zielposition und Positionsnummern geben Feedback.
- Sortieren bleibt bis „Speichern“ ein Entwurf. Abbrechen schützt Änderungen;
  Escape bricht zunächst eine laufende Ziehgeste ab. Speichern sperrt weitere
  Aktionen, ändert nur Sortierwerte und bestätigt erst den gelesenen Serverstand.
  Konflikte verlangen Neuladen; ein unklarer Teilstand wird nie als Erfolg gezeigt.
- Der Editor besitzt klare Einfarbig/Zweifarbig-Auswahl, gemeinsame Live-Vorschau,
  vollständig lesbare HEX-Felder und gestaltete Farbpalette. Beliebige Farbwerte
  können per HEX eingegeben werden; keine ungestalteten Betriebssystem-Farbmenüs.
- Name, Farbwerte, Reihenfolge und Aktivstatus werden gemeinsam validiert und
  explizit gespeichert. Blur löst keine Schreiboperation aus. Abbrechen/Escape
  schützen ungespeicherte Änderungen durch eine Verwerfen-Bestätigung.
- Administratoren sehen auch inaktive Farben und können sie wieder aktivieren;
  öffentliche Boulderfilter bleiben aktiv-only. Die bestehenden RLS-Schreibrechte
  bleiben unverändert.
- Standardfarben werden nur nach Bestätigung ergänzt; vorhandene Namen und
  Farbwerte werden dabei nicht überschrieben. Löschen nennt die betroffene
  Farbe, bietet Abbrechen an und bestätigt erst eine tatsächlich gelöschte Zeile.
- Laden, leerer Katalog, Such-Leerzustand, Ladefehler und Schreibfehler sind
  unterscheidbar. Bei Schreibfehlern bleiben die Eingaben erhalten.
- Mobil steht die Liste im normalen Seitenfluss. Im Editor scrollt nur der
  Inhalt; Abbrechen/Speichern bleiben erreichbar. Namen dürfen umbrechen,
  HEX-Werte und Bedienelemente werden nicht zusammengeschoben.

## 10. Zustände und Accessibility

Jede interaktive Komponente benötigt mindestens:

- Default,
- Hover, wenn ein Hovergerät vorhanden ist,
- Active/Pressed,
- `focus-visible`,
- Selected/Checked,
- Disabled,
- Loading, wenn Daten asynchron sind,
- Empty und Error, wenn fachlich möglich.

Verbindliche Regeln:

- Fokus darf keine Größe verändern.
- Maus-/Touchfokus zeigt keinen zufälligen Browserrahmen.
- Tastaturfokus bleibt sichtbar und markenkonform.
- Auswahl ist nicht nur über Farbe erkennbar: Checkmark, Invertierung, Text oder
  `aria-pressed` ergänzen die Farbe.
- Iconbuttons besitzen `aria-label`.
- Collapsibles verwenden `aria-expanded` und `aria-controls`.
- Kartentags sind per Tastatur mit `Enter` und `Space` bedienbar.
- Kontrast für normalen Text mindestens `4.5:1`.
- Loading-Skeletons verwenden dieselben Radien und Größen wie der spätere Inhalt.
- Globale Lade- und Authentifizierungsübergänge verwenden denselben ruhigen
  Vollbildstatus mit dem freigegebenen Beta-Logo auf Weiß, einer aktionsbezogenen
  Kurzmeldung und einer 96 × 2px großen unbestimmten Ladeanzeige. Keine Karte,
  kein altes KWS-Zeichen, keine hüpfenden Balken. Das vollständige Logo ist mobil
  152px und ab md 176px breit. Es blendet einmal in 180ms mit 3px Versatz ein;
  nur der kleine Ladeindikator bewegt sich anschließend. App-Start, Session-Prüfung,
  Anmeldung, Registrierung, E-Mail-Bestätigung und Abmeldung behalten eindeutige
  Texte. Die Animation verlängert den bestehenden Ladeablauf nicht.
  Native Launch-Screens zeigen das unveränderte grüne Beta-Zeichen auf Weiß.
  Android verwendet eigene Splash-Ressourcen unabhängig vom weiß-grünen Launcher;
  iOS eine mittige 288pt-Bildfläche mit 72pt-Zeichen, ohne Aspect-Fill-Zuschnitt.
  Export: `scripts/generate-beta-splash.cjs`. Am 17.10.2026 zur Veröffentlichung
  freigegeben (Web1.0.243 / Android1.0.66). iOS-Ressourcen vorbereitet;
  ein neuer TestFlight-Build ist nicht Bestandteil dieses Releases.
- Ein Ladezustand darf nicht kurz flackern: initiale Übergänge bleiben für eine
  kurze Mindestdauer stabil. `prefers-reduced-motion` reduziert alle dekorativen
  Ladeanimationen.
- Fehlermeldungen erklären knapp, was passiert ist und wie es weitergeht.

## 11. Responsive und mobile Bedienung

- Mobile zuerst entwickeln, anschließend Tablet und Desktop bewusst anpassen.
- Nutzerfreigabe 19.10.2026: Home-Abschnittsaktionen sind unter 768px mindestens
  44px hoch. Bei Auth haben „Vergessen?“ und Passwortanzeige 44px Touchfläche,
  ohne über benachbarte Felder zu ragen; Passwortfelder reservieren rechts 52px.
  Ab 768px bleiben die bisherigen kompakten Maße bestehen.
- Auf Setter-Bearbeiten, -Status und -Planung liegt die Upload-Übersicht als
  44px-Icon im vorhandenen Header, mit Anzahl und zugänglichem Status.
  Die Sammelauswahl bleibt unten vollständig erreichbar. Es gibt keinen zweiten
  schwebenden Uploadzugang. Erstellen behält seinen bestehenden gemeinsamen
  Upload-/Aktionsdock. Home-Statscard oben und Beta-Logo-Startlader bleiben erhalten.
- Mindestprüfbreiten: `375`, `768`, `1280` und `1920px`.
- Notch und Kamera werden über `env(safe-area-inset-top)` berücksichtigt.
- Bottom-Navigation berücksichtigt `env(safe-area-inset-bottom)`.
- Es darf keine pauschale zusätzliche Safe-Area-Fläche ohne Geräte-Inset geben.
- Keine verschachtelten vertikalen Scrollbereiche in mobilen Filtern.
- Horizontale Chiplisten dürfen scrollen, müssen aber durch Anschnitt oder
  Bewegung verständlich bleiben.
- Popover, Dialoge und Toolpanels dürfen den Viewport nicht verlassen.
- Drei Gridkarten bleiben mobil sichtbar; ihre Texte skalieren kompakt, ohne
  Badges zu überlappen.
- Touchgesten von Karte, horizontalen Scrollern und Route-Swipe werden sauber
  voneinander getrennt.
- Route-Swipes dürfen auf normalen Karten und Listenzeilen beginnen. Formfelder,
  Switches, Dialoge, Hallenkarte und horizontal scrollbare Bereiche bleiben
  ausgeschlossen; ein erfolgreicher Swipe darf keinen Kartenklick auslösen.
- Pull-to-Refresh beginnt ausschließlich am oberen Dokumentrand. Nach einer
  kleinen Bewegungsschwelle wird die Richtung gesperrt: horizontale Gesten
  bleiben für Route-Swipe und Scroller frei, vertikale Abwärtsgesten zeigen
  einen kompakten KWS-Status. Formfelder, Switches, Slider, Dialoge und Drawer
  starten keine Aktualisierung.
- Der Refresh-Status unterscheidet zwischen Ziehen, Loslassen und Laden. Erfolg,
  Teilerfolg und Fehler werden wahrheitsgemäß und knapp bestätigt.
- Der sichtbare Pull-to-Refresh-Status gehört zur hellen Toast-Familie: weiße
  12-px-Fläche, eckige grüne Iconfläche, dunkelblaue Schrift und eine dünne
  grüne Fortschrittslinie. Ein dunkler Banner und Prozentangaben zum gesamten
  Daten- oder Videovolumen werden dafür nicht verwendet.

### Admin-Grundbedienung (13. September 2026)

- Nutzerauftrag19.10.2026: Admin-Übersicht und Monitoring-Übersicht zeigen
  denselben kompakten Systemstatus für App, API und Videos aus der externen
  Überwachung. Mobil drei flache Zeilen, ab768px drei Spalten. Prüfzeit,
  verständlicher Zustand und tatsächlicher Alarmmodus bleiben sichtbar;
  letzte Störungen sind aufklappbar. Fehlender Abruf, alte Übertragung und alte
  Einzelprüfung werden nie als grün/Entwarnung ausgegeben. Keine erfundene
  Verfügbarkeitsquote. Die Überwachung/Alarmierung bleibt außerhalb der App;
  das Dashboard ist ausschließlich eine Admin-Leseansicht, kein Hub-Steuerzugang.

- Mobile Administration hat fünf Gruppen: Übersicht, Benutzer, Halle, Moderation
  und Mehr. Mehr öffnet Feedback, Monitoring, Protokoll und Push-Test. Die
  gemeinsame Definition liegt in `src/lib/adminNavigation.ts`; alle acht Ziele
  bleiben erreichbar. Ohne gültige Bereichsauswahl startet die Admin-Übersicht.
- Moderation ist ein eigener Adminbereich. Kommentare zur Freigabe und offene
  Inhaltsmeldungen haben getrennte, direkt verlinkbare Ansichten mit Anzahl und
  Aktualisieren-Aktion. Erläuterungen stehen in einer kompakten aufklappbaren Hilfe
  statt einer vorgeschalteten Karte. Andere Adminseiten zeigen nur bei bestätigten
  offenen Aufgaben einen kurzen Hinweis mit Direktlink; Feedback bleibt separat.
- Desktop zeigt dieselben acht Adminziele direkt in der Sidebar und einen
  Rückweg zur App. Keine zweite große Bereichs-Tab-Leiste über dem Inhalt.
- Nutzerauftrag 19.10.2026: Eine zentrale Admin-Übersicht bündelt alle Bereiche:
  Live-Zahlen mit Zustimmungshinweis, priorisierter Handlungsbedarf mit
  Direktlinks und sechs kompakte Bereichsübersichten. Aufgaben zunächst auf fünf
  begrenzen, weitere explizit öffnen. Mobil einspaltig, ab768px zwei und ab1280px
  drei Kennzahlenbereiche; keine breite Reihe großer Einzel-KPI-Karten.
  Bestände/offene Arbeit und die letzten24Stunden sind klar getrennt. Fehlende
  Quellen zeigen Nicht verfügbar statt0; eine fehlende Servererweiterung ist ein
  Einrichtungszustand. Alter Stand und fehlgeschlagener Refresh bleiben sichtbar.
  Registrierungen sind keine Downloads, Push-Annahme ist keine Zustellung und
  Fehlergruppen sind keine Nutzerzahlen. Bereichslinks öffnen die passende
  Arbeitsansicht; die Fehlerliste startet über den Direktlink mit30Tagen.
- Adminseiten beginnen mit der Bereichsauswahl (maximal 480 px) und einer
  Aktualisieren-Aktion. Darunter folgen Suche/Filter, dann Ergebniszahl und
  Sortierung, danach die Inhalte. Keine Benutzerzahl oberhalb des Switches.
  Einzelzweckseiten wie Push-Test zeigen dort Empfängerkreis und Gerätestatus.
  Monitoring-Präzisierung 18.10.2026: Das Launchcockpit bietet Übersicht,
  Fehler, Nutzung, Mitteilungen, Uploads und Aktivität. Unter 1024px wird die
  Ansicht mit einem 44px hohen Select gewählt; ab 1024px stehen alle sechs
  Ansichten in einer einzigen Zeile über der verfügbaren Inhaltsbreite. Nur
  diese längere Bereichsauswahl überschreibt die normale 480px-Begrenzung.
  Zeitraum und Filteraktion bleiben kompakt; Plattform/Version öffnen ein
  gemeinsames Filterpanel mit sichtbarer Auswahl und Rücksetzweg. Messdefinitionen
  liegen hinter einer benannten Infoaktion. Kennzahlen und Fehlerprioritäten
  sind mobil ohne lange Einleitung erreichbar; fehlende Quellen werden direkt
  vor den Zahlen erklärt. Desktop-Fehlerlisten richten Problem/Plattform, Umfang
  und Zeitpunkt nebeneinander aus. Nutzerkorrektur 19.10.2026: Fehler sind eine
  Arbeitsliste wie in professionellen Issue-Tools. Standardmäßig nur aktive
  Probleme; Behoben und Alle bleiben direkt erreichbar. Statusansichten mit
  geladenen Anzahlen, Suche, Quelle und Sortierung bilden eine kompakte Einheit.
  Zeitraum ist hier ein Select statt einer zweiten bildschirmbreiten Tableiste.
  Mobil Statusauswahl und gestapelte Zeilen, Desktop Statuskurzwege und Spalten.
  Priorität sortiert Wiederauftreten, gemeldeten Schweregrad und letzten Eingang,
  nicht unvergleichbare App-/Sentry-Zähler. Fehlende Sentry-Nutzerreferenzen
  bedeuten unbekannten Umfang statt null betroffene Geräte. Sentry-Zähler sind
  als gesamter Problemverlauf gekennzeichnet; ausgeblendete Sentry-Daten bei
  Plattform-/Versionsfilter werden mit gezieltem Rücksetzweg erklärt. Suche,
  Quelle, Status und Sortierung bleiben bei Ansichts-/Zeitraumwechsel erhalten.
  Rohmeldungen und Buildketten gehören in Details; unbekannte Auswirkungen
  werden nicht als Diagnose dargestellt. Die Ladegrenze wird erklärt und beim
  Erreichen hervorgehoben. Tagesverläufe zeigen zunächst sieben Tage mit
  explizitem Aufklappen; vollständige Werte bleiben erhalten.
  Aktivität verwendet dieselben aktuellen Launch-Signale wie Nutzung, nicht den
  abgeschalteten Altsammler. Aktuelle Vordergrundsignale stehen dort zuerst;
  Einträge älter als drei Minuten werden nicht mehr als aktiv ausgegeben.
  Nutzerauftrag 18.10.2026: Übersicht und Aktivität beginnen zusätzlich mit
  „Jetzt in der App“ und den aktuell angesehenen Bouldern. Diese Live-Zahlen
  verwenden einen getrennten kurzlebigen Status und echte serverseitige
  Änderungsmeldungen. Online zählt teilnehmende Konten einmal, Gäste pro
  Installation; Boulderzeilen zeigen Namen und aktuelle Anzahl, keine Personen.
  Hintergrund/Widerruf melden ab; fehlende Signale verfallen nach45Sekunden.
  Verbindungsaufbau, bestätigte Null, Ersatzabfrage und Fehler bleiben sichtbar
  getrennt. Zeitraumfilter beeinflussen nur Historie, Plattform/Version auch Live.
  Mobile Kennzahlen zweispaltig mit nachgeordneter Aufteilung, Desktop dreispaltig;
  Boulderlisten bleiben flach, umbrechend und direkt bedienbar.
  Nutzerpräzisierung 19.10.2026: Die kurze freiwillige Statistikabfrage benennt
  App-Starts, Boulder-/Videonutzung und Live-Zahlen ohne Namen. Gleich direkt
  erreichbare Erlauben-/Ohne-Statistik-Aktionen, Gerätebezug, Widerruf im Profil
  und unabhängige technische Fehlerberichte bleiben verständlich. Die
  Dashboard-Kennzahl heißt „Online mit Zustimmung“; direkt vor den Live-Zahlen
  in Übersicht und Aktivität steht, dass nur Nutzer mit Statistikzustimmung
  gezählt werden, nicht alle App-Nutzer. Dieser Hinweis bleibt bei Null,
  Ladezustand und Fehler sichtbar; keine erneute Abfrage allein wegen Textpflege.
  Umbrüche der Kennzahl-Beschriftungen dürfen die nebeneinanderstehenden Zahlen
  nicht vertikal gegeneinander versetzen; die Zahlbereiche richten sich unten aus.
  Monitoring trennt Übersicht, Upload-Suche und Aktivität; technische IDs und
  vollständige Fehler stehen in Details. Protokoll zeigt kompakte, aufklappbare
  Gruppen und benennt seine Suchgrenze (letzte 300 Einträge).
  Nutzerkorrektur 18.10.2026: Fehlerdetails müssen ohne Entwicklungswissen
  bedienbar sein. Reihenfolge: verständliches Problem und letzter Zeitpunkt,
  Auswirkung und belegte Einordnung, kompakter Umfang, nächste Handlung,
  Bearbeitungsstatus. Keine vermutete Ursache als bewiesene Diagnose darstellen.
  Plattformen und Versionen erscheinen lesbar statt als Buildketten. Vollständige
  Releases, Referenzen, Einzelberichte und Rohdaten liegen unter „Technische
  Details“. Ein kopierbarer Technikbericht enthält keine Konten-/Gerätekennungen
  oder ungeprüften Zusatzfelder. Ein Statuswechsel dokumentiert nur Bearbeitung;
  „Behoben“ erfordert eine von der Technik bestätigte Fixversion. Schließen und
  Speichern bleiben im festen Fuß erreichbar, dazu ein sichtbarer Schließenknopf
  im Kopf. Mobile Bottom-Sheet, Desktop begrenzter Dialog, genau ein Scrollbereich.
  Nutzerauftrag19.10.2026: Fehlerdetails zeigen zusätzlich „Wer war betroffen?“
  pro Einzelmeldung. Nur deren ursprüngliche Kontozuordnung darf Profilname und
  E-Mail aus dem bestehenden App-Profil auflösen. „Ohne Konto gemeldet“, nicht
  zugeordnet, Lade-/Abfragefehler und noch fehlende Serverunterstützung bleiben
  unterscheidbar. Sentry-Referenzen werden nicht zu App-Konten geraten. Der
  direkte Nutzerlink liest exakt dieses Konto und öffnet einen neuen Tab, damit
  ungespeicherte Fehlerbearbeitung erhalten bleibt. Ein fehlendes/gelöschtes Konto
  darf nie ein anderes Profil zeigen. Keine Identitäten in Live-Boulderlisten,
  Nutzungsstatistik oder kopierten Technikberichten.
  Push-Erfolg bedeutet nur bestätigte Annahme durch den Dienst, niemals
  bestätigte Anzeige auf dem Gerät. Gerätetokens gehören nicht in die UI.
  Wiederholte
  Abschnittstitel und erklärende Einleitungsabsätze entfallen. Benutzereinträge
  zeigen Name, E-Mail und besondere Rollen; Details werden gezielt aufgeklappt.
- Rollenänderungen und Passwort-E-Mails erfordern eine personenbezogene
  Bestätigung. Fehlgeschlagene oder unbestätigte Änderungen bleiben offen.
- Feedback und Protokoll verwenden kompakte Such-/Filterleisten mit aktiver
  Filteranzahl, eindeutigem Reset und einer mobilen Filterfläche.
- Die Hallenkarte ist eine Arbeitsfläche: Karte vor Metadaten, maximal ein
  Sektorinspektor am Desktop, mobile Sektorauswahl im Sheet. Speicheraktionen
  dürfen nicht von der App-Navigation verdeckt werden.
- Karteneinstellungen öffnen einen eigenen Formular-Dialog mit Bildvorschau,
  Dateiaktion und festen Speichern/Abbrechen-Aktionen; Name/Bild-Entwürfe erhalten
  Verwerfenschutz. Die Bereichslegende steht direkt unter der Karte. Mehrere
  physische Flächen desselben Teilbereichs werden in der Editor-Auswahl gemeinsam
  benannt und bleiben einzeln bearbeitbar. Mobile Zeichenaktionen dürfen nicht
  von einer nach oben versetzten Speicherleiste überdeckt werden.
- Hallenkarten-Werkzeuge stehen nach Sektorwahl vor der Karte. Statuswechsel
  (Gespeichert/Ungespeichert) dürfen deren Geometrie beim Ziehen nicht verschieben.
  Normales Mausrad und Einfinger-Wischen scrollen die Seite, auch über der Karte.
  Nur Ziehpunkte bzw. der ausdrücklich aktivierte Handmodus sperren Touch-Scroll.
  Vergrößern, Verkleinern und Zurücksetzen sind sichtbar; Bearbeiten verlässt den
  Navigationsmodus. Mobile Speicheraktionen heißen kurz „Speichern“.
- „Zeichenvorlage“ bezeichnet das gespeicherte Originalbild, nicht die farbige
  App-Ansicht. Beide Ansichten erhalten keine konkurrierenden Konturen; nur der
  aktive Entwurf darf als Zeichenhilfe über dem Original liegen. „Karte verwalten“
  besitzt Zahnrad plus sichtbaren Text, kein missverständliches Filtericon.
  Die interne Bezeichnung (z. B. Boulderhalle Main) ist nachrangig erklärt und
  ersetzt nicht den fachlichen Seitentitel. Umbenennen verändert weder Bildmaße
  noch Flächen und funktioniert auch bei fehlgeschlagener Bildvorschau.
- Admin-Inhalte werden genau einmal responsiv eingebunden. Ungültige Tabwerte
  fallen auf Benutzer zurück. Während der Auth-Prüfung werden keine Inhalte
  freigegeben und keine vorzeitigen Login-Weiterleitungen ausgelöst.
- Der Benutzereditor folgt dem Farbeneditor: 16/20 px Innenabstand, ein
  scrollender Formularbereich, feste Aktionen und sichtbares Schließen.
  E-Mail bleibt Kontoinformation, Passwortversand eine getrennte Kontoaktion.
- Profiländerungen werden ausdrücklich gespeichert. Ungespeicherte Eingaben
  erhalten eine Verwerfen-Bestätigung; Fehler erhalten den Entwurf. Erfolg setzt
  eine bestätigte Änderung des ausgewählten Datensatzes voraus.
- Das optionale Geburtsdatum wird im Format TT.MM.JJJJ eingegeben und als
  reines Datum ohne UTC-Verschiebung gespeichert. Ungültige oder zukünftige
  Daten werden vor dem Speichern mit zugeordnetem Feldhinweis abgewiesen.
- Monitoring unterscheidet erfolgreich leere Daten, Ladezustand, Teilfehler
  und vollständige Nichtverfügbarkeit. Fehlgeschlagene Abfragen sind niemals
  Kennzahl 0. Abfragezeit, automatische Aktualisierung und Wiederholen sind
  sichtbar; jede Abfrage hat ein Zeitlimit von 15 Sekunden.
- Das KWS-Marken-Grün und die vorhandenen 4/8/12-px-Radien bleiben unverändert.
  Die mobile Sheetform übernimmt die Geometrie der Nutzervorlage, nicht deren
  dunkle Farbpalette. Technische Backend-/Gerätetests bleiben von der lokalen
  UI-Prüfung mit isolierten Daten getrennt dokumentiert.

### Feedback-Arbeitsplatz (14. September 2026)

- Rückmeldungen und automatische Fehler sind getrennte Ansichten derselben
  hellen KWS-Oberfläche. Manuelle Rückmeldungen sind der Einstieg.
- Kompakte Zeilen liegen in einer gemeinsamen weißen Surface, nicht in einer
  Folge großer, gerahmter Karten. Eine Zeile öffnet direkt den Detaildialog;
  ein zusätzliches Aufklappen derselben Inhalte entfällt.
- Automatische Fehler werden nach Meldung/Fingerprint, betroffener Seite und
  vorhandenem Release gruppiert. Eine Gruppe ist keine bewiesene gemeinsame
  Fehlerursache. Einzelberichte und ihre Historie bleiben vollständig erhalten.
- Suche, Status, Kategorie, Priorität und Zeitraum arbeiten auf dem gesamten
  Bestand. Schlanke Indexdaten werden mit stabiler Cursor-Pagination vollständig
  geladen, Details und Screenshots erst beim Öffnen. Die Anzeige rendert zunächst
  30 Zeilen oder Gruppen und bietet weiteres Anzeigen an.
- Sortierung erfolgt auf dem vollständigen Index, niemals nur auf einer
  abgeschnittenen API-Seite. Gesamtzahlen, Treffer und Gruppenzahlen sind getrennt;
  unbekannte oder fehlgeschlagene Zählungen erscheinen nicht als 0.
- Sammelauswahl benennt ihren Umfang: sichtbare Einträge bzw. alle Meldungen der
  sichtbaren Gruppen. Ansichts-/Filterwechsel setzen die Auswahl zurück.
- Statuswechsel und Löschen der Auswahl erfordern eine Bestätigung mit Anzahl.
  Nur bestätigte IDs zählen als Erfolg; Teilfehler laden den Bestand neu und
  behalten ausschließlich unbestätigte IDs für einen erneuten Versuch.
- Bearbeitung ist ein Entwurf mit Speichern/Abbrechen, Versionsprüfung,
  Pending-Sperre und Verwerfenschutz. Dialoge geben Tastaturfokus an den Auslöser
  zurück; technische Informationen sind nachgeordnet und einklappbar.
- Marken-Grün, dunkelblaue Beschriftung, 4/8/12-px-Radien und mobile randbündige
  Bottom-Sheets mit festen Aktionen bleiben unverändert.

## 12. Technische Quelle und Wiederverwendung

### Sektorhierarchie und Kartenquelle

- Admin und App verwenden `resolveSectorArea`: Bug, Couch-Ecke, Top-Out,
  Lange Platte und Grotte sowie neue strukturierte Haupt-/Teilbereiche. Die Verwaltung erhält alle physischen IDs;
  Die bisherige Zusammenfassung von Atta-Höhle und Felsenmeer als Bug A ist
  durch die Nutzerkorrektur in Abschnitt 7.4 fachlich überholt und wird in der
  gemeinsamen App-Auflösung getrennt. Alte Namen dienen nur
  der eindeutigen Detailbearbeitung, nicht als parallele Bereichsstruktur.
- Die Sektorverwaltung übernimmt die aufklappbaren Hauptbereiche der Boulderansicht.
  Darunter steht genau eine Karte pro logischem Teilbereich, dieselben Einträge
  wie auf der Hallenkarte. Der bekannte Bestand enthält nach Trennung der Kurzen
  Platte 19 physische und 19 logische Einträge. Bug A erscheint genau einmal.
  Keine äußere Card um die Liste.
  Die 19 physischen Datensätze mit alten Namen erscheinen erst im Detaildialog.
  Dort werden einzelne Flächen bearbeitet oder nach Bestätigung gelöscht.
  Die Übersicht bietet QR-Codes für den gesamten Teilbereich. Bestehende alte QR-Links
  bleiben kompatibel. Eine Suche nach einem alten Namen erhält sämtliche Mitglieder
  des passenden Teilbereichs, einschließlich ihrer gemeinsamen Boulderzahl.
  Boulderzahlen werden über Primär- und Sekundärzuordnungen dedupliziert und über
  alle REST-Seiten geladen. Bei fehlenden Referenzen wird kein ungesicherter Summenwert angezeigt.
- Hauptbereiche werden unabhängig von vorhandenen Sektoren geladen; auch leere
  Bereiche bleiben sichtbar und auswählbar. „Hauptbereich“ legt einen Bereich an.
  „Teilbereich“ am Gruppenkopf öffnet einen neuen Sektor mit vorausgewähltem Bereich.
  „Fläche ergänzen“ im Detaildialog übernimmt zusätzlich dessen Kürzel.
- Ein Teilbereich ist das Paar `area_id` + `subarea_code`, kein separater Datensatz.
  Im Sektorformular kann ein vorhandener Teilbereich gewählt oder ein neues Kürzel
  vergeben werden. Der neue Teilbereich entsteht erst mit dem ersten gespeicherten
  Sektor. Hauptbereichsanlage aus dem Formular erhält den Sektorentwurf.
- Neue Hauptbereiche werden erst nach bestätigtem Rücklesen angezeigt. Eine
  stabile Anfrage-ID verhindert doppelte Anlage beim Wiederholen nach Antwortverlust.
- Der Editor startet wie die App mit farbigen Flächen und lesbaren Teilbereichs-Tags.
  Das gespeicherte Bild ist als Zeichenhilfe einblendbar. Quelle und Maße kommen
  gemeinsam über `resolveHallMapSource` aus `hall_maps`. Einzige geprüfte
  Altlast-Ausnahme: der ursprüngliche KWS-Verweis auf `hall-map-base.svg`
  wird auf `boulderkarte-original.png` abgebildet, zu der die gespeicherten
  Flächen gehören (Quellenabgleich und Nutzerfreigabe 14.09.2026). Dabei bleiben
  gespeicherte Arbeitsmaße und Punktkoordinaten erhalten. Die Ausnahme gilt
  ausschließlich für diesen konkreten Verweis, nicht pauschal für SVGs oder
  andere Kartenuploads. Dialog, Editor und App teilen dieselbe Auflösung.
- Statische Flächenvorschläge gelten ausschließlich für ihr ursprüngliches
  Kartenbild. Ein Bildwechsel darf keine Koordinaten oder Sektor-IDs umschreiben.
- Ohne Hierarchieschema bleibt die vorhandene Namenszuordnung geschützt;
  Bereichsänderungen setzen die Datenbankmigration voraus. Das UI darf keine
  erfolgreiche Migration oder Zuordnungsänderung vortäuschen.

Zentrale Foundations:

- `src/index.css` – Farben, Safe Areas, Schatten und globale Grundlagen,
- `tailwind.config.ts` – Font-, Farb-, Schatten- und Radiustokens,
- `src/lib/sectorAreas.ts` – ursprüngliche und neue Bereiche, Teilbereichszuordnung und Kartenpaletten.

Gemeinsame Komponenten und Logiken:

- `src/components/DashboardPageLayout.tsx`,
- `src/components/DashboardHeader.tsx`,
- `src/components/ProfileMenu.tsx`,
- `src/components/ui/kws-surface.tsx`,
- `src/components/ui/kws-segmented-control.tsx`,
- `src/components/ui/kws-metric-strip.tsx`,
- `src/components/ui/switch.tsx`,
- `src/components/boulder/DifficultyBadge.tsx`,
- `src/components/HallMapView.tsx`,
- `src/hooks/useHorizontalRouteSwipe.ts`.

Regeln für Implementierungen:

- Vor einer neuen Komponente prüfen, ob dieselbe Funktion bereits gemeinsam
  existiert.
- Eine Korrektur an einer wiederkehrenden Komponente möglichst zentral
  implementieren.
- Neue Arbeit verwendet `rounded-kws-*`; generische alte Radiusklassen werden
  nicht kopiert.
- Neue wiederkehrende Farben und Schatten werden als Token oder gemeinsame
  Klasse ergänzt.
- Gast- und Login-Varianten teilen Komponenten, solange nur Berechtigungen und
  Inhalte abweichen.
- Seitenlokale Sonderklassen sind kein Ersatz für ein gemeinsames Pattern.

Bekannte Migrationshinweise:

- Gemeinsame Inputs, Buttons, Badges, Tabs, Selects und Dialoge sowie die aktiven
  Setter-/Adminflächen sind auf die KWS-Tokens migriert. Formularfelder behalten
  notwendige Konturen; Inhaltskarten nutzen `kwsSurfaceClassName`/`shadow-soft`.
- Historische, nicht eingebundene Screens und einzelne nicht-kompakte
  Hallenkartenvarianten können weiterhin ältere Rundungen enthalten.
- Alte `rounded-xl/2xl/full` kommen noch vor; wiederkehrende direkte Markenfarben
  wurden am 16.10.2026 durch zentrale `brand-*`-Utilities ersetzt.
- Diese Altstellen werden beim nächsten fachlichen Anfassen gegen diese Datei
  geprüft; sie sind keine Vorlage für neue Screens.

## 13. Visuelle QA: zwei verbindliche Loops

Vor Abschluss einer sichtbaren Änderung werden zwei getrennte visuelle Loops
auf der tatsächlich gerenderten App durchgeführt.

### Loop 1 – Hierarchie und Layout

- Headerposition und Safe Area,
- Seitenränder und Abstände,
- Typohierarchie und einheitliche Schriftfarben,
- Radien, Schatten und Konturen,
- Bildausschnitte, Badges und Überlappungen,
- Mobile, Tablet und Desktop.

### Loop 2 – Verhalten und Zustände

- Öffnen/Schließen von Panels, Menüs und Dialogen,
- aktiv/inaktiv, Hover, Pressed und Tastaturfokus,
- Multi-Select, Reset, Sortierung, Gruppierung und Collapse,
- leere, geladene und fehlerhafte Zustände,
- Swipe, Scroll, Karte, Safe Areas und Viewportgrenzen,
- Browserkonsole sowie relevante technische Tests.

Screenshots werden nach Möglichkeit mindestens bei `375`, `768`, `1280` und
`1920px` geprüft. Eine visuelle Änderung ist nicht allein durch erfolgreichen
TypeScript- oder Build-Output verifiziert.

## 14. Definition of Done für neue UI-Arbeit

Eine UI-Aufgabe ist erst abgeschlossen, wenn:

- diese Datei vor der Änderung vollständig gelesen wurde,
- vorhandene gemeinsame Komponenten wiederverwendet wurden,
- Farben, Typografie und 4/8/12-px-Radien eingehalten sind,
- Header, Safe Area und Navigation zur restlichen App passen,
- Gast- und Login-Parität geprüft wurde, sofern betroffen,
- alle relevanten Zustände gestaltet und zugänglich sind,
- beide visuellen QA-Loops abgeschlossen sind,
- Mobile, Tablet und Desktop geprüft wurden,
- keine neuen ungeklärten Magic Values oder Pill-Komponenten entstanden sind,
- eine neue bestätigte Designregel in dieser Datei dokumentiert wurde.

## 15. Setter-Arbeitsbereiche

Die gemeinsamen Grundlagen gelten auch für Erstellen, Bearbeiten, Status und
Planung. Alle vier Seiten nutzen den gemeinsamen Seitenrahmen und auf dem Desktop
dieselben direkten Ziele wie die mobile Setter-Navigation.

- Werkzeugleiste vor Ergebniszahlen; keine zusätzliche Hero-/KPI-Ebene.
- Bearbeiten und Status als flache, nach Sektor gruppierte Listen. Auf schmalen
  Displays darf ein Statusbutton nicht den Boulder-Namen auf einzelne Buchstaben
  zusammendrücken: die Aktion erhält eine eigene Rasterzeile.
- Der Upload-Stapel zeigt reale Verarbeitungsphasen statt pauschal „bereit“.
  Solange der Stapel läuft, sind seine Entwürfe nicht bearbeitbar oder entfernbar.
  „Übertragen“ ist keine zusätzliche Zusicherung über die serverseitige Veröffentlichung.
- Boulder- und Terminformulare verwenden den gemeinsamen mobilen Bottom-Sheet-
  Standard: fixer Kopf/Fuß, genau ein innerer Scrollbereich. Karten und zusätzliche
  Angaben werden bei Bedarf aufgeklappt.
- Farben haben sichtbare Farbmuster plus Text; Schwierigkeiten bleiben mittig.
  Ein Farbwechsel darf einen eigenen Boulder-Namen nicht überschreiben.
- Eine Filteränderung verwirft die vorherige Mehrfachauswahl. Status-/Löschaktionen
  bestätigen den konkreten Umfang, Fehler behalten Entwurf bzw. Rest-Auswahl.
- Terminplanung zählt logische Teilbereiche, speichert aber weiterhin alle
  zugehörigen physischen Sektor-IDs. Der Kalender liegt über dem Formular, nicht
  hinter dessen Overlay.

Prüfbelege: `test-results/setter-workspace-20260914/QA.md` und
`e2e/setter-workspace.spec.ts`.

### 15.1 FAB und kompakte Filter (2026-09-15)

- „Boulder hinzufügen“ ist ein 56px-FAB mit 12px-Radius; mobil Plus-Icon mit
  zugänglichem Namen, auf Desktop zusätzlich Text. Er sitzt rechts über der
  Navigation/Safe Area. Bei einem Stapel stehen FAB und Upload-Leiste in einer
  gemeinsamen festen Aktionszone, ohne einander zu überdecken. Die Liste
  reserviert Platz dafür. Upload-Sperren gelten weiterhin auch für den FAB.
- Die globale Upload-Übersicht gehört auf „Erstellen“ in dieselbe Aktionszone:
  links die sekundäre Upload-Übersicht, rechts der primäre FAB, mindestens 12px
  Abstand. Beide stehen im Layoutfluss über einer gegebenenfalls vorhandenen
  Stapelleiste. Es gibt dort keinen zweiten frei positionierten Upload-Button.
  Auf anderen Setterseiten bleibt die globale Übersicht erreichbar. Regressionen
  prüfen den echten globalen Trigger samt Seiten-FAB, aktive/fehlerhafte Uploads
  und einen gefüllten Stapel, nicht nur isolierte Seitenkomponenten.
- Bearbeiten: Suche und kompakter Filterbutton in einer Zeile, Auswahlen als
  entfernbare Chips. Sektoren, Farben und Grade sind Mehrfachfilter; innerhalb
  einer Kategorie gilt ODER, zwischen Kategorien UND. Zweitfarbe und zweiter
  Sektor zählen mit. Jeder Wechsel setzt Sammelauswahl und 50er-Seitengrenze zurück.
- Status: dieselbe Sektorauswahl im Sheet, bewusst ein Sektor wie bei der Karte;
  Status-Schnellwahl bleibt direkt neben der Ergebnisliste zugänglich.
- Keine neuen Dropdown-Stapel, keine zusätzlichen Card-in-Card-Flächen und keine
  Änderung der Markenfarben für diese Überarbeitung.

Prüfbelege: `test-results/boulder-filters-20260914/QA.md`,
`e2e/boulder-filter-refresh.spec.ts`.

### 15.2 Planungskalender und Statusgruppen (2026-09-15)

- Planung startet mit einer Monatsübersicht; die bisherige Terminliste bleibt
  über „Kalender / Liste“ erreichbar. Deutsch, Wochenstart Montag, Monatswechsel
  und „Heute“; Tagesnavigation per Pfeiltasten, Öffnen per Enter/Leertaste.
- Tage zeigen Terminanzahl bzw. Teilbereichsnamen; ein Klick auf einen freien
  heutigen/zukünftigen Tag öffnet die Anlage mit vorbelegtem Datum. Belegte Tage
  zeigen alle Termine in der Tagesplanung mit einer Aktion für weitere Termine.
  Vergangene Tage bleiben lesbar, erlauben aber keine rückwirkende Anlage.
- Mobil steht die Tagesplanung unter dem Kalender, auf breiten Displays daneben.
  Datumsschlüssel sind lokale Kalendertage, keine abgeschnittenen UTC-Zeitstempel.
  Gleichzeitige physische Flächen desselben Teilbereichs zählen als ein Termin.
- Ein unveränderter vorbelegter Dialog lässt sich sofort abbrechen. Änderungen
  haben Verwerfenschutz; zukünftige Zeitpunkte, bestätigtes Speichern und
  explizite Löschbestätigung bleiben verbindlich. Erfolg aktualisiert den gewählten Tag.
- Statusgruppen lassen sich einzeln sowie gemeinsam ein-/ausklappen. Der Kopf
  zeigt Anzahl, Chevron, `aria-expanded` und bei Auswahl deren Umfang.
  Einklappen verändert keine Daten und keine Auswahl. Eine Auswahl in geschlossenen
  Gruppen wird ausdrücklich angezeigt; Filterwechsel setzt Auswahl und Collapse zurück.

Prüfbelege: `test-results/setter-calendar-20260915/QA.md`,
`e2e/setter-calendar.spec.ts` und `e2e/setter-workspace.spec.ts`.

### 15.3 Sitzungswiederherstellung und verlässliche Zähler (2026-09-15)

- Eine abgelaufene Sitzung darf offene Editoren nicht durch einen seitenweiten
  Ladezustand ersetzen. Eine erforderliche erneute Anmeldung liegt als gesperrter
  Dialog darüber und gilt nur für dasselbe Konto. Das Passwort erhält den Fokus.
  Entwürfe bleiben im aktuellen Fenster erhalten; Neuladen wird nicht zugesichert.
  Explizites Abmelden benennt das Verwerfen der Entwürfe.
- Token-Erneuerung bündelt parallele Anfragen. Nur lesende REST-Anfragen dürfen
  bei eindeutig abgelaufenem Token einmal wiederholt werden. Schreibaktionen,
  RPCs und Uploads werden dadurch nicht automatisch wiederholt.
- „Lädt“, „Fehler“, „leer“ und „geladen“ sind getrennte Zustände: Bei unbekanntem
  Bestand keine Null-Zähler, alten Schnellfilterzahlen oder Nachlade-Aktionen.
  Eine gültige leere Antwort darf „0 Boulder“ zeigen. Suche und Auswahlzustand
  bleiben bei vorübergehenden Lesefehlern erhalten; Sammelaktionen sind gesperrt.
- Ein erneuter Ladeversuch zeigt „Wird geladen …“ und sperrt den Retry-Button.
  Einzahl und Mehrzahl werden korrekt angezeigt: „1 Sektor“, „1 Teilbereich“.

Prüfbelege: `docs/qa/2026-09-15-session-recovery.md`,
`test/sessionRecovery.test.mjs`, `e2e/session-recovery.spec.ts` und
`e2e/setter-desktop-audit.spec.ts`.

### 15.4 Upload-Wiederherstellung (2026-09-15)

- „Aktiv“, „Datei benötigt“, „Server-Verarbeitung“ und „Status prüfen“ sind
  unterschiedliche Zustände. Alte Fortschrittswerte dürfen nicht als aktuelle
  Übertragung oder pauschal als wartende Uploads erscheinen.
- Wiederherstellung liest nur die Protokolle des angemeldeten Kontos und gleicht
  sie mit dem Boulder ab. Eine veröffentlichte URL allein oder 100 % genügt nicht:
  Nur `ready` mit passender Upload-Sitzung und URL schließt den Eintrag aus.
- Unklare Zuordnungen und Server-Verarbeitung erlauben keine Dateiauswahl zum
  erneuten Upload. Ein erneuter lesender Statusabgleich ist sichtbar erreichbar.
- Die Übersicht verwendet den gemeinsamen Bottom-Sheet-/Desktop-Dialog, feste
  Kopf-/Fußbereiche und genau einen scrollenden Inhalt. Alte Einträge zeigen
  ihr Datum, erhalten vorhandene Fehlertexte und zeigen keinen Prozentbalken.
- Fehler beim Abgleich sind nicht „Keine offenen Uploads“. Laufende lokale
  Dateiobjekte bleiben bei einem Abgleich erhalten.

Prüfbelege: `docs/qa/2026-09-15-upload-reconciliation.md`,
`test/uploadRecovery.test.mjs`, `e2e/upload-recovery.spec.ts`.

### 15.5 Persönlicher Fortschritt, Sammlungen und Fehleransichten (2026-09-15)

- Statistiken trennen „Fortschritt“ und „Meine Boulder“. Zeiträume heißen
  „7 Tage“, „30 Tage“, „Gesamt“. Wandstatus ist nur ein Sammlungsfilter.
- Tops sind einzigartige geschaffte Boulder im Zeitraum, einschließlich Flashes.
  Klettertage zählen lokale Datumswerte einmal, nicht jeden Boulder als Session.
  Höchster Top berücksichtigt nur Erfolge mit bekanntem Grad. Gespeicherte
  Boulder und Projektmarkierungen allein sind keine Aktivität.
- Gesamt enthält auch alte Tops ohne Tagesprotokoll und abgeschraubte Boulder.
  Historische Datierung wird nicht aus dem Änderungsdatum einer Markierung erfunden.
  Die Gradverteilung bleibt als Vergleich sichtbar; ein angeklickter Grad filtert
  die Kennzahlen und Tagesdetails. Ältere Tage werden schrittweise eingeblendet.
- Projekte sind offene Ziele; Erledigte lassen sich zusätzlich einblenden.
  Gespeichert ist eine unabhängige Merkliste. Einträge sind suchbar und nach
  Wandstatus filterbar. Entfernen ändert ausschließlich die jeweilige Markierung;
  Notizen, Versuche und Erfolge bleiben unverändert.
- Persönliche Daten werden vollständig und kontogebunden paginiert. Ladefehler
  sind keine Nullwerte. Home-Karten verwenden vollständige transformierte
  Boulder mit Sektor-/Bilddaten; fehlende Zuordnungen dürfen nicht abstürzen.
- 404 und Ansichtsfehler erhalten deutsche Rückwege im KWS-Stil. Kein
  zeitgesteuerter Reset. Fehlerbeschreibungen bleiben bei unbestätigtem Versand
  und beim Schließen des Dialogs erhalten. Erfolg setzt bestätigte Übertragung voraus.

Prüfbelege: `docs/qa/2026-09-15-personal-progress-design.md`,
`test/personalProgress.test.mjs`, `e2e/personal-workspace.spec.ts`.

### 15.6 Benachrichtigungen (2026-09-15)

- Meldungen unterstützen horizontales Wischen: rechts gelesen/ungelesen,
  links entfernen. Entfernen blendet reversibel aus; es löscht keinen Datensatz.
  Eine bestätigte Aktion bietet „Rückgängig“ im festen Panel-Fuß. Dieselben
  Aktionen sind per beschrifteten Iconbuttons und Tastatur erreichbar.
  Vertikales Scrollen, Pinch-Zoom und abgebrochene Gesten schreiben nichts;
  Buttons starten keine Wischgeste. Unter etwa 88px springt die Meldung zurück.
  Reduced Motion entfällt beim Zurückgleiten. Verborgene Meldungen zählen nicht
  zum Ungelesen-Zähler. Wiederherstellen erzeugt keinen neuen Push.

- Ein gemeinsamer Posteingang: mobil randbündiges Bottom-Sheet, Desktop als
  kompaktes Hover-/Klick-Popover. Hover übernimmt keinen Fokus; Klick/Interaktion
  hält die Ansicht offen. Ein Scrollbereich, feste Kopf- und Fußaktionen.
- „Alle / Ungelesen“, Themen und Nachladen arbeiten auf dem gesamten Bestand,
  nicht nur einer lokalen Vorschau. Texte bleiben vollständig. Tage gruppieren
  Meldungen; Typ-Icons und der Ungelesen-Punkt ergänzen Text statt ihn zu ersetzen.
- Öffnen der Glocke markiert nichts. „Als gelesen“, „Ansehen“ und Sammelaktionen
  benötigen eine bestätigte Änderung. Fehlgeschlagene Änderungen bleiben sichtbar.
  Der Sammelvorgang schließt später eintreffende Meldungen aus.
- Lade-, Fehler- und Leerzustände sind getrennt. Ein unbekannter Zähler ist keine
  Null. Ältere Seiten bleiben nach einem Nachladefehler erhalten und sind wiederholbar.
- Einstellungen unterscheiden Kontopräferenzen, Geräteberechtigung und Registrierung.
  Fehlende Präferenzen brauchen eine ausdrückliche Einrichtung, keine scheinbar
  gespeicherten Standard-Schalter. „Mitteilungen empfangen“ pausiert neue In-App-
  Meldungen und Push; vorhandene Meldungen und die Themenauswahl bleiben erhalten.
- Browser-Push bleibt deaktiviert. Die native Anmeldung gilt erst nach Geräteevent
  und bestätigter Speicherung als erfolgreich. Registrierung ist kein Zustellnachweis.
  Empfang aktualisiert nur den Posteingang und löst keinen zweiten Push aus.
- Für die erste öffentliche iPhone-Version bleiben Mitteilungen innerhalb der
  App aktiv. iPhone-Push folgt nach Einrichtung und Gerätetest der APNs-Anbindung;
  bis dahin gibt es keinen Push-Schalter und keinen Registrierungsversuch auf iOS.
  Die Einstellungen benennen diese Einschränkung ausdrücklich. Android bleibt
  unabhängig davon verfügbar; eine Registrierung ist weiterhin kein Zustellnachweis.
- Native Aktionen und In-App-Links verwenden validierte interne Ziele. Queries und
  Änderungen sind kontogebunden. Markengrün, gemeinsame Controls und Radien bleiben.
- Sektornamen in Mitteilungen entsprechen der öffentlichen App-Hierarchie,
  einschließlich Teilbereich (etwa „Bug D“, „Couch-Ecke B“). Technische Altnamen
  dienen nur der Auflösung. Bereits vorhandene Posteingangstexte dürfen beim
  Korrigieren der Zuordnung aktualisiert werden, ohne sie erneut zu versenden
  oder ihren Gelesen-Status zu ändern.
- „Ansehen“, Echtzeit-Toasts und Push öffnen bei neuen Bouldern die Auswahl der
  jeweiligen Mitteilung. Ein oder mehrere betroffene Bereiche sind aufgeklappt;
  andere neue Boulder gehören nicht ungefragt zur Auswahl. Die Auswahl bleibt
  beim Detailbesuch und Rückweg erhalten und ist über „Aus Mitteilung“ entfernbar.
  Alte Mitteilungen behalten ihre konkreten Boulder auch nach sieben Tagen.
  Nicht mehr verfügbare Zuordnungen zeigen Fehler/Leerzustand mit Rückweg zum
  gesamten Bestand. Große Sammlungen verwenden eine kurze kontogebundene
  Mitteilungsreferenz statt langer URLs oder vollständiger ID-Listen im Push.

Prüfbelege: `docs/qa/2026-09-15-notifications.md`, `e2e/notifications.spec.ts`,
`test/notifications.test.mjs`, `test/pushRegistration.test.mjs`.

### Nutzerpräzisierung 14.10.2026: Mobilität und Kartenbedienung

Die Hauptbereiche heißen Kraft, Bouldern, Mobilität und Kinder. Mobilität bietet allgemeines Bewegen und Dehnen als freiwillige Ergänzung, mit den Filtern Alle / Bewegen / Dehnen. Beschwerden sind ein nachgeordneter Zugang für Orientierung; alte Reha-Links bleiben gültig. Dehnen wird nicht als Pflicht nach jedem Krafttraining dargestellt.

Bibliothekskarten öffnen ihre Anleitung über die gesamte Fläche durch einen nativen Link. Merken und Hinzufügen sind unabhängig bedienbare Geschwister-Buttons, keine verschachtelten Link-Inhalte. Touchziele mindestens44px; Tastaturfokus weiter sichtbar. Kartenbilder bleiben Rasterillustrationen; Körpersymbole nur dort, wo sie eine Region benennen. Schulter, Hand, Ellbogen und Knie verwenden die gemeinsame Region-Komponente. Explizite Grid-Spalten und umbrechende Titel verhindern abgeschnittene Tasten bei375px. Alltagssprache gilt auch für aufklappbare Begründungen: z.B. Hände auf einer Bank machen Liegestütze leichter.

Korrektur der Körpersymbole 14.10.2026: Ellenbogen und Knie brauchen eine erkennbare vollständige Arm- bzw. Beinsilhouette mit Hand bzw. Fuß und einem markierten Gelenk. Zwei abstrakte Winkellinien genügen nicht. Konturstärke wird auf die gemeinsame Icongröße normalisiert; keine abweichenden Farben oder größeren Iconflächen. Immer in tatsächlicher Kartengröße prüfen, nicht nur vergrößert.


### Nutzerkorrektur14.10.2026: Rastergrafiken und nutzbare Übungsdetails

Für Körperregionen werden generierte Rastergrafiken mit KWS-grüner Markierung verwendet. Die zuvor formulierte SVG-Silhouettenregel wird damit ersetzt. Eigene anatomische SVG-Pfade entfallen; auch kleine Themenreiter erhalten keine dekorativen Miniatur-SVGs. Funktionssymbole für Navigation/Merken/Hinzufügen bleiben gemeinsame Appcontrols. Die Bitmapfarbe wird nicht über currentColor abgedunkelt. Originale, Bildprompts und Sichtprüfung müssen nachvollziehbar bleiben.

Übungsdetails folgen der Reihenfolge kurzer Titel/Zweck → Bewegungsbild → Anleitung. Anleitung, Umfang und Varianten sind getrennte Textreiter. Die Anleitung zeigt kurze nummerierte Handlungen, optional einen Schritt mit Zurück/Weiter. Vorbereitung und Zusatzhinweise werden gezielt geöffnet; Stopgrenzen bleiben sichtbar. Zahlen für Blöcke/Sätze, Wiederholungen/Versuche/Haltephasen und Pause bleiben bei ihrem korrekten Seiten-/Zeitbezug. Ein zentraler Add-Einstieg behält Entwurf, Ersetzen und Rückwege; Quellen am Ende aufklappbar. Kinder verwenden Spielablauf/Aufbau/Varianten und sichtbar umschaltbare Kita-/Schulideen. Beschwerden und Fingerboard bleiben Orientierung ohne Add/Dosis. Mobil einspaltig, ab ausreichender Desktopbreite Bild neben Inhalt.

Materialangaben müssen wirklich benötigte Geräte nennen, z.B. Bank beim erhöhten Liegestütz. Bildbeschriftungen behaupten keine einzelne Position, wenn ein Vergleich dargestellt ist. Ein aus der Suche erkanntes und als aktiv dargestelltes Thema muss die Ergebnisse auch tatsächlich einschränken. Konzept/Referenzableitung: docs/design/training-exercise-detail-concept.md.

### Nutzerpräzisierung14.10.2026: Trainingshilfe und kurze Einführung

Wiederkehrende Bedienerklärungen stehen im Training oben hinter einem funktionalen Info-Icon. Es ersetzt die bisherige Textaktion „Vorschau“. Auf Übungsseiten stehen dort zuerst die Hinweise zur jeweiligen Übung, einschließlich Betreuung, Ausführung und Grenzen; danach aufklappbare Bedienhilfe, Hintergrund/Quellen und Speicherung. Das ersetzt die zuvor beschriebene Darstellung von Hinweisen und Quellen am Seitenende. Bild, kurze Aufgabe, Anleitung, Vorbereitung, Umfang und Varianten bleiben direkt nutzbarer Übungsinhalt. Aktuelle Fehler und Speicherprobleme beim Bearbeiten bleiben sichtbar; kein Fehler wird nur in der Hilfe gemeldet.

Beim ersten Besuch einer aktivierten Trainingsroute erklärt eine überspringbare Einführung in zwei Schritten „Zur Einheit hinzufügen“ → Entwurf → „Einheit öffnen“ → Anpassen/Speichern. Sie erscheint auch bei direkten Bibliotheks- oder Übungslinks. Abschluss oder Schließen merkt sich die App pro Konto auf diesem Gerät, getrennt von Trainingsdaten. Ein Datenreset wiederholt die Einführung nicht. „Einführung erneut ansehen“ bleibt im Infofenster erreichbar. Kinder und Beschwerdeorientierung werden als getrennte, merkbare Inhalte erklärt. Bei ausgeblendetem Training erscheint keine Einführung.

Die Einführung verwendet die gemeinsamen Dialogcontrols: mobil randbündig, aber mit `data-compact="true"` nur so hoch wie der Inhalt; Desktop zentriert und kompakt. Lange Infofenster scrollen innen bei festem Kopf. Tastaturfokus startet am Titel und kehrt beim Schließen zur Infoaktion zurück. Sichtbarer Tastaturfokus und mindestens44px große Bedienelemente bleiben erhalten. Keine neue Illustration oder eigenes Dekorationsicon für die Bedienhilfe.

Prüfbeleg: `docs/qa/2026-10-14-training-help-onboarding.md`.

### Nutzerkorrektur14.10.2026: Einführung am echten Bedienelement

Die Einführung ist eine Tour mit hervorgehobenen echten Bedienelementen und kurzen, daran verankerten Hinweisen. Die zuvor beschriebene Einführung als Bottom-Sheet oder kompakter Dialog wird ersetzt. Die dauerhafte Infohilfe bleibt ein normaler Dialog.

Die Tour stellt nur vorhandene Controls der aktuellen Ansicht vor: Bereiche/Einheiten/Plan-Assistent auf der Startseite; Suche/Filter/Hinzufügen/Merken in der Bibliothek; Anleitung/Umfang/Varianten auf Übungsseiten. Kinder- und Orientierungsansichten bekommen keine Erklärung für eine dort nicht vorhandene Hinzufügen-Taste. Der obere Infozugang ist der Abschluss. Bestehende Auswahl-, Ergänzungs- und Ersatzsituationen erhalten passende Texte. Keine Beispieltasten oder automatisch vorgenommenen Datenänderungen.

Der Hintergrund wird zurückgenommen, das echte Element bleibt sichtbar mit grüner Kontur. Der kleine Hinweis liegt daneben bzw. ober- oder unterhalb, zeigt mit einem Pfeil auf das Element und bleibt vollständig im Viewport. Scrollen, Größenwechsel und Layoutänderungen aktualisieren den Anker; auf kurzen Displays wird bei Bedarf Platz durch Scrollen geschaffen. Weiter/Zurück, Überspringen/X/Escape und Fokusrückgabe sind vorhanden. Nach Abschluss kehrt die Seite an ihre Ausgangsposition zurück. Einmaligkeit je Konto/Gerät und Wiederholung über das „i“ bleiben erhalten.

Prüfbeleg: `docs/qa/2026-10-14-training-coachmark-tour.md`.

### Nutzerpräzisierung14.10.2026: Einheiten benennen und mehrfach einplanen

Gespeicherte Einheiten lassen sich über den Stift neben dem Namen umbenennen. Der Name wird mit Speichern bestätigt; Abbrechen lässt ihn unverändert. Leere Namen werden verhindert, Rand-Leerzeichen entfernt und Namen auf80Zeichen begrenzt. Auch lange Wörter umbrechen in Sammlung, Wochenplan, Startseite und Infohilfe.

Beim optionalen Einplanen eigener Einheiten sind mehrere freie Wochentage gleichzeitig auswählbar. Bereits eingeplante Tage bleiben sichtbar; weitere freie Tage können später ergänzt werden. Belegte Tage und feste Termine werden nicht überschrieben. Je ausgewähltem Tag entsteht ein eigener Termineintrag mit eigener ID; alle verweisen auf dieselbe gespeicherte Einheit. Änderungen an deren Namen und Übungen gelten für diese Einheit an allen geplanten Tagen; abgeschlossene Verlaufssnapshots bleiben unverändert.

Abschließen und Rückgängig gelten für einen konkreten Termin. Aus dem Wochenplan geöffnete Einheiten behalten den Termineintrag im Link. Beim Öffnen über die Sammlung wird bei mehreren Terminen zuerst der Trainingstag gewählt; keine stillschweigende Zuordnung zum ersten Termin. Ungültige Terminlinks zeigen einen Fehler und markieren keinen anderen Tag. Planungen zur fachlichen Besprechung bleiben gesperrt. Ein Termin pro Wochentag bleibt der aktuelle Planvertrag.

Prüfbeleg: `docs/qa/2026-10-14-training-session-names-days.md`.

### Nutzerkorrektur14.10.2026: konkretes Aufwärmen statt Platzhalter

Einheiten und Wochenplan zeigen denselben konkreten Aufwärmablauf: Bewegung am Boden, benannte Gelenkbewegungen und je nach Inhalt leichte Boulder bzw. eine einfache Variante der ersten Kraftübung mit Mengen/Pausen. Handlungen stehen direkt in der Einheit; Quellen, redaktionelle Herleitung und Einschränkungen bleiben im Infozugang. Kein Fingerboard-Maximaltest und kein automatisch hinzugefügtes Belastungsgerät. Die kurze Abfolge ist ein redaktioneller Einstieg, kein Nachweis individueller Bereitschaft nach einer festen Minutenzahl und keine Kopie eines längeren Verbandsprogramms.

Der pauschale Abschluss mit „locker bewegen und reflektieren“ entfällt. Dafür werden auch keine drei zusätzlichen Minuten mehr gerechnet. Der Zeitansatz zählt genau die dargestellten Aufwärmphasen und Übungen/Pausen. Ältere cooldownMinutes-Felder dürfen lesbar bleiben, werden aber nicht dargestellt oder mitgerechnet. Anfänger- und Erwachsenengrenzen sowie feste Termine bleiben erhalten. Leere und reine Orientierungs-/Kinderinhalte erhalten keine allgemeine Erwachsenenvorgabe.

Prüfbeleg: `docs/qa/2026-10-14-training-concrete-warmup.md`.
### 15.7 Volumen-Boulder und tonlose Uploads (2026-10-14)

- „Nur Volumen“ ist eine unabhängige Setter-Angabe für Boulder ohne zusätzliche
  Griffe. Eine oder zwei Farben bleiben frei wählbar; die Option ersetzt weder
  Grad noch Farbe oder andere Merkmale.
- Anlegen und Bearbeiten verwenden denselben Schalter im Farbbereich.
  Boulderlisten, Home, Details, Upload-Stapel und Setterübersichten kennzeichnen
  den Typ mit einem neutralen Badge aus Icon und Text. Gridkarten verwenden die
  kompakte Beschriftung „Volumen“, Details „Nur Volumen“.
- Neue Videos werden vor dem Upload ohne Tonspur vorbereitet. Der Editor
  benennt dies ausdrücklich. Die Galerie-Datei bleibt unverändert. Eine fehlende
  Tonentfernung ist ein sichtbarer Fehler und kein Anlass für einen Upload mit Ton.
- Bestehende Videos und externe Video-Links werden nicht rückwirkend verändert.

Prüfbelege: `docs/qa/2026-10-14-volume-silent.md`,
`e2e/volume-silent.spec.ts`, `test/nativeSilentVideo.test.mjs`.

### Gemeinsamer Web-Release 15.10.2026: öffentlicher Schraubplan

Home und Profil führen auf `/schedule`. Termine und ein kompakter Kalender
verwenden dieselben öffentlich lesbaren Hallendaten, ohne Erstellerdaten zu laden.
Gleiche Zeitpunkte werden zusammengefasst, unterschiedliche Uhrzeiten bleiben
getrennt. Heute/Morgen und Tagesgruppen richten sich nach Europe/Berlin.
Ansicht, Monat und gewählter Tag werden als versionierte, öffentliche
UI-Präferenzen gespeichert; fehlender Speicher blockiert die Bedienung nicht.
Der nächste Termin erhält ein Badge statt einer zusätzlichen grünen Seitenlinie.

Die Home-Vorschau hat keinen festen rechten Termin-Badge mehr. Lange
Teilbereichsnamen umbrechen innerhalb der Karte, auch ungetrennte Wörter.
Der Abschnittstitel und die Aktion dürfen bei großer Schrift umbrechen.
Kalender-Bedienelemente haben mindestens 44px; die Setter-Planung behält ihre
größere Bearbeitungsansicht. Lesen, Leerzustand, Ladefehler und Wiederholen sind
getrennte Zustände. Route und Kalender sind auch für Gäste lesbar.

Nutzerkorrektur 15.10.2026: Training ist noch nicht zur Veröffentlichung
freigegeben. Ausschließlich die lokale Entwicklungsvorschau darf den Bereich
aktivieren. Web- und native Produktionsbuilds zeigen weder Training in der
Navigation noch Trainingseinstellungen; direkte Trainings- und Einstellungslinks
sind gesperrt. Ein altes Vorschau-Flag darf diese Releasesperre nicht umgehen.
Entwicklungscode und lokal gespeicherte Inhalte bleiben erhalten. Der gemeinsame
Root behält den Live-Navigationszustand und Profilfoto-Cache bei.

### Landingpage-Marke16.10.2026

Nutzerkorrektur V22: Der Partnerwechsler zeigt genau einen Richtungspfeil zum
anderen Partner: bei aktivem Moonsight rechts zur KWS, bei aktiver KWS links zu
Moonsight. Richtung und zugänglicher Zielname wechseln unmittelbar; keine
Doppelpfeile oder animierten Zwischenrichtungen.
Mobile Präzisierung V22 ersetzt die bisherige mobile Scrollfixierung: bis600px
werden die vier Features mit sichtbaren Icon-/Textcontrols direkt gewählt.
Größeres Smartphone, normaler Seitenfluss und keine Fixierung über mehrere
Bildschirmhöhen. Reduced Motion entfernt Übergänge, erhält die Direktauswahl;
ohne JavaScript bleiben alle vier Beiträge als Liste lesbar. Desktop behält
die freigegebene Scroll-Tour. Mobile Schriftgrößen in Ausblick/Partnerbeiträgen
und Platzreserven müssen auch bei320px lesbar und beim Wechsel stabil bleiben.
Nutzerwahl V23: Navbar B (Floating Dock) wird übernommen. Desktop schwebende
weiße Leiste; bis960px obere Markenleiste und unteres Dock mit drei beschrifteten
Icons. Beide Originalmarken bleiben sichtbar. Aktiver Abschnitt,44px-Ziele,
Safe-Area und ausreichend Footerraum bleiben Pflicht. Die reale Höhe beider
Leisten bestimmt Ankersprünge und den Platz für die Desktop-Featuretour.
Diese Wahl ersetzt die frühere V21-Menünavigation. Die Varianten A/C und der
V22-Ausgangszustand bleiben als eingefrorene lokale Vorschläge erhalten.
Mobile Korrektur V24 ersetzt das untere Dock: Beide Marken in einer kompakten
oberen Zeile, darunter Funktionen/Ausblick/Über Beta als dauerhaft sichtbare
Textlinks mit44px-Zielen. Kein belegter unterer Bildschirmrand. Aktive Sektion
mit Textzustand und kurzer Unterlinie, gemessene Gesamthöhe für Anker/Tour.
Die gewählte schwebende Navbar B bleibt auf Desktop erhalten.
Präzisierung V26: Auch die kompakte obere mobile Navbar schwebt als weiße
12px gerundete Fläche mit12px seitlichem Abstand und mindestens12px Abstand
nach oben über dem Inhalt. Safe-Area und Schatten beachten; Sticky-Verhalten
mit diesem Abstand erhalten. Keine bündige Leiste oder neues unteres Dock.
Nutzerwahl V27: Mobile Navbar bis960px nur mit originalem grünem Beta-Symbol,
ohne Wortmarke und KWS-Logo. Symbol und drei44px-Textlinks in einer schwebenden
Zeile;66px Außenhöhe. KWS bleibt im Partnerbereich und im Desktopheader sichtbar.
Desktop B und Footer unverändert. Diese Ausnahme ersetzt die ältere Forderung
nach beiden Logos im mobilen Header.

Nutzerwahl V21: Favicon-Variante3/C verwenden: unverändertes weißes Symbol auf
grüner, weich gerundeter Kachel, mit größerer Symbolfläche als bisher. SVG plus
16/32/48px-ICO und180px-Touchicon. Header-/Footer-Wortmarken bleiben unverändert.
Landingpage-Navigation V21 bleibt beim Scrollen sichtbar und zeigt den aktuellen
Abschnitt mit Textzustand und grüner Unterlinie. Beide Marken bleiben sichtbar.
Unter961px ersetzt ein44px-Menüschalter die Desktopnavigation; Menülinks,
Escape, Fokus und eine ohne JavaScript lesbare Fassung bleiben erhalten.
Die Feature-Sequenz berücksichtigt die Höhe der Navbar beim Fixieren/Springen.

Für die Beta-App wird seit Nutzerkorrektur V20 die ausgewählte originale
DM-Sans-700-Wort-Bild-Marke aus beta-dm-sans-selected-2026-10-16 verwendet.
Sie ersetzt die frühere V2. Auf hellen Flächen primary, auf dunklen die weiße
Originalfassung; Farben, Formen und Proportionen
bleiben unverändert. Hallenname und KWS-Logo stehen separat. Keine Filter,
Schlagschatten oder Animation auf dem Logo selbst. Quelle und SHA-256:
docs/design/landing/logo-integration.md. Diese Integration betrifft die öffentliche
Landingpage, nicht die noch separat zu aktualisierenden App-Icons.

Landingpage-Nutzerkorrektur V15: Beta-Logo und originales schwarz-grünes
Kletterwelt-Sauerland-Logo stehen beide im Header, auch mobil. Separate Marken
mit Trennlinie und Schutzraum. Unter600px bleibt der Zugang zu den Funktionen
als beschrifteter44px-Pfeilbutton erreichbar, damit beide Logos Platz haben.

### Landingpage-Ausblick16.10.2026

Geplante Bereiche stehen in einer eigenen Ausblick-Sektion zwischen den heute
verfügbaren Funktionen und den Projektpartnern. Status textlich unterscheiden:
„In Entwicklung“ für den bestehenden unveröffentlichten Trainings-/Kinderbereich,
„Geplant“ für spätere Seilkletter-Erweiterung. Keine Termine erfinden und keine
Links zu gesperrten Vorschaufunktionen. Eine Marketingankündigung hebt keine
Releasesperre der eigentlichen App auf. V17 ersetzt die aufklappbaren Zeilen
durch sichtbare Vorschauflächen: großes Trainingsthema, getrennte Kletterhallen-
und Kinderbereiche. Alle Aussagen bleiben auch ohne JavaScript direkt lesbar.
Bestehende Konzeptillustrationen dürfen die Vorschau unterstützen, ohne eine
schon verfügbare Appansicht oder einen Starttermin vorzutäuschen.

Nutzerwahl Landingpage V18: Der Ausblick verwendet eine echte App-Vorschau mit fotografischem Smartphone-Mockup und drei umschaltbaren Themen. Training/Kinderbouldern zeigen ausschließlich isolierte Entwicklungsansichten und bleiben als unveröffentlicht markiert. Die Kletterhalle hat noch keine App-Ansicht. Tastaturfähige Tabs und ein ohne JavaScript vollständig lesbarer Fallback; keine automatische Bewegung. Details: docs/design/landing/design-system.md und docs/design/landing/upcoming/bar.md.

### Landingpage-Ausblick V19 – Nutzerwahl B

Nutzer wählt die Mockup-Galerie B. Im Ausblick steht das ausgewählte Smartphone
farbig in der Mitte, Alternativen kleiner und grau daneben. Auswahl über Bilder
und kompakte, tastaturfähige Themen-Tabs. Keine Dauerschleifen; Bewegung nur auf
Auswahl, Reduced Motion entfernt Übergänge. Mobil vollständiges Hauptgerät und
seitlich angeschnittene Alternativen. Auf ausdrücklichen Nutzerwunsch darf die
Kletterhalle einen generierten App-Konzeptscreen zeigen, mit sichtbarem Hinweis
„Geplant · Konzeptvorschau“. Das ist keine implementierte App-Funktion und keine
Releasesperren-Aufhebung. Derselbe fotografische Rahmen für alle drei Ansichten.
Diese Nutzerwahl ersetzt die abgelehnte V18-Ausblickgestaltung. Quelle/Prompt:
docs/design/landing/concepts/climbing-mockup.md.

Nutzerergänzung V23: Die Roadmap lässt sich horizontal wischen oder mit der Maus
ziehen. Nach links folgt das nächste Thema in Tab-Reihenfolge, nach rechts das
vorherige; die Galerie läuft am Ende wieder zum Anfang. Die seitlichen Geräte
stehen entsprechend dieser Reihenfolge. Erst eine klar horizontale Geste wird
übernommen; vertikales Scrollen und Pinch-Zoom bleiben nativ. Kleine und
abgebrochene Gesten wählen kein anderes Thema. Themenbuttons, Tastatur und
vollständig lesbarer No-JS-Fallback bleiben erhalten. Kein Autoplay; Reduced
Motion entfernt die Zug-/Wechselbewegung.

Roadmap-Korrektur V25: Nach horizontalem Wischen beginnt die Platzwechsel-
animation an der tatsächlich sichtbaren Loslassposition. Keine gleichzeitige
Rückfederung der ganzen Galerie. Das hintere Gerät wird unsichtbar an den
Außenkanten umgesetzt, statt durch die Mitte zu kreuzen. Das neue Hauptgerät
wird früh vollständig deckend, damit keine überlagerten Appansichten entstehen.
Schnelle Gegenwahl übernimmt den aktuellen Animationsstand; Abbruch/kurzer Zug
kehrt weich zur bestehenden Auswahl zurück. Reduced Motion beendet laufende
Bewegungen unmittelbar. Vertikales Scrollen bleibt nativ.

# Landingpage V28 – Rechtliches und Social Preview

Impressum, Datenschutz und Community-Regeln verwenden dieselbe feste Navbar,
Schrift und den vorhandenen Footer; gut lesbarer Textbereich mit 850px Maximalbreite,
mobilem Innenabstand und ohne App-JavaScript. Die zusätzlichen Angaben zur
Landingpage stehen vor den übernommenen App-Datenschutzhinweisen. Keine Änderung
der freigegebenen Hero-, Feature-, Roadmap- und Partnerinteraktionen.
Die Social-Vorschau ist eine eigene 1200×630-Komposition aus unveränderten Logos
und echten App-Screenshots. Die geschützte Betriebsübersicht bekommt eine
ruhige Zahlenkarte im bestehenden Design; keine Besucheridentitäten oder
unbelegten QR-/Store-Konversionen. Zwei gerenderte QA-Schleifen auf 375/768/1280/1920.


## Nutzerfreigabe 2026-10-19 – Statistik und gezielte DesignMotion-Ergänzungen

- Statistik startet mit heute und sechs vorherigen Kalendertagen. Pfeile blättern
  um sieben Tage; der nächste Zeitraum reicht höchstens bis heute. Datumskopf und
  „Zeitraum“ öffnen eine freie Von–Bis-Auswahl mit Kalender und „Letzte 20 Tage“.
  Beide Grenztage zählen mit. Abbrechen übernimmt keine Änderung. Unzulässige
  URL-Daten führen mit sichtbarem Hinweis zur aktuellen 7-Tage-Ansicht zurück.
  Zeitraum und Gradfilter bleiben in der URL. Gesamt enthält weiterhin undatierte
  ältere Tops; frei begrenzte Zeiträume erhalten keine erfundenen Aktivitätsdaten.
- Statusbadges für Projekt, Gespeichert, In Arbeit und Geschafft verwenden die
  gemeinsame 4px-Form und lesbares dunkles Grün. Bereich und Versuche bleiben
  Untertitel. Grad, NEU und Volumen behalten ihre bestehenden Badge-Aufgaben.
- Fotokarten: Name mobil 12px, Bereich 11px; Name maximal eine Zeile, bei Überlänge
  mit Ellipse und vollständigem zugänglichem Namen. Grad nur im eigenen Badge;
  keine ergänzte Schwierigkeit hinter dem Namen. Tatsächliche Namen werden nicht
  gekürzt gespeichert. Originale Bildformate, Gradbadges und Gradientenhöhen bleiben.
- Mehrfachauswahl bleibt nach gewählten Filtern sichtbar; „Filter wirken sofort“
  erläutert die bestehende Wirkung. Profilfehler stehen am Feld; der erste Fehler
  erhält Fokus und Eingaben bleiben erhalten. Der Editor-Kopf nennt Boulder und
  Ungespeichert, ohne vorhandenen Verwerfenschutz oder festen Fuß zu ersetzen.
- Nutzerkorrektur19.10.2026 nach Sichtprüfung: Der verzerrende Foto-Flug entfällt.
  Karten öffnen das Detail unmittelbar in seiner endgültigen Geometrie, mit
  einer einzigen dezenten150ms-Deckkraftangleichung von92% auf100%. Kein
  Größenmorphing, Positionsgleiten, nativer Foto-Snapshot oder zweiter Eintritt.
  Die Rücknavigation läuft sofort und behält Filter, Ansicht, Fokus und
  Scrollposition. Reduced Motion entfernt die Einblendung. Keine zusätzlichen
  Videostarts oder Abhängigkeit von Bildladezustand/Browser-Animations-API.
- Tracking zeigt Erfolg erst nach bestätigten Tages- und Status-Schreibvorgängen;
  Fehler erhalten Rücknahme und Wiederholungsmöglichkeit. Keine Erfolgsbestätigung
  allein aufgrund einer optimistischen Anzeige.
- Lange Verwaltungs-E-Mails dürfen umbrechen, Kopieren steht im geöffneten Eintrag.
  Der zugängliche Name der Glocke enthält Anzahl oder Lade-/Fehlerzustand.
- Die Wochen-Statscard bleibt auf Home oben; Beta-Logo-Startscreen bleibt erhalten.

Prüfumfang und Belege: docs/design/designmotion-2026-10-19.md.

### Getrennte Demoumgebung für Store-Prüfungen (19. Oktober 2026)

- Nutzerentscheidung: Kunde, Setter und Verwaltung bleiben in derselben App.
  Für die Store-Prüfung steht eine getrennte Umgebung mit erfundenen Daten bereit.
- Die Anmeldung bietet die Demo ausdrücklich und aufklappbar an. Kein
  automatischer Wechsel anhand von E-Mail, Gerät oder vermutetem Store-Prüfer.
- In der Demo bleibt „Demo · Beispieldaten“ dauerhaft sichtbar. Sidebar und
  fester Header berücksichtigen die tatsächliche Höhe dieses Hinweises,
  einschließlich Zeilenumbrüchen und Safe Area. Bestehende Komponenten behalten
  ihre Gestaltung; der Hinweis verdeckt weder Logo noch Aktionen.
- Der Rückweg verlangt die Abmeldung des Demo-Kontos. Während eines laufenden
  Uploads ist der Wechsel gesperrt. Sitzungen und Rollen-Caches sind getrennt;
  die reguläre App bleibt der Standard. Eine nicht verfügbare Demo wechselt nie
  automatisch zu echten Betriebsdaten.
### Nutzerfreigabe 19.10.2026 – Setter-Schnellaktionen (Videos 2, 3, 4, 6, 7)

- Die Setter-Bearbeitenliste bietet einen benannten Stift zum direkten Umbenennen.
  Das einzelne Namensfeld steht unter der betreffenden Zeile. Enter bzw.
  „Name speichern“ bestätigt ausschließlich den getrimmten, nicht leeren Namen;
  Escape/Abbrechen verwirft. Blur speichert nichts. Erfolg benötigt eine bestätigte
  Antwort des bestehenden Schreibwegs; Fehler erhalten die Eingabe.
- Während der Namensbearbeitung sind andere Zeilenaktionen, Suche, Filter und
  Mehrfachauswahl gesperrt. Speichern sperrt auch die Formaktionen gegen doppelte
  Ausführung. Ein zwischenzeitlicher Ladefehler erhält den offenen Namen im
  Seitenentwurf; Wiederholen und Abbrechen bleiben erreichbar. Kein automatisches
  Sichern oder Wiederherstellen nach einem App-Neustart ist damit freigegeben.
- Ein sichtbares Drei-Punkte-Menü enthält Bearbeiten und abgetrenntes Löschen.
  Die normale Zeile öffnet weiterhin direkt den vollständigen Editor. Mobil
  stehen Stift und Menü übereinander, damit Namen nicht durch zwei zusätzliche
  nebeneinanderstehende Iconbuttons zusammengedrückt werden.
- Einzelnes Löschen aus Menü oder Editor nennt den Boulder im Titel, verwendet
  „Boulder löschen“ und erklärt die Unwiderruflichkeit. Es löscht nur das konkrete
  Objekt, unabhängig von einer bestehenden Sammelauswahl. Abbrechen und Fehler
  bleiben im vorhandenen Bestätigungsablauf. Beim Schließen kehrt der Fokus zum
  Auslöser bzw. nach dessen Entfernung zur Suche zurück.
- Null Setter-Treffer nennen Suchbegriff/Auswahl und bieten in der Leerfläche
  „Suche und Filter zurücksetzen“. Ein tatsächlich leerer Bestand ist getrennt.
  Ladefehler erklären den erhaltenen Filter-/Suchkontext. Wiederholen liest die
  vier beteiligten Quellen parallel, bleibt bis zum Abschluss sichtbar gesperrt
  und zeigt bei unbestätigtem Bestand keine scheinbare Null.
- Der optionale Admin-Schnellzugriff (Video 10) wird ausdrücklich nicht umgesetzt.
  Upload-Ergänzungen und lokale Entwurfswiederherstellung sind weiter Vorschläge.

Prüfumfang: docs/qa/2026-10-19-setter-quick-actions.md.


### Onboarding – freigegebene App-Integration 19.10.2026

- Der erste Gastbesuch führt mit kurzen verankerten Hinweisen durch die echte
  Oberfläche, nach der bestehenden Trainings-Tour-Methode: sichtbares Ziel,
  dezenter Hintergrund, grüne Kontur und zugehöriger Pfeil. Keine vorgeschaltete
  Folge allgemeiner Erklärungskarten. Das erklärte Element bleibt bedienbar.
- Präzisierung nach Sichtprüfung: Die Aufhellung folgt der tatsächlichen
  Rundung des Zielelements einschließlich des umlaufenden Abstands. Ausschnitt,
  grüne Kontur und klickfreie Öffnung haben dieselbe Geometrie; keine hellen
  rechteckigen Eckflächen außerhalb der Rundung. Abgeschnittene Zielkanten
  bleiben gerade. Die Kontozeile heißt auf Nutzerwunsch „Das Kommentieren“ und
  behält ausdrücklich den Stern. Bestätigte Nutzerwahl im Iconvergleich:
  Gespeicherte Boulder B (`Bookmark`), Tracking A (`Play`), Statistik A
  (zentraler `StatisticsIcon`). Diese Auswahl gilt für die Konto-Vorteilszeilen.
  Produktive Detail- und Ergebnisaktionen behalten ihre eigenen Funktionsicons.
  Die Kontozeilen heißen „Gespeicherte Boulder“, „Tracking“, „Statistik“ und
  „Das Kommentieren“.
  Boulder-/Konto-/Statistiknavigation verwenden die gemeinsamen `appIcons`.
  Die Kontovorteile erhalten keine zusätzlichen Erledigt-Häkchen.
- Gastfunktionen zuerst: Boulder öffnen, vorhandene Beta ansehen und die echten
  Mehrfachfilter ausprobieren. Nutzerkorrektur 19.10.2026: Die Einführung bleibt
  im geöffneten Filter erhalten und erklärt Grad, Farbe, Hallenbereich und den
  Ergebnisbutton direkt an den bedienbaren Elementen. Nach „Boulder anzeigen“
  folgt ein Hinweis an der gefilterten Liste, bevor die Kontofunktionen beginnen.
  Keine Unterbrechung durch eine unbegleitete Standard-Filteransicht. In kurzen
  Viewports bleiben Erklärung und scrollbar erreichbare Auswahl getrennt sichtbar.
- Texte nennen konkrete Handlungen in kurzen, natürlichen Sätzen. Keine
  Werbeslogans, künstlichen Motivationszeilen oder wiederholten Nutzenformeln.
- Kontovorteile werden direkt im jeweiligen Kontext beworben: Merken/Projekte,
  Versuche/Tops/Flashes und persönlicher Fortschritt, ergänzt um Bewertungen und
  Kommentare. Gastvideos sind kein exklusiver Kontovorteil. Unveröffentlichtes
  Training und geplante Funktionen gehören nicht in dieses Verfügbarkeitsversprechen.
- Eine Gastvorschau persönlicher Funktionen ist dauerhaft als Kontovorschau mit
  Beispieldaten gekennzeichnet; sie erzeugt keine echten Einträge. Konto erstellen
  und als Gast fortfahren sind ausdrücklich erreichbar. Überspringen, X, Escape,
  Zurück und erneuter Start bleiben möglich; Hinweise liegen im Viewport und
  verdecken ihr Ziel nicht. Fokus und Gastfilter bleiben nachvollziehbar erhalten.
- Freigabe 19.10.2026: Integration in die App. Automatischer Start nur beim
  ersten geladenen Gastbesuch; direkte Anmeldung/Registrierung und angemeldete
  Nutzer werden nicht unterbrochen. Der bisherige `hasSeenOnboarding`-Status
  wird berücksichtigt. Neue Abschlüsse sind versioniert und nach Backend
  getrennt; gesperrter Browserspeicher verhindert die Nutzung nicht.
- Die echte Gastliste und das echte Boulder-Detail liefern die Ziele. Ohne
  vorhandenes Beta-Video erklärt der Hinweis das Foto und benennt das fehlende
  Video. Lade-/Fehler-/Leerzustände erzeugen keine Erklärung ohne sichtbares Ziel.
- Persönliche Funktionen werden unter `/onboarding/account` und
  `/onboarding/progress` ausprobiert. Markierungen und Tracking bleiben lokaler
  Zustand; die Woche verwendet ausdrücklich Beispieldaten. Die Kontovorteile
  führen über `/onboarding/register` zum vorhandenen Formular `/app/register`.
  „Einführung ansehen“ im Gastkopf startet die Führung erneut.
- Der Filter meldet Öffnen, tatsächliche Ergebnisbestätigung und seinen
  Dialoghost explizit an die Tour. Stabile `data-onboarding`-Ziele ersetzen
  CSS-Layout-/Textsuche. X oder Zurück schließt den Filter ohne Ergebnisbestätigung;
  Escape bzw. das X der Einführung beendet nur die Tour.
- Verankerte Hinweise berücksichtigen die eigene Scrollebene des Boulder-Details
  und den tatsächlich verfügbaren Scrollbereich im Filter. Auch Browser-Zurück
  darf den vorgesehenen nächsten Schritt nicht durch einen Zwischenzustand ersetzen.

Prüfbeleg: `docs/qa/2026-10-19-onboarding-integration.md`.

- Begleitende Systemabfragen dürfen die erklärten Ziele nicht überdecken. Die
  freiwillige Statistikabfrage wartet während der Tour und ihrer Kontovorschau;
  ihre bestehende Auswahl wird dadurch weder erteilt noch zurückgesetzt.
