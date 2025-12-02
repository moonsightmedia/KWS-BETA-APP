# Kletterwelt Boulder App – Web Client

Dieses Projekt ist der Web-Client für die Kletterwelt-Boulder-App.  
Die App soll mobile-first funktionieren und später auch als White-Label-Lösung für andere Kletter- und Boulderhallen nutzbar sein.

Aktuell liegt ein von Aura generiertes **HTML-Prototyp-Layout** vor (`generated-page.html`), das bereits:
- das grundlegende Layout (Header, Kontext-Switch, Sidebar, Mobile-Nav),
- Beispiel-Views für User/Setter/Admin
- und ein Mini-Designsystem mit Buttons, Inputs, Cards, Zuständen

definiert. :contentReference[oaicite:1]{index=1}

---

## Ziele

- Bestehendes HTML-Design **1:1 als Style Guide und Komponentenbibliothek extrahieren**.
- Daraus eine **strukturierte App** aufbauen mit:
    - klaren Rollen (User, Setter, Admin),
    - sauberer Navigation,
    - echten Views für Boulder, Upload und Planung.
- Schrittweise von einer statischen HTML-Seite zu einer **sauberen, komponentenbasierten Codebasis** (z. B. React + TypeScript + Tailwind).

---

## Rollen & Bereiche

Es gibt drei Rollen, die unterschiedliche Bereiche sehen:

- **User**
    - Dashboard
    - Boulder
    - Sektoren

- **Setter**
    - Boulder (Verwaltung)
    - Upload (Drafts + Upload-Queue)
    - Planung (Schraubtermine)

- **Admin**
    - Einstellungen
    - Benutzer
    - System (Designsystem / Meta-Bereich)

Die Zuordnung der Routen ist in der aktuellen HTML-Datei über das `pages`-Objekt und die `router(pageId)`-Funktion definiert. :contentReference[oaicite:2]{index=2}

---

## Aktuelles Layout (aus generated-page.html)

Das bestehende HTML definiert bereits:

- **Desktop-Layout**
    - Linke Sidebar mit drei Gruppen:
        - User Area: Dashboard, Boulder, Sektoren
        - Setter Area: Bearbeiten (setter-boulder), Upload, Planung
        - Admin Area: Einstellungen, Benutzer, System
    - Oben eine Header-Bar mit Titel + Kontext-Switch (User / Setter / Admin Tabs)
    - Content-Bereich mit:
        - „System View“ (Designsystem / Komponentenübersicht)
        - „Generic View“ für generische Seiten
        - „Upload View“ für Upload-Queue

- **Mobile-Layout**
    - Header oben (Avatar links, Titel in der Mitte, Icon rechts)
    - Darunter Kontext-Switch (User / Setter / Admin)
    - Unten eine **mobile Bottom-Navigation** mit drei Gruppen:
        - User: Dash, Boulder, Sektoren
        - Setter: Edit, Upload, Plan
        - Admin: Set, User, Sys

- **Komponenten-Beispiele**
    - Textfelder, Textareas, Suche, Datum
    - Buttons (Primary, Secondary, Icon-Buttons)
    - Toggles, Filterchips, Dropdown-Mock
    - Boulder-Card, Draft-Card, Sektor-Card, User-Card, Termin-Card
    - Batch-Upload-Zeile, Color-Management-Row, Sektor-Management-Row
    - Skeleton Loading, Toasts, Empty State
    - Upload-Queue-View mit FAB („Upload All“ + „Add New“)
    - Modal „Neuer Boulder“ mit:
        - Name
        - Difficulty 1–8 (Radio-Grid)
        - Farbe (Farbdots)
        - Sektor (Horizontale Auswahl)
        - Routenschrauber (Tag-Input)

Diese Komponenten bilden die **visuelle und strukturelle Grundlage** für das spätere Komponentensystem.

---

## Ziel-Architektur (Client)

Empfohlene Struktur (konzeptionell):

- `src/`
    - `components/`
        - `layout/` (Header, Sidebar, BottomNav, ContextSwitcher)
        - `ui/` (Buttons, Inputs, Chips, Cards, Modals, Toasts, Skeletons)
    - `features/`
        - `user/` (Dashboard, Boulder-Ansicht, Sektoren)
        - `setter/` (Boulder-Verwaltung, Upload, Planung)
        - `admin/` (Einstellungen, Benutzer, System)
    - `router/` (Routing, Role-Guard)
    - `styles/` (Tailwind Config, globales Styling)
    - `lib/` (Hilfsfunktionen, z. B. Zustand für Upload-Queue)

Technisch kann das z. B. mit **React + TypeScript + Tailwind** umgesetzt werden. Die konkrete Wahl klären wir mit Junie in den ersten Schritten.

---

## Geplante Schritte mit Junie (JetBrains)

1. **Style Guide & Komponenten-Inventar aus generated-page.html extrahieren**
    - Farben, Typografie, Spacing, Shadows, Border-Radius
    - Liste aller vorhandenen UI-Komponenten
    - Vereinheitlichte Komponenten-Namen

2. **Layout-Komponenten aufsetzen**
    - Header, Context Switcher
    - Desktop Sidebar
    - Mobile Bottom Navigation
    - View-Switching (User / Setter / Admin, plus einzelne Routen)

3. **UI-Komponenten extrahieren**
    - BoulderCard, DraftCard, SektorCard, TerminCard, BatchUploadRow, etc.
    - Buttons, Inputs, Chips, Toasts, EmptyStates, Modals

4. **Routen & Views anlegen**
    - Für alle im `pages`-Objekt definierten Routen

5. **Später: Datenmodell & Logik**
    - Boulder Drafts, Upload-Queue, Planung, Admin-Management
    - API-Anbindung / Mock-Data

**Wichtig:**  
Alle existierenden UI-Komponenten aus `generated-page.html` bleiben in Look & Feel **exakt erhalten**. Neues UI muss sich daran ausrichten.
