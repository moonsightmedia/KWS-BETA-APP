# KWS Beta App - Features & Entwicklungs-Roadmap

**Stand:** Februar 2026  
**Version:** 1.0.68

---

## 📋 Inhaltsverzeichnis

1. [Kritische Aufgaben (Sofort)](#kritische-aufgaben-sofort)
2. [Geplante Features (Kurzfristig)](#geplante-features-kurzfristig)
3. [Geplante Features (Mittelfristig)](#geplante-features-mittelfristig)
4. [Geplante Features (Langfristig)](#geplante-features-langfristig)
5. [Technische Verbesserungen](#technische-verbesserungen)
6. [Code-Qualität & Refactoring](#code-qualität--refactoring)
7. [UX-Verbesserungen](#ux-verbesserungen)
8. [Bekannte Probleme & Limitationen](#bekannte-probleme--limitationen)

---

## 🚨 Kritische Aufgaben (Sofort)

### 1. Wettkampf-Modus reaktivieren
**Status:** ⏳ Code vorhanden, aber UI ausgeblendet  
**Priorität:** Hoch  
**Aufwand:** Mittel (4-6 Stunden)  
**Geschätzte Zeit:** 1 Tag

#### Problem
Die Wettkampf-Funktionalität ist vollständig implementiert, aber die UI ist in `Competition.tsx` ausgeblendet. Die Seite leitet aktuell alle Besucher auf die Home-Seite um.

#### Implementierungsschritte

**Schritt 1: Competition.tsx reaktivieren**
```typescript
// src/pages/Competition.tsx
// ENTFERNEN: Die Redirect-Logik (Zeilen 46-50)
// ENTFERNEN: return null (Zeile 61)
// AKTIVIEREN: Alle auskommentierten Imports (Zeilen 8-28)
// AKTIVIEREN: Die vollständige CompetitionContent-Implementierung
```

**Schritt 2: Route prüfen**
- Route `/competition` ist bereits in `App.tsx` definiert (Zeile 315)
- `CompetitionOnboardingProvider` ist bereits vorhanden
- Keine Änderungen an Routing nötig

**Schritt 3: Datenbank-Migrationen prüfen**
```sql
-- Prüfen ob Tabellen existieren:
-- competition_boulders
-- competition_participants  
-- competition_results

-- Migrationen vorhanden:
-- supabase/migrations/20250133000000_create_competition_tables.sql
-- supabase/migrations/20250133000001_add_unique_user_id_to_participants.sql
```

**Schritt 4: Komponenten testen**
- [ ] `ResultInput.tsx` - Ergebnis-Eingabe testen
- [ ] `Leaderboard.tsx` - Rangliste testen
- [ ] `CompetitionBoulderManagement.tsx` - Boulder-Zuordnung testen
- [ ] `AdminResultEditDialog.tsx` - Admin-Bearbeitung testen
- [ ] `ParticipantDetails.tsx` - Teilnehmer-Details testen

**Schritt 5: Hooks testen**
- [ ] `useCompetitionBoulders.tsx` - Boulder-Daten laden
- [ ] `useCompetitionParticipant.tsx` - Teilnehmer-Verwaltung
- [ ] `useCompetitionResults.tsx` - Ergebnis-Verwaltung
- [ ] `useCompetitionLeaderboard.tsx` - Rangliste berechnen

**Schritt 6: Admin-Integration**
- [ ] Admin-Panel: Wettkampf-Boulder-Verwaltung prüfen
- [ ] Admin kann Wettkampf-Boulders zuweisen
- [ ] Admin kann Ergebnisse bearbeiten
- [ ] Admin kann Teilnehmer löschen

**Schritt 7: UI-Anpassungen (falls nötig)**
- [ ] Mobile-Responsiveness prüfen
- [ ] Loading-States optimieren
- [ ] Fehlerbehandlung verbessern
- [ ] Toast-Notifications für Aktionen

#### Akzeptanzkriterien
- ✅ Wettkampf-Seite ist erreichbar unter `/competition`
- ✅ User kann sich als Teilnehmer registrieren
- ✅ User kann Ergebnisse eingeben (Flash/Top/Zone/None)
- ✅ Rangliste wird korrekt angezeigt
- ✅ Filter nach Geschlecht funktioniert
- ✅ Admin kann Wettkampf-Boulders verwalten
- ✅ Admin kann Ergebnisse bearbeiten
- ✅ Mobile-Ansicht funktioniert korrekt

#### Bekannte Probleme
- Keine bekannten Probleme - Code ist vollständig vorhanden

#### Dateien betroffen
- `src/pages/Competition.tsx` (Hauptänderung)
- `src/components/competition/*` (alle Komponenten vorhanden)
- `src/hooks/useCompetition*.tsx` (alle Hooks vorhanden)
- `src/App.tsx` (Route bereits vorhanden)

#### Testing-Checkliste
- [ ] Unit-Tests für Hooks (falls vorhanden)
- [ ] Manuelle Tests: Teilnehmer-Registrierung
- [ ] Manuelle Tests: Ergebnis-Eingabe
- [ ] Manuelle Tests: Rangliste-Anzeige
- [ ] Manuelle Tests: Admin-Funktionen
- [ ] Cross-Browser-Tests (Chrome, Safari, Firefox)
- [ ] Mobile-Tests (iOS, Android)

---

## 🎯 Geplante Features (Kurzfristig - Q1 2026)

### 1. QR-Code-Scanner für Sektoren
**Status:** ⏳ Teilweise implementiert (QR-Code-Generierung vorhanden)  
**Priorität:** Hoch  
**Aufwand:** Mittel (8-12 Stunden)  
**Geschätzte Zeit:** 2 Tage

#### Problem
QR-Codes können für Sektoren generiert werden, aber es gibt keine Möglichkeit, diese zu scannen und direkt zum Sektor zu navigieren.

#### Implementierungsschritte

**Schritt 1: Dependencies installieren**
```bash
npm install @zxing/library @zxing/browser-reader
npm install @capacitor/camera
npx cap sync
```

**Schritt 2: Capacitor Camera Plugin konfigurieren**
```typescript
// capacitor.config.ts
plugins: {
  Camera: {
    permissions: {
      camera: 'We need camera access to scan QR codes',
    },
  },
}
```

**Schritt 3: Berechtigungen hinzufügen**

**Android (`android/app/src/main/AndroidManifest.xml`):**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

**iOS (`ios/App/App/Info.plist`):**
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan QR codes for sectors</string>
```

**Schritt 4: QR-Code-Scanner-Komponente erstellen**
```typescript
// src/components/QRCodeScanner.tsx
import { BrowserMultiFormatReader } from '@zxing/browser-reader';
import { Camera } from '@capacitor/camera';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface QRCodeScannerProps {
  open: boolean;
  onClose: () => void;
}

export const QRCodeScanner = ({ open, onClose }: QRCodeScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const reader = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (open && !reader.current) {
      reader.current = new BrowserMultiFormatReader();
    }
    return () => {
      if (reader.current) {
        reader.current.reset();
      }
    };
  }, [open]);

  const startScanning = async () => {
    try {
      // Check permissions
      const permission = await Camera.checkPermissions();
      if (permission.camera !== 'granted') {
        const result = await Camera.requestPermissions();
        if (result.camera !== 'granted') {
          setError('Camera permission denied');
          return;
        }
      }

      setScanning(true);
      setError(null);

      // Start scanning
      const result = await reader.current?.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, error) => {
          if (result) {
            handleQRCode(result.getText());
          }
          if (error && error.name !== 'NotFoundException') {
            console.error('Scan error:', error);
          }
        }
      );
    } catch (err) {
      setError('Failed to start camera');
      setScanning(false);
    }
  };

  const handleQRCode = (text: string) => {
    try {
      // Parse QR code format: sector:{sector_id}
      const match = text.match(/sector:([a-f0-9-]+)/i);
      if (match) {
        const sectorId = match[1];
        stopScanning();
        navigate(`/boulders?sector=${sectorId}`);
        onClose();
      } else {
        setError('Invalid QR code format');
      }
    } catch (err) {
      setError('Failed to parse QR code');
    }
  };

  const stopScanning = () => {
    reader.current?.reset();
    setScanning(false);
  };

  useEffect(() => {
    if (!open) {
      stopScanning();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR-Code scannen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <video
            ref={videoRef}
            className="w-full rounded-lg"
            style={{ display: scanning ? 'block' : 'none' }}
          />
          {!scanning && (
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Kamera wird gestartet...</p>
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <div className="flex gap-2">
            {!scanning ? (
              <Button onClick={startScanning} className="flex-1">
                Scannen starten
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="outline" className="flex-1">
                Abbrechen
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

**Schritt 5: Scanner in Sidebar/Navigation integrieren**
```typescript
// src/components/Sidebar.tsx
import { QRCodeScanner } from '@/components/QRCodeScanner';
import { QrCode } from 'lucide-react';

// In Sidebar-Komponente:
const [scannerOpen, setScannerOpen] = useState(false);

<Button
  variant="ghost"
  onClick={() => setScannerOpen(true)}
  className="w-full justify-start"
>
  <QrCode className="mr-2 h-4 w-4" />
  QR-Code scannen
</Button>

<QRCodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} />
```

**Schritt 6: Fallback für Web (ohne Kamera)**
```typescript
// Fallback: File-Upload für QR-Code-Bild
const handleFileUpload = async (file: File) => {
  const reader = new BrowserMultiFormatReader();
  const result = await reader.decodeFromImageFile(file);
  handleQRCode(result.getText());
};
```

**Schritt 7: QR-Code-Format standardisieren**
```typescript
// src/utils/qrCodeUtils.ts
export const generateSectorQRCode = (sectorId: string): string => {
  return `sector:${sectorId}`;
};

export const parseSectorQRCode = (text: string): string | null => {
  const match = text.match(/sector:([a-f0-9-]+)/i);
  return match ? match[1] : null;
};
```

#### Akzeptanzkriterien
- ✅ Scanner öffnet Kamera auf iOS und Android
- ✅ QR-Code wird erkannt und geparst
- ✅ Navigation zum Sektor funktioniert
- ✅ Fehlerbehandlung bei ungültigen QR-Codes
- ✅ Berechtigungen werden korrekt angefragt
- ✅ Web-Fallback funktioniert (File-Upload)

#### Bekannte Herausforderungen
- Kamera-Berechtigungen auf iOS/Android
- Unterschiedliche Kamera-APIs (Capacitor vs. Browser)
- Performance bei kontinuierlichem Scannen

#### Dateien betroffen
- `src/components/QRCodeScanner.tsx` (NEU)
- `src/components/Sidebar.tsx` (Integration)
- `src/utils/qrCodeUtils.ts` (Erweitern)
- `capacitor.config.ts` (Plugin-Konfiguration)
- `android/app/src/main/AndroidManifest.xml` (Berechtigungen)
- `ios/App/App/Info.plist` (Berechtigungen)

#### Testing-Checkliste
- [ ] Scanner öffnet auf iOS
- [ ] Scanner öffnet auf Android
- [ ] QR-Code wird erkannt
- [ ] Navigation funktioniert
- [ ] Berechtigungen werden korrekt angefragt
- [ ] Fehlerbehandlung bei ungültigen Codes
- [ ] Web-Fallback funktioniert
- [ ] Performance-Test (keine Memory-Leaks)

#### Bereits vorhanden
- ✅ QR-Code-Generierung (`src/components/admin/SectorQRCode.tsx`)
- ✅ QR-Code-Utilities (`src/utils/qrCodeUtils.ts`)

#### Benötigte Dependencies
- `@zxing/library` - QR-Code-Decoding
- `@zxing/browser-reader` - Browser-Integration
- `@capacitor/camera` - Native Kamera-Zugriff

---

### 2. Verbesserte Offline-Funktionalität
**Status:** ⏳ Service Worker vorhanden, aber nicht optimal  
**Priorität:** Mittel  
**Aufwand:** Hoch

**Was zu tun:**
- [ ] Service Worker optimieren (`public/service-worker.js`)
- [ ] Strategisches Caching für Boulders, Sektoren, Farben
- [ ] Offline-First-Ansatz für Boulder-Übersicht
- [ ] Queue-System für Offline-Uploads
- [ ] Sync-Mechanismus bei Wiederherstellung der Verbindung
- [ ] Offline-Indikator in UI

**Bereits vorhanden:**
- ✅ Service Worker implementiert
- ✅ PWA Manifest konfiguriert

---

### 3. Native Kamera-Zugriff
**Status:** ⏳ Geplant, nicht implementiert  
**Priorität:** Mittel  
**Aufwand:** Mittel

**Was zu tun:**
- [ ] Capacitor Camera Plugin installieren
- [ ] Kamera-Komponente für Thumbnail-Aufnahme
- [ ] Kamera-Komponente für Video-Aufnahme (Beta-Videos)
- [ ] Integration in Setter-Bereich
- [ ] Berechtigungen-Handling (iOS/Android)
- [ ] Test auf iOS und Android

**Benötigt:**
- `@capacitor/camera` Plugin
- Berechtigungen in `AndroidManifest.xml` und `Info.plist`

---

## 🎨 Geplante Features (Mittelfristig - Q2-Q3 2026)

### 1. Social Features
**Status:** ⏳ Nicht implementiert  
**Priorität:** Mittel  
**Aufwand:** Hoch (20-30 Stunden)  
**Geschätzte Zeit:** 1 Woche

#### Features

##### A. Favoriten-System

**Datenbank-Migration:**
```sql
-- supabase/migrations/YYYYMMDD_create_boulder_favorites.sql
CREATE TABLE IF NOT EXISTS public.boulder_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, boulder_id)
);

-- Index für schnelle Abfragen
CREATE INDEX idx_boulder_favorites_user_id ON public.boulder_favorites(user_id);
CREATE INDEX idx_boulder_favorites_boulder_id ON public.boulder_favorites(boulder_id);

-- RLS Policies
ALTER TABLE public.boulder_favorites ENABLE ROW LEVEL SECURITY;

-- Jeder kann seine eigenen Favoriten sehen
CREATE POLICY "Users can view own favorites"
  ON public.boulder_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Jeder kann eigene Favoriten hinzufügen
CREATE POLICY "Users can insert own favorites"
  ON public.boulder_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Jeder kann eigene Favoriten löschen
CREATE POLICY "Users can delete own favorites"
  ON public.boulder_favorites
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Hook: `useBoulderFavorites.tsx`**
```typescript
// src/hooks/useBoulderFavorites.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useBoulderFavorites = () => {
  const queryClient = useQueryClient();
  
  const { data: favorites, isLoading } = useQuery({
    queryKey: ['boulder_favorites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boulder_favorites')
        .select('boulder_id')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return new Set(data.map(f => f.boulder_id));
    },
  });

  const addFavorite = useMutation({
    mutationFn: async (boulderId: string) => {
      const { error } = await supabase
        .from('boulder_favorites')
        .insert({ boulder_id: boulderId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder_favorites'] });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (boulderId: string) => {
      const { error } = await supabase
        .from('boulder_favorites')
        .delete()
        .eq('boulder_id', boulderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder_favorites'] });
    },
  });

  return {
    favorites: favorites || new Set(),
    isLoading,
    isFavorite: (boulderId: string) => favorites?.has(boulderId) || false,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
    toggleFavorite: (boulderId: string) => {
      if (favorites?.has(boulderId)) {
        removeFavorite.mutate(boulderId);
      } else {
        addFavorite.mutate(boulderId);
      }
    },
  };
};
```

**UI-Komponente: `FavoriteButton.tsx`**
```typescript
// src/components/FavoriteButton.tsx
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoulderFavorites } from '@/hooks/useBoulderFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  boulderId: string;
  className?: string;
}

export const FavoriteButton = ({ boulderId, className }: FavoriteButtonProps) => {
  const { isFavorite, toggleFavorite, isLoading } = useBoulderFavorites();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => toggleFavorite(boulderId)}
      disabled={isLoading}
      className={cn(className)}
    >
      <Heart
        className={cn(
          "h-5 w-5",
          isFavorite(boulderId) ? "fill-red-500 text-red-500" : "text-gray-400"
        )}
      />
    </Button>
  );
};
```

**Integration in BoulderDetailDialog:**
```typescript
// src/components/BoulderDetailDialog.tsx
import { FavoriteButton } from '@/components/FavoriteButton';

// Im Dialog-Header:
<FavoriteButton boulderId={boulder.id} />
```

**Favoriten-Filter in Boulders.tsx:**
```typescript
// src/pages/Boulders.tsx
const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
const { favorites } = useBoulderFavorites();

const filteredBoulders = useMemo(() => {
  let filtered = boulders || [];
  
  if (showFavoritesOnly) {
    filtered = filtered.filter(b => favorites.has(b.id));
  }
  
  // ... weitere Filter
}, [boulders, showFavoritesOnly, favorites]);
```

##### B. Kommentare-System

**Datenbank-Migration:**
```sql
-- supabase/migrations/YYYYMMDD_create_boulder_comments.sql
CREATE TABLE IF NOT EXISTS public.boulder_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boulder_id UUID NOT NULL REFERENCES public.boulders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL CHECK (char_length(comment) >= 1 AND char_length(comment) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited BOOLEAN NOT NULL DEFAULT false
);

-- Index für schnelle Abfragen
CREATE INDEX idx_boulder_comments_boulder_id ON public.boulder_comments(boulder_id);
CREATE INDEX idx_boulder_comments_user_id ON public.boulder_comments(user_id);
CREATE INDEX idx_boulder_comments_created_at ON public.boulder_comments(created_at DESC);

-- RLS Policies
ALTER TABLE public.boulder_comments ENABLE ROW LEVEL SECURITY;

-- Alle können Kommentare lesen
CREATE POLICY "Anyone can view comments"
  ON public.boulder_comments
  FOR SELECT
  USING (true);

-- Nur authentifizierte User können Kommentare hinzufügen
CREATE POLICY "Authenticated users can insert comments"
  ON public.boulder_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Nur eigene Kommentare können bearbeitet werden
CREATE POLICY "Users can update own comments"
  ON public.boulder_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Nur eigene Kommentare oder Admin können löschen
CREATE POLICY "Users can delete own comments or admin"
  ON public.boulder_comments
  FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_boulder_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.edited = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_boulder_comments_updated_at
  BEFORE UPDATE ON public.boulder_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_boulder_comments_updated_at();
```

**Hook: `useBoulderComments.tsx`**
```typescript
// src/hooks/useBoulderComments.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BoulderComment {
  id: string;
  boulder_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  edited: boolean;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export const useBoulderComments = (boulderId: string) => {
  const queryClient = useQueryClient();
  
  const { data: comments, isLoading } = useQuery({
    queryKey: ['boulder_comments', boulderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boulder_comments')
        .select(`
          *,
          profile:profiles!inner(full_name, email)
        `)
        .eq('boulder_id', boulderId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as BoulderComment[];
    },
  });

  const addComment = useMutation({
    mutationFn: async (comment: string) => {
      const { data, error } = await supabase
        .from('boulder_comments')
        .insert({
          boulder_id: boulderId,
          comment: comment.trim(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder_comments', boulderId] });
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const { error } = await supabase
        .from('boulder_comments')
        .update({ comment: comment.trim() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder_comments', boulderId] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('boulder_comments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulder_comments', boulderId] });
    },
  });

  return {
    comments: comments || [],
    isLoading,
    addComment: addComment.mutate,
    updateComment: updateComment.mutate,
    deleteComment: deleteComment.mutate,
  };
};
```

**UI-Komponente: `BoulderComments.tsx`**
```typescript
// src/components/BoulderComments.tsx
import { useState } from 'react';
import { useBoulderComments, BoulderComment } from '@/hooks/useBoulderComments';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { MessageSquare, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BoulderCommentsProps {
  boulderId: string;
}

export const BoulderComments = ({ boulderId }: BoulderCommentsProps) => {
  const { user } = useAuth();
  const { comments, isLoading, addComment, updateComment, deleteComment } = useBoulderComments(boulderId);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleSubmit = () => {
    if (newComment.trim()) {
      addComment(newComment);
      setNewComment('');
    }
  };

  const handleEdit = (comment: BoulderComment) => {
    setEditingId(comment.id);
    setEditText(comment.comment);
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      updateComment({ id: editingId, comment: editText });
      setEditingId(null);
      setEditText('');
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Lade Kommentare...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        <h3 className="font-semibold">Kommentare ({comments.length})</h3>
      </div>

      {/* Kommentar hinzufügen */}
      {user && (
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Kommentar hinzufügen..."
            rows={3}
          />
          <Button onClick={handleSubmit} size="sm">
            Kommentieren
          </Button>
        </div>
      )}

      {/* Kommentar-Liste */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar>
              <AvatarFallback>
                {comment.profile?.full_name?.[0] || comment.profile?.email?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {comment.profile?.full_name || comment.profile?.email || 'Unbekannt'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: de,
                  })}
                  {comment.edited && ' (bearbeitet)'}
                </span>
              </div>
              {editingId === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} size="sm">
                      Speichern
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm">{comment.comment}</p>
                  {user?.id === comment.user_id && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(comment)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Bearbeiten
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Kommentar wirklich löschen?')) {
                            deleteComment(comment.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Löschen
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Integration in BoulderDetailDialog:**
```typescript
// src/components/BoulderDetailDialog.tsx
import { BoulderComments } from '@/components/BoulderComments';

// Im Dialog-Content:
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="comments">Kommentare</TabsTrigger>
  </TabsList>
  <TabsContent value="details">
    {/* Bestehender Content */}
  </TabsContent>
  <TabsContent value="comments">
    <BoulderComments boulderId={boulder.id} />
  </TabsContent>
</Tabs>
```

#### Akzeptanzkriterien
- ✅ User kann Boulders als Favoriten markieren
- ✅ Favoriten-Liste wird im Profil angezeigt
- ✅ Filter nach Favoriten funktioniert
- ✅ Kommentare können hinzugefügt werden
- ✅ Kommentare werden angezeigt
- ✅ Eigene Kommentare können bearbeitet/gelöscht werden
- ✅ Admin kann alle Kommentare löschen
- ✅ Kommentare werden chronologisch sortiert
- ✅ Bearbeitete Kommentare werden markiert

#### Dateien betroffen
- `supabase/migrations/YYYYMMDD_create_boulder_favorites.sql` (NEU)
- `supabase/migrations/YYYYMMDD_create_boulder_comments.sql` (NEU)
- `src/hooks/useBoulderFavorites.tsx` (NEU)
- `src/hooks/useBoulderComments.tsx` (NEU)
- `src/components/FavoriteButton.tsx` (NEU)
- `src/components/BoulderComments.tsx` (NEU)
- `src/components/BoulderDetailDialog.tsx` (Integration)
- `src/pages/Boulders.tsx` (Favoriten-Filter)
- `src/pages/Profile.tsx` (Favoriten-Liste)

#### Testing-Checkliste
- [ ] Favoriten hinzufügen/entfernen
- [ ] Favoriten-Liste anzeigen
- [ ] Filter nach Favoriten
- [ ] Kommentar hinzufügen
- [ ] Kommentar bearbeiten
- [ ] Kommentar löschen
- [ ] Admin-Moderation
- [ ] RLS Policies testen
- [ ] Performance bei vielen Kommentaren

---

### 2. Persönliche Statistiken
**Status:** ⏳ Nicht implementiert  
**Priorität:** Mittel  
**Aufwand:** Mittel

**Features:**
- [ ] **Eigene Erfolge tracken:**
  - Welche Boulders geschafft
  - Anzahl Versuche pro Boulder
  - Persönliche Bestzeiten
  - Fortschritts-Charts
- [ ] **Statistik-Dashboard:**
  - Erfolgsrate pro Schwierigkeit
  - Meist gekletterte Sektoren
  - Persönliche Entwicklung über Zeit

**Datenbank:**
- Neue Tabelle `user_boulder_results` (user_id, boulder_id, completed, attempts, completed_at)

---

### 3. Boulder-Routenplanung
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Hoch

**Features:**
- [ ] Optimale Route durch Halle berechnen
- [ ] Sektor-Reihenfolge vorschlagen
- [ ] Berücksichtigung von Schwierigkeit und Position
- [ ] Speichern von Routen
- [ ] Teilen von Routen

**Benötigt:**
- Sektor-Positionen in Datenbank
- Routing-Algorithmus
- UI für Routenplanung

---

### 4. Erweiterte Filter
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Niedrig  
**Aufwand:** Niedrig

**Zusätzliche Filter:**
- [ ] Filter nach Datum (erstellt/aktualisiert)
- [ ] Filter nach Setter (wer hat Boulder erstellt)
- [ ] Filter nach Status-Historie
- [ ] Kombinierte Filter speichern
- [ ] Filter-Vorschläge basierend auf Nutzung

**Bereits vorhanden:**
- ✅ Filter nach Sektor, Schwierigkeit, Farbe, Status

---

### 5. Dark Mode
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Mittel (12-16 Stunden)  
**Geschätzte Zeit:** 2-3 Tage

#### Problem
Die App unterstützt aktuell nur Light Mode. Dark Mode würde die Nutzerfreundlichkeit verbessern, besonders bei Nutzung in dunklen Umgebungen.

#### Implementierungsschritte

**Schritt 1: Tailwind Dark Mode konfigurieren**
```typescript
// tailwind.config.ts
export default {
  darkMode: 'class', // Aktiviert class-basierten Dark Mode
  // ... rest der Konfiguration
}
```

**Schritt 2: Theme-Provider einrichten**
```typescript
// src/components/ThemeProvider.tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

**Schritt 3: ThemeProvider in App.tsx integrieren**
```typescript
// src/App.tsx
import { ThemeProvider } from '@/components/ThemeProvider';

const App = () => (
  <ErrorBoundary>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={queryClient}>
        {/* ... rest */}
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
```

**Schritt 4: Theme-Toggle-Komponente erstellen**
```typescript
// src/components/ThemeToggle.tsx
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Theme umschalten</span>
    </Button>
  );
}
```

**Schritt 5: Theme-Toggle in Sidebar integrieren**
```typescript
// src/components/Sidebar.tsx
import { ThemeToggle } from '@/components/ThemeToggle';

// Im Sidebar-Footer:
<div className="mt-auto p-4 border-t">
  <ThemeToggle />
</div>
```

**Schritt 6: Dark Mode Klassen für Hauptkomponenten**

**Globale Styles (`src/index.css`):**
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 142 71% 45%;
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 142 71% 45%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 142 71% 45%;
    --primary-foreground: 0 0% 100%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 142 71% 45%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Komponenten anpassen (Beispiel: BoulderDetailDialog):**
```typescript
// src/components/BoulderDetailDialog.tsx
// Alle hardcodierten Farben durch CSS-Variablen ersetzen:

// VORHER:
<div className="bg-white text-gray-900">

// NACHHER:
<div className="bg-card text-card-foreground">
```

**Schritt 7: Spezifische Komponenten anpassen**

**Sidebar:**
```typescript
// src/components/Sidebar.tsx
// VORHER:
<div className="bg-[#F9FAF9] border-r border-gray-200">

// NACHHER:
<div className="bg-background border-r border-border">
```

**Boulder Cards:**
```typescript
// src/pages/Boulders.tsx
// VORHER:
<Card className="bg-white border-gray-200">

// NACHHER:
<Card className="bg-card border-border">
```

**Schritt 8: User-Präferenz in Datenbank speichern (optional)**
```sql
-- Erweitere profiles Tabelle
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system'));
```

**Hook: `useThemePreference.tsx`**
```typescript
// src/hooks/useThemePreference.tsx
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export const useThemePreference = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (user) {
      // Lade Präferenz aus Datenbank
      supabase
        .from('profiles')
        .select('theme_preference')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.theme_preference) {
            setTheme(data.theme_preference);
          }
        });
    }
  }, [user]);

  const updateTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    if (user) {
      await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user.id);
    }
  };

  return { theme, setTheme: updateTheme };
};
```

**Schritt 9: Bilder/Logos für Dark Mode**
```typescript
// Für Logos mit weißem Hintergrund:
<img 
  src="/logo.png" 
  className="dark:invert dark:brightness-0 dark:contrast-100"
  alt="Logo"
/>
```

#### Komponenten-Übersicht (alle anpassen)

**Hauptkomponenten:**
- [ ] `Sidebar.tsx` - Hintergrund, Borders, Text
- [ ] `BoulderDetailDialog.tsx` - Card, Text, Buttons
- [ ] `BoulderCard` (in Boulders.tsx) - Card, Badges
- [ ] `DashboardHeader.tsx` - Hintergrund, Text
- [ ] `StatCard.tsx` - Card, Text, Icons
- [ ] `CategoryChart.tsx` - Chart-Farben
- [ ] `DifficultyDistributionChart.tsx` - Chart-Farben
- [ ] Alle Admin-Komponenten
- [ ] Alle Setter-Komponenten
- [ ] Auth-Seite
- [ ] Profile-Seite

**UI-Komponenten (shadcn/ui):**
- Die meisten shadcn/ui Komponenten unterstützen bereits Dark Mode
- Prüfen und ggf. anpassen:
  - `button.tsx`
  - `input.tsx`
  - `select.tsx`
  - `dialog.tsx`
  - `card.tsx`
  - `badge.tsx`

#### Akzeptanzkriterien
- ✅ Dark Mode kann aktiviert/deaktiviert werden
- ✅ System-Präferenz wird erkannt
- ✅ Theme-Präferenz wird gespeichert (optional)
- ✅ Alle Komponenten sehen in Dark Mode gut aus
- ✅ Keine kontrastlosen Elemente
- ✅ Smooth Transitions zwischen Themes
- ✅ Bilder/Logos sind in Dark Mode sichtbar

#### Bekannte Herausforderungen
- Viele hardcodierte Farben müssen ersetzt werden
- Bilder müssen für Dark Mode angepasst werden
- Charts müssen Dark-Mode-Farben haben
- Konsistenz über alle Komponenten hinweg

#### Dateien betroffen
- `tailwind.config.ts` (Dark Mode aktivieren)
- `src/index.css` (CSS-Variablen für Dark Mode)
- `src/components/ThemeProvider.tsx` (NEU)
- `src/components/ThemeToggle.tsx` (NEU)
- `src/App.tsx` (ThemeProvider integrieren)
- `src/components/Sidebar.tsx` (Theme-Toggle + Dark Mode Klassen)
- Alle Komponenten (Dark Mode Klassen)
- `src/hooks/useThemePreference.tsx` (NEU, optional)
- `supabase/migrations/YYYYMMDD_add_theme_preference.sql` (NEU, optional)

#### Testing-Checkliste
- [ ] Theme-Toggle funktioniert
- [ ] System-Präferenz wird erkannt
- [ ] Alle Seiten sehen in Dark Mode gut aus
- [ ] Keine kontrastlosen Texte
- [ ] Bilder sind sichtbar
- [ ] Charts sind lesbar
- [ ] Smooth Transitions
- [ ] Theme-Präferenz wird gespeichert (falls implementiert)
- [ ] Cross-Browser-Test (Chrome, Safari, Firefox)

#### Bereits vorhanden
- ✅ `next-themes` ist bereits installiert (package.json)

---

## 🚀 Geplante Features (Langfristig - Q4 2026+)

### 1. White-Label-Lösung
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Sehr Hoch

**Features:**
- [ ] Multi-Tenant-Support
- [ ] Konfigurierbare Branding (Logo, Farben, Name)
- [ ] Tenant-spezifische Domain-Support
- [ ] Tenant-Isolation in Datenbank
- [ ] Admin-Interface für Tenant-Verwaltung

**Architektur:**
- Row Level Security erweitern für Multi-Tenant
- Tenant-ID in allen Tabellen
- Konfigurations-Tabelle für Tenants

---

### 2. Multi-Tenant-Support
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Sehr Hoch

**Features:**
- [ ] Tenant-Verwaltung
- [ ] Tenant-spezifische Daten
- [ ] Tenant-spezifische Einstellungen
- [ ] Tenant-Isolation

---

### 3. API für externe Integrationen
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Hoch

**Features:**
- [ ] RESTful API dokumentieren
- [ ] API-Keys für externe Zugriffe
- [ ] Rate Limiting
- [ ] API-Dokumentation (z.B. Swagger/OpenAPI)
- [ ] Webhooks für Events

---

### 4. Erweiterte Analytics
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Mittel

**Features:**
- [ ] Nutzungsstatistiken
- [ ] Boulder-Popularität
- [ ] User-Engagement-Metriken
- [ ] Admin-Dashboard mit Analytics
- [ ] Export-Funktionen

---

### 5. KI-gestützte Boulder-Empfehlungen
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Sehr Hoch

**Features:**
- [ ] Empfehlungs-Algorithmus basierend auf:
  - Geschafften Bouldern
  - Schwierigkeit
  - Sektor-Präferenzen
  - Ähnliche User
- [ ] Machine Learning Integration
- [ ] Personalisierte Boulder-Vorschläge

---

## ⚡ Technische Verbesserungen

### Performance-Optimierungen

#### 1. Lazy Loading für alle Routen
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Mittel  
**Aufwand:** Niedrig (2-4 Stunden)  
**Geschätzte Zeit:** 0.5 Tage

#### Problem
Aktuell werden alle Seiten-Komponenten beim ersten Load geladen, was die initiale Bundle-Größe erhöht. Nur `Setter` und `Guest` sind lazy geladen.

#### Aktueller Stand
```typescript
// src/App.tsx - Aktuelle Implementierung
import Index from "./pages/Index";        // ❌ Nicht lazy
import Sectors from "./pages/Sectors";    // ❌ Nicht lazy
import Boulders from "./pages/Boulders";  // ❌ Nicht lazy
import Auth from "./pages/Auth";          // ❌ Nicht lazy
import Profile from "./pages/Profile";    // ❌ Nicht lazy
import Admin from "./pages/Admin";        // ❌ Nicht lazy
import Setter from "./pages/Setter";      // ✅ Bereits lazy (vermutlich)
import Guest from "./pages/Guest";        // ✅ Bereits lazy (vermutlich)
import Competition from "./pages/Competition"; // ❌ Nicht lazy
```

#### Implementierungsschritte

**Schritt 1: Lazy Loading für alle Routen implementieren**
```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';

// Lazy load alle Seiten-Komponenten
const Index = lazy(() => import('./pages/Index'));
const Sectors = lazy(() => import('./pages/Sectors'));
const Boulders = lazy(() => import('./pages/Boulders'));
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const Setter = lazy(() => import('./pages/Setter'));
const Guest = lazy(() => import('./pages/Guest'));
const Competition = lazy(() => import('./pages/Competition'));
const NotFound = lazy(() => import('./pages/NotFound'));
```

**Schritt 2: Suspense-Boundaries hinzufügen**
```typescript
// src/App.tsx
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthProvider>
        <Root />
      </AuthProvider>
    ),
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <RequireAuth>
              <Index />
            </RequireAuth>
          </Suspense>
        ) 
      },
      { 
        path: "sectors", 
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <Sectors />
          </Suspense>
        ) 
      },
      { 
        path: "boulders", 
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <Boulders />
          </Suspense>
        ) 
      },
      { 
        path: "auth", 
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <Auth />
          </Suspense>
        ) 
      },
      { 
        path: "profile", 
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <Profile />
          </Suspense>
        ) 
      },
      { 
        path: "admin", 
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <Admin />
          </Suspense>
        ) 
      },
      { 
        path: "setter", 
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <Setter />
          </Suspense>
        ) 
      },
      { 
        path: "guest", 
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <Guest />
          </Suspense>
        ) 
      },
      { 
        path: "competition", 
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <Competition />
          </Suspense>
        ) 
      },
      { 
        path: "*", 
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <NotFound />
          </Suspense>
        ) 
      },
    ],
  },
]);
```

**Schritt 3: Preloading für wahrscheinliche Routen (optional)**
```typescript
// src/components/Sidebar.tsx
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  
  // Preload wahrscheinliche Routen beim Hover
  const handleMouseEnter = (route: string) => {
    // Dynamisch importieren ohne zu navigieren
    if (route === '/boulders') {
      import('../pages/Boulders');
    } else if (route === '/sectors') {
      import('../pages/Sectors');
    }
    // ... weitere Routen
  };

  return (
    <nav>
      <Link 
        to="/boulders"
        onMouseEnter={() => handleMouseEnter('/boulders')}
      >
        Boulders
      </Link>
      {/* ... */}
    </nav>
  );
};
```

**Schritt 4: Route-basiertes Code-Splitting optimieren**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select', /* ... */],
          'chart-vendor': ['recharts'],
        },
      },
    },
  },
});
```

