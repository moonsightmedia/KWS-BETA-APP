import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { refreshAllData, clearAllCaches, clearBrowserCaches } from "@/utils/cacheUtils";
// PullToRefreshIndicator import entfernt - Animation deaktiviert
import { LoadingScreen } from "@/components/LoadingScreen";
import { retryPendingFeedback } from "@/utils/feedbackUtils";
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
      refetchOnMount: true, // Always refetch on mount to ensure data is loaded after reload
      refetchOnWindowFocus: true, // Refetch stale queries when window regains focus (tab switch back)
      refetchOnReconnect: true, // Refetch when network reconnects
      retry: 1, // Only retry once on failure
      networkMode: 'online', // Only run queries when online to avoid hanging
      // Global error handler for all queries
      onError: (error: any) => {
        console.error('[QueryClient] Query error:', error);
        // Don't throw - let individual queries handle their errors
        // This prevents the entire app from crashing
      },
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
      onError: (error: any) => {
        console.error('[QueryClient] Mutation error:', error);
      },
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
  const { loading: authLoading } = useAuth();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullThreshold = 60; // Reduced threshold for easier triggering
  
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
      }
      // Don't clear preserveRoute if isRefreshing is not set - it might be from a legitimate refresh
      // Only clear it if we're sure it's not needed
    } catch (error) {
      // Ignore storage errors
      console.warn('[PullToRefresh] Error restoring route:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  
  // Query State Monitoring - detects hanging queries
  useEffect(() => {
    const monitoringInterval = setInterval(() => {
      const allQueries = queryClient.getQueryCache().getAll();
      const hangingQueries: string[] = [];
      
      allQueries.forEach((query) => {
        const state = query.state;
        const queryKey = JSON.stringify(query.queryKey);
        
        // Check if query has been loading for more than 15 seconds
        if (state.status === 'loading' || state.status === 'pending') {
          const fetchStartTime = (state as any).fetchStartTime || query.state.dataUpdatedAt;
          const now = Date.now();
          const loadingDuration = now - (fetchStartTime || now);
          
          if (loadingDuration > 15000) {
            hangingQueries.push(queryKey);
            console.warn(`[QueryMonitoring] Hanging query detected: ${queryKey} (loading for ${Math.round(loadingDuration / 1000)}s)`);
          }
        }
      });
      
      // If we found hanging queries, invalidate and refetch them
      if (hangingQueries.length > 0) {
        console.warn(`[QueryMonitoring] Found ${hangingQueries.length} hanging queries, invalidating...`);
        hangingQueries.forEach((queryKeyStr) => {
          try {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.invalidateQueries({ queryKey }).catch((error) => {
              console.error(`[QueryMonitoring] Error invalidating query ${queryKeyStr}:`, error);
            });
          } catch (e) {
            console.error(`[QueryMonitoring] Error parsing query key ${queryKeyStr}:`, e);
          }
        });
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(monitoringInterval);
  }, [queryClient]);
  
  // VEREINFACHT: PullToRefreshHandler macht nur noch Route-Restoration
  // Refetch-Logik wurde komplett entfernt - Root-Komponente übernimmt das
  // Dies verhindert Konflikte zwischen mehreren Refetch-Mechanismen
  
  useEffect(() => {
    console.log('[PullToRefresh] Setting up event listeners');
    
    // Detect pull-to-refresh on mobile devices (works in both web and native apps)
    let touchStartY = 0;
    let touchStartTime = 0;
    let localIsRefreshing = false;
    let currentPullDistance = 0;
    
    const getScrollTop = () => {
      // Check multiple scroll containers
      return Math.max(
        window.pageYOffset || 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0
      );
    };

    // Pull-to-Refresh Gesture Detection DEAKTIVIERT
    // Touch-Event-Handler werden nicht mehr registriert
    const handleTouchStart = () => {
      // Deaktiviert
    };
    
    const handleTouchMove = () => {
      // Deaktiviert
    };
    
    const handleTouchEnd = () => {
      // Deaktiviert
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
    // Note: Query refetch is now handled in useEffect above that waits for authLoading
    const handleLoad = () => {
      const wasRefreshing = sessionStorage.getItem('isRefreshing');
      if (wasRefreshing === 'true') {
        console.log('[PullToRefresh] handleLoad triggered - will wait for auth to finish before refetching');
        // Don't remove isRefreshing flag here - let the useEffect above handle it
        // This ensures we only refetch once auth is ready
      }
    };
    
    // Touch-Event-Listener DEAKTIVIERT - Pull-to-Refresh-Geste entfernt
    // Nur noch beforeunload und load für Route-Restoration
    
    console.log('[PullToRefresh] ✅ Event listeners registered');
    
    // Listen for page refresh
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('load', handleLoad);
    
    // Listen for visibility change (when user switches back to tab)
    // Refetch stale queries to ensure data is fresh
    // IMPORTANT: Never clear caches on visibility change - only on actual page reload
    let visibilityTimeout: NodeJS.Timeout | null = null;
    let isVisibilityRefreshing = false;
    const handleVisibilityChangeRefresh = async () => {
      if (document.visibilityState === 'visible') {
        // Debounce: Clear any pending timeout and set a new one
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }
        
        // Prevent multiple simultaneous refreshes
        if (isVisibilityRefreshing) {
          console.log('[Visibility] Refresh already in progress, skipping');
          return;
        }
        
        visibilityTimeout = setTimeout(async () => {
          // Normal tab switch - refetch only stale queries to avoid unnecessary requests
          // Don't clear cache - that would cause content to disappear
          console.log('[Visibility] Tab visible again - refetching stale queries');
          isVisibilityRefreshing = true;
          try {
            // Only refetch if queries are actually stale (older than staleTime)
            // This prevents unnecessary network requests
            const staleQueries = queryClient.getQueryCache().getAll().filter(
              query => query.isStale() && query.state.status === 'success'
            );
            
            if (staleQueries.length > 0) {
              console.log(`[Visibility] Refetching ${staleQueries.length} stale queries`);
              await queryClient.refetchQueries({ stale: true });
              console.log('[Visibility] Stale queries refetched successfully');
            } else {
              console.log('[Visibility] No stale queries to refetch');
            }
          } catch (error) {
            console.error('[Visibility] Error refetching queries:', error);
            // Don't throw - just log the error to prevent app freezing
          } finally {
            isVisibilityRefreshing = false;
          }
        }, 1000); // Increased debounce to 1s to prevent rapid calls in native apps
      } else {
        // Tab hidden - clear any pending timeout
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
          visibilityTimeout = null;
        }
        isVisibilityRefreshing = false;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChangeRefresh);
    
    return () => {
      // Touch-Event-Listener wurden nicht registriert, daher nicht entfernen
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('visibilitychange', handleVisibilityChangeRefresh);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
    };
  }, [queryClient, navigate, location.pathname, pullDistance]);
  
  // Pull-to-Refresh Animation deaktiviert - zu viele Probleme
  return null;
};

import { SidebarProvider } from '@/components/SidebarContext';
import { UploadOverview } from '@/components/UploadOverview';
import { UploadProvider } from '@/contexts/UploadContext';
import { initializeErrorHandler } from '@/utils/errorHandler';
import { OnboardingProvider } from '@/components/Onboarding';
import { RoleTabProvider } from '@/contexts/RoleTabContext';
import { initializePushNotifications } from '@/utils/pushNotifications';
import { EmergencyReset } from '@/components/EmergencyReset';

// Component to conditionally show Sidebar only for authenticated users
const ConditionalSidebar = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  
  // Don't render anything while loading - wait for auth to resolve
  // This prevents flickering and ensures proper state
  if (loading) {
    return null;
  }
  
  // Hide sidebar on auth page, competition page, or if user is not logged in
  if (location.pathname === '/auth' || location.pathname === '/competition' || !user) {
    return null;
  }
  
  return <Sidebar />;
};

const Root = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: authLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [authTimeout, setAuthTimeout] = useState(false);
  
  // Initialize error handler on mount
  useEffect(() => {
    initializeErrorHandler();
  }, []);
  
  // Log when Root component is mounted
  useEffect(() => {
    console.log('[Root] Component mounted');
  }, []);

  // Timeout for auth loading - if it takes too long, show fallback
  useEffect(() => {
    if (authLoading) {
      const timeoutId = setTimeout(() => {
        console.warn('[Root] Auth loading timeout (10s) - showing fallback');
        setAuthTimeout(true);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeoutId);
    } else {
      setAuthTimeout(false);
    }
  }, [authLoading]);

  // Initialize push notifications when user is authenticated
  // Delay initialization to avoid crashes on app start
  useEffect(() => {
    if (user && !authLoading) {
      // Wait a bit before initializing to ensure app is fully loaded
      const timer = setTimeout(() => {
        initializePushNotifications().catch((error) => {
          console.error('[App] Error initializing push notifications:', error);
          // Don't crash the app - push notifications are optional
        });
      }, 2000); // Wait 2 seconds after app start
      
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]);
  
  // Show loading screen during initial auth check
  useEffect(() => {
    if (!authLoading && isInitialLoad) {
      // Small delay to show loading screen briefly
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [authLoading, isInitialLoad]);

  // Retry pending feedback when user is logged in
  useEffect(() => {
    if (user && !authLoading) {
      // Wait a bit for the app to stabilize, then retry pending feedback
      const timer = setTimeout(() => {
        retryPendingFeedback().catch((error) => {
          console.error('[App] Error retrying pending feedback:', error);
        });
      }, 2000); // Wait 2 seconds after login
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]);
  
  // Explicitly refetch queries after auth loading completes
  // This ensures data is loaded even if components haven't mounted yet
  // BUT: Only if PullToRefreshHandler hasn't already handled it
  const rootRefetchDoneRef = useRef(false);
  
  useEffect(() => {
    if (!authLoading && !rootRefetchDoneRef.current) {
      const wasRefreshing = sessionStorage.getItem('isRefreshing');
      
      console.log('[Root] Auth loading ended, checking refetch strategy:', { wasRefreshing });
      
      // VEREINFACHT: Root refetched IMMER, unabhängig von PullToRefreshHandler
      // PullToRefreshHandler macht nur noch Route-Restoration, kein Refetch mehr
      rootRefetchDoneRef.current = true;
      console.log('[Root] Auth loading ended, Root will handle refetch immediately');
      performRootRefetch('Reload detected');
    }
    
    function performRootRefetch(reason: string) {
      // Small delay to ensure components are mounted
      const timer = setTimeout(async () => {
        console.log(`[Root] Triggering query refetch after auth (reason: ${reason})`);
        
        try {
          // ALWAYS invalidate and refetch on reload, regardless of current state
          // This ensures fresh data after reload
          console.log('[Root] Invalidating all queries...');
          queryClient.invalidateQueries();
          
          // Cancel any pending queries first
          console.log('[Root] Cancelling any pending queries...');
          await queryClient.cancelQueries();
          
          // Wait a bit before refetching
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Refetch critical queries with timeout
          const criticalQueries = [
            ['boulders'],
            ['sectors'],
            ['colors'],
            ['competition_boulders'],
            ['competition_participant'],
          ];
          
          console.log(`[Root] Refetching ${criticalQueries.length} critical queries...`);
          
          const refetchStartTime = Date.now();
          await Promise.allSettled(
            criticalQueries.map(async (queryKey) => {
              try {
                const queryKeyStr = JSON.stringify(queryKey);
                console.log(`[Root] Refetching ${queryKeyStr}...`);
                
                // Cancel any existing fetch for this query
                await queryClient.cancelQueries({ queryKey });
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Refetch with timeout
                const refetchPromise = queryClient.refetchQueries({ queryKey });
                const timeoutPromise = new Promise((_, reject) => {
                  setTimeout(() => reject(new Error('Refetch timeout after 8s')), 8000);
                });
                
                await Promise.race([refetchPromise, timeoutPromise]);
                
                const state = queryClient.getQueryState(queryKey);
                console.log(`[Root] ✅ Refetched ${queryKeyStr}:`, {
                  hasData: !!state?.data,
                  status: state?.status,
                });
              } catch (err: any) {
                console.error(`[Root] ❌ Error refetching ${JSON.stringify(queryKey)}:`, err?.message || err);
              }
            })
          );
          
          const duration = Date.now() - refetchStartTime;
          console.log(`[Root] Query refetch completed in ${duration}ms`);
        } catch (error) {
          console.error('[Root] Error during query refetch:', error);
        }
      }, 1000); // Wait 1 second after auth loading ends
      
      return () => clearTimeout(timer);
    }
  }, [authLoading, queryClient]);
  
  // Don't restore route in Root - let PullToRefreshHandler handle it
  // This prevents conflicts with normal navigation
  
  // Show fallback UI if auth is hanging
  if (authTimeout && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAF9] p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-semibold text-[#13112B]">App lädt zu lange</h2>
          <p className="text-sm text-[#13112B]/60">
            Die App scheint hängen zu bleiben. Du kannst versuchen, sie zurückzusetzen.
          </p>
          <Button
            onClick={() => {
              // Clear everything and redirect to auth
              try {
                sessionStorage.clear();
                localStorage.clear();
              } catch (e) {
                // Ignore
              }
              window.location.href = '/auth';
            }}
            className="bg-[#36B531] hover:bg-[#2da029] text-white"
          >
            App neustarten
          </Button>
        </div>
      </div>
    );
  }
  
  // Show loading screen during initial load
  if (authLoading || isInitialLoad) {
    return <LoadingScreen />;
  }
  
  return (
    <OnboardingProvider>
      <RoleTabProvider>
        <SidebarProvider>
          <UploadProvider>
            <RouteLogger />
            <PullToRefreshHandler />
            <ConditionalSidebar />
            <UploadOverview />
            <EmergencyReset />
          <Outlet />
        </UploadProvider>
      </SidebarProvider>
      </RoleTabProvider>
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
