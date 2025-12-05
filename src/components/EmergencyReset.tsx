import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { performEmergencyReset } from '@/utils/resetUtils';

/**
 * Emergency Reset Component
 * Provides a way to reset the app when it's frozen or stuck
 * Only visible when the app is detected to be hanging
 */
export const EmergencyReset = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isResetting, setIsResetting] = useState(false);
  const [isAppHanging, setIsAppHanging] = useState(false);

  // Monitor for app hanging issues
  useEffect(() => {
    if (!user) {
      setIsAppHanging(false);
      return;
    }

    const checkForHanging = () => {
      let hasHangingQueries = false;
      let hasAuthTimeout = false;

      // Check for hanging queries (loading for more than 15 seconds)
      const allQueries = queryClient.getQueryCache().getAll();
      allQueries.forEach((query) => {
        const state = query.state;
        if (state.status === 'loading' || state.status === 'pending') {
          const fetchStartTime = (state as any).fetchStartTime || query.state.dataUpdatedAt;
          const now = Date.now();
          const loadingDuration = now - (fetchStartTime || now);
          
          // If query has been loading for more than 15 seconds, consider app hanging
          if (loadingDuration > 15000) {
            hasHangingQueries = true;
          }
        }
      });

      // Check for auth timeout (loading for more than 10 seconds)
      if (authLoading) {
        // This is a simplified check - in practice, authLoading should be false after initial load
        // We'll rely more on query hanging detection
        hasAuthTimeout = false; // Auth loading is expected during initial load
      }

      // Show button if we detect hanging queries
      setIsAppHanging(hasHangingQueries || hasAuthTimeout);
    };

    // Check immediately
    checkForHanging();

    // Check every 5 seconds
    const interval = setInterval(checkForHanging, 5000);

    return () => clearInterval(interval);
  }, [user, authLoading, queryClient]);

  // Only show if user is logged in AND app is hanging
  if (!user || !isAppHanging) {
    return null;
  }

  const handleEmergencyReset = async () => {
    setIsResetting(true);
    
    try {
      await performEmergencyReset(queryClient);
      // Note: performEmergencyReset will reload the page, so setIsResetting(false) won't be reached
    } catch (error) {
      console.error('[EmergencyReset] Error during reset:', error);
      setIsResetting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full bg-[#E74C3C] text-white shadow-lg hover:bg-[#C0392B] transition-all"
          aria-label="Notfall-Reset"
          title="App neustarten (wenn die App hängt)"
        >
          <AlertTriangle className="h-5 w-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>App neustarten?</AlertDialogTitle>
          <AlertDialogDescription>
            Dies wird alle Caches löschen und die App neu laden. Deine Anmeldung bleibt erhalten.
            <br />
            <br />
            <strong>Verwende dies nur, wenn die App hängt oder nicht mehr reagiert.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEmergencyReset}
            disabled={isResetting}
            className="bg-[#E74C3C] hover:bg-[#C0392B]"
          >
            {isResetting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Neustarten...
              </> 
            ) : (
              'Neustarten'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

