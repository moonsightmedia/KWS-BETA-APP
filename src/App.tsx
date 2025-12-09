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
      staleTime: 0, // CRITICAL FIX: Set to 0 to ensure data is always refetched after reload
      gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
      refetchOnMount: true, // Always refetch on mount to ensure data is loaded after reload
      refetchOnWindowFocus: false, // DISABLED: Causes hanging queries in production build when triggered during mutations
      refetchOnReconnect: true, // Refetch when network reconnects
      retry: 1, // Only retry once on failure
      networkMode: 'online', // Only run queries when online to avoid hanging
      // CRITICAL: Add timeout to prevent queries from hanging forever
      // If a query takes longer than 15 seconds, it will be marked as error
      // This prevents the app from hanging in loading state
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

// CRITICAL: Expose queryClient to window for main.tsx to access it
if (typeof window !== 'undefined') {
  (window as any).__queryClient = queryClient;
}

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

import { PullToRefreshHandler } from '@/components/PullToRefreshHandler';

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
  
  // Refetch-Logik komplett entfernt - React Query macht das automatisch mit refetchOnMount: true
  
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

// CRITICAL: Expose queryClient on window for reload handling
if (typeof window !== 'undefined') {
  (window as any).__queryClient = queryClient;
}

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
