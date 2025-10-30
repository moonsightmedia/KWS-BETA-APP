import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Sectors from "./pages/Sectors";
import Boulders from "./pages/Boulders";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const RouteLogger = () => {
  const location = useLocation();
  useEffect(() => {
    // Debug: Log every route change (visible in default console levels)
    console.log("[Route] navigated", location.pathname + location.search);
  }, [location]);
  return null;
};

const Root = () => (
  <AuthProvider>
    <RouteLogger />
    <Outlet />
  </AuthProvider>
);

const SetterPage = lazy(() => import('./pages/Setter'));
const GuestPage = lazy(() => import('./pages/Guest'));

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
      { path: "setter", element: (
        <Suspense fallback={<div />}> 
          <SetterPage />
        </Suspense>
      ) },
      { path: "guest", element: (
        <Suspense fallback={<div />}> 
          <GuestPage />
        </Suspense>
      ) },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider 
        router={router} 
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }} 
      />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
