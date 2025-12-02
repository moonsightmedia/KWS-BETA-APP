Kletterwelt Boulder App – Style Guide (aus `generated-page.html`)

Dieser Style Guide dokumentiert Farben, Typografie, Abstände, Radien, Schatten, Motion sowie das Komponenten‑Inventar exakt so, wie es in `generated-page.html` umgesetzt ist. Er dient als Referenz für die spätere Komponenten‑Extraktion. Die Optik bleibt unverändert.

1. Farbpalette

- Basis
  - Hintergrund: `#F9FAF9` (App‑Hintergrund, Inputs, Chips)
  - Text primär: `#13112B` (Haupttext/Icons), genutzt mit Opazitäten: `/30`, `/40`, `/50`, `/60`, `/70`
  - Weiß: `#FFFFFF` (Flächen, Karten, Buttons)
  - Rahmen/Divider: `#E7F7E9` (Borders, Trennlinien, aktive Sidebar‑Hinterlegung)
  - Schwarz: `#000000` (Overlays, Gradients mit Opazität)
- Primär / Akzent
  - Primärgrün: `#36B531` (Primärbutton, aktive Tabs, Akzenttexte, Status, FAB)
  - Primärgrün (Active‑Variante): `#2DA029` (FAB `active:bg`)
  - Auswahl‑Hintergrund: `#E7F7E9` (aktive Sidebar‑Items, Text‑Selektion)
  - Auswahl‑Text (Selection): `#13112B`
- Status / Zusatzfarben
  - Blau: `#5681EA` (Statusdot, Farbdot)
  - Orange: `#E08636` (Draft‑Badge, Farbdot)
  - Rot: `#D65448` (Farbdot, Color‑Row). Fehler‑Toast nutzt `red-100` (Tailwind) als Rahmen
  - Gelb: `#ECD348` (Farbdot)
  - Lila: `#8E44ED` (Farbdot)
  - Schwarzton: `#1F1E31` (Farbdot „Black“)
  - Grün (Dot‑Variante): `#69B54A` (Farbdot „Green“)
- Neutrals (Tailwind‑Grau, exemplarisch)
  - `gray-100/200/300/400/600` (Skeletons, Labels, Sekundärtexte, Badges, Platzhalter)
- Tailwind‑Farbnutzen (zusätzlich zu Hex‑Farben)
  - `orange-400` (kleiner Status‑Dot in BatchUploadRow)
  - `blue-500` (Farbdot in UploadQueueItem)
  - `red-100` (Fehler‑Toast Rahmen)
- Fokus/Ring
  - Inputs Focus/Ring: `#36B531`
  - Radio Color Ring: `#13112B`
- Overlays/Transparenzen
  - Modal Backdrop: `#13112B/30`
  - Gradient‑Overlay: `black/60 → transparent`
  - Mobile Bottom Nav: `#13112B/90` (mit Blur)

2. Typografie

- Body‑Font: `Poppins`, sans‑serif (global auf `body`)
- Heading‑Font: `Teko`, sans‑serif (auf `h1–h4`, `.font-heading`)
- Hierarchie (via verwendeter Tailwind‑Sizes)
  - App‑Titel im Header: `text-2xl` – `Teko`, fett
  - Sektionstitel (Systemübersicht): `text-4xl` – `Teko`, fett
  - Subtitel/Blocktitel: `text-2xl` – `Teko`
  - View‑Titel (Generic/Upload): `text-3xl` – `Teko`, fett
  - Card‑Titel: `text-xl` – `Teko`/`Poppins` je nach Karte
  - Body: `text-base`; Sekundär: `text-sm`; Labels/Badges: `text-xs`, oft `uppercase`/`tracking-wide`
- Extras: `font-mono` für LIVE‑Badge, `uppercase` in Sidebar‑Gruppen, `tracking-wide` bei Headlines

3. Spacing, Radien, Schatten, Motion

- Spacing (aus Markup)
  - Häufig: `p-4`, `p-8`, `px-2/3/4/5/6`, `py-1/1.5/2/2.5/3`, `gap-2/3/4/6/8`
  - Feinheiten: `py-0.5`, `top-3.5`, `-mr-2`, `-space-x-2`
  - Größen: Header `h-14` (`lg:h-16`); Sidebar `w-64`; Safe‑Area: `pb-safe`, `pb-safe-plus`
