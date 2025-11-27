# Upload-Logging-System - Implementierungsplan

## 🎯 Ziel

Ein umfassendes Logging- und Tracking-System für Video-Uploads, das:
- Alle Upload-Schritte nachvollziehbar macht
- Probleme auf dem iPhone identifiziert
- Doppelte Uploads verhindert
- Upload-Status in Echtzeit verfolgt
- Fehlerbehandlung verbessert

## 📊 Identifizierte Probleme

1. **Videos werden nicht auf CDN gespeichert** (Thumbnails schon)
2. **Videos werden doppelt gespeichert**
3. **App hängt sich auf** beim Upload mehrerer Videos
4. **Keine Nachvollziehbarkeit** was passiert ist
5. **iPhone-spezifische Probleme** (Netzwerk, App-Wechsel, etc.)

## 🏗️ Architektur-Übersicht

### 1. Upload-Log-Tabelle (Datenbank)

```sql
CREATE TABLE upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_session_id TEXT NOT NULL, -- Eindeutige Session-ID pro Upload
  boulder_id UUID REFERENCES boulders(id),
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL, -- 'video' | 'thumbnail'
  upload_type TEXT NOT NULL, -- 'allinkl' | 'supabase'
  status TEXT NOT NULL, -- 'pending' | 'compressing' | 'uploading' | 'completed' | 'failed' | 'duplicate'
  progress INTEGER DEFAULT 0, -- 0-100
  error_message TEXT,
  error_details JSONB, -- Detaillierte Fehlerinformationen
  final_url TEXT, -- URL nach erfolgreichem Upload
  chunk_info JSONB, -- Info über Chunks (bei chunked uploads)
  device_info JSONB, -- User-Agent, Platform, etc.
  network_info JSONB, -- Connection type, etc.
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_upload_logs_session_id ON upload_logs(upload_session_id);
CREATE INDEX idx_upload_logs_boulder_id ON upload_logs(boulder_id);
CREATE INDEX idx_upload_logs_status ON upload_logs(status);
CREATE INDEX idx_upload_logs_created_at ON upload_logs(created_at DESC);
```

### 2. Upload-Tracking-System (Frontend)

**Komponenten:**
- `UploadLogger` - Utility-Klasse für strukturiertes Logging
- `UploadTracker` - React Hook für Upload-Status-Tracking
- `UploadLogViewer` - Admin-Komponente zum Anzeigen von Logs

### 3. Logging-Ebenen

1. **Client-Side Logging** (Browser/iPhone)
   - Strukturierte Logs in localStorage (für Offline-Verfügbarkeit)
   - Automatisches Senden an Backend bei Verbindung
   - Device-Informationen sammeln

2. **Backend-Logging** (Supabase)
   - Upload-Logs in Datenbank
   - Server-seitige Validierung
   - Duplikat-Erkennung

3. **Server-Logging** (All-Inkl PHP)
   - PHP-Logs für Server-seitige Probleme
   - Chunk-Tracking
   - Fehlerbehandlung

## 📝 Implementierungs-Schritte

### Phase 1: Datenbank & Grundstruktur

#### 1.1 Migration erstellen
- `upload_logs` Tabelle anlegen
- Indizes erstellen
- RLS Policies setzen

#### 1.2 Upload-Logger Utility
- Strukturierte Logging-Funktionen
- Device-Info-Sammlung
- Network-Info-Sammlung
- LocalStorage-Persistierung

#### 1.3 Upload-Session-Management
- Eindeutige Session-IDs generieren
- Session-Tracking
- Duplikat-Erkennung

### Phase 2: Upload-Funktionen erweitern

#### 2.1 uploadBetaVideo() erweitern
- Logging vor/nach jedem Schritt
- Session-ID generieren
- Status-Updates
- Fehlerbehandlung verbessern

#### 2.2 uploadToAllInkl() erweitern
- Chunk-Logging
- Retry-Mechanismen
- Timeout-Handling
- Netzwerk-Status-Tracking

#### 2.3 Deduplizierung
- Prüfung vor Upload (Datei-Hash)
- Session-ID-basierte Duplikat-Erkennung
- Abbrechen bei Duplikat

