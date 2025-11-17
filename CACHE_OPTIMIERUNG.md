# Cache-Optimierung - Systemüberprüfung und Verbesserungen

## 🔍 Problem-Analyse

Das System hatte mehrere Cache-Probleme, die dazu führten, dass Daten nicht aktualisiert wurden:

### Identifizierte Probleme:

1. **React Query Cache zu aggressiv:**
   - `staleTime: 5 Minuten` - Daten wurden 5 Minuten als "fresh" betrachtet
   - `refetchOnMount: false` - Kein automatisches Refetch beim Mount
   - `refetchOnWindowFocus: false` - Kein Refetch beim Fokus
   - **Problem:** Nach Updates wurden Daten erst nach 5 Minuten als stale betrachtet

2. **Cache-Control Headers zu aggressiv:**
   - Videos: `31536000` (1 Jahr) - zu lang für Updates
   - Thumbnails: `3600` (1 Stunde) - akzeptabel, aber könnte kürzer sein
   - **Problem:** Browser cached Videos für 1 Jahr, Updates wurden nicht sichtbar

3. **Service Worker Cache zu aggressiv:**
   - `main.tsx` löschte ALLE Caches beim Laden
   - **Problem:** Zu aggressiv, führte zu Performance-Problemen

4. **Inkonsistente Cache-Invalidierung:**
   - Nach Updates wurde nur `invalidateQueries` aufgerufen
   - Kein automatisches `refetchQueries`
   - **Problem:** Daten wurden als stale markiert, aber nicht sofort refetched

## ✅ Durchgeführte Änderungen

### 1. React Query Cache-Strategie optimiert

**Datei:** `src/App.tsx`

**Änderungen:**
- `staleTime`: `5 Minuten` → `30 Sekunden` (reduziert)
- `gcTime`: `10 Minuten` → `5 Minuten` (reduziert)
- `refetchOnMount`: `false` → `true` ✅ (aktiviert)
- `refetchOnWindowFocus`: `false` → `true` ✅ (aktiviert)

**Effekt:**
- Daten werden nach 30 Sekunden als stale betrachtet
- Beim Mount wird automatisch refetched, wenn Daten stale sind
- Beim Window-Focus wird automatisch refetched, wenn Daten stale sind

### 2. Cache-Control Headers angepasst

**Dateien:**
- `src/integrations/supabase/storage.ts`
- `upload-api/video-proxy.php`

**Änderungen:**
- Videos (Supabase): `31536000` (1 Jahr) → `604800` (7 Tage) ✅
- Videos (All-Inkl Proxy): `31536000` (1 Jahr) → `604800` (7 Tage) ✅
- Thumbnails: `3600` (1 Stunde) → `1800` (30 Minuten) ✅
- Sector Images: `3600` (1 Stunde) - unverändert

**Effekt:**
- Videos werden nur noch 7 Tage gecacht (statt 1 Jahr)
- Thumbnails werden nur noch 30 Minuten gecacht (statt 1 Stunde)
- Updates werden schneller sichtbar

### 3. Service Worker Cache-Strategie verbessert

**Datei:** `src/main.tsx`

**Änderungen:**
- Entfernt: Aggressives Cache-Clearing beim Laden
- **Neue Strategie:** Relies on React Query's staleTime and refetchOnMount settings
- Cache-Clearing nur bei explizitem Refresh (handled by service worker)

**Effekt:**
- Keine unnötigen Cache-Löschungen mehr
- Bessere Performance beim Laden
- Cache wird nur bei Bedarf geleert

### 4. Konsistente Cache-Invalidierung nach Updates

**Dateien:**
- `src/hooks/useBoulders.tsx`
- `src/hooks/useSectors.tsx`

**Änderungen:**
- Nach jedem Update/Create/Delete:
  - `invalidateQueries()` ✅ (bereits vorhanden)
  - `refetchQueries()` ✅ (NEU hinzugefügt)

**Betroffene Funktionen:**
- `useUpdateBoulder()` - refetchQueries hinzugefügt
- `useCreateBoulder()` - refetchQueries hinzugefügt
- `useDeleteBoulder()` - refetchQueries bereits vorhanden
- `useBulkUpdateBoulderStatus()` - refetchQueries hinzugefügt
- `useUpdateSector()` - refetchQueries hinzugefügt
- `useCreateSector()` - refetchQueries hinzugefügt
- `useDeleteSector()` - refetchQueries hinzugefügt

**Effekt:**
- Nach Updates werden Daten sofort refetched
- Keine Wartezeit mehr bis Daten aktualisiert werden

