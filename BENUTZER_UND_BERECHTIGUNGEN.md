# KWS Beta App - Benutzer, Profile & Berechtigungen - Erklärung

**Stand:** Februar 2026  
**Version:** 1.0.68

---

## 📋 Inhaltsverzeichnis

1. [Übersicht: Die drei Ebenen](#übersicht-die-drei-ebenen)
2. [Ebene 1: Supabase Auth (auth.users)](#ebene-1-supabase-auth-authusers)
3. [Ebene 2: Profile (profiles)](#ebene-2-profile-profiles)
4. [Ebene 3: Rollen (user_roles)](#ebene-3-rollen-user_roles)
5. [Wie alles zusammenarbeitet](#wie-alles-zusammenarbeitet)
6. [Berechtigungen im Detail](#berechtigungen-im-detail)
7. [Was wird automatisch gemacht?](#was-wird-automatisch-gemacht)
8. [Was muss manuell gemacht werden?](#was-muss-manuell-gemacht-werden)
9. [Workflows & Beispiele](#workflows--beispiele)

---

## 🎯 Übersicht: Die drei Ebenen

Das Benutzer-System besteht aus **drei Ebenen**, die zusammenarbeiten:

```
┌─────────────────────────────────────────┐
│  1. auth.users (Supabase Auth)         │
│     - Login/Passwort                    │
│     - E-Mail-Verifizierung              │
│     - Session-Management                │
└─────────────────────────────────────────┘
              ↓ (1:1 Beziehung)
┌─────────────────────────────────────────┐
│  2. profiles (Erweiterte Daten)        │
│     - Name, Geburtsdatum                │
│     - E-Mail (Synchronisiert)           │
│     - Persönliche Informationen        │
└─────────────────────────────────────────┘
              ↓ (1:N Beziehung)
┌─────────────────────────────────────────┐
│  3. user_roles (Berechtigungen)         │
│     - Rolle: user/setter/admin          │
│     - Mehrere Rollen möglich            │
│     - Zugriffsrechte                    │
└─────────────────────────────────────────┘
```

---

## 🔐 Ebene 1: Supabase Auth (auth.users)

### Was ist das?
Die **Basis-Ebene** für die Authentifizierung. Wird komplett von Supabase verwaltet.

### Was wird hier gespeichert?
- **E-Mail-Adresse** - Für Login
- **Verschlüsseltes Passwort** - Sicher gespeichert
- **E-Mail-Verifizierung** - Status der Bestätigung
- **Session-Tokens** - Für eingeloggte Sessions
- **User-ID (UUID)** - Eindeutige Identifikation

### Was kann man hier machen?
- ✅ User registrieren (E-Mail + Passwort)
- ✅ User einloggen
- ✅ Passwort zurücksetzen
- ✅ E-Mail verifizieren
- ✅ Session verwalten
- ✅ User löschen

### Was kann man NICHT hier machen?
- ❌ Rollen verwalten (dafür gibt es `user_roles`)
- ❌ Erweiterte Profil-Daten speichern (dafür gibt es `profiles`)
- ❌ Berechtigungen direkt setzen

### Wichtige Felder:
```
auth.users:
  - id (UUID)                    ← WICHTIG: Diese ID wird überall verwendet
  - email                        ← Für Login
  - encrypted_password           ← Verschlüsselt
  - email_confirmed_at           ← Verifizierungsstatus
  - created_at                   ← Registrierungsdatum
```

### Beispiel:
```javascript
// User registrieren
await supabase.auth.signUp({
  email: 'max@example.com',
  password: 'sicheresPasswort123'
});

// User einloggen
await supabase.auth.signInWithPassword({
  email: 'max@example.com',
  password: 'sicheresPasswort123'
});
```

---

## 👤 Ebene 2: Profile (profiles)

### Was ist das?
Die **Erweiterte Daten-Ebene** für zusätzliche Benutzer-Informationen, die nicht in `auth.users` gespeichert werden.

### Warum gibt es das?
- `auth.users` ist nur für Login/Auth gedacht
- Wir brauchen zusätzliche Daten (Name, Geburtsdatum, etc.)
- Diese Daten sollen in unserer eigenen Tabelle sein (mehr Kontrolle)

### Was wird hier gespeichert?
- **E-Mail** - Synchronisiert mit `auth.users`
- **Vorname** (first_name)
- **Nachname** (last_name)
- **Vollständiger Name** (full_name)
- **Geburtsdatum** (birth_date)
- **Zeitstempel** (created_at, updated_at)

### Wichtige Besonderheit:
- **1:1 Beziehung** zu `auth.users`
- Die `id` in `profiles` ist die gleiche wie in `auth.users`
- Wenn User gelöscht wird, wird auch das Profil gelöscht (CASCADE)

### Wichtige Felder:
```
profiles:
  - id (UUID)                    ← GLEICHE ID wie auth.users.id
  - email                        ← Synchronisiert mit auth.users
  - first_name                   ← Optional
  - last_name                    ← Optional
  - full_name                    ← Optional (kann aus first+last generiert werden)
  - birth_date                   ← Optional
  - created_at                   ← Wann erstellt
  - updated_at                   ← Wann zuletzt geändert
```

### Beispiel:
```javascript
// Profil lesen
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Profil aktualisieren
await supabase
  .from('profiles')
  .update({ 
    first_name: 'Max',
    last_name: 'Mustermann',
    full_name: 'Max Mustermann'
  })
  .eq('id', userId);
```

---

## 🎭 Ebene 3: Rollen (user_roles)

### Was ist das?
Die **Berechtigungs-Ebene** für Zugriffsrechte und Rollen-Verwaltung.

### Warum gibt es das?
- Nicht alle User sollen alles können
- Unterschiedliche Berechtigungen für verschiedene Rollen
- Ein User kann mehrere Rollen haben

### Was wird hier gespeichert?
- **User-ID** - Referenz zu `auth.users`
- **Rolle** - 'user', 'setter' oder 'admin'
- **Zeitstempel** - Wann Rolle zugewiesen wurde

### Rollen-Typen:

#### 1. **user** (Standard-Rolle)
- **Was kann er?**
  - Boulders ansehen
  - Statistiken einsehen
  - Eigenes Profil bearbeiten
  - Beta-Videos ansehen
- **Was kann er NICHT?**
  - Boulders erstellen/bearbeiten
  - Admin-Funktionen nutzen
  - Andere User verwalten

#### 2. **setter** (Setter-Rolle)
- **Was kann er?**
  - Alles was `user` kann PLUS:
  - Boulders erstellen
  - Boulders bearbeiten
  - Videos hochladen
  - Boulder-Status ändern
  - Sektor-Planung einsehen
- **Was kann er NICHT?**
  - Admin-Funktionen nutzen
  - Andere User verwalten
  - Farben/Sektoren verwalten

#### 3. **admin** (Admin-Rolle)
- **Was kann er?**
  - **ALLES** - Vollzugriff auf alle Funktionen
  - User verwalten
  - Rollen zuweisen
  - Boulders/Sektoren/Farben verwalten
  - Feedback verwalten
  - System-Einstellungen

### Wichtige Besonderheit:
- **1:N Beziehung** zu `auth.users`
- Ein User kann **mehrere Rollen** haben (z.B. `setter` + `admin`)
- UNIQUE Constraint: Ein User kann nicht zweimal die gleiche Rolle haben

### Wichtige Felder:
```
user_roles:
  - id (UUID)                    ← Eindeutige ID für diese Rolle-Zuweisung
  - user_id (UUID)              ← Referenz zu auth.users.id
  - role (ENUM)                 ← 'user' | 'setter' | 'admin'
  - created_at                  ← Wann zugewiesen
```

### Beispiel:
```javascript
// Rollen eines Users abfragen
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);

// Prüfen ob User Admin ist
const isAdmin = roles?.some(r => r.role === 'admin');

// Rolle zuweisen (nur Admin kann das)
await supabase
  .from('user_roles')
  .insert({ 
    user_id: targetUserId,
    role: 'setter'
  });
```

---

## 🔄 Wie alles zusammenarbeitet

### Der komplette Flow:

#### 1. **Registrierung** (Neuer User)
```
User registriert sich
    ↓
Supabase erstellt Eintrag in auth.users
    ↓
Trigger: handle_new_user() wird ausgelöst
    ↓
Automatisch: Profil wird in profiles erstellt
    ↓
Trigger: on_auth_user_default_role wird ausgelöst
    ↓
Automatisch: Rolle 'user' wird in user_roles zugewiesen
    ↓
Fertig: User kann sich einloggen
```

#### 2. **Login** (Bestehender User)
```
User loggt sich ein
    ↓
Supabase prüft E-Mail + Passwort
    ↓
Session wird erstellt
    ↓
App lädt Profil aus profiles
    ↓
App lädt Rollen aus user_roles
    ↓
App zeigt entsprechenden Bereiche (User/Setter/Admin)
```

#### 3. **Berechtigungs-Prüfung** (Bei Aktion)
```
User möchte etwas tun (z.B. Boulder erstellen)
    ↓
App prüft: Hat User Rolle 'setter' oder 'admin'?
    ↓
Datenbank prüft: RLS Policy erlaubt das?
    ↓
Wenn JA: Aktion wird durchgeführt
Wenn NEIN: Fehler wird zurückgegeben
```

---

## 🔒 Berechtigungen im Detail

### Wie werden Berechtigungen geprüft?

#### 1. **In der App (Frontend)**
```javascript
// Hook: useHasRole
const { hasRole } = useHasRole();
const isSetter = hasRole('setter');
const isAdmin = hasRole('admin');

// Hook: useIsAdmin
const { isAdmin } = useIsAdmin();

// Verwendung
if (isAdmin) {
  // Zeige Admin-Bereich
}
```

#### 2. **In der Datenbank (RLS Policies)**
```sql
-- Beispiel: Nur Setter/Admin können Boulders erstellen
CREATE POLICY "Setters can insert boulders"
  ON public.boulders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'setter') OR 
    public.has_role(auth.uid(), 'admin')
  );
```

### Die `has_role()` Funktion:

**Was macht sie?**
- Prüft, ob ein User eine bestimmte Rolle hat
- Läuft mit erhöhten Rechten (SECURITY DEFINER)
- Kann in RLS Policies verwendet werden

**Wie funktioniert sie?**
```sql
-- Prüft in user_roles Tabelle
SELECT EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
    AND ur.role = 'admin'
);
```

**Verwendung:**
```sql
-- In RLS Policy
USING (public.has_role(auth.uid(), 'admin'))

-- In Datenbank-Funktion
IF public.has_role(p_user_id, 'admin') THEN
  -- Admin-Logik
END IF;
```

---

## ⚙️ Was wird automatisch gemacht?

### Automatische Prozesse (Trigger):

#### 1. **Profil-Erstellung** (Trigger: `on_auth_user_created`)
**Wann:** Bei jeder neuen User-Registrierung  
**Was passiert:**
- Neuer Eintrag in `profiles` wird erstellt
- `id` wird von `auth.users` übernommen
- `email` wird synchronisiert

**Code:**
```sql
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 2. **Standard-Rolle zuweisen** (Trigger: `on_auth_user_default_role`)
**Wann:** Bei jeder neuen User-Registrierung  
**Was passiert:**
- Rolle `user` wird automatisch zugewiesen
- Eintrag in `user_roles` wird erstellt

**Code:**
```sql
CREATE TRIGGER on_auth_user_default_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();
```

#### 3. **Profil-Synchronisation** (App-seitig)
**Wann:** Nach Login oder Registrierung  
**Was passiert:**
- Metadaten aus `auth.users` werden zu `profiles` synchronisiert
- `first_name`, `last_name`, `full_name`, `birth_date` werden übertragen

**Code:** Siehe `useAuth.tsx` → `syncMetadataToProfiles()`

---

## ✋ Was muss manuell gemacht werden?

### Manuelle Aufgaben:

#### 1. **Rollen zuweisen** (Nur Admin)
```javascript
// Setter-Rolle zuweisen
await supabase
  .from('user_roles')
  .insert({
    user_id: targetUserId,
    role: 'setter'
  });

// Admin-Rolle zuweisen
await supabase
  .from('user_roles')
  .insert({
    user_id: targetUserId,
    role: 'admin'
  });
```

#### 2. **Rollen entfernen** (Nur Admin)
```javascript
// Rolle entfernen
await supabase
  .from('user_roles')
  .delete()
  .eq('user_id', targetUserId)
  .eq('role', 'setter');
```

#### 3. **Profil-Daten aktualisieren**
```javascript
// User kann eigenes Profil aktualisieren
await supabase
  .from('profiles')
  .update({
    first_name: 'Max',
    last_name: 'Mustermann',
    birth_date: '1990-01-01'
  })
  .eq('id', userId);
```

#### 4. **User löschen** (Nur Admin)
```javascript
// User löschen (löscht automatisch Profil und Rollen wegen CASCADE)
await supabase.auth.admin.deleteUser(userId);
```

---

## 📋 Workflows & Beispiele

### Workflow 1: Neuer User registriert sich

**Schritt 1: User registriert sich**
```javascript
await signUp('max@example.com', 'passwort123', {
  firstName: 'Max',
  lastName: 'Mustermann',
  birthDate: '1990-01-01'
});
```

**Schritt 2: Automatisch passiert:**
- ✅ Eintrag in `auth.users` wird erstellt
- ✅ Trigger erstellt Eintrag in `profiles`
- ✅ Trigger weist Rolle `user` zu
- ✅ Metadaten werden zu `profiles` synchronisiert

**Ergebnis:**
```
auth.users:
  id: "abc-123"
  email: "max@example.com"
  
profiles:
  id: "abc-123"  ← gleiche ID!
  email: "max@example.com"
  first_name: "Max"
  last_name: "Mustermann"
  full_name: "Max Mustermann"
  birth_date: "1990-01-01"
  
user_roles:
  user_id: "abc-123"
  role: "user"  ← Standard-Rolle
```

---

### Workflow 2: Admin macht User zum Setter

**Schritt 1: Admin weist Rolle zu**
```javascript
// Admin ist eingeloggt (hat Rolle 'admin')
await supabase
  .from('user_roles')
  .insert({
    user_id: 'abc-123',  // Max's User-ID
    role: 'setter'
  });
```

**Ergebnis:**
```
user_roles:
  - user_id: "abc-123", role: "user"    ← bereits vorhanden
  - user_id: "abc-123", role: "setter"  ← NEU hinzugefügt
```

**Max hat jetzt:**
- ✅ Rolle `user` (Standard)
- ✅ Rolle `setter` (neu)
- ✅ Kann jetzt Boulders erstellen/bearbeiten

---

### Workflow 3: User loggt sich ein

**Schritt 1: User loggt sich ein**
```javascript
await signIn('max@example.com', 'passwort123');
```

**Schritt 2: App lädt Daten**
```javascript
// 1. Session wird erstellt (Supabase)
const { data: { session } } = await supabase.auth.getSession();

// 2. Profil wird geladen
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', session.user.id)
  .single();

// 3. Rollen werden geladen
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', session.user.id);
```

**Schritt 3: App zeigt entsprechende Bereiche**
```javascript
const isSetter = roles?.some(r => r.role === 'setter');
const isAdmin = roles?.some(r => r.role === 'admin');

if (isAdmin) {
  // Zeige Admin-Bereich
} else if (isSetter) {
  // Zeige Setter-Bereich
} else {
  // Zeige User-Bereich
}
```

---

### Workflow 4: Setter möchte Boulder erstellen

**Schritt 1: Setter klickt "Boulder erstellen"**
```javascript
// App prüft Berechtigung
const { hasRole } = useHasRole();
if (!hasRole('setter') && !hasRole('admin')) {
  toast.error('Keine Berechtigung');
  return;
}
```

**Schritt 2: Boulder wird erstellt**
```javascript
const { data, error } = await supabase
  .from('boulders')
  .insert({
    name: 'Neuer Boulder',
    sector_id: sectorId,
    difficulty: 5,
    color: 'Rot',
    status: 'haengt'
  });
```

**Schritt 3: Datenbank prüft RLS Policy**
```sql
-- RLS Policy prüft:
-- Hat User Rolle 'setter' ODER 'admin'?
-- Wenn JA: Insert wird erlaubt
-- Wenn NEIN: Fehler wird zurückgegeben
```

**Ergebnis:**
- ✅ Wenn Setter/Admin: Boulder wird erstellt
- ❌ Wenn nur User: Fehler "Keine Berechtigung"

---

## 🎯 Zusammenfassung: Was wird gebraucht?

### Für einen vollständigen User braucht man:

#### 1. **auth.users Eintrag** (Automatisch bei Registrierung)
- ✅ E-Mail
- ✅ Passwort (verschlüsselt)
- ✅ User-ID (UUID)

#### 2. **profiles Eintrag** (Automatisch erstellt)
- ✅ Gleiche ID wie `auth.users.id`
- ✅ E-Mail (synchronisiert)
- ✅ Optional: Name, Geburtsdatum

#### 3. **user_roles Eintrag** (Automatisch erstellt)
- ✅ Mindestens eine Rolle: `user` (Standard)
- ✅ Optional: `setter` oder `admin` (manuell zugewiesen)

### Die drei Ebenen im Überblick:

| Ebene | Zweck | Automatisch? | Wer kann ändern? |
|-------|-------|--------------|------------------|
| **auth.users** | Login/Auth | ✅ Bei Registrierung | User (Passwort), Admin (alles) |
| **profiles** | Erweiterte Daten | ✅ Bei Registrierung | User (eigene), Admin (alle) |
| **user_roles** | Berechtigungen | ✅ Standard-Rolle | Nur Admin |

### Berechtigungen-Übersicht:

| Rolle | Boulders lesen | Boulders erstellen | Admin-Funktionen | User verwalten |
|-------|---------------|-------------------|------------------|----------------|
| **Gast** (anonym) | ✅ | ❌ | ❌ | ❌ |
| **user** | ✅ | ❌ | ❌ | ❌ |
| **setter** | ✅ | ✅ | ❌ | ❌ |
| **admin** | ✅ | ✅ | ✅ | ✅ |

---

## 🔍 Häufige Fragen

### Frage 1: Warum drei separate Tabellen?
**Antwort:**
- `auth.users` ist von Supabase verwaltet (nur Login-Daten)
- `profiles` ist unsere eigene Tabelle (erweiterte Daten)
- `user_roles` ist flexibel (ein User kann mehrere Rollen haben)

### Frage 2: Kann ein User mehrere Rollen haben?
**Antwort:** Ja! Ein User kann z.B. gleichzeitig `setter` und `admin` sein.

### Frage 3: Was passiert wenn ein User gelöscht wird?
**Antwort:** 
- `auth.users` Eintrag wird gelöscht
- `profiles` Eintrag wird automatisch gelöscht (CASCADE)
- `user_roles` Einträge werden automatisch gelöscht (CASCADE)

### Frage 4: Wie prüfe ich ob ein User Admin ist?
**Antwort:**
```javascript
// In der App:
const { isAdmin } = useIsAdmin();

// In der Datenbank:
SELECT public.has_role(auth.uid(), 'admin');
```

### Frage 5: Wer kann Rollen zuweisen?
**Antwort:** Nur Admins können Rollen zuweisen/entfernen.

### Frage 6: Was ist der Unterschied zwischen `auth.users.email` und `profiles.email`?
**Antwort:**
- `auth.users.email` ist die Quelle der Wahrheit (für Login)
- `profiles.email` ist synchronisiert (für unsere App-Daten)
- Beide sollten immer gleich sein

---

## 📝 Checkliste: Was ist implementiert?

### ✅ Bereits implementiert:
- [x] Supabase Auth Integration
- [x] Automatische Profil-Erstellung (Trigger)
- [x] Automatische Standard-Rolle (Trigger)
- [x] Profil-Synchronisation (App-seitig)
- [x] Rollen-Prüfung (`has_role()` Funktion)
- [x] RLS Policies für alle Tabellen
- [x] Admin kann Rollen zuweisen
- [x] User kann eigenes Profil bearbeiten

### ⏳ Noch zu implementieren (optional):
- [ ] Bulk-Rollen-Zuweisung
- [ ] Rollen-Historie (wer hat wann welche Rolle zugewiesen)
- [ ] Temporäre Rollen (mit Ablaufdatum)
- [ ] Rollen-basierte Feature-Flags

---

**Letzte Aktualisierung:** Februar 2026  
**Status:** Vollständig implementiert und funktionsfähig