- Radien
  - Controls: `rounded-lg`, `rounded-xl`
  - Cards/Modals: `rounded-2xl`, `rounded-3xl`
  - Pills/Avatare: `rounded-full`
  - Spezifika: `rounded-r-xl`, `rounded-l-sm` (Termin/Planning‑Card)
- Schatten
  - `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`
  - Farbschatten: `shadow-[#36B531]/20` (Buttons), stärker bei FAB‑Hover `shadow-[#36B531]/30–40`
- Motion/States
  - Fade‑In: `.fade-in` (Opacity + Translate‑Y)
  - Modal‑Enter: `.modal-enter` (Bottom‑In, cubic‑bezier)
  - Active Scale: `active:scale-95` breit eingesetzt (Buttons/Nav)
  - Hover‑Transitions: Farbe/Opacity/Shadow
  - Toggle: Peer‑Switch; `.toggle-checkbox` + `peer-checked:bg-[#36B531]`

4. Komponenten‑Inventar

- Layout
  - AppContainer
    - Ort: `body > div.flex.flex-col.h-screen`
    - Zweck: Hauptwrapper (Header, Main), Desktop‑Inset via `lg:pl-64`.
  - AppHeader
    - Ort: `header` (Titel `#header-title`, Glocke/LIVE rechts, darunter ContextSwitcher)
    - Zweck: Obere Appbar inkl. Tabs‑Leiste.
  - ContextSwitcher
    - Ort: Header‑Unterzeile (`#tab-user`, `#tab-setter`, `#tab-admin`)
    - Zweck: Wechselt Bereich User/Setter/Admin; aktives Tab grün.
  - DesktopSidebar
    - Ort: `aside` links; Gruppen „User/Setter/Admin“
    - Zweck: Desktop‑Navigation; aktives Item grün hinterlegt; Profil‑Footer.
  - MobileBottomNav
    - Ort: `nav.fixed.bottom-6`; Gruppencontainer `#nav-group-user|setter|admin`
    - Zweck: Mobile Navigation pro Bereich; Items `#mobile-*`.
  - MainViewport
    - Ort: `main`
    - Zweck: Scrollbarer Inhaltsbereich für Views.

- Views
  - SystemView
    - Ort: `#view-system`
    - Zweck: Design/Komponenten‑Übersicht (Inputs, Buttons, Chips, Cards, Tools, States).
  - GenericView
    - Ort: `#view-generic`
    - Zweck: Platzhalterseite mit dynamischem Titel/Icon (`#dynamic-*`).
  - UploadView
    - Ort: `#view-upload`
    - Zweck: Upload‑Queue inkl. FABs (Upload All, Add New).

- UI‑Basiskomponenten
  - PrimaryButton / SecondaryButton / IconButton
    - Ort: SystemView → Interaktionen & Inputs → Buttons
    - Zweck: Primärer CTA (grün), sekundärer (weiß/border), Icon‑Aktionen.
  - TextInput / SearchInput / TextArea / DateInput
    - Ort: SystemView → Inputs
    - Zweck: Formularelemente mit grünem Fokus‑Ring; Search mit Prefix‑Icon.
  - ToggleSwitch
    - Ort: SystemView (Karte) und ColorManagementRow
    - Zweck: Binärer Status; aktiv grün.
  - FilterChip
    - Ort: SystemView → Filter & Sort Chips
    - Zweck: Kategorie/Sort‑Filter; aktiv dunkel, inaktiv weiß/border; optional Dropdown‑Chevron.
  - DropdownMock
    - Ort: SystemView → Dropdown / Select
    - Zweck: Selektor‑Darstellung (ohne Logik; visuelle Referenz).
  - ToastSuccess / ToastError
    - Ort: SystemView → Zustände & Feedback → Toasts
    - Zweck: Erfolg (dunkler Toast mit grünem Icon) / Fehler (weiß, roter Ton).
  - SkeletonBlock
    - Ort: SystemView → Zustände & Feedback → Skeleton
    - Zweck: Ladezustand mit animierten grauen Blöcken.
  - EmptyState
    - Ort: SystemView → Zustände & Feedback; auch in GenericView (Hero‑Empty)
    - Zweck: Leerer Zustand mit Icon, Kurztext, optionaler Aktion.