#### Erwartete Verbesserungen
- **Initiale Bundle-Größe:** ~30-40% kleiner
- **Time to Interactive:** ~20-30% schneller
- **First Contentful Paint:** ~15-25% schneller

#### Akzeptanzkriterien
- ✅ Alle Routen werden lazy geladen
- ✅ Loading-States werden während Ladezeit angezeigt
- ✅ Keine Performance-Regression
- ✅ Code-Splitting funktioniert korrekt
- ✅ Preloading funktioniert (falls implementiert)

#### Dateien betroffen
- `src/App.tsx` (Hauptänderung)
- `vite.config.ts` (Code-Splitting optimieren)
- `src/components/Sidebar.tsx` (Preloading, optional)

#### Testing-Checkliste
- [ ] Alle Routen laden korrekt
- [ ] Loading-States werden angezeigt
- [ ] Bundle-Größe ist reduziert
- [ ] Performance-Metriken verbessert
- [ ] Keine Fehler beim Lazy Loading
- [ ] Cross-Browser-Test

#### Bereits vorhanden
- ✅ `LoadingScreen` Komponente vorhanden
- ✅ `Suspense` aus React verfügbar

---

#### 2. Virtualisierung für lange Listen
**Status:** ⏳ Nicht implementiert  
**Priorität:** Mittel  
**Aufwand:** Mittel (8-12 Stunden)  
**Geschätzte Zeit:** 1.5-2 Tage

