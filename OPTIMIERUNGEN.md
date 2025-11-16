# Projekt-Optimierungen

## 📊 Übersicht

Dieses Dokument listet alle identifizierten Optimierungsmöglichkeiten für das KWS Beta App Projekt auf.

---

## 🚀 Priorität 1: Hohe Auswirkung, Einfache Umsetzung

### 1. **Lazy Loading für alle Routen**
**Aktuell:** Nur `Setter` und `Guest` sind lazy geladen  
**Problem:** Alle anderen Seiten werden sofort geladen, erhöht initiale Bundle-Größe  
**Lösung:** Alle Routen lazy laden

```typescript
// App.tsx
const IndexPage = lazy(() => import('./pages/Index'));
const SectorsPage = lazy(() => import('./pages/Sectors'));
const BouldersPage = lazy(() => import('./pages/Boulders'));
const AuthPage = lazy(() => import('./pages/Auth'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const AdminPage = lazy(() => import('./pages/Admin'));
```

**Erwartete Verbesserung:** ~30-40% kleinere initiale Bundle-Größe

---

### 2. **React Query Cache-Optimierung**
**Aktuell:** `staleTime: 0` - Daten werden immer als stale betrachtet  
**Problem:** Unnötige Refetches, schlechtere Performance  
**Lösung:** Intelligente staleTime basierend auf Datentyp

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 Sekunden für dynamische Daten
      gcTime: 5 * 60 * 1000,
      refetchOnMount: false, // Nur refetch wenn stale
      refetchOnWindowFocus: false, // Optional: nur bei wichtigen Daten
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
```

**Erwartete Verbesserung:** ~50% weniger API-Calls, schnellere Navigation

---

### 3. **React.memo für häufig re-rendernde Komponenten**
**Aktuell:** Keine Memoization für Komponenten  
**Problem:** Unnötige Re-Renders bei Parent-Updates  
**Lösung:** `React.memo` für:
- `StatCard`
- `BoulderDetailDialog`
- `BoulderCard` (in Guest/Boulders)
- Chart-Komponenten

**Erwartete Verbesserung:** ~20-30% weniger Re-Renders

---

### 4. **Bessere Suspense Fallbacks**
**Aktuell:** `<div />` als Fallback  
**Problem:** Schlechte UX während Ladezeit  
**Lösung:** Sinnvolle Loading-States

```typescript
<Suspense fallback={<PageSkeleton />}>
  <SetterPage />
</Suspense>
```

---

## ⚡ Priorität 2: Mittlere Auswirkung

### 5. **Code-Splitting für große Komponenten**
**Aktuell:** `Setter.tsx` ist sehr groß (~1800 Zeilen)  
**Problem:** Große Bundle-Größe, langsamere Ladezeiten  
**Lösung:** Aufteilen in:
- `BoulderWizard.tsx`
- `BoulderEditForm.tsx`
- `ScheduleView.tsx`
- `StatusView.tsx`

---

### 6. **Image-Optimierung**
**Aktuell:** Bilder werden direkt geladen  
**Problem:** Keine Bildoptimierung, große Dateien  
**Lösung:**
- WebP-Format verwenden (mit Fallback)
- Responsive Images (`srcset`)
- Lazy Loading für Bilder außerhalb Viewport

```typescript
<picture>
  <source srcSet={webpUrl} type="image/webp" />
  <img src={jpgUrl} alt={alt} loading="lazy" />
</picture>
```

---

### 7. **Video Preload-Strategie**
**Aktuell:** Videos haben `preload="none"`  
**Problem:** Lange Ladezeiten beim Abspielen  
**Lösung:** Intelligente Preload-Strategie
- `preload="metadata"` für Videos im Viewport
- `preload="none"` für Videos außerhalb

---

### 8. **useCallback für Event-Handler**
**Aktuell:** Viele Event-Handler werden bei jedem Render neu erstellt  
**Problem:** Unnötige Re-Renders von Child-Komponenten  
**Lösung:** `useCallback` für:
- `handleBoulderClick`
- `handleFilterChange`
- `handleSubmit`

---

## 🔧 Priorität 3: Langfristige Verbesserungen

### 9. **Bundle-Analyse und Tree-Shaking**
**Aktuell:** Keine Analyse der Bundle-Größe  
**Problem:** Möglicherweise ungenutzte Dependencies  
**Lösung:**
- `vite-bundle-visualizer` installieren
- Ungenutzte Radix UI Komponenten entfernen
- Tree-Shaking optimieren

---

### 10. **Service Worker Optimierung**
**Aktuell:** Basis-Service Worker vorhanden  
**Problem:** Könnte intelligenter sein  
**Lösung:**
- Cache-Strategie für statische Assets
- Background-Sync für Offline-Funktionalität
- Prefetching für wahrscheinliche nächste Seiten

---

### 11. **Virtualisierung für lange Listen**
**Aktuell:** Alle Boulder werden gerendert  
**Problem:** Performance-Probleme bei vielen Boulders  
**Lösung:** `react-window` oder `react-virtual` für:
- Boulder-Listen
- Admin-Tabellen

---

### 12. **Debouncing für Suchfunktionen**
**Aktuell:** Suche triggert sofort Filter  
**Problem:** Viele unnötige Re-Renders während Tippen  
**Lösung:** `useDebouncedValue` Hook

```typescript
const debouncedSearch = useDebouncedValue(searchQuery, 300);
```

---

### 13. **Optimistic Updates**
**Aktuell:** UI wartet auf Server-Response  
**Problem:** Langsamere UX  
**Lösung:** Optimistic Updates für:
- Boulder-Status-Änderungen
- Boulder-Erstellung
- Farb-Updates

---

### 14. **Error Boundaries**
**Aktuell:** Keine Error Boundaries  
**Problem:** Ein Fehler crasht die ganze App  
**Lösung:** Error Boundaries für:
- Jede Route
- Chart-Komponenten
- Admin-Bereich

---

## 📦 Build-Optimierungen

### 15. **Vite Build-Konfiguration**
**Aktuell:** Basis-Konfiguration  
**Lösung:** Erweiterte Optimierungen

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select', ...],
          'chart-vendor': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

---

## 🎯 Quick Wins (Schnell umsetzbar)

1. ✅ **Lazy Loading für Routen** - 15 Minuten
2. ✅ **React.memo für StatCard** - 5 Minuten
3. ✅ **Bessere Suspense Fallbacks** - 10 Minuten
4. ✅ **useCallback für Event-Handler** - 20 Minuten
5. ✅ **Query Cache-Optimierung** - 10 Minuten

**Gesamtzeit:** ~1 Stunde für deutliche Verbesserungen

---

## 📈 Erwartete Gesamtverbesserungen

- **Initiale Bundle-Größe:** -40%
- **Ladezeit (First Contentful Paint):** -30%
- **API-Calls:** -50%
- **Re-Renders:** -25%
- **Gesamt-Performance-Score:** +30-40 Punkte

---

## 🔍 Monitoring

Empfohlen: Performance-Monitoring einrichten
- Lighthouse CI
- Web Vitals Tracking
- Bundle Size Monitoring

---

## 📝 Notizen

- Alle Optimierungen sollten mit Tests begleitet werden
- Performance-Messungen vor/nach jeder Änderung
- Schrittweise Umsetzung empfohlen (nicht alles auf einmal)