### 5. Cache-Utility-Funktionen hinzugefügt

**Datei:** `src/utils/cacheUtils.ts` (NEU)

**Funktionen:**
- `clearReactQueryCache()` - Löscht React Query Cache
- `refreshBoulderData()` - Aktualisiert Boulder-Daten
- `clearBrowserCaches()` - Löscht Browser-Caches
- `hardReload()` - Hard Reload der Seite
- `clearAllCachesAndReload()` - Löscht alle Caches und lädt neu

**Verwendung:**
```typescript
import { refreshBoulderData, clearAllCachesAndReload } from '@/utils/cacheUtils';
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Nur Boulder-Daten aktualisieren
refreshBoulderData(queryClient);

// Alle Caches löschen und neu laden
await clearAllCachesAndReload(queryClient);
```

## 📊 Cache-Übersicht nach Änderungen

### React Query Cache
- **staleTime:** 30 Sekunden
- **gcTime:** 5 Minuten
- **refetchOnMount:** ✅ true
- **refetchOnWindowFocus:** ✅ true
- **refetchOnReconnect:** ✅ true

### HTTP Cache-Control Headers
- **Videos:** 7 Tage (604800 Sekunden)
- **Thumbnails:** 30 Minuten (1800 Sekunden)
- **Sector Images:** 1 Stunde (3600 Sekunden)

### Service Worker Cache
- **Strategie:** Cache-first für Bilder, Network-first für andere Requests
- **Videos:** Werden nicht gecacht (immer Network)
- **Automatisches Clearing:** Nur bei explizitem Refresh

## 🔄 Wann werden Daten neu geladen?

### Automatisch:
1. **Beim Mount einer Komponente:** Wenn Daten stale sind (>30 Sekunden alt)
2. **Beim Window-Focus:** Wenn Daten stale sind
3. **Bei Netzwerk-Reconnect:** Immer
4. **Nach Updates/Create/Delete:** Sofort (invalidate + refetch)

### Manuell:
- Verwende `refreshBoulderData(queryClient)` für sofortige Aktualisierung
- Verwende `clearAllCachesAndReload(queryClient)` für vollständiges Cache-Clearing

## 🎯 Erwartete Verbesserungen

1. **Schnellere Updates:** Daten werden nach 30 Sekunden als stale betrachtet (statt 5 Minuten)
2. **Sofortige Refetches:** Nach Updates werden Daten sofort refetched
3. **Kürzere Video-Cache-Zeit:** Videos werden nur noch 7 Tage gecacht (statt 1 Jahr)
4. **Bessere Performance:** Keine unnötigen Cache-Löschungen mehr
5. **Konsistente Cache-Invalidierung:** Alle Mutations verwenden jetzt refetchQueries

## ⚠️ Wichtige Hinweise

1. **Videos:** Werden weiterhin 7 Tage gecacht. Bei Video-Updates kann es bis zu 7 Tage dauern, bis alle Browser den Cache aktualisiert haben. Für sofortige Updates: Cache manuell leeren.

2. **Thumbnails:** Werden 30 Minuten gecacht. Updates sollten innerhalb von 30 Minuten sichtbar sein.

3. **React Query:** Daten werden automatisch refetched, wenn sie stale sind. Keine manuelle Aktion nötig.

4. **Service Worker:** Wird nur in Production aktiviert. In Development wird kein Service Worker verwendet.

## 🧪 Testing

Um die Änderungen zu testen:

1. **Boulder erstellen/bearbeiten:**
   - Erstelle oder bearbeite einen Boulder
   - Daten sollten sofort aktualisiert werden (kein Refresh nötig)

2. **Cache-Verhalten testen:**
   - Öffne DevTools → Network Tab
   - Prüfe Cache-Control Headers bei Video/Thumbnail-Requests
   - Prüfe, ob Daten nach 30 Sekunden refetched werden

3. **Manuelles Cache-Clearing:**
   - Verwende `clearAllCachesAndReload()` in der Konsole
   - Alle Caches sollten geleert werden

## 📝 Nächste Schritte (Optional)

1. **Cache-Clear-Button in Admin-Panel:** Optional kann ein Button zum manuellen Cache-Clearing hinzugefügt werden
2. **Supabase Realtime:** Für noch schnellere Updates könnte Supabase Realtime Subscriptions verwendet werden
3. **Cache-Versionierung:** Für Videos könnte eine Versionierung (z.B. Query-Parameter) verwendet werden, um Cache-Busting zu ermöglichen