#### Problem
Bei vielen Bouldern (>100) kann die Rendering-Performance leiden, da alle Items gleichzeitig gerendert werden.

#### Implementierungsschritte

**Schritt 1: React Virtual installieren**
```bash
npm install @tanstack/react-virtual
```

**Schritt 2: Virtualisierung für Boulder-Liste**
```typescript
// src/pages/Boulders.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

const Boulders = () => {
  const parentRef = useRef<HTMLDivElement>(null);
  const filteredBoulders = /* ... */;

  const virtualizer = useVirtualizer({
    count: filteredBoulders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Geschätzte Höhe pro Boulder-Card
    overscan: 5, // Anzahl der Items außerhalb des Viewports
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const boulder = filteredBoulders[virtualItem.index];
          return (
            <div
              key={boulder.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <BoulderCard boulder={boulder} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

**Schritt 3: Dynamische Höhen-Schätzung (optional)**
```typescript
// Für unterschiedliche Card-Höhen:
const virtualizer = useVirtualizer({
  count: filteredBoulders.length,
  getScrollElement: () => parentRef.current,
  estimateSize: (index) => {
    const boulder = filteredBoulders[index];
    // Geschätzte Höhe basierend auf Content
    let height = 150; // Basis-Höhe
    if (boulder.note) height += 50;
    if (boulder.beta_video_url) height += 20;
    return height;
  },
  overscan: 5,
});
```

**Schritt 4: Virtualisierung für Sektor-Liste**
```typescript
// src/pages/Sectors.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const Sectors = () => {
  const parentRef = useRef<HTMLDivElement>(null);
  const { data: sectors } = useSectorsTransformed();

  const virtualizer = useVirtualizer({
    count: sectors?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // Geschätzte Höhe pro Sektor-Card
    overscan: 3,
  });

  // Ähnliche Implementierung wie bei Boulders
};
```

**Schritt 5: Virtualisierung für Leaderboard**
```typescript
// src/components/competition/Leaderboard.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const Leaderboard = () => {
  const parentRef = useRef<HTMLDivElement>(null);
  const { data: entries } = useCompetitionLeaderboard();

  const virtualizer = useVirtualizer({
    count: entries?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Geschätzte Höhe pro Leaderboard-Entry
    overscan: 10, // Mehr Overscan für schnelles Scrollen
  });

  // Implementierung ähnlich wie oben
};
```

**Schritt 6: Responsive Höhen**
```typescript
// Für mobile vs. desktop unterschiedliche Höhen:
const isMobile = useMediaQuery('(max-width: 768px)');
const estimateSize = (index: number) => {
  return isMobile ? 150 : 200;
};
```

#### Performance-Verbesserungen
- **Rendering-Zeit:** ~80-90% schneller bei >100 Items
- **Memory-Usage:** ~70-80% weniger bei großen Listen
- **Scroll-Performance:** Smooth auch bei 1000+ Items

#### Akzeptanzkriterien
- ✅ Listen mit >100 Items scrollen smooth
- ✅ Keine Performance-Probleme
- ✅ Alle Items sind erreichbar
- ✅ Höhen werden korrekt geschätzt
- ✅ Mobile-Ansicht funktioniert

#### Bekannte Herausforderungen
- Dynamische Höhen können zu Sprüngen führen
- Initiale Höhen-Schätzung muss genau sein
- Scroll-Position muss bei Filter-Änderungen erhalten bleiben

#### Dateien betroffen
- `src/pages/Boulders.tsx` (Virtualisierung)
- `src/pages/Sectors.tsx` (Virtualisierung)
- `src/components/competition/Leaderboard.tsx` (Virtualisierung)
- `package.json` (Dependency hinzufügen)

#### Testing-Checkliste
- [ ] Virtualisierung funktioniert bei vielen Items
- [ ] Scroll-Performance ist gut
- [ ] Alle Items sind erreichbar
- [ ] Höhen werden korrekt geschätzt
- [ ] Mobile-Ansicht funktioniert
- [ ] Filter funktionieren mit Virtualisierung
- [ ] Keine visuellen Artefakte

---

#### 3. Debouncing für Suche
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Sehr Niedrig (1-2 Stunden)  
**Geschätzte Zeit:** 0.25 Tage

#### Problem
Die Boulder-Suche führt bei jedem Tastendruck eine Filterung durch, was bei vielen Bouldern zu Performance-Problemen führen kann.

#### Implementierungsschritte

**Schritt 1: Custom Hook für Debounced Value**
```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**Schritt 2: Debouncing in Boulders.tsx implementieren**
```typescript
// src/pages/Boulders.tsx
import { useDebounce } from '@/hooks/useDebounce';

const Boulders = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isSearching, setIsSearching] = useState(false);

  // Zeige Loading-Indicator während Debounce
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery, debouncedSearchQuery]);

  // Verwende debouncedSearchQuery für Filterung
  const filteredBoulders = useMemo(() => {
    let filtered = boulders || [];
    
    if (debouncedSearchQuery) {
      filtered = filtered.filter(boulder =>
        boulder.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }
    
    // ... weitere Filter
    
    return filtered;
  }, [boulders, debouncedSearchQuery, /* weitere Dependencies */]);

  return (
    <div>
      <div className="relative">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Boulder suchen..."
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>
      {/* ... rest */}
    </div>
  );
};
```

