import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AuthProvider } from "@/hooks/useAuth";
import { refreshAllData, clearAllCaches } from "@/utils/cacheUtils";
import Index from "./pages/Index";
import Sectors from "./pages/Sectors";
import Boulders from "./pages/Boulders";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Setter from "./pages/Setter";
import Guest from "./pages/Guest";
import NotFound from "./pages/NotFound";

// Configure QueryClient for optimal caching and prefetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // Data is fresh for 30 seconds (reduced from 5 minutes)
      gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes (reduced from 10 minutes)
      refetchOnMount: true, // Always refetch on mount if data is stale (CHANGED from false)
      refetchOnWindowFocus: true, // Refetch on window focus if data is stale (CHANGED from false)
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
      // Mark that we're refreshing
      sessionStorage.setItem('isRefreshing', 'true');
    };
    
    // Check on load if this was a refresh
    const handleLoad = async () => {
      const wasRefreshing = sessionStorage.getItem('isRefreshing');
      if (wasRefreshing === 'true') {
        sessionStorage.removeItem('isRefreshing');
        console.log('[PullToRefresh] Page was refreshed, clearing caches and refreshing data');
        
        try {
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
    
    // Also listen for visibility change (when user switches back to tab)
    const handleVisibilityChange = async () => {
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
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);
  
  return null;
};

const Root = () => (
  <AuthProvider>
    <RouteLogger />
    <Outlet />
  </AuthProvider>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
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
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PullToRefreshHandler />
      <RouterProvider 
        router={router} 
        future={{ v7_startTransition: true }} 
      />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
