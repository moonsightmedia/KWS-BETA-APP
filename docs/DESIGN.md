---
status: verbindlich
scope: KWS Beta App
owner: Janosch Althoff
last_verified: 2026-08-26
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
| Primärgrün | `#36B531` / `primary` | aktive Controls, Auswahl, Hauptaktionen, positive Zustände |
| Starke Schrift | `#192436` | Seitenüberschriften, Abschnittstitel, Kartentitel, wichtige Zahlen |
| Seitenfläche | `#F9FAF9` | angemeldete Hauptseiten und ruhige App-Hintergründe |
| Kartenfläche | `#FFFFFF` / `card` | Karten, Popover, Listenflächen |
| Sekundärfläche | `secondary`, visuell etwa `#F1F5F1` | inaktive Controls, Iconflächen, leichte Gruppierung |
| Bild-Platzhalter | `#EEF2EE` | Thumbnail-Hintergrund während Laden oder bei fehlendem Bild |
| Sekundärtext | `muted-foreground` | Metadaten, Hilfetext, Zähler |
| Border | `border`, visuell etwa `#DDE7DF` | subtile Trenner und notwendige Control-Konturen |
| Gefahr | `#C6453A` auf sehr hellem Rottint | Abmelden, Löschen und echte Fehlerzustände |

Regeln:

- `#192436` ist die einheitliche starke Schriftfarbe der neuen Nutzeroberfläche.
- Primärgrün wird nicht als großflächiger Seitenhintergrund eingesetzt.
- Weitere Grüntöne sind Tints oder semantische Hallenkartenfarben, keine zweite
  konkurrierende Markenfarbe.
- Direkte Hexwerte sollen bei neuer Arbeit nur ergänzt werden, wenn eine neue
  semantische Rolle beschlossen wurde. Wiederkehrende Werte gehören in
  `src/index.css` und `tailwind.config.ts`.
- Alte Textverwendungen von `#13112B` werden bei Berührung auf die aktuelle
  Texthierarchie geprüft. Der Farbwert kann weiterhin als Ausgangswert für
  transparente Schatten dienen.

### 3.2 Hallenkartenpalette

Die fünf kundenorientierten Bereiche erhalten ausschließlich Grüntöne. Alle
A–D-Teilbereiche erben die Palette ihres Elternbereichs.

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
- Keine wechselnden Headerfarben zwischen Gast- und Login-Bereich.
- Sehr kleine Schrift ist nur für kurze Metadaten auf kompakten Fotokarten
  erlaubt. Bedienhandlungen und längere Texte bleiben größer.
- Überschriften sind kurz. Zusätzliche Erklärung maximal ein kompakter Satz.

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

- Standarddauer für kleine Zustandswechsel: `150–200ms`.
- Panels dürfen kurz von oben einblenden; keine große Show-Animation.
- Pressed-Zustände dürfen auf `0.97–0.98` skalieren.
- Hover verändert bevorzugt Farbe oder Schatten, nicht das Layout.
- `prefers-reduced-motion` ist bei neuen größeren Animationen zu beachten.

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
- Hauptseiten zeigen links dasselbe `ProfileMenu`.
- Profil-Unterseiten zeigen an derselben Stelle einen 40-px-Zurückbutton.
- Rechts sitzen nur häufig verwendete Seitenaktionen.
- Suchfelder und Filterpanels erscheinen bei Bedarf unter der Titelzeile, nicht
  dauerhaft als großer Headerblock.

Gast- und angemeldeter Bereich verwenden dieselbe Header-Typografie und starke
Schriftfarbe. Fehlende Gastfunktionen werden weggelassen, nicht durch ein
anderes Design ersetzt.

### 4.3 Navigation und Scrollposition

- Hauptreihenfolge: `Home → Boulder → Statistiken`.
- Die Bottom-Navigation und Desktop-Navigation verwenden dieselben Labels,
  Icons und Aktivzustände.
- Bei normalem Wechsel auf eine andere Route beginnt die neue Seite oben.
- Browser-Zurücknavigation darf ihre natürliche Historienposition behalten.
- Mobile Hauptseiten unterstützen horizontales Route-Swipen:
  - Wisch nach rechts: nächster Eintrag der Reihenfolge,
  - Wisch nach links: vorheriger Eintrag,
  - Mindestdistanz etwa `56px`,
  - vertikale Gesten, Links, Buttons, Inputs, Karten und horizontale Scroller
    werden nicht abgefangen.
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
- Primär: grüner Hintergrund, weiße Schrift.
- Inaktiv/sekundär: helle Sekundärfläche, graues Icon oder dunkelblaue Schrift.
- Aktivzustand von Toolbarbuttons: Primärgrün mit weißem Icon.
- Destruktive Aktionen verwenden Rot nur dort, wo wirklich Daten oder Sitzungen
  beendet werden.
- Gleiche Aktion = gleiche Komponente und gleiche Maße auf jeder Seite.
- Iconbuttons benötigen ein verständliches `aria-label`.

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
- Aktiv: grüner Track, weißer Thumb.
- Inaktiv: `#D9E0DA`, weißer Thumb.
- Übergang: `200ms`.
- Tastaturfokus: grüner `focus-visible`-Ring ohne Layoutsprung.