**Schritt 3: Optional - useMemo für teure Berechnungen**
```typescript
// Wenn Filterung sehr teuer ist:
const filteredBoulders = useMemo(() => {
  // Teure Filter-Operationen
}, [boulders, debouncedSearchQuery, /* ... */]);
```

#### Akzeptanzkriterien
- ✅ Suche wird debounced (300-500ms Verzögerung)
- ✅ Loading-Indicator während Debounce
- ✅ Keine Performance-Probleme bei vielen Bouldern
- ✅ Suche fühlt sich responsiv an

#### Dateien betroffen
- `src/hooks/useDebounce.ts` (NEU)
- `src/pages/Boulders.tsx` (Integration)

#### Testing-Checkliste
- [ ] Debouncing funktioniert korrekt
- [ ] Loading-Indicator wird angezeigt
- [ ] Performance ist gut bei vielen Bouldern
- [ ] Suche fühlt sich responsiv an

---

#### 4. Optimistic Updates
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Mittel  
**Aufwand:** Mittel

**Was zu tun:**
- [ ] Optimistic Updates für Boulder-Erstellung
- [ ] Optimistic Updates für Status-Änderungen
- [ ] Rollback bei Fehlern
- [ ] Bessere UX bei langsamen Verbindungen

**Bereits vorhanden:**
- ✅ TanStack Query unterstützt Optimistic Updates

