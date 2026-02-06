# KWS Beta App - Konzept & Planungsdokument

**Version:** 1.0.68  
**Stand:** Februar 2026  
**URL:** https://beta.kletterwelt-sauerland.de

---

## 📋 Inhaltsverzeichnis

1. [App-Übersicht](#app-übersicht)
2. [Zielgruppe & Use Cases](#zielgruppe--use-cases)
3. [Kernfunktionalitäten](#kernfunktionalitäten)
4. [Technische Architektur](#technische-architektur)
5. [Rollen & Berechtigungen](#rollen--berechtigungen)
6. [Datenmodell](#datenmodell)
7. [Features im Detail](#features-im-detail)
8. [Deployment & Plattformen](#deployment--plattformen)
9. [Roadmap & Erweiterungen](#roadmap--erweiterungen)
10. [Technische Entscheidungen](#technische-entscheidungen)

---

## 🎯 App-Übersicht

### Vision
Die **KWS Beta App** ist eine digitale Plattform für die Kletterwelt Sauerland, die Boulder-Kletterern eine zentrale Anlaufstelle bietet, um:
- Boulders zu entdecken und zu durchsuchen
- Beta-Videos anzusehen und zu lernen
- Statistiken und Schwierigkeitsverteilungen einzusehen
- Wettkämpfe zu verwalten und zu verfolgen
- Als Setter neue Boulders zu erstellen und zu verwalten

### App-Typ
- **Progressive Web App (PWA)** - funktioniert im Browser und als installierbare App
- **Native App** - verfügbar für Android (Play Store) und iOS (App Store) via Capacitor
- **Mobile-First** - optimiert für Smartphones und Tablets
- **Offline-Fähig** - Service Worker ermöglicht Offline-Nutzung

### Status
✅ **Production Ready** - App ist live und funktionsfähig  
✅ **Multi-Platform** - Web, Android, iOS  
✅ **Beta-Phase** - kontinuierliche Weiterentwicklung

---

## 👥 Zielgruppe & Use Cases

### Primäre Zielgruppen

#### 1. **Kletterer (User)**
- **Ziel:** Boulders finden, Beta-Videos ansehen, Fortschritt tracken
- **Use Cases:**
  - Boulder-Übersicht nach Sektor/Schwierigkeit filtern
  - Beta-Videos für spezifische Boulders ansehen
  - Statistiken über eigene Erfolge einsehen
  - Sektor-Planung für kommende Schraubtermine verfolgen

#### 2. **Setter**
- **Ziel:** Neue Boulders erstellen, Videos hochladen, Status verwalten
- **Use Cases:**
  - Neuen Boulder mit allen Details anlegen
  - Beta-Video und Thumbnail hochladen
  - Boulder-Status ändern (hängt/abgeschraubt)
  - Sektor-Planung einsehen

#### 3. **Administratoren**
- **Ziel:** Vollständige Verwaltung der App und Inhalte
- **Use Cases:**
  - Boulders, Sektoren, Farben verwalten
  - Benutzer und Rollen verwalten
  - Wettkampf-Modus aktivieren/verwalten
  - System-Einstellungen konfigurieren

#### 4. **Gäste (Anonym)**
- **Ziel:** Öffentliche Boulder-Übersicht ohne Registrierung
- **Use Cases:**
  - Boulders durchsuchen
  - Beta-Videos ansehen
  - Eingeschränkte Funktionen nutzen

---

## ⚙️ Kernfunktionalitäten

### 1. **Dashboard**
- **Statistiken-Karten:**
  - Gesamtanzahl Boulders
  - Neue Boulders seit letztem Update
  - Letztes Update-Datum
- **Visualisierungen:**
  - Schwierigkeitsverteilung (Chart)
  - Farbverteilung (Chart)
- **Sektor-Planung:**
  - Kommende Schraubtermine
  - Letzte Schraubtermine
- **Persönliche Begrüßung** mit Benutzernamen

### 2. **Boulder-Verwaltung**
- **Übersicht:**
  - Liste aller Boulders mit Filtern
  - Suche nach Boulder-Namen
  - Filter nach Sektor, Schwierigkeit, Farbe, Status
- **Detailansicht:**
  - Name, Sektor, Schwierigkeit, Farbe
  - Beta-Video (Video-Player)
  - Thumbnail-Bild
  - Notizen
  - Status (hängt/abgeschraubt)
- **Erstellung/Bearbeitung:**
  - Wizard-Interface für neue Boulders
  - Video-Upload mit Progress-Tracking
  - Thumbnail-Upload
  - Notizen hinzufügen

### 3. **Sektor-Verwaltung**
- Liste aller Sektoren
- Sektor-Bilder
- Boulder-Anzahl pro Sektor
- Beschreibungen
- Schraubtermine (Vergangenheit & Zukunft)

### 4. **Wettkampf-Modus** (aktuell deaktiviert)
- **Teilnehmer-Verwaltung:**
  - Registrierte User oder Gäste
  - Geschlecht (male/female/other)
- **Boulder-Zuordnung:**
  - 1-20 Wettkampf-Boulders
  - Farbzuordnung
- **Ergebnis-Eingabe:**
  - Flash, Top, Zone, None
  - Versuchsanzahl bei Top
  - Automatische Punkteberechnung
- **Live-Rangliste:**
  - Gesamtpunkte
  - Flash/Top/Zone-Zähler
  - Filter nach Geschlecht
  - Detailansicht pro Teilnehmer

### 5. **Admin-Panel**
- **Boulder-Verwaltung:**
  - CRUD-Operationen
  - Bulk-Operationen
  - Operation-Logs
- **Farb-Verwaltung:**
  - Farben hinzufügen/bearbeiten/löschen
  - Hex-Codes verwalten
  - Sortierreihenfolge
  - Aktiv/Inaktiv-Status
- **Sektor-Verwaltung:**
  - Sektoren erstellen/bearbeiten/löschen
  - Sektor-Bilder hochladen
  - Schraubtermine verwalten
  - QR-Code-Generierung für Sektoren
- **Benutzer-Verwaltung:**
  - Benutzer-Liste
  - Rollen zuweisen
  - Profile verwalten
- **Feedback-Verwaltung:**
  - User-Feedback sammeln und verwalten
- **Push-Notifications:**
  - Test-Tool für Push-Benachrichtigungen

### 6. **Push-Notifications**
- **Benachrichtigungen für:**
  - Neue Boulders
  - Boulder-Status-Änderungen
  - Sektor-Updates
  - Wettkampf-Updates
- **Benutzer-Präferenzen:**
  - Individuelle Einstellungen pro Benachrichtigungstyp
  - Opt-in/Opt-out pro Kategorie

### 7. **Profil & Authentifizierung**
- **Registrierung:**
  - Email/Password
  - Optionale Metadaten (Name, Geburtsdatum)
- **Login:**
  - Email/Password
  - Session-Management
- **Profil:**
  - Benutzer-Informationen anzeigen/bearbeiten
  - Benachrichtigungs-Präferenzen

---

## 🏗 Technische Architektur

### Frontend-Stack

#### Core Framework
- **React 18.3.1** - UI-Framework mit Hooks
- **TypeScript 5.8.3** - Typsicherheit
- **Vite 5.4.19** - Build-Tool und Dev-Server

#### Routing & State Management
- **React Router DOM 6.30.1** - Client-Side Routing
- **TanStack Query 5.83.0** - Server-State Management, Caching, Synchronisation
- **React Context** - Globaler State (Auth, Upload-Tracking)

#### UI & Styling
- **Tailwind CSS 3.4.17** - Utility-First CSS Framework
- **shadcn/ui** - Komponenten-Bibliothek (basierend auf Radix UI)
- **Lucide React** - Icon-Bibliothek
- **Recharts 2.15.4** - Charts und Diagramme

#### Formular-Handling
- **React Hook Form 7.61.1** - Performantes Formular-Management
- **Zod 3.25.76** - Schema-Validierung
- **@hookform/resolvers** - Integration von Zod mit React Hook Form

#### Mobile & Native
- **Capacitor 7.4.4** - Native Bridge für iOS/Android
- **@capacitor/push-notifications** - Push-Benachrichtigungen
- **PWA** - Service Worker für Offline-Funktionalität

### Backend & Services

#### Backend-as-a-Service
- **Supabase 2.76.1**
  - PostgreSQL-Datenbank
  - Authentifizierung (Email/Password)
  - Row Level Security (RLS)
  - Real-time Subscriptions (optional)
  - Storage (Fallback)

#### Storage-Lösung
- **All-Inkl CDN** (Primär)
  - PHP-basierte Upload/Delete-API
  - Chunked Upload für große Dateien
  - CORS-Unterstützung
  - Unbegrenzte Speicherkapazität
- **Supabase Storage** (Fallback)
  - Automatischer Fallback bei Fehlern

### Development Tools
- **ESLint** - Code-Linting
- **TypeScript ESLint** - TypeScript-spezifische Regeln
- **Vite Plugin React SWC** - Schneller React-Compiler

---

## 🔐 Rollen & Berechtigungen

### Rollen-System

#### 1. **Admin**
- ✅ Vollzugriff auf alle Funktionen
- ✅ Benutzer- und Rollenverwaltung
- ✅ Alle CRUD-Operationen
- ✅ System-Einstellungen
- ✅ Wettkampf-Verwaltung

#### 2. **Setter**
- ✅ Boulder erstellen/bearbeiten
- ✅ Videos hochladen
- ✅ Status ändern
- ✅ Sektor-Planung einsehen
- ❌ Keine Admin-Funktionen
- ❌ Keine Benutzer-Verwaltung

#### 3. **User** (Standard)
- ✅ Boulder ansehen
- ✅ Statistiken einsehen
- ✅ Profil bearbeiten
- ✅ Beta-Videos ansehen
- ❌ Keine Boulder-Erstellung
- ❌ Keine Admin-Funktionen

#### 4. **Gast** (Anonym)
- ✅ Öffentliche Boulder-Übersicht
- ✅ Beta-Videos ansehen
- ❌ Keine Authentifizierung erforderlich
- ❌ Eingeschränkte Funktionen

### Row Level Security (RLS)

Die Datenbank verwendet Supabase RLS für granulare Berechtigungen:

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

## 🗄 Datenmodell

### Haupt-Tabellen

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

#### `competition_boulders` (Wettkampf)
- `id` (UUID, Primary Key)
- `boulder_number` (Integer, 1-20, unique)
- `boulder_id` (UUID, Foreign Key → boulders)
- `color` (Text)
- `created_at` (Timestamp)

#### `competition_participants` (Wettkampf)
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → auth.users, nullable)
- `guest_name` (Text, nullable)
- `gender` (Text: 'male' | 'female' | 'other', nullable)
- `is_guest` (Boolean)
- `created_at` (Timestamp)

#### `competition_results` (Wettkampf)
- `id` (UUID, Primary Key)
- `participant_id` (UUID, Foreign Key → competition_participants)
- `boulder_number` (Integer, 1-20)
- `result_type` (Text: 'flash' | 'top' | 'zone' | 'none')
- `attempts` (Integer, nullable, nur bei 'top')
- `points` (Numeric)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- UNIQUE (participant_id, boulder_number)

#### `notifications` (Push-Notifications)
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → auth.users)
- `type` (Text: 'new_boulder' | 'boulder_status' | 'sector_update' | 'competition')
- `title` (Text)
- `body` (Text)
- `data` (JSONB, nullable)
- `read` (Boolean)
- `created_at` (Timestamp)

#### `notification_preferences` (Push-Notifications)
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → auth.users)
- `notification_type` (Text)
- `enabled` (Boolean)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

---

## 🎨 Features im Detail

### Boulder-Verwaltung

#### Boulder-Erstellung (Setter)
1. **Wizard-Interface:**
   - Schritt 1: Grunddaten (Name, Sektor, Schwierigkeit, Farbe)
   - Schritt 2: Video-Upload (mit Progress-Tracking)
   - Schritt 3: Thumbnail-Upload
   - Schritt 4: Notizen hinzufügen
   - Schritt 5: Status setzen

2. **Video-Upload:**
   - Chunked Upload für große Dateien (>5MB)
   - Progress-Bar
   - Automatische Kompression (optional)
   - Unterstützte Formate: MP4, WebM

3. **Thumbnail-Upload:**
   - Automatische Kompression
   - Unterstützte Formate: JPG, PNG, WebP

#### Boulder-Bearbeitung
- Bestehende Boulders bearbeiten
- Video/Thumbnail aktualisieren
- Status ändern (hängt ↔ abgeschraubt)
- Notizen aktualisieren

#### Boulder-Filterung
- **Nach Sektor:** Dropdown mit allen Sektoren
- **Nach Schwierigkeit:** 1-8 oder "?"
- **Nach Farbe:** Alle aktiven Farben
- **Nach Status:** hängt / abgeschraubt
- **Suche:** Volltext-Suche nach Boulder-Namen

### Statistiken & Analytics

#### Dashboard-Charts
- **Schwierigkeitsverteilung:**
  - Balkendiagramm mit Anzahl pro Schwierigkeit
  - Filter nach Status
- **Farbverteilung:**
  - Kreisdiagramm mit Prozentangaben
  - Farbcodierte Segmente

#### Statistik-Karten
- Gesamtanzahl Boulders
- Neue Boulders (seit letztem Update)
- Letztes Update-Datum
- Dynamische Berechnung basierend auf Datenbank

### Sektor-Verwaltung

#### Sektor-Übersicht
- Grid-Layout mit Sektor-Karten
- Sektor-Bilder als Hintergrund
- Boulder-Anzahl pro Sektor
- Beschreibungen
- Schraubtermine (Vergangenheit & Zukunft)

#### Sektor-Planung
- Kalender-Ansicht für Schraubtermine
- Kommende Termine hervorgehoben
- Letzte Termine archiviert
- Notizen zu Terminen

### Wettkampf-Modus (aktuell deaktiviert)

#### Wettkampf-Setup
1. **Boulder-Zuordnung:**
   - 1-20 Wettkampf-Boulders auswählen
   - Farbzuordnung pro Boulder
   - Boulder-Nummern vergeben

2. **Teilnehmer-Registrierung:**
   - Registrierte User oder Gäste
   - Geschlecht erfassen (für getrennte Ranglisten)
   - Automatische Teilnehmer-ID

#### Ergebnis-Eingabe
- **Result-Types:**
  - Flash (erster Versuch geschafft)
  - Top (geschafft mit X Versuchen)
  - Zone (Zone erreicht)
  - None (nicht geschafft)
- **Punkteberechnung:**
  - Flash: Höchste Punkte
  - Top: Punkte abhängig von Versuchen
  - Zone: Teilpunkte
  - None: 0 Punkte

#### Live-Rangliste
- **Sortierung:** Nach Gesamtpunkten (absteigend)
- **Filter:** Alle / Männlich / Weiblich
- **Anzeige:**
  - Rang
  - Name
  - Gesamtpunkte
  - Flash/Top/Zone-Zähler
  - Detailansicht pro Teilnehmer
- **Admin-Funktionen:**
  - Ergebnisse bearbeiten
  - Teilnehmer löschen

### Push-Notifications

#### Benachrichtigungstypen
- **Neue Boulders:** Wenn Setter neuen Boulder erstellt
- **Boulder-Status:** Wenn Boulder abgeschraubt wird
- **Sektor-Updates:** Bei neuen Schraubterminen
- **Wettkampf-Updates:** Bei neuen Ergebnissen

#### Benutzer-Präferenzen
- Individuelle Einstellungen pro Typ
- Opt-in/Opt-out pro Kategorie
- Persistente Einstellungen in Datenbank

#### Technische Umsetzung
- **Capacitor Push Notifications Plugin**
- **Firebase Cloud Messaging (FCM)** für Android
- **Apple Push Notification Service (APNs)** für iOS
- **Web Push API** für Browser

---

## 🚀 Deployment & Plattformen

### Web (PWA)
- **URL:** https://beta.kletterwelt-sauerland.de
- **Hosting:** Vercel
- **Build:** `npm run build`
- **Features:**
  - Service Worker für Offline-Funktionalität
  - Installierbar als PWA
  - Responsive Design

### Android
- **App-ID:** `com.kletterwelt.beta`
- **App-Name:** KWS Beta App
- **Build-Tool:** Capacitor + Gradle
- **Deployment:** Google Play Store
- **Features:**
  - Native Push-Notifications (FCM)
  - Native File-Upload
  - Native Kamera-Zugriff (geplant)

### iOS
- **App-ID:** `com.kletterwelt.beta`
- **App-Name:** KWS Beta App
- **Build-Tool:** Capacitor + Xcode
- **Deployment:** Apple App Store
- **Features:**
  - Native Push-Notifications (APNs)
  - Native File-Upload
  - Native Kamera-Zugriff (geplant)

### CI/CD
- **CodeMagic** - Automatische Builds für iOS/Android
- **GitHub Actions** - Automatische Web-Deployments (optional)
- **Versionierung:** Automatische Version-Bumps bei Builds

---

## 📈 Roadmap & Erweiterungen

### Geplante Features

#### Kurzfristig (Q1 2026)
- ✅ Push-Notifications implementiert
- ✅ Feedback-System implementiert
- ⏳ Wettkampf-Modus reaktivieren (aktuell deaktiviert)
- ⏳ QR-Code-Scanner für Sektoren
- ⏳ Verbesserte Offline-Funktionalität

#### Mittelfristig (Q2-Q3 2026)
- ⏳ Social Features (Favoriten, Kommentare)
- ⏳ Persönliche Statistiken (eigene Erfolge tracken)
- ⏳ Boulder-Routenplanung (optimale Route durch Halle)
- ⏳ Erweiterte Filter (nach Datum, Setter, etc.)
- ⏳ Dark Mode

#### Langfristig (Q4 2026+)
- ⏳ White-Label-Lösung für andere Kletterhallen
- ⏳ Multi-Tenant-Support
- ⏳ API für externe Integrationen
- ⏳ Erweiterte Analytics
- ⏳ KI-gestützte Boulder-Empfehlungen

### Technische Verbesserungen

#### Performance
- ⏳ Lazy Loading für alle Routen
- ⏳ Virtualisierung für lange Listen
- ⏳ Debouncing für Suche
- ⏳ Optimistic Updates
- ⏳ Bundle-Size-Optimierung

#### Code-Qualität
- ⏳ Error Boundaries implementieren
- ⏳ Unit-Tests für kritische Funktionen
- ⏳ E2E-Tests für Haupt-Workflows
- ⏳ Code-Splitting optimieren
- ⏳ Refactoring von großen Komponenten (z.B. Setter.tsx)

#### UX-Verbesserungen
- ⏳ Onboarding-Flow für neue User
- ⏳ Verbesserte Fehlerbehandlung
- ⏳ Loading-States optimieren
- ⏳ Accessibility-Verbesserungen (WCAG 2.1)

---

## 🔧 Technische Entscheidungen

### Warum React + TypeScript?
- **React:** Bewährtes Framework, große Community, gute Performance
- **TypeScript:** Typsicherheit, bessere Developer Experience, weniger Runtime-Fehler

### Warum Supabase?
- **Backend-as-a-Service:** Schnelle Entwicklung, keine eigene Infrastruktur
- **PostgreSQL:** Robuste Datenbank mit erweiterten Features
- **Row Level Security:** Granulare Berechtigungen auf Datenbankebene
- **Real-time:** Optional für Live-Updates

### Warum All-Inkl Storage?
- **Kosten:** Günstiger als Supabase Storage für große Dateien
- **Kapazität:** Unbegrenzte Speicherkapazität
- **Performance:** Schnelle Uploads über CDN
- **Kontrolle:** Volle Kontrolle über Dateien

### Warum Capacitor statt React Native?
- **Code-Sharing:** Gleicher Code für Web, iOS, Android
- **Web-First:** App funktioniert primär als Web-App
- **Einfacheres Deployment:** Keine separate Codebase nötig
- **Native Plugins:** Zugriff auf native Features bei Bedarf

### Warum TanStack Query?
- **Caching:** Intelligentes Caching reduziert API-Calls
- **Synchronisation:** Automatische Daten-Synchronisation
- **Optimistic Updates:** Bessere UX bei Mutationen
- **DevTools:** Gute Debugging-Möglichkeiten

---

## 📊 Projekt-Metriken

### Code-Statistiken
- **TypeScript-Dateien:** ~100+
- **React-Komponenten:** ~50+
- **Custom Hooks:** ~15
- **Datenbank-Migrationen:** 33+
- **Routes:** 8
- **UI-Komponenten (shadcn):** 40+

### Dependencies
- **Production Dependencies:** ~30
- **Dev Dependencies:** ~15
- **Bundle-Größe:** (siehe Build-Output)

### Performance-Ziele
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Lighthouse Score:** > 90

---

## 🔗 Externe Ressourcen

### Dokumentation
- **Supabase:** https://supabase.com/docs
- **React:** https://react.dev
- **React Router:** https://reactrouter.com
- **TanStack Query:** https://tanstack.com/query
- **Tailwind CSS:** https://tailwindcss.com
- **shadcn/ui:** https://ui.shadcn.com
- **Capacitor:** https://capacitorjs.com

### Projekt-Links
- **Lovable Project:** https://lovable.dev/projects/ed5d82b6-b50a-40cc-893d-87017cd2260a
- **All-Inkl CDN:** https://cdn.kletterwelt-sauerland.de
- **Production URL:** https://beta.kletterwelt-sauerland.de

---

## 📝 Wichtige Hinweise

### Bekannte Limitationen
- Wettkampf-Modus ist aktuell deaktiviert (Code vorhanden, aber UI ausgeblendet)
- Setter.tsx ist sehr groß (~1800 Zeilen) - sollte refactored werden
- Nicht alle Routen sind lazy geladen
- Service Worker könnte optimiert werden

### Best Practices
- **Code-Stil:** TypeScript mit strikter Typisierung
- **Komponenten:** Functional Components mit Hooks
- **Styling:** Tailwind CSS Utility Classes
- **State Management:** React Query für Server-State, Context für globalen State
- **Formulare:** React Hook Form + Zod für Validierung

### Wartung
- Regelmäßige Dependency-Updates
- Performance-Monitoring
- Bundle-Size-Monitoring
- Security-Audits
- User-Feedback sammeln und umsetzen

---

**Erstellt:** Februar 2026  
**Version:** 1.0.68  
**Status:** Production Ready, kontinuierliche Weiterentwicklung