Der Thumb darf den Track nicht fast vollständig ausfüllen und nicht bündig an
einer Kante sitzen.

### 5.5 Segmentsteuerung

`KwsSegmentedControl` ist die Standardlösung für kleine Ansichts- oder
Inhaltswechsel wie `Info / Track / Beta` oder Statistikzeiträume.

- äußerer Track: `rounded-kws-card`, Sekundärfläche, `4px` Padding,
- Auswahl: `rounded-kws-control`, grüner Hintergrund, weiße Schrift,
- inaktiv: Sekundärtext, leichter Hover,
- kein zusätzlicher grüner Unterstrich,
- ausgewählte Fläche und äußerer Track müssen geometrisch sauber ineinander
  sitzen.

### 5.6 Inputs und Suche

- Inputs und Suchfelder verwenden den 8-px-Controlradius.
- Die Suchfunktion der Boulderliste bleibt hinter einem Icon verborgen, da
  Boulder selten über ihren Namen gesucht werden.
- Ein geöffnetes Suchfeld liegt im Header-Unterbereich und enthält Suchicon,
  Text und Schließen-Aktion.
- Fokus erzeugt keinen grünen Rahmen um das ganze Feld. Verwendet wird ein
  zurückhaltender, nicht layoutverändernder dunkelblauer Fokusindikator.
- Löschen/Schließen darf die Höhe des Feldes nicht verändern.

### 5.7 Menüs, Popover, Dialoge und Filterpanels

- große Fläche: Radius `12px`; kompakte Inline-Toolpanels dürfen Radius `8px`
  verwenden,
- weißer Hintergrund und leichter Popover-Schatten,
- Optionen verwenden die gleichen 8-px-Controls,
- gewählte Option: Grün/Weiß plus `aria-pressed` oder semantisches Primitive,
- keine nativen ungestalteten Select-Menüs in finalen Screens,
- auf Mobilgeräten kein zweiter vertikaler Scrollcontainer innerhalb der Seite,
- Panels wachsen im normalen Seitenfluss oder werden als klarer, einziger
  Dialog/Sheet geöffnet.

### 5.8 Icons

- Lucide-Icons sind Standard.
- Normaler Stroke: ungefähr `2`; globale Altbestände mit `2.5` werden bei
  Berührung geprüft.
- Icons erklären eine Funktion und werden nicht als beliebige Dekoration
  eingesetzt.
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
  und besitzt einen sichtbaren markenkonformen Tastaturfokus.
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
weißem Icon. Ein kleiner Zähler zeigt aktive Filter; er ersetzt keine
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

### 6.3 Sortierung und Gruppierung

Standard ist `Neueste zuerst`.

- Boulder werden immer nach den fünf kundenorientierten Bereichen gruppiert.
- Bei Datumssortierung bestimmt das neueste beziehungsweise älteste Element der
  Gruppe die Gruppenreihenfolge.
- Innerhalb einer Gruppe gilt dieselbe ausgewählte Sortierung.
- Ein neu eingestellter Boulder erscheint damit in seiner Bereichsgruppe oben;
  die Gruppe mit dem neuesten Boulder steht bei `Neueste zuerst` zuerst.
- Für Nicht-Datumssortierungen gilt die kanonische Bereichsreihenfolge.
- Jede Gruppe kann einzeln ein- und ausgeklappt werden.
- Neben der Sortierung gibt es `Alle einklappen / Alle ausklappen`.
- Der Gruppenkopf zeigt Bereichsname, Anzahl und eine dünne ruhige Trennlinie.

Die fünf öffentlichen Bereichsnamen sind:

1. Bug
2. Couch-Ecke
3. Top-Out
4. Lange Platte
5. Grotte

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
- in der Metazeile nur der Bereich, nicht A–D,
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

Kunden sehen fünf Bereichsnamen und darunter die flexiblen Teilbereiche A–D.
Beispiele: `Bug A`, `Bug B`, `Bug C`, `Bug D`.

Auf der kompakten Karte selbst stehen ausschließlich die A–D-Tags. Die
Bereichsnamen werden in einer kleinen Legende unter der Karte erklärt. Dadurch
bleibt die Karte lesbar, ohne die Kundschaft mit Altsektornamen zu belasten.

### 7.2 Zustände

- Standardfläche: Grundton des Elternbereichs.
- Hover/Fokus: dunklere Bereichsfläche; Tag wird farbig mit weißer Schrift.
- Ausgewählt: dunklere Bereichsfläche; das A–D-Tag wird invertiert – weißer
  Hintergrund, Schrift in der Bereichsfarbe.
- Weiße Trennlinien separieren die Flächen klar.
- Jede sichtbare Wandkante wird nur einmal gezeichnet. Grundkarte und
  interaktive Polygone dürfen nicht als zwei versetzte Konturen übereinander
  erscheinen.