---

#### 5. Bundle-Size-Optimierung
**Status:** ⏳ Nicht optimiert  
**Priorität:** Niedrig  
**Aufwand:** Mittel

**Was zu tun:**
- [ ] Bundle-Analyse durchführen
- [ ] Unused Dependencies entfernen
- [ ] Tree-Shaking optimieren
- [ ] Code-Splitting verbessern
- [ ] Asset-Optimierung (Bilder, Videos)

---

## 🔧 Code-Qualität & Refactoring

### 1. Error Boundaries implementieren
**Status:** ⏳ Teilweise vorhanden  
**Priorität:** Hoch  
**Aufwand:** Niedrig

**Was zu tun:**
- [ ] Error Boundary für gesamte App
- [ ] Error Boundaries für kritische Bereiche
- [ ] Fehler-Logging (z.B. Sentry)
- [ ] User-freundliche Fehlermeldungen

**Bereits vorhanden:**
- ✅ `src/components/ErrorBoundary.tsx` (vorhanden, aber nicht überall verwendet)

---

### 2. Unit-Tests für kritische Funktionen
**Status:** ⏳ Nicht implementiert  
**Priorität:** Mittel  
**Aufwand:** Hoch

**Was zu tun:**
- [ ] Test-Framework einrichten (z.B. Vitest)
- [ ] Tests für Hooks schreiben
- [ ] Tests für Utility-Funktionen
- [ ] Tests für Daten-Transformationen
- [ ] CI/CD Integration

