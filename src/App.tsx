import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { refreshAllData, clearAllCaches } from "@/utils/cacheUtils";
import Index from "./pages/Index";
import Sectors from "./pages/Sectors";
import Boulders from "./pages/Boulders";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Setter from "./pages/Setter";
import Guest from "./pages/Guest";
import Competition from "./pages/Competition";
import NotFound from "./pages/NotFound";
import { Sidebar } from "@/components/Sidebar";

// Configure QueryClient for optimal caching and prefetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
      refetchOnMount: false, // Don't refetch on mount - use cached data
      refetchOnWindowFocus: false, // Don't refetch on window focus - use cached data
      refetchOnReconnect: true, // Refetch when network reconnects
      retry: 1, // Only retry once on failure
    },
  },
});

const RouteLogger = () => {
  const location = useLocation();
  useEffect(() => {
    // Debug: Log every route change (only in development)
    if (import.meta.env.DEV) {
      console.log("[Route] navigated", location.pathname + location.search);
    }
  }, [location]);
  return null;
};

/**
 * Component to handle pull-to-refresh
 * Detects pull-to-refresh gestures and clears all caches + refetches all data
 */
const PullToRefreshHandler = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Restore route immediately on mount if it was preserved
  // Only restore if this was actually a page refresh (not a normal navigation)
  useEffect(() => {
    try {
      const preserveRoute = sessionStorage.getItem('preserveRoute');
      const wasRefreshing = sessionStorage.getItem('isRefreshing');
      
      // Only restore route if this was a page refresh, not a normal navigation
      if (preserveRoute && wasRefreshing === 'true') {
        const currentPath = window.location.pathname;
        console.log(`[PullToRefresh] Checking route restoration: current=${currentPath}, preserved=${preserveRoute}`);
        
        // Don't restore route if we're on /auth - user might be trying to log in
        if (currentPath === '/auth') {
          console.log(`[PullToRefresh] On /auth page, clearing preserved route: ${preserveRoute}`);
          sessionStorage.removeItem('preserveRoute');
          sessionStorage.removeItem('isRefreshing');
          return;
        }
        
        // Also don't restore to /auth if we're not already there
        if (preserveRoute === '/auth') {
          console.log(`[PullToRefresh] Preserved route is /auth but we're on ${currentPath}, clearing it`);
          sessionStorage.removeItem('preserveRoute');
          sessionStorage.removeItem('isRefreshing');
          return;
        }
        
        if (preserveRoute !== currentPath) {
          console.log(`[PullToRefresh] Restoring route from ${currentPath} to ${preserveRoute}`);
          sessionStorage.removeItem('preserveRoute');
          sessionStorage.removeItem('isRefreshing');
          
          // First, update the browser URL directly to prevent any race conditions
          if (window.history.replaceState) {
            window.history.replaceState(null, '', preserveRoute);
          }
          
          // Then navigate with React Router
          navigate(preserveRoute, { replace: true });
        } else {
          // Route is already correct, just clean up
          console.log(`[PullToRefresh] Route ${preserveRoute} is already correct`);
          sessionStorage.removeItem('preserveRoute');
          sessionStorage.removeItem('isRefreshing');
        }
      } else if (preserveRoute && !wasRefreshing) {
        // If preserveRoute exists but isRefreshing is not set, it's from visibility change
        // Don't restore in this case - it would interfere with normal navigation
        console.log(`[PullToRefresh] Clearing preserveRoute from visibility change (not a refresh)`);
        sessionStorage.removeItem('preserveRoute');
      }
    } catch (error) {
      // Ignore storage errors
      console.warn('[PullToRefresh] Error restoring route:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  
  useEffect(() => {
    // Detect pull-to-refresh on mobile devices
    let touchStartY = 0;
    let touchEndY = 0;
    let isRefreshing = false;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      // Check if user is pulling down from the top
      const currentY = e.touches[0].clientY;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // If at top of page and pulling down, prepare for refresh
      if (scrollTop === 0 && currentY > touchStartY && currentY - touchStartY > 50) {
        // User is pulling down from top
      }
    };
    
    const handleTouchEnd = async (e: TouchEvent) => {
      touchEndY = e.changedTouches[0].clientY;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Check if this was a pull-to-refresh gesture
      // User pulled down more than 80px from the top
      if (scrollTop === 0 && touchEndY - touchStartY > 80 && !isRefreshing) {
        isRefreshing = true;
        console.log('[PullToRefresh] Detected pull-to-refresh gesture');
        
        // Save current route before refreshing
        const currentRoute = location.pathname || window.location.pathname;
        sessionStorage.setItem('preserveRoute', currentRoute);
        console.log(`[PullToRefresh] Saving route for pull-to-refresh: ${currentRoute}`);
        
        try {
          // Clear all caches
          await clearAllCaches(queryClient);
          
          // Refresh all data
          await refreshAllData(queryClient);
          
          console.log('[PullToRefresh] All data refreshed successfully');
        } catch (error) {
          console.error('[PullToRefresh] Error refreshing data:', error);
        } finally {
          // Reset after a short delay
          setTimeout(() => {
            isRefreshing = false;
          }, 1000);
        }
      }
    };
    
    // Also listen for beforeunload to detect page refresh
    const handleBeforeUnload = () => {
      // Mark that we're refreshing and save current route
      // Use location.pathname from React Router to get the correct route
      const currentRoute = location.pathname || window.location.pathname;
      const windowPath = window.location.pathname;
      console.log(`[PullToRefresh] beforeunload - location.pathname: ${location.pathname}, window.location.pathname: ${windowPath}`);
      sessionStorage.setItem('isRefreshing', 'true');
      sessionStorage.setItem('preserveRoute', currentRoute);
      console.log(`[PullToRefresh] Saving route for refresh: ${currentRoute} (stored in sessionStorage)`);
      
      // Double-check it was saved
      const saved = sessionStorage.getItem('preserveRoute');
      console.log(`[PullToRefresh] Verification - saved route: ${saved}`);
    };
    
    // Don't save route on visibility change - this interferes with normal navigation
    // Only save route on actual page refresh (beforeunload)
    
    // Check on load if this was a refresh
    const handleLoad = async () => {
      const wasRefreshing = sessionStorage.getItem('isRefreshing');
      const preserveRoute = sessionStorage.getItem('preserveRoute');
      
      if (wasRefreshing === 'true') {
        sessionStorage.removeItem('isRefreshing');
        console.log('[PullToRefresh] Page was refreshed, clearing caches and refreshing data');
        
        try {
          // Route restoration is handled in the mount effect above
          // Just clean up the storage here
          if (preserveRoute) {
            // Route will be restored by the mount effect
            console.log(`[PullToRefresh] Route ${preserveRoute} will be restored on mount`);
          }
          
          // Clear all caches
          await clearAllCaches(queryClient);
          
          // Refresh all data
          await refreshAllData(queryClient);
          
          console.log('[PullToRefresh] All data refreshed after page reload');
        } catch (error) {
          console.error('[PullToRefresh] Error refreshing data after reload:', error);
        }
      }
    };
    
    // Add touch event listeners for mobile pull-to-refresh
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Listen for page refresh
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('load', handleLoad);
    
    // Listen for visibility change (when user switches back to tab) to refresh data
    const handleVisibilityChangeRefresh = async () => {
      if (document.visibilityState === 'visible') {
        // Check if page was just refreshed
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation?.type === 'reload') {
          console.log('[PullToRefresh] Page reload detected via visibility change');
          try {
            await clearAllCaches(queryClient);
            await refreshAllData(queryClient);
          } catch (error) {
            console.error('[PullToRefresh] Error refreshing data:', error);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChangeRefresh);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('visibilitychange', handleVisibilityChangeRefresh);
    };
  }, [queryClient, navigate, location]);
  
  return null;
};

import { SidebarProvider } from '@/components/SidebarContext';
import { UploadOverview } from '@/components/UploadOverview';
import { UploadProvider } from '@/contexts/UploadContext';
import { initializeErrorHandler } from '@/utils/errorHandler';
import { OnboardingProvider } from '@/components/Onboarding';

// Component to conditionally show Sidebar only for authenticated users
const ConditionalSidebar = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  
  // Hide sidebar on auth page, competition page (for guests), or if user is not logged in
  if (location.pathname === '/auth' || location.pathname === '/competition' || (!loading && !user)) {
    return null;
  }
  
  return <Sidebar />;
};

const Root = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize error handler on mount
  useEffect(() => {
    initializeErrorHandler();
  }, []);
  
  // Don't restore route in Root - let PullToRefreshHandler handle it
  // This prevents conflicts with normal navigation
  
  return (
    <OnboardingProvider>
      <SidebarProvider>
        <UploadProvider>
          <RouteLogger />
          <PullToRefreshHandler />
          <ConditionalSidebar />
          <UploadOverview />
          <Outlet />
        </UploadProvider>
      </SidebarProvider>
    </OnboardingProvider>
  );
};

// Restore route from sessionStorage BEFORE creating router
// This ensures the URL is correct before React Router initializes
const restoreRouteOnInit = () => {
  try {
    const preserveRoute = sessionStorage.getItem('preserveRoute');
    const currentPath = window.location.pathname;
    
    // Don't restore route if we're on /auth - user might be trying to log in
    if (currentPath === '/auth') {
      if (preserveRoute) {
        console.log(`[RouterInit] On /auth page, clearing preserved route: ${preserveRoute}`);
        sessionStorage.removeItem('preserveRoute');
      }
      return;
    }
    
    if (preserveRoute && preserveRoute !== currentPath) {
      // Also don't restore to /auth if we're not already there
      if (preserveRoute === '/auth') {
        console.log(`[RouterInit] Preserved route is /auth but we're on ${currentPath}, clearing it`);
        sessionStorage.removeItem('preserveRoute');
        return;
      }
      
      console.log(`[RouterInit] Restoring route before router init: ${currentPath} → ${preserveRoute}`);
      // Update URL directly before React Router initializes
      if (window.history.replaceState) {
        window.history.replaceState(null, '', preserveRoute);
      }
      sessionStorage.removeItem('preserveRoute');
    }
  } catch (error) {
    // Ignore storage errors
    console.warn('[RouterInit] Error restoring route:', error);
  }
};

// Restore route immediately
restoreRouteOnInit();

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthProvider>
        <Root />
      </AuthProvider>
    ),
    children: [
      { index: true, element: (
        <RequireAuth>
          <Index />
        </RequireAuth>
      ) },
      { path: "sectors", element: <Sectors /> },
      { path: "boulders", element: <Boulders /> },
      { path: "auth", element: <Auth /> },
      { path: "profile", element: <Profile /> },
      { path: "admin", element: <Admin /> },
      { path: "setter", element: <Setter /> },
      { path: "guest", element: <Guest /> },
      { path: "competition", element: <Competition /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider 
          router={router} 
          future={{ v7_startTransition: true }} 
        />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
