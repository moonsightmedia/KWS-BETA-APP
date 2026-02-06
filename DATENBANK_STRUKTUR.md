# KWS Beta App - Datenbank-Struktur & Benutzerverwaltung

**Stand:** Februar 2026  
**Version:** 1.0.68

---

## 📋 Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Authentifizierung & Benutzerverwaltung](#authentifizierung--benutzerverwaltung)
3. [Kern-Tabellen](#kern-tabellen)
4. [Wettkampf-Tabellen](#wettkampf-tabellen)
5. [Notification-Tabellen](#notification-tabellen)
6. [Logging & Tracking-Tabellen](#logging--tracking-tabellen)
7. [Storage Buckets](#storage-buckets)
8. [Row Level Security (RLS)](#row-level-security-rls)
9. [Funktionen & Trigger](#funktionen--trigger)
10. [Indizes & Performance](#indizes--performance)
11. [Beziehungen & Foreign Keys](#beziehungen--foreign-keys)

---

## 📊 Übersicht

### Datenbank-System
- **PostgreSQL** (via Supabase)
- **Row Level Security (RLS)** aktiviert für alle Tabellen
- **Realtime** für ausgewählte Tabellen aktiviert

### Tabellen-Übersicht

**Kern-Tabellen:**
- `boulders` - Boulder-Daten
- `sectors` - Sektor-Daten
- `colors` - Farb-Verwaltung
- `profiles` - Benutzer-Profile
- `user_roles` - Rollen-Verwaltung
- `sector_schedule` - Sektor-Planung

**Wettkampf-Tabellen:**
- `competition_boulders` - Wettkampf-Boulder-Zuordnung
- `competition_participants` - Wettkampf-Teilnehmer
- `competition_results` - Wettkampf-Ergebnisse

**Notification-Tabellen:**
- `notifications` - In-App-Benachrichtigungen
- `notification_preferences` - Benutzer-Präferenzen
- `push_tokens` - Push-Notification-Tokens

**Logging & Tracking:**
- `upload_logs` - Upload-Logs
- `boulder_operation_logs` - Boulder-Operationen-Logs
- `feedback` - Feedback-System

**Storage:**
- `beta-videos` Bucket - Beta-Videos
- `sector-images` Bucket - Sektor-Bilder
- `feedback-screenshots` Bucket - Feedback-Screenshots

---

## 🔐 Authentifizierung & Benutzerverwaltung

### Supabase Auth (`auth.users`)

Die Authentifizierung wird von Supabase verwaltet. Die `auth.users` Tabelle enthält:
- `id` (UUID) - Eindeutige User-ID
- `email` - E-Mail-Adresse
- `encrypted_password` - Verschlüsseltes Passwort
- `email_confirmed_at` - E-Mail-Bestätigungszeitpunkt
- `created_at` - Erstellungszeitpunkt
- `updated_at` - Aktualisierungszeitpunkt

### Rollen-System

#### Rollen-Typen (`app_role` ENUM)
- `user` - Standard-Benutzer (Standard-Rolle)
- `setter` - Setter (kann Boulders erstellen/bearbeiten)
- `admin` - Administrator (Vollzugriff)

#### Rollen-Verwaltung

**Tabelle: `user_roles`**
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
```

**Berechtigungen:**
- Ein User kann mehrere Rollen haben (z.B. `setter` + `admin`)
- Standard-Rolle `user` wird automatisch zugewiesen bei Registrierung
- Nur Admins können Rollen verwalten

**RLS Policies:**
- Lesen: Eigene Rollen oder Admin
- Schreiben: Nur Admin
- Löschen: Nur Admin

### Profile-Verwaltung

**Tabelle: `profiles`**
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Funktionalität:**
- Automatische Erstellung bei Registrierung (Trigger)
- Synchronisation mit `auth.users`
- Erweiterte Benutzer-Informationen

**RLS Policies:**
- Lesen: Eigene Profile oder Admin
- Schreiben: Eigene Profile oder Admin
- Einfügen: Nur eigene Profile (bei Registrierung)

### Rollen-Prüfung

**Funktion: `has_role(user_id, role)`**
```sql
CREATE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text = _role::text
  );
$$;
```

**Verwendung:**
- In RLS Policies: `public.has_role(auth.uid(), 'admin')`
- In Datenbank-Funktionen
- Security Definer Function (läuft mit erhöhten Rechten)

### Automatische Rollen-Zuweisung

**Trigger: `on_auth_user_default_role`**
- Wird ausgelöst bei neuer User-Registrierung
- Weist automatisch Rolle `user` zu
- Erstellt automatisch Profil-Eintrag

---

## 🧗 Kern-Tabellen

### 1. Boulders

**Tabelle: `boulders`**
```sql
CREATE TABLE public.boulders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector_id UUID NOT NULL REFERENCES public.sectors(id),
  sector_id_2 UUID REFERENCES public.sectors(id), -- Optional: Boulder spannt mehrere Sektoren
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 8), -- Nullable für "?"
  color TEXT NOT NULL REFERENCES public.colors(name),
  beta_video_url TEXT, -- Legacy: Einzel-URL
  beta_video_urls JSONB, -- Neu: Multi-Quality URLs { "hd": "...", "sd": "...", "low": "..." }
  thumbnail_url TEXT,
  note TEXT,
  status boulder_status NOT NULL DEFAULT 'haengt', -- 'haengt' | 'abgeschraubt'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Felder:**
- `id` - Eindeutige Boulder-ID
- `name` - Boulder-Name
- `sector_id` - Primärer Sektor (Pflicht)
- `sector_id_2` - Optionaler zweiter Sektor
- `difficulty` - Schwierigkeit 1-8 oder NULL für "?"
- `color` - Farbe (Referenz zu colors.name)
- `beta_video_url` - Legacy Video-URL
- `beta_video_urls` - Multi-Quality Video-URLs (JSONB)
- `thumbnail_url` - Thumbnail-Bild-URL
- `note` - Notizen zum Boulder
- `status` - Status: 'haengt' oder 'abgeschraubt'

**RLS Policies:**
- Lesen: Alle (auch anonym) für hängende Boulders, Authentifizierte für alle
- Schreiben: Nur Setter/Admin
- Löschen: Nur Admin

**Indizes:**
- `idx_boulders_status` - Für Status-Filterung
- `idx_boulders_sector_id_2` - Für Sektor-2-Filterung
- `idx_boulders_beta_video_urls` - GIN-Index für JSONB
- `idx_boulders_thumbnail_url` - Für Thumbnail-Abfragen

---

### 2. Sectors

**Tabelle: `sectors`**
```sql
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  next_schraubtermin DATE,
  last_schraubtermin DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Felder:**
- `id` - Eindeutige Sektor-ID
- `name` - Sektor-Name (eindeutig)
- `description` - Beschreibung
- `image_url` - Sektor-Bild-URL
- `next_schraubtermin` - Nächster Schraubtermin
- `last_schraubtermin` - Letzter Schraubtermin

**RLS Policies:**
- Lesen: Alle (auch anonym)
- Schreiben: Nur Admin/Setter
- Löschen: Nur Admin/Setter

---

### 3. Colors

**Tabelle: `colors`**
```sql
CREATE TABLE public.colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  hex TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Felder:**
- `id` - Eindeutige Farb-ID
- `name` - Farb-Name (eindeutig, z.B. "Grün", "Rot")
- `hex` - Hex-Farbcode (z.B. "#22c55e")
- `sort_order` - Sortierreihenfolge
- `is_active` - Aktiv/Inaktiv-Status

**RLS Policies:**
- Lesen: Alle
- Schreiben: Nur Admin

**Trigger:**
- `trg_colors_updated_at` - Aktualisiert `updated_at` automatisch

---

### 4. Sector Schedule

**Tabelle: `sector_schedule`**
```sql
CREATE TABLE public.sector_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID NOT NULL REFERENCES public.sectors(id),
  scheduled_at DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);
```

**Felder:**
- `id` - Eindeutige Planungs-ID
- `sector_id` - Sektor
- `scheduled_at` - Geplanter Termin
- `note` - Notizen zum Termin
- `created_by` - Wer hat den Termin erstellt

**RLS Policies:**
- Lesen: Alle
- Schreiben: Nur Setter/Admin
- Löschen: Nur Setter/Admin

---

## 🏆 Wettkampf-Tabellen

### 1. Competition Boulders

**Tabelle: `competition_boulders`**
```sql
CREATE TABLE public.competition_boulders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_number INTEGER UNIQUE NOT NULL CHECK (boulder_number >= 1 AND boulder_number <= 20),
  boulder_id UUID REFERENCES public.boulders(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Felder:**
- `id` - Eindeutige ID
- `boulder_number` - Wettkampf-Boulder-Nummer (1-20, eindeutig)
- `boulder_id` - Referenz zum Boulder
- `color` - Farbe für Wettkampf

**RLS Policies:**
- Lesen: Alle
- Schreiben: Nur Setter/Admin
- Löschen: Nur Setter/Admin

**Indizes:**
- `idx_competition_boulders_number` - Für schnelle Nummer-Suche

---

### 2. Competition Participants

**Tabelle: `competition_participants`**
```sql
CREATE TABLE public.competition_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  is_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_participant_identity CHECK (
    (user_id IS NOT NULL AND guest_name IS NULL) OR 
    (user_id IS NULL AND guest_name IS NOT NULL AND is_guest = true)
  )
);
```

**Felder:**
- `id` - Eindeutige Teilnehmer-ID
- `user_id` - Referenz zu registriertem User (nullable)
- `guest_name` - Name für Gäste (nullable)
- `gender` - Geschlecht für getrennte Ranglisten
- `is_guest` - Ist Gast-Teilnehmer

**Constraint:**
- Entweder `user_id` ODER `guest_name` muss gesetzt sein

**RLS Policies:**
- Lesen: Alle
- Schreiben: Eigene Teilnahme oder Admin
- Löschen: Nur Admin

**Indizes:**
- `idx_competition_participants_user_id` - Für User-Suche
- `idx_competition_participants_guest` - Für Gast-Suche

---

### 3. Competition Results

**Tabelle: `competition_results`**
```sql
CREATE TABLE public.competition_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.competition_participants(id) ON DELETE CASCADE,
  boulder_number INTEGER NOT NULL CHECK (boulder_number >= 1 AND boulder_number <= 20),
  result_type TEXT NOT NULL CHECK (result_type IN ('flash', 'top', 'zone', 'none')),
  attempts INTEGER CHECK (attempts IS NULL OR (attempts >= 1 AND result_type = 'top')),
  points NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_id, boulder_number)
);
```

**Felder:**
- `id` - Eindeutige Ergebnis-ID
- `participant_id` - Teilnehmer
- `boulder_number` - Boulder-Nummer (1-20)
- `result_type` - Ergebnis-Typ: 'flash', 'top', 'zone', 'none'
- `attempts` - Versuchsanzahl (nur bei 'top')
- `points` - Punkte (automatisch berechnet)

**Constraint:**
- Eindeutige Kombination pro Teilnehmer/Boulder
- `attempts` nur bei `result_type = 'top'`

**RLS Policies:**
- Lesen: Alle
- Schreiben: Eigene Ergebnisse oder Admin
- Löschen: Nur Admin

**Trigger:**
- `trigger_update_competition_result_points` - Berechnet Punkte automatisch

**Funktion: `calculate_competition_points`**
- Berechnet Punkte basierend auf `result_type` und `attempts`
- Flash: Höchste Punkte
- Top: Punkte abhängig von Versuchen
- Zone: Teilpunkte
- None: 0 Punkte

**Indizes:**
- `idx_competition_results_participant` - Für Teilnehmer-Abfragen
- `idx_competition_results_boulder` - Für Boulder-Abfragen

---

## 🔔 Notification-Tabellen

### 1. Notifications

**Tabelle: `notifications`**
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'boulder_new', 
    'competition_update', 
    'feedback_reply', 
    'admin_announcement', 
    'schedule_reminder', 
    'competition_result', 
    'competition_leaderboard_change'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_url TEXT
);
```

**Felder:**
- `id` - Eindeutige Notification-ID
- `user_id` - Empfänger
- `type` - Notification-Typ
- `title` - Titel
- `message` - Nachricht
- `data` - Zusätzliche Daten (JSONB)
- `read` - Gelesen-Status
- `read_at` - Gelesen-Zeitpunkt
- `action_url` - URL für Aktion (optional)

**RLS Policies:**
- Lesen: Eigene Notifications
- Schreiben: Admin (für alle) oder Setter (für Boulder-Notifications)
- Aktualisieren: Eigene Notifications
- Löschen: Eigene Notifications

**Indizes:**
- `idx_notifications_user_id` - Für User-Abfragen
- `idx_notifications_read` - Für Gelesen-Status
- `idx_notifications_created_at` - Für Sortierung

**Realtime:**
- Tabelle ist für Realtime aktiviert

---

### 2. Notification Preferences

**Tabelle: `notification_preferences`**
```sql
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  boulder_new BOOLEAN NOT NULL DEFAULT true,
  competition_update BOOLEAN NOT NULL DEFAULT true,
  feedback_reply BOOLEAN NOT NULL DEFAULT true,
  admin_announcement BOOLEAN NOT NULL DEFAULT true,
  schedule_reminder BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Felder:**
- `user_id` - User (Primary Key)
- `in_app_enabled` - In-App-Notifications aktiviert
- `push_enabled` - Push-Notifications aktiviert
- `boulder_new` - Neue Boulders
- `competition_update` - Wettkampf-Updates
- `feedback_reply` - Feedback-Antworten
- `admin_announcement` - Admin-Ankündigungen
- `schedule_reminder` - Planungs-Erinnerungen

**RLS Policies:**
- Alle Operationen: Nur eigene Preferences

**Trigger:**
- `trigger_update_notification_preferences_updated_at` - Aktualisiert `updated_at`

---

### 3. Push Tokens

**Tabelle: `push_tokens`**
```sql
CREATE TABLE public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(token)
);
```

**Felder:**
- `id` - Eindeutige Token-ID
- `user_id` - User
- `token` - Push-Token (eindeutig)
- `platform` - Plattform: 'android', 'ios', 'web'
- `device_id` - Device-ID (optional)
- `last_used_at` - Letzte Verwendung

**RLS Policies:**
- Alle Operationen: Nur eigene Tokens

**Indizes:**
- `idx_push_tokens_user_id` - Für User-Abfragen
- `idx_push_tokens_token` - Für Token-Suche

**Trigger:**
- `trigger_update_push_tokens_last_used_at` - Aktualisiert `last_used_at`

---

## 📝 Logging & Tracking-Tabellen

### 1. Upload Logs

**Tabelle: `upload_logs`**
```sql
CREATE TABLE public.upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_session_id TEXT NOT NULL,
  boulder_id UUID REFERENCES public.boulders(id),
  user_id UUID REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('video', 'thumbnail')),
  upload_type TEXT NOT NULL CHECK (upload_type IN ('allinkl', 'supabase')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'compressing', 'uploading', 'completed', 'failed', 'duplicate')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  error_details JSONB,
  final_url TEXT,
  chunk_info JSONB,
  device_info JSONB,
  network_info JSONB,
  file_hash TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Felder:**
- `id` - Eindeutige Log-ID
- `upload_session_id` - Session-ID für Upload
- `boulder_id` - Zugehöriger Boulder
- `user_id` - User, der hochgeladen hat
- `file_name` - Dateiname
- `file_size` - Dateigröße
- `file_type` - Typ: 'video' oder 'thumbnail'
- `upload_type` - Backend: 'allinkl' oder 'supabase'
- `status` - Status des Uploads
- `progress` - Fortschritt (0-100)
- `error_message` - Fehlermeldung
- `error_details` - Detaillierte Fehlerinformationen (JSONB)
- `final_url` - Finale URL nach Upload
- `chunk_info` - Chunk-Informationen (JSONB)
- `device_info` - Device-Informationen (JSONB)
- `network_info` - Netzwerk-Informationen (JSONB)
- `file_hash` - Datei-Hash für Duplikat-Erkennung
- `retry_count` - Anzahl Wiederholungen

**RLS Policies:**
- Lesen: Admins und Setter (alle), User (eigene)
- Schreiben: User (eigene)
- Aktualisieren: User (eigene) oder Admin (alle)

**Indizes:**
- `idx_upload_logs_session_id` - Für Session-Suche
- `idx_upload_logs_boulder_id` - Für Boulder-Suche
- `idx_upload_logs_status` - Für Status-Filterung
- `idx_upload_logs_created_at` - Für Sortierung
- `idx_upload_logs_file_name` - Für Dateiname-Suche
- `idx_upload_logs_file_hash` - Für Duplikat-Erkennung
- `idx_upload_logs_user_id` - Für User-Abfragen

**Trigger:**
- `update_upload_logs_updated_at` - Aktualisiert `updated_at`

---

### 2. Boulder Operation Logs

**Tabelle: `boulder_operation_logs`**
```sql
CREATE TABLE public.boulder_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_id UUID REFERENCES public.boulders(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  boulder_name TEXT,
  boulder_data JSONB,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Felder:**
- `id` - Eindeutige Log-ID
- `boulder_id` - Boulder (kann NULL sein bei Delete)
- `operation_type` - Operation: 'create', 'update', 'delete'
- `user_id` - User, der Operation durchgeführt hat
- `boulder_name` - Boulder-Name (für Delete-Logs)
- `boulder_data` - Vollständige Boulder-Daten (JSONB)
- `changes` - Änderungen bei Update (JSONB)

**RLS Policies:**
- Lesen: Admins und Setter (alle)
- Schreiben: User (eigene Logs)

**Indizes:**
- `idx_boulder_operation_logs_boulder_id` - Für Boulder-Suche
- `idx_boulder_operation_logs_operation_type` - Für Typ-Filterung
- `idx_boulder_operation_logs_user_id` - Für User-Abfragen
- `idx_boulder_operation_logs_created_at` - Für Sortierung

**Trigger:**
- `boulder_operation_logs_set_user_id_trigger` - Setzt automatisch `user_id` aus `auth.uid()`

---

### 3. Feedback

**Tabelle: `feedback`**
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type feedback_type NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  status feedback_status NOT NULL DEFAULT 'open',
  priority feedback_priority NOT NULL DEFAULT 'medium',
  browser_info JSONB,
  url TEXT,
  screenshot_url TEXT,
  error_details JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
```

**Enums:**
- `feedback_type`: 'error', 'bug', 'feature', 'general', 'other'
- `feedback_status`: 'open', 'in_progress', 'resolved', 'closed'
- `feedback_priority`: 'low', 'medium', 'high', 'critical'

**Felder:**
- `id` - Eindeutige Feedback-ID
- `type` - Feedback-Typ
- `title` - Titel
- `description` - Beschreibung
- `user_id` - User (nullable für anonymes Feedback)
- `user_email` - E-Mail (für anonymes Feedback)
- `status` - Status
- `priority` - Priorität
- `browser_info` - Browser-Informationen (JSONB)
- `url` - URL, wo Feedback erstellt wurde
- `screenshot_url` - Screenshot-URL
- `error_details` - Fehler-Details (JSONB)
- `metadata` - Zusätzliche Metadaten (JSONB)
- `resolved_at` - Zeitpunkt der Lösung
- `resolved_by` - Wer hat gelöst

**RLS Policies:**
- Lesen: Nur Admins
- Schreiben: Alle (auch anonym)
- Aktualisieren: Nur Admins
- Löschen: Nur Admins

**Indizes:**
- `idx_feedback_status` - Für Status-Filterung
- `idx_feedback_type` - Für Typ-Filterung
- `idx_feedback_created_at` - Für Sortierung
- `idx_feedback_user_id` - Für User-Abfragen
- `idx_feedback_priority` - Für Prioritäts-Filterung

**Trigger:**
- `update_feedback_updated_at` - Aktualisiert `updated_at`
- `feedback_notify_admins` - Benachrichtigt Admins bei neuem Feedback

---

## 📦 Storage Buckets

### 1. Beta Videos (`beta-videos`)

**Zweck:** Speicherung von Beta-Videos

**RLS Policies:**
- Lesen: Alle
- Schreiben: Setter/Admin
- Aktualisieren: Setter/Admin
- Löschen: Setter/Admin

**Struktur:**
- Videos werden nach Boulder-ID organisiert
- Unterstützt Multi-Quality (HD, SD, Low)

---

### 2. Sector Images (`sector-images`)

**Zweck:** Speicherung von Sektor-Bildern

**RLS Policies:**
- Lesen: Alle
- Schreiben: Setter/Admin
- Aktualisieren: Setter/Admin
- Löschen: Setter/Admin

---

### 3. Feedback Screenshots (`feedback-screenshots`)

**Zweck:** Speicherung von Feedback-Screenshots

**RLS Policies:**
- Lesen: Nur Admins
- Schreiben: Alle (für Feedback)
- Löschen: Nur Admins

---

## 🔒 Row Level Security (RLS)

### Übersicht

Alle Tabellen haben RLS aktiviert. Policies werden basierend auf:
- `auth.uid()` - Aktueller authentifizierter User
- `public.has_role(auth.uid(), 'role')` - Rollen-Prüfung
- Datenbank-Funktionen für komplexe Logik

### Policy-Patterns

**Lesen:**
- Öffentlich: `USING (true)` - Alle können lesen
- Authentifiziert: `USING (auth.uid() IS NOT NULL)` - Nur authentifizierte User
- Eigene Daten: `USING (user_id = auth.uid())` - Nur eigene Daten
- Admin: `USING (public.has_role(auth.uid(), 'admin'))` - Nur Admins

**Schreiben:**
- Eigene Daten: `WITH CHECK (user_id = auth.uid())`
- Admin: `WITH CHECK (public.has_role(auth.uid(), 'admin'))`
- Setter/Admin: `WITH CHECK (public.has_role(auth.uid(), 'setter') OR public.has_role(auth.uid(), 'admin'))`

**Löschen:**
- Eigene Daten: `USING (user_id = auth.uid())`
- Admin: `USING (public.has_role(auth.uid(), 'admin'))`

---

## ⚙️ Funktionen & Trigger

### Wichtige Funktionen

**1. `has_role(user_id, role)`**
- Prüft, ob User eine bestimmte Rolle hat
- Security Definer Function
- Wird in RLS Policies verwendet

**2. `create_notification(...)`**
- Erstellt eine Notification
- Prüft Benutzer-Präferenzen
- Berücksichtigt Notification-Typ-Einstellungen

**3. `mark_notification_read(notification_id)`**
- Markiert Notification als gelesen
- Setzt `read_at` Zeitstempel

**4. `mark_all_notifications_read()`**
- Markiert alle eigenen Notifications als gelesen

**5. `get_unread_count()`**
- Gibt Anzahl ungelesener Notifications zurück

**6. `create_admin_notification(...)`**
- Erstellt Admin-Notification
- Kann an alle oder spezifische User gesendet werden
- Nur für Admins

**7. `calculate_competition_points(result_type, attempts)`**
- Berechnet Punkte für Wettkampf-Ergebnisse
- Wird automatisch von Trigger aufgerufen

### Wichtige Trigger

**1. `on_auth_user_created`**
- Wird ausgelöst bei neuer User-Registrierung
- Erstellt automatisch Profil
- Weist Standard-Rolle `user` zu

**2. `on_auth_user_default_role`**
- Weist Standard-Rolle zu
- Wird bei Registrierung ausgelöst

**3. `trigger_notify_new_boulder`**
- Erstellt Notification bei neuem Boulder
- Wird von Setter/Admin ausgelöst

**4. `trigger_update_competition_result_points`**
- Berechnet automatisch Punkte bei Ergebnis-Eingabe
- Wird vor INSERT/UPDATE ausgelöst

**5. `trigger_send_push_notification`**
- Sendet Push-Notification bei neuer Notification
- Prüft Push-Präferenzen
- Ruft Edge Function auf

**6. `boulder_operation_logs_set_user_id_trigger`**
- Setzt automatisch `user_id` in Operation-Logs
- Verwendet `auth.uid()`

**7. `update_*_updated_at` Trigger**
- Aktualisieren automatisch `updated_at` Felder
- Für alle Tabellen mit `updated_at`

---

## 📈 Indizes & Performance

### Wichtige Indizes

**Boulders:**
- `idx_boulders_status` - Status-Filterung
- `idx_boulders_sector_id_2` - Sektor-2-Filterung
- `idx_boulders_beta_video_urls` - GIN-Index für JSONB
- `idx_boulders_thumbnail_url` - Thumbnail-Abfragen

**Competition:**
- `idx_competition_boulders_number` - Boulder-Nummer
- `idx_competition_participants_user_id` - User-Suche
- `idx_competition_participants_guest` - Gast-Suche
- `idx_competition_results_participant` - Teilnehmer-Abfragen
- `idx_competition_results_boulder` - Boulder-Abfragen

**Notifications:**
- `idx_notifications_user_id` - User-Abfragen
- `idx_notifications_read` - Gelesen-Status
- `idx_notifications_created_at` - Sortierung

**Upload Logs:**
- `idx_upload_logs_session_id` - Session-Suche
- `idx_upload_logs_boulder_id` - Boulder-Suche
- `idx_upload_logs_status` - Status-Filterung
- `idx_upload_logs_file_hash` - Duplikat-Erkennung

**Feedback:**
- `idx_feedback_status` - Status-Filterung
- `idx_feedback_type` - Typ-Filterung
- `idx_feedback_priority` - Prioritäts-Filterung

---

## 🔗 Beziehungen & Foreign Keys

### Beziehungs-Diagramm

```
auth.users
  ├── profiles (1:1)
  │     └── notifications (1:N)
  │     └── notification_preferences (1:1)
  │     └── push_tokens (1:N)
  │     └── upload_logs (1:N)
  │     └── boulder_operation_logs (1:N)
  │
  └── user_roles (1:N)
        └── role: 'user' | 'setter' | 'admin'

sectors
  ├── boulders (1:N)
  ├── sector_schedule (1:N)
  └── competition_boulders (indirekt)

boulders
  ├── competition_boulders (1:1)
  ├── upload_logs (1:N)
  └── boulder_operation_logs (1:N)

colors
  └── boulders (1:N via name)

competition_participants
  ├── competition_results (1:N)
  └── user_id → auth.users (optional)

feedback
  └── user_id → auth.users (optional)
```

### Foreign Key Constraints

**CASCADE Delete:**
- `profiles` → `auth.users` (CASCADE)
- `user_roles` → `auth.users` (CASCADE)
- `boulders` → `sectors` (RESTRICT)
- `competition_results` → `competition_participants` (CASCADE)
- `notifications` → `profiles` (CASCADE)
- `upload_logs` → `boulders` (kein CASCADE, SET NULL)

**SET NULL Delete:**
- `upload_logs` → `boulders` (SET NULL bei Boulder-Löschung)
- `boulder_operation_logs` → `boulders` (SET NULL bei Boulder-Löschung)

---

## 📊 Zusammenfassung

### Tabellen-Anzahl
- **Kern-Tabellen:** 6
- **Wettkampf-Tabellen:** 3
- **Notification-Tabellen:** 3
- **Logging-Tabellen:** 3
- **Gesamt:** 15 Tabellen

### Storage Buckets
- **Beta Videos:** 1
- **Sector Images:** 1
- **Feedback Screenshots:** 1
- **Gesamt:** 3 Buckets

### Funktionen
- **Hauptfunktionen:** ~10
- **Trigger:** ~15

### Indizes
- **Gesamt:** ~30 Indizes

---

**Letzte Aktualisierung:** Februar 2026  
**Datenbank-Version:** PostgreSQL 13+ (via Supabase)