### Phase 3: Frontend-Integration

#### 3.1 Upload-Tracker Hook
- React Hook für Upload-Status
- Echtzeit-Updates
- Progress-Tracking

#### 3.2 Setter.tsx anpassen
- Upload-Tracking integrieren
- Bessere Fehlerbehandlung
- Upload-Queue für mehrere Videos

#### 3.3 Upload-Status-Anzeige
- UI-Komponente für aktive Uploads
- Fehler-Anzeige
- Retry-Buttons

### Phase 4: Admin-Interface

#### 4.1 Upload-Log-Viewer
- Admin-Seite für Logs
- Filter & Suche
- Detail-Ansicht
- Export-Funktion

#### 4.2 Upload-Statistiken
- Erfolgsrate
- Durchschnittliche Upload-Zeit
- Fehler-Analyse

### Phase 5: iPhone-spezifische Verbesserungen

#### 5.1 Background-Upload-Handling
- Service Worker für Background-Uploads
- App-Wechsel-Handling
- Netzwerk-Wechsel-Handling

#### 5.2 Retry-Mechanismen
- Automatische Retries bei Fehlern
- Exponential Backoff
- Max. Retry-Limit

#### 5.3 Upload-Queue
- Queue-System für mehrere Videos
- Sequenzielles Upload (optional)
- Priorisierung

## 🔧 Technische Details

### Upload-Logger Struktur

```typescript
interface UploadLog {
  upload_session_id: string;
  boulder_id?: string;
  file_name: string;
  file_size: number;
  file_type: 'video' | 'thumbnail';
  upload_type: 'allinkl' | 'supabase';
  status: 'pending' | 'compressing' | 'uploading' | 'completed' | 'failed' | 'duplicate';
  progress: number;
  error_message?: string;
  error_details?: {
    code?: string;
    message: string;
    stack?: string;
    networkError?: boolean;
    timeout?: boolean;
    chunkNumber?: number;
    totalChunks?: number;
  };
  final_url?: string;
  chunk_info?: {
    totalChunks: number;
    chunkSize: number;
    uploadedChunks: number[];
  };
  device_info: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
    isIOS: boolean;
    connectionType?: string;
  };
  network_info?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  retry_count: number;
  started_at: string;
  completed_at?: string;
}
```

### Logging-Punkte

1. **Upload-Start**
   - Session-ID generieren
   - Datei-Info sammeln
   - Device-Info sammeln
   - Log in DB erstellen

2. **Komprimierung**
   - Start/Ende loggen
   - Progress loggen
   - Fehler loggen

3. **Upload-Chunks**
   - Jeden Chunk loggen
   - Chunk-Status
   - Retry bei Fehler

4. **Upload-Abschluss**
   - Finale URL loggen
   - Status auf "completed"
   - Boulder-Update loggen

5. **Fehler**
   - Detaillierte Fehler-Info
   - Stack-Trace
   - Retry-Info

### Duplikat-Erkennung

**Strategie:**
1. Datei-Hash berechnen (SHA-256)
2. Prüfen ob Hash bereits existiert
3. Prüfen ob Session-ID bereits verwendet wurde
4. Prüfen ob identische Datei in letzten 5 Minuten hochgeladen wurde

**Implementierung:**
- Hash in `upload_logs` speichern
- Index auf Hash-Spalte
- Prüfung vor Upload-Start

### Retry-Mechanismus

**Strategie:**
- Max. 3 Retries
- Exponential Backoff: 1s, 2s, 4s
- Nur bei Netzwerk-Fehlern retry
- Nicht bei Validierungs-Fehlern

**Logging:**
- Jeden Retry loggen
- Retry-Grund dokumentieren
- Finaler Status nach allen Retries

## 📱 iPhone-spezifische Verbesserungen

### 1. Background-Upload-Handling
- Service Worker für Background-Uploads
- Visibility API für App-Wechsel
- Network API für Netzwerk-Status

### 2. Upload-Queue
- Sequenzielles Upload (nicht parallel)
- Queue-Management
- Priorisierung