**Kritische Funktionen:**
- `src/hooks/useAuth.tsx`
- `src/hooks/useBoulders.tsx`
- `src/utils/*.ts`
- `src/lib/dataTransformers.ts`

---

### 3. E2E-Tests für Haupt-Workflows
**Status:** ⏳ Nicht implementiert  
**Priorität:** Niedrig  
**Aufwand:** Sehr Hoch

**Was zu tun:**
- [ ] E2E-Test-Framework einrichten (z.B. Playwright)
- [ ] Tests für User-Registrierung/Login
- [ ] Tests für Boulder-Erstellung (Setter)
- [ ] Tests für Boulder-Filterung
- [ ] Tests für Admin-Funktionen

---

### 4. Code-Splitting optimieren
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Niedrig  
**Aufwand:** Mittel

**Was zu tun:**
- [ ] Route-basiertes Code-Splitting
- [ ] Component-basiertes Code-Splitting
- [ ] Vendor-Chunks optimieren
- [ ] Dynamic Imports für große Bibliotheken

---

### 5. Refactoring von großen Komponenten
**Status:** ⏳ Bekanntes Problem  
**Priorität:** Mittel  
**Aufwand:** Mittel

**Betroffene Komponenten:**

#### Setter.tsx (~1800 Zeilen)
**Was zu tun:**
- [ ] Aufteilen in kleinere Komponenten:
  - `BoulderForm.tsx` - Formular für Boulder-Erstellung
  - `BoulderEditForm.tsx` - Formular für Boulder-Bearbeitung
  - `BoulderList.tsx` - Liste der Boulders
  - `UploadQueue.tsx` - Upload-Queue-Verwaltung