- Karten / Feature‑Elemente
  - BoulderCard
    - Ort: SystemView → Cards & Views (erste Karte)
    - Zweck: Boulder mit Bild, Name, Sektor, Setter, Grad‑Badge, Statusicon.
  - DraftBoulderCard
    - Ort: SystemView → Cards & Views (zweite Karte)
    - Zweck: Entwurf ohne Medien; „DRAFT“‑Badge (orange), Edit‑Aktion.
  - SectorCard
    - Ort: SystemView → Cards & Views (dritte Karte)
    - Zweck: Sektor mit Bild‑Header, Gradient, Titel, Infozeile, Details‑Button.
  - UserCard
    - Ort: SystemView → Cards & Views (vierte Karte)
    - Zweck: Kompakte Benutzerkarte mit Initial‑Avatar und Menü.
  - PlanningCard (TerminCard)
    - Ort: SystemView → Cards & Views (fünfte Karte)
    - Zweck: Termin‑Hinweis mit grünem Seitenindikator und Teilnehmer‑Avataren.
  - BatchUploadRow
    - Ort: SystemView → Admin & Setter Tools
    - Zweck: Eingabezeile für Batch‑Uploads (Checkbox, Medien‑Slot, 3 Felder).
  - ColorManagementRow
    - Ort: SystemView → Admin & Setter Tools
    - Zweck: Farbreihe mit Farbkugel, Hex‑Wert, Aktiv‑Switch, Edit‑Aktion.
  - SectorManagementRow
    - Ort: SystemView → Admin & Setter Tools
    - Zweck: Sortierbare Sektorzeile mit Griff‑Icon und Aktionen (QR, Edit).
  - UploadQueueItem
    - Ort: UploadView → Kartenliste
    - Zweck: Boulder in Upload‑Queue mit Vorschaubild/Status, Name, Farbe, Sektor, Grad, Ready‑Badge, Löschen.
  - UploadAllFab / AddNewFab
    - Ort: UploadView → FABs Container (rechts unten)
    - Zweck: Sammel‑Upload; „Neuer Boulder“ hinzufügen (öffnet Modal).
  - NewBoulderModal
    - Ort: `#upload-modal`
    - Zweck: Erfassung (Name, Schwierigkeit 1–8, Farbe, Sektor‑Scroller, Routenschrauber‑Tags) mit Footer‑Aktionen.

- Navigation/Logik‑Referenz (für spätere Umsetzung)
  - Router (`router(pageId)`) und `pages`
    - Ort: `<script>` am Ende der Datei
    - Zweck: Schaltet Sidebar, Tabs, MobileNav und Views.
    - Routen: `dashboard`, `boulder`, `sektoren`, `setter-boulder`, `upload`, `planung`, `settings`, `users`, `system`
    - Gruppen: `user`, `setter`, `admin`

5. Interaktionsmuster (UX‑Leitplanken)

- Hover/Active: sanfte Farbwechsel, `active:scale-95`
- Fokus: grüne Border/Rings auf Inputs; klare Aktivzustände bei Tabs/Chips/Radio
- Difficulty‑Radiogrid: 1–8, `checked` invertiert (grün) mit Shadow
- Farbdots: `checked` mit Ring (`#13112B`) und leichtem Scale
- Horizontal‑Snap: `snap-scroll`/`snap-child` (Sektorwahl)
- Modal: mobil unten einfahrend, Desktop zentriert; Blur‑Backdrop

6. Icons & Bilder

- Icons: Lucide (CDN), global `stroke-width: 1.5`
- Avatare: Initialen/Placeholders, `rounded-full`, teils `animate-pulse`
- Bilder: Unsplash‑Beispiele; Overlays via Gradients/Opacity

7. Designprinzipien (Zusammenfassung)

- Helle, ruhige Flächen mit dunkelblauem Text und frischem Primärgrün
- Großzügige Abstände, weiche Radien, dezente Schatten
- Mobile‑First: dedizierte Mobile Bottom Nav, Safe‑Area‑Padding
- Rollen‑Kontext sichtbar (Tabs, gruppierte Navigation)

8. Nächste Schritte (ohne Optikänderung)

- Projektstruktur/Technologie vorschlagen (z. B. React + TypeScript + Tailwind)
- Routen/Views aus `pages`/`router` auf App‑Routing mappen
- Komponenten nach diesem Style Guide 1:1 aus dem HTML extrahieren
