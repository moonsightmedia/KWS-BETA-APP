---
status: verbindlich
scope: KWS Beta App
owner: Janosch Althoff
last_verified: 2026-09-14
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
| Sekundärfläche | `secondary`, visuell etwa `#F1F5F1` | inaktive Controls, Iconflächen, leichte Gruppierung |
| Bild-Platzhalter | `#EEF2EE` | Thumbnail-Hintergrund während Laden oder bei fehlendem Bild |
| Sekundärtext | `muted-foreground` | Metadaten, Hilfetext, Zähler |
| Border | `border`, visuell etwa `#DDE7DF` | subtile Trenner und notwendige Control-Konturen |
| Gefahr | `destructive`, `hsl(5 55% 45%)` | Gefahrenhinweise auf hellem Rottint; gefüllte Löschaktionen mit Weiß |

Regeln:

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
- Alte Textverwendungen von `#13112B` werden bei Berührung auf die aktuelle
  Texthierarchie geprüft. Der Farbwert kann weiterhin als Ausgangswert für
  transparente Schatten dienen.

### 3.2 Hallenkartenpalette

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
- Primär: ursprünglicher grüner Hintergrund, dunkelblaue `primary-foreground`-Schrift.
- Inaktiv/sekundär: helle Sekundärfläche, graues Icon oder dunkelblaue Schrift.
- Aktivzustand von Toolbarbuttons: Primärgrün mit dunkelblauem Icon.
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

Die fünf ursprünglichen öffentlichen Bereichsnamen sind:

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

Auf der kompakten Karte selbst stehen ausschließlich die Teilbereichskürzel. Die
Bereichsnamen werden in einer kleinen Legende unter der Karte erklärt. Dadurch
bleibt die Karte lesbar, ohne die Kundschaft mit Altsektornamen zu belasten.

### 7.2 Zustände

- Standardfläche: Grundton des Elternbereichs.
- Hover/Fokus: dunklere Bereichsfläche; Tag wird farbig mit weißer Schrift.
- Ausgewählt: dunklere Bereichsfläche; das Teilbereichs-Tag wird invertiert – weißer
  Hintergrund, Schrift in der Bereichsfarbe.
- Weiße Trennlinien separieren die Flächen klar.
- Jede sichtbare Wandkante wird nur einmal gezeichnet. Grundkarte und
  interaktive Polygone dürfen nicht als zwei versetzte Konturen übereinander
  erscheinen.
- Teilbereichs-Tags werden so positioniert und skaliert, dass sie weder einander noch
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

- Mobile Administration hat vier Gruppen: Benutzer, Halle, Feedback und Betrieb.
  Betrieb öffnet Monitoring, Protokoll und Push-Test. Die gemeinsame Definition
  liegt in `src/lib/adminNavigation.ts`; alle sechs Ziele bleiben erreichbar.
- Desktop zeigt dieselben sechs Adminziele direkt in der Sidebar und einen
  Rückweg zur App. Keine zweite große Bereichs-Tab-Leiste über dem Inhalt.
- Adminseiten beginnen mit der Bereichsauswahl (maximal 480 px) und einer
  Aktualisieren-Aktion. Darunter folgen Suche/Filter, dann Ergebniszahl und
  Sortierung, danach die Inhalte. Keine Benutzerzahl oberhalb des Switches.
  Einzelzweckseiten wie Push-Test zeigen dort Empfängerkreis und Gerätestatus.
  Monitoring trennt Übersicht, Upload-Suche und Aktivität; technische IDs und
  vollständige Fehler stehen in Details. Protokoll zeigt kompakte, aufklappbare
  Gruppen und benennt seine Suchgrenze (letzte 300 Einträge).
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
  Bug A besteht weiterhin aus Atta-Höhle und Felsenmeer. Alte Namen dienen nur
  der eindeutigen Detailbearbeitung, nicht als parallele Bereichsstruktur.
- Die Sektorverwaltung übernimmt die aufklappbaren Hauptbereiche der Boulderansicht.
  Darunter steht genau eine Karte pro logischem Teilbereich, dieselben 18 Einträge
  wie auf der Hallenkarte. Bug A erscheint genau einmal. Keine äußere Card um die Liste.
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
- Native Aktionen und In-App-Links verwenden validierte interne Ziele. Queries und
  Änderungen sind kontogebunden. Markengrün, gemeinsame Controls und Radien bleiben.

Prüfbelege: `docs/qa/2026-09-15-notifications.md`, `e2e/notifications.spec.ts`,
`test/notifications.test.mjs`, `test/pushRegistration.test.mjs`.
