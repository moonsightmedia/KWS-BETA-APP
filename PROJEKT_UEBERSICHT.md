# KWS Beta App - Projektübersicht

## 📋 Inhaltsverzeichnis

1. [Projektbeschreibung](#projektbeschreibung)
2. [Technologie-Stack](#technologie-stack)
3. [Projektstruktur](#projektstruktur)
4. [Funktionalitäten](#funktionalitäten)
5. [Datenbank-Schema](#datenbank-schema)
6. [Authentifizierung & Rollen](#authentifizierung--rollen)
7. [Storage-Lösung](#storage-lösung)
8. [Routen & Seiten](#routen--seiten)
9. [Komponenten](#komponenten)
10. [Hooks & Utilities](#hooks--utilities)
11. [Deployment](#deployment)
12. [Scripts & Tools](#scripts--tools)
13. [Umgebungsvariablen](#umgebungsvariablen)
14. [Entwicklung](#entwicklung)

---

## 🎯 Projektbeschreibung

**KWS Beta App** ist eine Web-Anwendung zur Verwaltung und Übersicht von Bouldern (Kletterrouten) für die Kletterwelt Sauerland. Die App ermöglicht es Benutzern, Boulders zu durchsuchen, Beta-Videos anzusehen, Statistiken einzusehen und (je nach Rolle) Boulders zu verwalten.

### Hauptfunktionen:
- 📊 Dashboard mit Statistiken und Charts
- 🧗 Boulder-Übersicht mit Filtern und Suche
- 🎥 Beta-Video-Integration
- 🎨 Farbverwaltung für Boulders
- 📍 Sektor-Verwaltung
- 👥 Benutzer- und Rollenverwaltung
- 🔧 Admin-Panel
- 🎬 Setter-Bereich für Boulder-Erstellung

---

## 🛠 Technologie-Stack

### Frontend
- **React 18.3.1** - UI-Framework
- **TypeScript 5.8.3** - Typsicherheit
- **Vite 5.4.19** - Build-Tool und Dev-Server
- **React Router DOM 6.30.1** - Routing
- **TanStack Query 5.83.0** - Daten-Fetching und Caching
- **Tailwind CSS 3.4.17** - Styling
- **shadcn/ui** - UI-Komponenten-Bibliothek (Radix UI)
- **Recharts 2.15.4** - Charts und Diagramme
- **React Hook Form 7.61.1** - Formular-Handling
- **Zod 3.25.76** - Schema-Validierung
- **date-fns 3.6.0** - Datum-Formatierung
- **Lucide React** - Icons

### Backend & Services
- **Supabase 2.76.1** - Backend-as-a-Service
  - PostgreSQL-Datenbank
  - Authentifizierung (Email/Password)
  - Row Level Security (RLS)
  - Storage (optional, als Fallback)
- **All-Inkl** - Externes Storage für Videos
  - PHP-basierte Upload/Delete-API
  - Chunked Upload für große Dateien

### Development Tools
- **ESLint** - Code-Linting
- **TypeScript ESLint** - TypeScript-spezifische Linting-Regeln
- **PostCSS** - CSS-Processing
- **Autoprefixer** - CSS-Vendor-Prefixes

---

## 📁 Projektstruktur

```
KWS-BETA-APP/
├── src/
│   ├── components/          # React-Komponenten
│   │   ├── admin/          # Admin-spezifische Komponenten
│   │   │   ├── BoulderManagement.tsx
│   │   │   ├── ColorManagement.tsx
│   │   │   ├── SectorManagement.tsx
│   │   │   └── UserManagement.tsx
│   │   ├── ui/             # shadcn/ui Komponenten
│   │   ├── BoulderDetailDialog.tsx
│   │   ├── CategoryChart.tsx
│   │   ├── DashboardHeader.tsx
│   │   ├── DifficultyDistributionChart.tsx
│   │   ├── MaterialIcon.tsx
│   │   ├── RequireAuth.tsx
│   │   ├── Sidebar.tsx
│   │   └── StatCard.tsx
│   ├── data/
│   │   └── mockData.ts     # Mock-Daten für Entwicklung
│   ├── hooks/              # Custom React Hooks
│   │   ├── useAuth.tsx
│   │   ├── useBoulders.tsx
│   │   ├── useColors.ts
│   │   ├── useHasRole.ts
│   │   ├── useIsAdmin.tsx
│   │   ├── usePreloadBoulderThumbnails.tsx
│   │   ├── usePreloadSectorImages.tsx
│   │   ├── useSectors.tsx
│   │   ├── useSectorSchedule.ts
│   │   ├── useStatistics.tsx
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts   # Supabase Client-Konfiguration
│   │       ├── storage.ts  # Storage-Utilities
│   │       └── types.ts    # TypeScript-Typen aus Supabase
│   ├── lib/
│   │   ├── dataTransformers.ts
│   │   └── utils.ts         # Utility-Funktionen
│   ├── pages/               # Seiten-Komponenten
│   │   ├── Admin.tsx
│   │   ├── Auth.tsx
│   │   ├── Boulders.tsx
│   │   ├── Guest.tsx
│   │   ├── Index.tsx        # Dashboard
│   │   ├── NotFound.tsx
│   │   ├── Profile.tsx
│   │   ├── Sectors.tsx
│   │   └── Setter.tsx
│   ├── types/
│   │   └── boulder.ts       # TypeScript-Typen
│   ├── App.tsx              # Haupt-App-Komponente
│   ├── App.css
│   ├── index.css
│   └── main.tsx             # Entry Point
├── public/                   # Statische Assets
│   ├── favicon.ico
│   ├── manifest.webmanifest
│   ├── robots.txt
│   ├── service-worker.js
│   └── [Logo-Dateien]
├── supabase/
│   ├── config.toml
│   └── migrations/          # Datenbank-Migrationen (33 Dateien)
├── upload-api/              # PHP-API für All-Inkl Storage
│   ├── upload.php
│   ├── delete.php
│   ├── list-videos.php
│   ├── video-proxy.php
│   ├── .htaccess
│   ├── README.md
│   ├── QUICK-START.md
│   └── [weitere Dokumentation]
├── scripts/                 # Node.js-Scripts
│   ├── migrate-videos-to-allinkl.js
│   ├── check-video-urls.js
│   ├── fix-video-urls.js
│   ├── cleanup-unused-videos.js
│   └── README.md
├── docs/                    # SQL-Scripts
│   ├── COLANCED_BACKFILL_FROM_BOULDERS.sql
│   ├── COLORS_RECREATE.sql
│   └── COLORS_SETUP.sql
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json              # Vercel-Deployment-Konfiguration
├── README.md
├── SETUP.md                 # Setup-Anleitung für All-Inkl
└── OPTIMIERUNGEN.md         # Performance-Optimierungen
```

---

## ⚙️ Funktionalitäten

### 1. Dashboard (Index)
- **Statistiken-Karten:**
  - Gesamtanzahl Boulders
  - Neue Boulders seit letztem Update
  - Letztes Update-Datum
- **Charts:**
  - Schwierigkeitsverteilung (Difficulty Distribution)
  - Farbverteilung (Category Chart)
- **Sektor-Planung:**
  - Anzeige kommender Schraubtermine
  - Letzte Schraubtermine
- **Persönliche Begrüßung** mit Namen

### 2. Boulder-Übersicht
- **Filter:**
  - Nach Sektor
  - Nach Schwierigkeit (1-8 oder "?")
  - Nach Farbe
  - Nach Status (hängt/abgeschraubt)
- **Suche** nach Boulder-Namen
- **Boulder-Detail-Dialog:**
  - Name, Sektor, Schwierigkeit, Farbe
  - Beta-Video (falls vorhanden)
  - Thumbnail-Bild
  - Notizen
  - Status

### 3. Sektor-Übersicht
- Liste aller Sektoren
- Sektor-Bilder
- Boulder-Anzahl pro Sektor
- Beschreibungen
- Schraubtermine

### 4. Setter-Bereich
- **Boulder-Erstellung:**
  - Wizard-Interface
  - Name, Sektor, Schwierigkeit, Farbe
  - Beta-Video-Upload (mit Progress)
  - Thumbnail-Upload
  - Notizen
- **Boulder-Bearbeitung:**
  - Bestehende Boulders bearbeiten
  - Video/Thumbnail aktualisieren
- **Status-Verwaltung:**
  - Boulder als "hängt" oder "abgeschraubt" markieren
- **Planungsansicht:**
  - Sektor-Planung einsehen

### 5. Admin-Panel
- **Boulder-Verwaltung:**
  - CRUD-Operationen für Boulders
  - Bulk-Operationen
- **Farb-Verwaltung:**
  - Farben hinzufügen/bearbeiten/löschen
  - Hex-Codes verwalten
  - Sortierreihenfolge
  - Aktiv/Inaktiv-Status
- **Sektor-Verwaltung:**
  - Sektoren erstellen/bearbeiten/löschen
  - Sektor-Bilder hochladen
  - Schraubtermine verwalten
- **Benutzer-Verwaltung:**
  - Benutzer-Liste
  - Rollen zuweisen
  - Profile verwalten

### 6. Profil-Seite
- Benutzer-Informationen anzeigen
- Profil bearbeiten
- Geburtsdatum, Name, etc.

### 7. Authentifizierung
- **Registrierung:**
  - Email/Password
  - Optionale Metadaten (Name, Geburtsdatum)
- **Login:**
  - Email/Password
- **Passwort-Reset:**
  - Email-basiert
- **Session-Management:**
  - Automatische Session-Erneuerung
  - Logout

### 8. Gast-Modus
- Öffentliche Boulder-Übersicht
- Keine Authentifizierung erforderlich
- Eingeschränkte Funktionen

---

## 🗄 Datenbank-Schema

### Tabellen

#### `boulders`
- `id` (UUID, Primary Key)
- `name` (String)
- `sector_id` (UUID, Foreign Key → sectors)
- `sector_id_2` (UUID, optional, Foreign Key → sectors)
- `difficulty` (Integer, 1-8, nullable für "?")
- `color` (String, Foreign Key → colors.name)
- `beta_video_url` (String, nullable)
- `thumbnail_url` (String, nullable)
- `note` (Text, nullable)
- `status` (Enum: 'haengt' | 'abgeschraubt')
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### `sectors`
- `id` (UUID, Primary Key)
- `name` (String, unique)
- `description` (Text, nullable)
- `image_url` (String, nullable)
- `next_schraubtermin` (Date, nullable)
- `last_schraubtermin` (Date, nullable)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### `colors`
- `id` (UUID, Primary Key)
- `name` (String, unique)
- `hex` (String, Hex-Code)
- `sort_order` (Integer)
- `is_active` (Boolean)
- `inserted_at` (Timestamp)
- `updated_at` (Timestamp)

#### `profiles`
- `id` (UUID, Primary Key, Foreign Key → auth.users)
- `email` (String, nullable)
- `first_name` (String, nullable)
- `last_name` (String, nullable)
- `full_name` (String, nullable)
- `birth_date` (Date, nullable)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### `user_roles`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → auth.users)
- `role` (String: 'admin' | 'setter' | 'user')
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### `sector_schedule`
- `id` (UUID, Primary Key)
- `sector_id` (UUID, Foreign Key → sectors)
- `scheduled_date` (Date)
- `notes` (Text, nullable)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Funktionen

#### `has_role(role_name text)`
- Prüft, ob der aktuelle Benutzer eine bestimmte Rolle hat
- Wird für Row Level Security verwendet
- Security Definer Function

### Row Level Security (RLS)

- **Boulders:**
  - Lesen: Alle (auch anonym)
  - Schreiben: Nur Setter/Admin
  - Löschen: Nur Admin
- **Sectors:**
  - Lesen: Alle
  - Schreiben: Nur Admin
- **Colors:**
  - Lesen: Alle
  - Schreiben: Nur Admin
- **Profiles:**
  - Lesen: Eigene oder Admin
  - Schreiben: Eigene oder Admin
- **User Roles:**
  - Lesen: Eigene oder Admin
  - Schreiben: Nur Admin

---

## 🔐 Authentifizierung & Rollen

### Rollen-System

1. **Admin**
   - Vollzugriff auf alle Funktionen
   - Benutzer- und Rollenverwaltung
   - Alle CRUD-Operationen

2. **Setter**
   - Boulder erstellen/bearbeiten
   - Videos hochladen
   - Status ändern
   - Sektor-Planung einsehen

3. **User** (Standard)
   - Boulder ansehen
   - Statistiken einsehen
   - Profil bearbeiten

4. **Gast** (Anonym)
   - Öffentliche Boulder-Übersicht
   - Eingeschränkte Funktionen

### Authentifizierungs-Flow

1. **Registrierung:**
   - Benutzer registriert sich mit Email/Password
   - Trigger erstellt automatisch Profil
   - Standard-Rolle "user" wird zugewiesen

2. **Login:**
   - Supabase Auth prüft Credentials
   - Session wird erstellt
   - Benutzer-Metadaten werden synchronisiert

3. **Session-Management:**
   - Automatische Token-Erneuerung
   - Session-Persistenz im LocalStorage
   - Auto-Logout bei Ablauf

### Hooks

- `useAuth()` - Authentifizierungs-Context
- `useIsAdmin()` - Prüft Admin-Rolle
- `useHasRole(role)` - Prüft spezifische Rolle
- `RequireAuth` - Route-Guard-Komponente

---

## 💾 Storage-Lösung

### Hybrid-Ansatz: Supabase + All-Inkl

Die App unterstützt zwei Storage-Backends:

#### 1. All-Inkl Storage (Empfohlen)
- **Vorteile:**
  - Geringere Kosten
  - Unbegrenzte Speicherkapazität
  - Schnelle Uploads
- **Features:**
  - Chunked Upload für große Dateien (>5MB)
  - Progress-Tracking
  - CORS-Unterstützung
  - PHP-basierte API
- **Struktur:**
  ```
  uploads/
  ├── videos/        # Beta-Videos
  └── sectors/       # Sektor-Bilder
  ```

#### 2. Supabase Storage (Fallback)
- Wird verwendet, wenn `VITE_USE_ALLINKL_STORAGE=false`
- Automatischer Fallback bei Fehlern

### Upload-API (All-Inkl)

**Endpoints:**
- `POST /upload-api/upload.php` - Datei hochladen
- `DELETE /upload-api/delete.php` - Datei löschen
- `GET /upload-api/list-videos.php` - Video-Liste
- `GET /upload-api/video-proxy.php` - Video-Proxy

**Features:**
- Dateityp-Validierung
- Größen-Limits
- Sichere Dateinamen
- Chunked Upload
- Progress-Tracking

### Storage-Utilities

- `src/integrations/supabase/storage.ts` - Storage-Helper-Funktionen
- Automatische URL-Generierung
- Fallback-Logik

---

## 🗺 Routen & Seiten

### Routen-Struktur

```
/                    → Index (Dashboard) - Auth erforderlich
/sectors             → Sektor-Übersicht
/boulders            → Boulder-Übersicht
/auth                → Authentifizierung (Login/Register)
/profile             → Benutzer-Profil
/admin               → Admin-Panel - Admin erforderlich
/setter              → Setter-Bereich - Setter/Admin erforderlich
/guest               → Gast-Modus (öffentlich)
/*                   → 404 Not Found
```

### Seiten-Komponenten

1. **Index.tsx** - Dashboard mit Statistiken
2. **Sectors.tsx** - Sektor-Übersicht
3. **Boulders.tsx** - Boulder-Übersicht mit Filtern
4. **Auth.tsx** - Login/Register-Formular
5. **Profile.tsx** - Benutzer-Profil
6. **Admin.tsx** - Admin-Panel mit Tabs
7. **Setter.tsx** - Setter-Bereich (große Komponente ~1800 Zeilen)
8. **Guest.tsx** - Öffentliche Boulder-Ansicht
9. **NotFound.tsx** - 404-Seite

---

## 🧩 Komponenten

### Admin-Komponenten
- `BoulderManagement.tsx` - Boulder-CRUD
- `ColorManagement.tsx` - Farb-Verwaltung
- `SectorManagement.tsx` - Sektor-Verwaltung
- `UserManagement.tsx` - Benutzer-Verwaltung

### UI-Komponenten
- `BoulderDetailDialog.tsx` - Boulder-Detail-Modal
- `CategoryChart.tsx` - Farbverteilungs-Chart
- `DifficultyDistributionChart.tsx` - Schwierigkeits-Chart
- `DashboardHeader.tsx` - Dashboard-Header
- `Sidebar.tsx` - Navigation-Sidebar
- `StatCard.tsx` - Statistik-Karte
- `RequireAuth.tsx` - Route-Guard
- `MaterialIcon.tsx` - Material-Icon-Wrapper

### shadcn/ui Komponenten
Vollständige UI-Bibliothek mit 40+ Komponenten:
- Button, Input, Dialog, Select, Tabs, etc.
- Alle basierend auf Radix UI
- Tailwind CSS-Styling

---

## 🎣 Hooks & Utilities

### Custom Hooks

#### Daten-Hooks
- `useBoulders()` - Boulder-Daten mit React Query
- `useBouldersWithSectors()` - Boulders mit Sektor-Info
- `useSectors()` - Sektor-Daten
- `useSectorsTransformed()` - Transformierte Sektor-Daten
- `useColors()` - Farb-Daten
- `useStatistics()` - Statistik-Daten
- `useSectorSchedule()` - Sektor-Planung

#### Auth-Hooks
- `useAuth()` - Authentifizierungs-Context
- `useIsAdmin()` - Admin-Check
- `useHasRole(role)` - Rollen-Check

#### Performance-Hooks
- `usePreloadBoulderThumbnails()` - Thumbnail-Preloading
- `usePreloadSectorImages()` - Sektor-Bild-Preloading

#### UI-Hooks
- `use-mobile.tsx` - Mobile-Detection
- `use-toast.ts` - Toast-Notifications

### Utilities

- `lib/utils.ts` - Allgemeine Utility-Funktionen (cn, etc.)
- `lib/dataTransformers.ts` - Daten-Transformationen
- `integrations/supabase/client.ts` - Supabase-Client
- `integrations/supabase/storage.ts` - Storage-Utilities

---

## 🚀 Deployment

### Vercel (Aktuell)

**Konfiguration:** `vercel.json`
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Build-Kommandos:**
- Build: `npm run build`
- Dev Build: `npm run build:dev`

**Umgebungsvariablen:**
- Müssen in Vercel-Dashboard gesetzt werden
- Siehe [Umgebungsvariablen](#umgebungsvariablen)

### Alternative Deployment-Optionen

- **Netlify** - Ähnlich wie Vercel
- **Cloudflare Pages** - CDN-Integration
- **Eigener Server** - Node.js/nginx

---

## 📜 Scripts & Tools

### NPM Scripts

```json
{
  "dev": "vite",                    // Dev-Server starten
  "build": "vite build",            // Production Build
  "build:dev": "vite build --mode development",
  "lint": "eslint .",               // Code-Linting
  "preview": "vite preview",         // Build-Vorschau
  "migrate:videos": "...",           // Video-Migration
  "check:video-urls": "...",         // URL-Check
  "fix:video-urls": "...",           // URL-Fixes
  "cleanup:videos": "...",           // Video-Cleanup
  "cleanup:videos:dry-run": "..."    // Cleanup-Test
}
```

### Node.js Scripts

#### `migrate-videos-to-allinkl.js`
- Migriert Videos von Supabase zu All-Inkl
- URL-Updates in Datenbank

#### `check-video-urls.js`
- Prüft Video-URLs auf Gültigkeit
- Findet defekte Links

#### `fix-video-urls.js`
- Repariert defekte Video-URLs
- Automatische URL-Korrektur

#### `cleanup-unused-videos.js`
- Findet ungenutzte Videos
- Optionale Löschung (--dry-run für Test)

---

## 🔧 Umgebungsvariablen

### Erforderliche Variablen

```env
# Supabase
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]

# Storage (Optional)
VITE_USE_ALLINKL_STORAGE=true
VITE_ALLINKL_API_URL=https://cdn.kletterwelt-sauerland.de/upload-api
```

### Umgebungsdateien

- `.env.local` - Lokale Entwicklung (nicht versioniert)
- `.env.production` - Production (optional)
- `.env` - Fallback

### Variablen-Usage

- Alle Variablen müssen mit `VITE_` beginnen (Vite-Anforderung)
- Zugriff im Code: `import.meta.env.VITE_*`
- Nach Änderungen: Dev-Server neu starten

---

## 💻 Entwicklung

### Setup

1. **Repository klonen:**
   ```bash
   git clone [repository-url]
   cd KWS-BETA-APP
   ```

2. **Dependencies installieren:**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen setzen:**
   ```bash
   cp .env.example .env.local
   # Bearbeite .env.local mit deinen Werten
   ```

4. **Dev-Server starten:**
   ```bash
   npm run dev
   ```

5. **App öffnen:**
   - http://localhost:8080

### Entwicklungsworkflow

1. **Feature-Branch erstellen:**
   ```bash
   git checkout -b feature/neue-funktion
   ```

2. **Änderungen machen:**
   - Code schreiben
   - Tests (falls vorhanden)
   - Linting: `npm run lint`

3. **Commit & Push:**
   ```bash
   git add .
   git commit -m "Beschreibung"
   git push origin feature/neue-funktion
   ```

4. **Pull Request erstellen**

### Code-Stil

- **TypeScript:** Strikte Typisierung
- **ESLint:** Automatisches Linting
- **Prettier:** (Optional) Code-Formatierung
- **Komponenten:** Functional Components mit Hooks
- **Styling:** Tailwind CSS Utility Classes

### Best Practices

1. **Komponenten:**
   - Kleine, wiederverwendbare Komponenten
   - Props mit TypeScript-Typen
   - React.memo für Performance

2. **Hooks:**
   - Custom Hooks für wiederverwendbare Logik
   - React Query für Daten-Fetching
   - useCallback/useMemo für Performance

3. **Routing:**
   - Lazy Loading für Routen (geplant)
   - Route-Guards mit RequireAuth

4. **State Management:**
   - React Query für Server-State
   - useState/useReducer für lokalen State
   - Context für globale State (Auth)

### Performance-Optimierungen

Siehe `OPTIMIERUNGEN.md` für detaillierte Optimierungsvorschläge:

- ✅ Lazy Loading für Routen
- ✅ React Query Cache-Optimierung
- ✅ React.memo für Komponenten
- ✅ Image-Optimierung
- ✅ Code-Splitting
- ✅ Bundle-Analyse

---

## 📊 Projekt-Statistiken

### Code-Metriken (Geschätzt)

- **TypeScript-Dateien:** ~100+
- **React-Komponenten:** ~50+
- **Custom Hooks:** ~15
- **Datenbank-Migrationen:** 33
- **Routes:** 8
- **UI-Komponenten (shadcn):** 40+

### Dependencies

- **Production Dependencies:** ~30
- **Dev Dependencies:** ~15
- **Gesamt Bundle-Größe:** (siehe Build-Output)

---

## 🔗 Externe Ressourcen

### Dokumentation

- **Supabase:** https://supabase.com/docs
- **React:** https://react.dev
- **React Router:** https://reactrouter.com
- **TanStack Query:** https://tanstack.com/query
- **Tailwind CSS:** https://tailwindcss.com
- **shadcn/ui:** https://ui.shadcn.com

### Projekt-Links

- **Lovable Project:** https://lovable.dev/projects/ed5d82b6-b50a-40cc-893d-87017cd2260a
- **All-Inkl CDN:** https://cdn.kletterwelt-sauerland.de

---

## 📝 Notizen & Wichtige Hinweise

### Bekannte Probleme

- Setter.tsx ist sehr groß (~1800 Zeilen) - sollte aufgeteilt werden
- Nicht alle Routen sind lazy geladen
- Service Worker könnte optimiert werden

### Geplante Features

- Lazy Loading für alle Routen
- Error Boundaries
- Optimistic Updates
- Virtualisierung für lange Listen
- Debouncing für Suche

### Wartung

- Regelmäßige Dependency-Updates
- Performance-Monitoring
- Bundle-Size-Monitoring
- Security-Audits

---

## 👥 Kontakt & Support

Bei Fragen oder Problemen:
- GitHub Issues erstellen
- Lovable Project kontaktieren
- Dokumentation konsultieren

---

**Erstellt:** 2025-01-XX  
**Version:** 0.0.0 (Beta)  
**Status:** In aktiver Entwicklung