- [ ] Custom Hooks extrahieren
- [ ] Logik von UI trennen

---

## 🎨 UX-Verbesserungen

### 1. Onboarding-Flow für neue User
**Status:** ⏳ Teilweise vorhanden  
**Priorität:** Mittel  
**Aufwand:** Mittel

**Was zu tun:**
- [ ] Onboarding-Komponente erstellen
- [ ] Schritt-für-Schritt-Anleitung:
  - App-Funktionen erklären
  - Boulder-Suche zeigen
  - Filter erklären
  - Profil-Einstellungen zeigen
- [ ] Skip-Option
- [ ] Persistente Einstellung (nicht erneut zeigen)

**Bereits vorhanden:**
- ✅ `src/components/Onboarding.tsx` (vorhanden)
- ✅ `src/components/CompetitionOnboarding.tsx` (vorhanden)

---

### 2. Verbesserte Fehlerbehandlung
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Hoch  
**Aufwand:** Mittel

**Was zu tun:**
- [ ] Konsistente Fehlermeldungen
- [ ] User-freundliche Fehlermeldungen (keine technischen Details)
- [ ] Retry-Mechanismen bei Fehlern
- [ ] Fehler-Logging für Debugging
- [ ] Toast-Notifications für Fehler

**Bereits vorhanden:**
- ✅ `src/utils/errorHandler.ts` (vorhanden)
- ✅ Toast-System vorhanden

---

### 3. Loading-States optimieren
**Status:** ⏳ Teilweise implementiert  
**Priorität:** Mittel  
**Aufwand:** Niedrig

**Was zu tun:**
- [ ] Konsistente Loading-States
- [ ] Skeleton-Screens statt Spinner
- [ ] Progressive Loading für Listen
- [ ] Optimistische Updates wo möglich

**Bereits vorhanden:**
- ✅ Skeleton-Komponenten vorhanden (`src/components/ui/skeleton.tsx`)

---

### 4. Accessibility-Verbesserungen (WCAG 2.1)
**Status:** ⏳ Nicht vollständig  
**Priorität:** Niedrig  
**Aufwand:** Mittel

**Was zu tun:**
- [ ] ARIA-Labels für alle interaktiven Elemente
- [ ] Keyboard-Navigation verbessern
- [ ] Screen-Reader-Unterstützung
- [ ] Kontrast-Verhältnisse prüfen
- [ ] Focus-Management verbessern

---

## ⚠️ Bekannte Probleme & Limitationen