- A–D-Tags werden so positioniert und skaliert, dass sie weder einander noch
  relevante Flächenkanten überlagern.
- Auswahl muss über Tag-Invertierung und Flächenänderung erkennbar sein.
- Mehrere Teilbereiche dürfen gleichzeitig ausgewählt werden.
- Erneutes Anklicken entfernt nur diesen Teilbereich aus der Auswahl.

### 7.3 Verhalten

- Kartenwahl und Standard-Boulderfilter teilen denselben Zustand.
- Zählungen berücksichtigen nur aktive/hängende Boulder und zählen einen
  Boulder innerhalb derselben logischen Gruppe nur einmal.
- Interaktive Karten unterstützen Pointer, Tastatur `Enter/Space`, Pinch und
  Mausrad-Zoom.
- Zoomrahmen: ungefähr `0.82–3.0`.
- Die Karte darf weder Route-Swipes noch den normalen Seitenscroll versehentlich
  auslösen.
- Die kompakte Boulderkarte erscheint hell, rahmenarm und mit der Legende direkt
  darunter.

## 8. Gastansicht und Boulder-Detail

### 8.0 Login und Registrierung

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

### 8.1 Gastansicht

Die Gastansicht ist keine zweite Designwelt.

- gleiche Schriftfamilien, Farben, Radien, Karten und Toolpanels,
- gleiche Such-, Sortier-, Sektor-, Grad- und Farbfilterlogik,
- Filter bleiben Multi-Select,
- keine Home-Funktion, die eine Anmeldung voraussetzt,
- Hauptnavigation enthält für Gäste `Boulder` und `Anmelden`,
- Klick auf einen Boulder öffnet eine funktionierende Gast-Detailansicht,
- das Zurückziel führt nachvollziehbar zur Gast-Boulderübersicht,
- Login-Aktionen sind klar, aber ersetzen nicht plötzlich Profilicons oder
  angemeldete Navigation.

Angemeldeten Nutzern vorbehaltene Tracking-, Bewertungs-, Kommentar- und
Attributaktionen werden fachlich ausgeblendet. Die übrige Detailseite behält
dieselbe visuelle Struktur.

### 8.2 Detailansicht

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
- die gewählte Qualität erhält eine grüne Fläche, weiße Schrift und ein weißes
  Häkchen. Kreisförmige Radioindikatoren werden in diesem eckigen Toolpanel
  nicht verwendet,
- im Vollbild wird das Video vollständig mit `object-contain` gezeigt,
- bei direkten Videos gehören Badge, Qualität und Vollbild in denselben
  Fullscreen-Container. So bleiben sie im Vollbild sichtbar und werden nicht
  durch doppelte seitenlokale Controls überlagert.

### 8.4 Kommentare und Track

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
- `Deine Woche` nutzt den kompakten `KwsMetricStrip` statt großer KPI-Karten.
- `Neu an der Wand` verwendet dieselbe kanonische Gridkarte wie die
  Boulderübersicht.
- Schraubtermine und Rückblicke bleiben kompakte, scannbare Flächen.
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
  Vollbildstatus mit KWS-Logo, aktionsbezogener Kurzmeldung und eckiger
  Fortschrittsanzeige. App-Start, Session-Prüfung, Anmeldung, Registrierung,
  E-Mail-Bestätigung und Abmeldung erhalten jeweils eindeutige Texte.
- Ein Ladezustand darf nicht kurz flackern: initiale Übergänge bleiben für eine
  kurze Mindestdauer stabil. `prefers-reduced-motion` reduziert alle dekorativen
  Ladeanimationen.
- Fehlermeldungen erklären knapp, was passiert ist und wie es weitergeht.

## 11. Responsive und mobile Bedienung

- Mobile zuerst entwickeln, anschließend Tablet und Desktop bewusst anpassen.
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
- Pull-to-Refresh beginnt ausschließlich am oberen Dokumentrand. Nach einer
  kleinen Bewegungsschwelle wird die Richtung gesperrt: horizontale Gesten
  bleiben für Route-Swipe und Scroller frei, vertikale Abwärtsgesten zeigen
  einen kompakten KWS-Status. Formfelder, Switches, Slider, Dialoge und Drawer
  starten keine Aktualisierung.
- Der Refresh-Status unterscheidet zwischen Ziehen, Loslassen und Laden. Erfolg,
  Teilerfolg und Fehler werden wahrheitsgemäß und knapp bestätigt.

## 12. Technische Quelle und Wiederverwendung

Zentrale Foundations:

- `src/index.css` – Farben, Safe Areas, Schatten und globale Grundlagen,
- `tailwind.config.ts` – Font-, Farb-, Schatten- und Radiustokens,
- `src/lib/sectorAreas.ts` – fünf Bereiche, A–D-Zuordnung und Kartenpaletten.

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

- Generische Altkomponenten wie `Input`, `Badge` und einzelne nicht-kompakte
  Hallenkartenvarianten enthalten noch ältere Rundungen.
- Direkte Farben wie `#13112B` und alte `rounded-xl/2xl/full` kommen noch vor.
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