### 3. Timeout-Handling
- Längere Timeouts für mobile Netzwerke
- Progress-Updates auch bei langsamen Verbindungen
- Abbrechen bei zu langem Timeout

### 4. Memory-Management
- File-Slicing für große Videos
- Memory-Cleanup nach Upload
- Blob-URLs revoken

## 🎨 UI-Komponenten

### 1. Upload-Status-Bar
- Zeigt aktive Uploads
- Progress-Anzeige
- Fehler-Anzeige
- Retry-Button

### 2. Upload-Log-Viewer (Admin)
- Tabelle mit allen Uploads
- Filter nach Status, Datum, Boulder
- Detail-Ansicht mit vollständigem Log
- Export-Funktion

### 3. Upload-Statistiken
- Erfolgsrate
- Durchschnittliche Upload-Zeit
- Fehler-Verteilung
- Device-Statistiken

## 🔍 Debugging-Features

### 1. Live-Log-Viewer
- WebSocket-Verbindung für Live-Logs
- Real-time Updates
- Filter & Suche

### 2. Log-Export
- CSV-Export
- JSON-Export
- Filterbare Exports

### 3. Log-Analyse
- Fehler-Pattern-Erkennung
- Performance-Analyse
- Device-spezifische Probleme

## 📋 Checkliste für Implementierung

### Phase 1: Grundlagen
- [x] Migration für `upload_logs` Tabelle
- [x] UploadLogger Utility-Klasse
- [x] Device-Info-Sammlung
- [x] Network-Info-Sammlung
- [x] Session-ID-Generierung

### Phase 2: Upload-Integration
- [x] uploadBetaVideo() erweitern
- [x] uploadToAllInkl() erweitern
- [x] uploadThumbnail() erweitern
- [x] Logging in allen Upload-Funktionen
- [x] Fehlerbehandlung verbessern

### Phase 3: Deduplizierung
- [x] Datei-Hash-Berechnung
- [x] Duplikat-Prüfung
- [x] Duplikat-Logging
- [x] Duplikat-Verhinderung

### Phase 4: Retry-Mechanismus
- [x] Retry-Logik implementieren
- [x] Exponential Backoff
- [x] Retry-Logging
- [x] Max-Retry-Limit

### Phase 5: Frontend
- [x] UploadTracker Hook
- [x] Upload-Status-UI
- [x] Setter.tsx Integration
- [x] Upload-Queue-System

### Phase 6: Admin-Interface
- [x] Upload-Log-Viewer
- [x] Filter & Suche
- [x] Detail-Ansicht
- [x] Export-Funktion
- [ ] Statistiken (optional - kann später hinzugefügt werden)

### Phase 7: iPhone-Optimierungen
- [x] Background-Upload-Handling
- [x] Sequenzielles Upload
- [x] Timeout-Anpassungen
- [x] Memory-Management

## 🚀 Priorisierung

**Hoch (Sofort):**
1. Migration & Grundstruktur
2. Upload-Logging in uploadBetaVideo()
3. Duplikat-Erkennung
4. Admin-Log-Viewer

**Mittel (Nächste Woche):**
5. Retry-Mechanismus
6. Upload-Status-UI
7. iPhone-Optimierungen

**Niedrig (Später):**
8. Statistiken
9. Live-Log-Viewer
10. Erweiterte Analyse

## 📊 Erwartete Verbesserungen

1. **Nachvollziehbarkeit:** 100% - Jeder Upload wird geloggt
2. **Duplikat-Prävention:** 100% - Keine doppelten Uploads mehr
3. **Fehlerbehandlung:** 90% - Bessere Fehlerbehandlung
4. **iPhone-Kompatibilität:** 80% - Weniger Probleme auf iPhone
5. **Debugging:** 100% - Vollständige Logs für Debugging

## 🔐 Sicherheit & Datenschutz

- Logs nur für Admins sichtbar
- Keine sensiblen Daten in Logs
- Automatische Löschung alter Logs (nach 30 Tagen)
- RLS Policies für upload_logs

## 📈 Monitoring

- Erfolgsrate überwachen
- Fehler-Rate überwachen
- Upload-Zeit überwachen
- Device-spezifische Probleme identifizieren