### 1. Wettkampf-Modus deaktiviert
**Status:** 🔴 Code vorhanden, aber UI ausgeblendet  
**Lösung:** Siehe [Kritische Aufgaben](#1-wettkampf-modus-reaktivieren)

---

### 2. Setter.tsx zu groß
**Status:** 🟡 ~1800 Zeilen, schwer wartbar  
**Lösung:** Siehe [Refactoring](#5-refactoring-von-großen-komponenten)

---

### 3. Nicht alle Routen lazy geladen
**Status:** 🟡 Performance könnte verbessert werden  
**Lösung:** Siehe [Lazy Loading](#1-lazy-loading-für-alle-routen)

---

### 4. Service Worker könnte optimiert werden
**Status:** 🟡 Offline-Funktionalität nicht optimal  
**Lösung:** Siehe [Verbesserte Offline-Funktionalität](#2-verbesserte-offline-funktionalität)

---

### 5. Upload-Logging Statistiken fehlen
**Status:** 🟡 Upload-Logging implementiert, aber Statistiken fehlen  
**Lösung:** Optional - kann später hinzugefügt werden

**Bereits vorhanden:**
- ✅ Upload-Logging-System vollständig implementiert
- ✅ Admin-Interface für Logs vorhanden
- ❌ Statistiken-Dashboard fehlt

---

## 📊 Priorisierung nach Dringlichkeit

### 🔴 Sofort (Diese Woche)
1. Wettkampf-Modus reaktivieren
2. Error Boundaries vollständig implementieren
3. Verbesserte Fehlerbehandlung

### 🟠 Kurzfristig (Dieser Monat)
1. QR-Code-Scanner für Sektoren
2. Native Kamera-Zugriff
3. Lazy Loading für alle Routen
4. Onboarding-Flow verbessern

### 🟡 Mittelfristig (Nächste 3 Monate)
1. Verbesserte Offline-Funktionalität
2. Social Features (Favoriten, Kommentare)
3. Persönliche Statistiken
4. Virtualisierung für lange Listen
5. Dark Mode

### 🟢 Langfristig (6+ Monate)
1. Boulder-Routenplanung
2. Erweiterte Filter
3. White-Label-Lösung
4. Multi-Tenant-Support
5. API für externe Integrationen
6. Erweiterte Analytics
7. KI-gestützte Boulder-Empfehlungen

---

## 📝 Notizen

### Bereits implementiert (nicht in Roadmap)
- ✅ Push-Notifications
- ✅ Feedback-System
- ✅ Upload-Logging-System
- ✅ QR-Code-Generierung für Sektoren
- ✅ Admin-Panel mit allen Verwaltungsfunktionen
- ✅ Setter-Bereich mit Boulder-Erstellung
- ✅ Wettkampf-System (Code vorhanden, aber deaktiviert)

### Technische Schulden
- Setter.tsx Refactoring (hohe Priorität)
- Service Worker Optimierung (mittlere Priorität)
- Bundle-Size-Optimierung (niedrige Priorität)
- Unit-Tests fehlen (mittlere Priorität)

---

---

## 📊 Detaillierte Priorisierung & Zeitplan

### Sprint 1 (Woche 1-2): Kritische Fixes
**Geschätzter Aufwand:** 16-24 Stunden

1. **Wettkampf-Modus reaktivieren** (4-6h)
   - Competition.tsx aktivieren
   - Tests durchführen
   - UI-Anpassungen

2. **Error Boundaries vollständig implementieren** (2-4h)
   - Error Boundary für gesamte App
   - Fehler-Logging einrichten
   - User-freundliche Fehlermeldungen

3. **Verbesserte Fehlerbehandlung** (4-6h)
   - Konsistente Fehlermeldungen
   - Retry-Mechanismen
   - Toast-Notifications optimieren

4. **Lazy Loading für alle Routen** (2-4h)
   - Alle Routen lazy laden
   - Suspense-Boundaries hinzufügen
   - Code-Splitting optimieren

**Ergebnis:** Stabilere App, bessere Performance

---

### Sprint 2 (Woche 3-4): Kurzfristige Features
**Geschätzter Aufwand:** 24-32 Stunden

1. **QR-Code-Scanner** (8-12h)
   - Scanner-Komponente implementieren
   - Native Kamera-Integration
   - Berechtigungen-Handling

2. **Native Kamera-Zugriff** (8-12h)
   - Camera Plugin installieren
   - Thumbnail-Aufnahme
   - Video-Aufnahme

3. **Debouncing für Suche** (1-2h)
   - useDebounce Hook
   - Integration in Boulders.tsx

4. **Onboarding-Flow verbessern** (4-6h)
   - Onboarding-Komponente erweitern
   - Schritt-für-Schritt-Anleitung

**Ergebnis:** Bessere UX, neue Features

---

### Sprint 3 (Woche 5-8): Performance & UX
**Geschätzter Aufwand:** 40-56 Stunden

1. **Virtualisierung für Listen** (8-12h)
   - React Virtual integrieren
   - Boulder-Liste virtualisieren
   - Sektor-Liste virtualisieren
   - Leaderboard virtualisieren

2. **Dark Mode** (12-16h)
   - Theme-Provider einrichten
   - Alle Komponenten anpassen
   - Theme-Präferenz speichern

3. **Verbesserte Offline-Funktionalität** (12-16h)
   - Service Worker optimieren
   - Strategisches Caching
   - Offline-Queue-System

4. **Loading-States optimieren** (4-6h)
   - Skeleton-Screens
   - Konsistente Loading-States

**Ergebnis:** Deutlich bessere Performance, moderne UX

---

### Sprint 4 (Woche 9-12): Social Features
**Geschätzter Aufwand:** 40-60 Stunden

1. **Favoriten-System** (12-16h)
   - Datenbank-Migration
   - Hook implementieren
   - UI-Komponenten
   - Filter-Integration

2. **Kommentare-System** (20-30h)
   - Datenbank-Migration
   - Hook implementieren
   - UI-Komponenten
   - Admin-Moderation

3. **Persönliche Statistiken** (8-14h)
   - Datenbank-Schema
   - Tracking-Implementierung
   - Statistik-Dashboard

**Ergebnis:** Soziale Interaktion, User-Engagement

---

### Sprint 5 (Woche 13-16): Erweiterte Features
**Geschätzter Aufwand:** 32-48 Stunden

1. **Erweiterte Filter** (4-8h)
   - Filter nach Datum
   - Filter nach Setter
   - Filter speichern

2. **Boulder-Routenplanung** (20-30h)
   - Routing-Algorithmus
   - UI für Routenplanung
   - Route speichern/teilen

3. **Optimistic Updates** (4-6h)
   - Boulder-Erstellung
   - Status-Änderungen
   - Rollback-Mechanismus

4. **Bundle-Size-Optimierung** (4-8h)
   - Bundle-Analyse
   - Unused Dependencies entfernen
   - Code-Splitting optimieren

**Ergebnis:** Erweiterte Funktionalität, bessere Performance

---

### Sprint 6 (Woche 17+): Code-Qualität & Tests
**Geschätzter Aufwand:** 40-80 Stunden

1. **Unit-Tests** (20-40h)
   - Test-Framework einrichten
   - Tests für Hooks
   - Tests für Utilities

2. **E2E-Tests** (20-40h)
   - E2E-Framework einrichten
   - Haupt-Workflows testen

3. **Refactoring Setter.tsx** (8-12h)
   - Komponenten aufteilen
   - Hooks extrahieren
   - Logik trennen

**Ergebnis:** Höhere Code-Qualität, weniger Bugs

---

## 🎯 Quick Wins (Schnelle Verbesserungen)

Diese Features können schnell implementiert werden und haben große Auswirkung:

1. **Debouncing für Suche** (1-2h) - Sofortige Performance-Verbesserung
2. **Lazy Loading für Routen** (2-4h) - Deutlich kleinere Bundle-Größe
3. **Error Boundaries** (2-4h) - Bessere Fehlerbehandlung
4. **Loading-States optimieren** (4-6h) - Bessere UX

**Gesamtaufwand:** ~9-16 Stunden  
**Ergebnis:** Deutlich bessere App-Qualität

---

## 📈 Geschätzter Gesamtaufwand

### Kurzfristig (Q1 2026)
- **Kritische Aufgaben:** 16-24h
- **Kurzfristige Features:** 24-32h
- **Gesamt:** ~40-56 Stunden (1-1.5 Monate)

### Mittelfristig (Q2-Q3 2026)
- **Performance & UX:** 40-56h
- **Social Features:** 40-60h
- **Erweiterte Features:** 32-48h
- **Gesamt:** ~112-164 Stunden (3-4 Monate)

### Langfristig (Q4 2026+)
- **Code-Qualität & Tests:** 40-80h
- **White-Label:** 80-120h
- **Multi-Tenant:** 60-100h
- **API:** 40-60h
- **Gesamt:** ~220-360 Stunden (6-9 Monate)

---

## 🔄 Abhängigkeiten zwischen Features

### Feature-Abhängigkeiten
- **QR-Code-Scanner** → **Native Kamera-Zugriff** (beide nutzen Camera Plugin)
- **Social Features** → **Persönliche Statistiken** (beide nutzen User-Tracking)
- **Dark Mode** → **Alle Komponenten** (müssen angepasst werden)
- **Virtualisierung** → **Debouncing** (beide verbessern Performance)

### Empfohlene Reihenfolge
1. Zuerst: Lazy Loading, Debouncing (Quick Wins)
2. Dann: QR-Code-Scanner, Native Kamera (neue Features)
3. Dann: Dark Mode, Virtualisierung (Performance & UX)
4. Dann: Social Features (User-Engagement)
5. Zuletzt: White-Label, Multi-Tenant (große Architektur-Änderungen)

---

## 📝 Zusammenfassung

### Bereits implementiert ✅
- Push-Notifications
- Feedback-System
- Upload-Logging-System
- QR-Code-Generierung
- Admin-Panel
- Setter-Bereich
- Wettkampf-System (Code vorhanden, aber deaktiviert)

### Nächste Schritte (Priorität)
1. **Wettkampf-Modus reaktivieren** (kritisch, schnell)
2. **Lazy Loading** (Quick Win, große Auswirkung)
3. **QR-Code-Scanner** (neues Feature, hohe Priorität)
4. **Debouncing** (Quick Win, Performance)
5. **Error Boundaries** (Stabilität)

### Langfristige Vision
- White-Label-Lösung für andere Kletterhallen
- Multi-Tenant-Support
- Erweiterte Analytics
- KI-gestützte Empfehlungen

---

**Letzte Aktualisierung:** Februar 2026  
**Nächste Review:** März 2026  
**Gesamt Features geplant:** ~30+  
**Geschätzter Gesamtaufwand:** ~372-580 Stunden (~9-15 Monate bei Vollzeit)
