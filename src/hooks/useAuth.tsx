import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';

type UserMetadata = Record<string, unknown>;
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { usePreloadSectorImages } from './usePreloadSectorImages';
import { usePreloadBoulderThumbnails } from './usePreloadBoulderThumbnails';
import { authenticatedFetch, getCurrentSession, SESSION_REQUIRED_EVENT } from '@/lib/authenticatedFetch';
import { SessionRecoveryDialog } from '@/components/SessionRecoveryDialog';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, meta?: { firstName?: string; lastName?: string; birthDate?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  loading: boolean;
  authTransition: AuthTransition;
  reauthRequired: boolean;
}

export type AuthTransition = 'signing-in' | 'signing-up' | 'signing-out' | null;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authTransition, setAuthTransition] = useState<AuthTransition>(null);
  const queryClient = useQueryClient(); // Get queryClient at component level
  const lastSession = useRef<Session | null>(null);
  const intentionalSignOut = useRef(false);
  const [reauthRequired, setReauthRequired] = useState(false);
  const acceptSession = useCallback((next: Session | null) => {
    if (!next && lastSession.current && !intentionalSignOut.current) {
      // Keep the mounted workspace only as a locked draft, never as authority.
      // Supabase has removed the real session; protected requests fail closed.
      setReauthRequired(true);
      return;
    }
    if (next && lastSession.current && next.user.id !== lastSession.current.user.id) {
      queryClient.clear();
      window.location.assign('/'); // Do not transfer an old account's drafts.
      return;
    }
    lastSession.current = next;
    setSession(next);
    setUser(next?.user ?? null);
    if (next) setReauthRequired(false);
  }, [queryClient]);

  useEffect(() => {
    const requireSession = () => {
      if (lastSession.current && !intentionalSignOut.current) setReauthRequired(true);
    };
    window.addEventListener(SESSION_REQUIRED_EVENT, requireSession);
    return () => window.removeEventListener(SESSION_REQUIRED_EVENT, requireSession);
  }, []);

  // Sync function to transfer user_metadata to profiles table
  const syncMetadataToProfiles = async (userId: string, metadata: UserMetadata | null | undefined) => {
    if (!userId) return;
    
    const payload: Record<string, unknown> = {};
    // Sync first_name if it exists and is not empty
    if (metadata?.first_name !== undefined && metadata.first_name !== null && String(metadata.first_name).trim() !== '') {
      payload.first_name = String(metadata.first_name).trim();
    }
    // Sync last_name if it exists and is not empty
    if (metadata?.last_name !== undefined && metadata.last_name !== null && String(metadata.last_name).trim() !== '') {
      payload.last_name = String(metadata.last_name).trim();
    }
    // Sync full_name if it exists and is not empty
    if (metadata?.full_name !== undefined && metadata.full_name !== null && String(metadata.full_name).trim() !== '') {
      payload.full_name = String(metadata.full_name).trim();
    }
    // Sync birth_date if it exists
    if (metadata?.birth_date !== undefined && metadata.birth_date !== null && String(metadata.birth_date).trim() !== '') {
      payload.birth_date = metadata.birth_date;
    }
    // Always sync email if available
    if (metadata?.email) {
      payload.email = metadata.email;
    }
    
    // First check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, full_name, email')
      .eq('id', userId)
      .maybeSingle();
    
    if (checkError) {
      console.error('[Profile Sync] Fehler beim Prüfen des Profils:', checkError);
      return;
    }
    
    // Always sync if we have payload data OR if email needs to be updated
    const needsEmailUpdate = metadata?.email && existingProfile && !existingProfile.email;
    const shouldSync = Object.keys(payload).length > 0 || needsEmailUpdate;
    
    if (existingProfile) {
      // Profile exists, update it
      if (shouldSync) {
        console.log('[Profile Sync] Starte Synchronisation:', payload, 'Existing profile:', existingProfile, 'Needs email update:', needsEmailUpdate);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', userId);
        
        if (updateError) {
          console.error('[Profile Sync] Fehler beim Update:', updateError);
        } else {
          console.log('[Profile Sync] Profildaten erfolgreich aktualisiert:', payload);
        }
      } else {
        console.debug('[Profile Sync] Keine Metadaten zum Synchronisieren gefunden');
      }
    } else {
      // Profile doesn't exist - trigger should create it automatically
      // If it doesn't exist after a moment, it might be a timing issue
      // We'll log it but not try to create it (RLS would block it anyway)
      console.warn('[Profile Sync] Profil existiert nicht für User:', userId, 'Der Trigger sollte es erstellen. Versuche es erneut in 2 Sekunden...');
      
      // Wait a bit and check again (trigger might be delayed)
      setTimeout(async () => {
        if (intentionalSignOut.current || lastSession.current?.user.id !== userId) return;
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name, email')
          .eq('id', userId)
          .maybeSingle();
        
        if (retryProfile && Object.keys(payload).length > 0) {
          console.log('[Profile Sync] Profil jetzt vorhanden, aktualisiere:', payload);
          const { error: updateError } = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', userId);
          
          if (updateError) {
            console.error('[Profile Sync] Fehler beim Update nach Retry:', updateError);
          } else {
            console.log('[Profile Sync] Profildaten erfolgreich aktualisiert nach Retry:', payload);
          }
        } else if (!retryProfile) {
          // Trigger hat nicht funktioniert - versuche Profil selbst zu erstellen
          // Versuche zuerst ein Update (falls es zwischenzeitlich erstellt wurde), dann Insert
          console.warn('[Profile Sync] Profil existiert immer noch nicht nach Retry. Versuche es selbst zu erstellen...');
          
          const createPayload: Record<string, unknown> = {
            id: userId,
            email: metadata?.email || null,
            ...payload
          };
          
          // Versuche zuerst Update (falls Trigger es zwischenzeitlich erstellt hat)
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', userId)
            .select()
            .single();
          
          if (!updateError && updatedProfile) {
            console.log('[Profile Sync] Profil wurde zwischenzeitlich erstellt (wahrscheinlich durch Trigger). Update erfolgreich:', updatedProfile);
          } else {
            // Update hat fehlgeschlagen, versuche Insert
            const { data: createdProfile, error: createError } = await supabase
              .from('profiles')
              .insert(createPayload)
              .select()
              .single();
            
            if (createError) {
              // Wenn es ein Duplikat-Fehler ist, wurde es zwischenzeitlich erstellt - versuche nochmal Update
              if (createError.code === '23505' || createError.message?.includes('duplicate key')) {
                console.log('[Profile Sync] Profil wurde während Insert erstellt. Versuche Update...');
                const { data: finalProfile, error: finalError } = await supabase
                  .from('profiles')
                  .update(payload)
                  .eq('id', userId)
                  .select()
                  .single();
                
                if (finalError) {
                  console.error('[Profile Sync] Fehler beim finalen Update:', finalError);
                } else {
                  console.log('[Profile Sync] Profil erfolgreich aktualisiert:', finalProfile);
                }
              } else {
                console.error('[Profile Sync] Fehler beim Erstellen des Profils:', createError);
              }
            } else {
              console.log('[Profile Sync] Profil erfolgreich erstellt:', createdProfile);
            }
          }
        }
      }, 2000);
    }
  };

  useEffect(() => {
    let mounted = true;
    let synchronizedProfile = '';
    const loadingStartTime = Date.now();
    let sessionLoaded = false; // Track if session has been loaded
    
    // Log loading start
    console.log('[Auth] Loading started (reload check)');
    
    // Set a timeout to ensure loading doesn't hang forever
    // Only trigger if there's really no session - if user/session exists, give more time
    const timeoutId = setTimeout(() => {
      if (mounted) {
        const duration = Date.now() - loadingStartTime;
        // Only trigger timeout if there's no user or session
        // If user/session exists, auth is still initializing and we should wait
        if (!user && !session) {
          console.warn(`[Auth] ⚠️ Timeout triggered (5s) - no session found, setting loading to false (duration: ${duration}ms)`);
          setLoading(false);
        } else {
          // User/session exists but still loading - give more time (will be cleared by auth state change)
          console.log(`[Auth] Timeout reached but user/session exists - waiting for auth state change (duration: ${duration}ms)`);
        }
      }
    }, 5000); // 5 second timeout
    
    // Additional safety timeout: If still loading after 10 seconds, force reset
    const safetyTimeoutId = setTimeout(() => {
      if (mounted && loading && !sessionLoaded) {
        console.error('[Auth] CRITICAL: Auth still loading after 10s - forcing reset');
        setLoading(false);
        // Do not clear a session that arrived while initialization was pending.
        // Clear potentially corrupted session storage
        try {
          sessionStorage.removeItem('preserveRoute');
          sessionStorage.removeItem('isRefreshing');
        } catch (e) {
          // Ignore storage errors
        }
      } else if (mounted && sessionLoaded) {
        // Session already loaded, just ensure loading is false
        console.log('[Auth] Safety timeout reached but session already loaded, ensuring loading=false');
        setLoading(false);
        clearTimeout(safetyTimeoutId);
      }
    }, 10000); // 10 second safety timeout

    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!mounted) return;
          
          // Ignore storage-related errors in the callback
          try {
            const loadingDuration = Date.now() - loadingStartTime;
            console.log(`[Auth] State change: ${event}`, session?.user?.id ? `user: ${session.user.id}` : 'no user');
            console.log(`[Auth] Loading ended (duration: ${loadingDuration}ms)`);
            
            // Log session status after reload
            const hasSession = !!session;
            const hasUser = !!session?.user;
            const userId = session?.user?.id || null;
            console.log(`[Auth] Session status after reload: {hasSession: ${hasSession}, hasUser: ${hasUser}, userId: ${userId}}`);
            
            // Only set loading to false if we haven't already loaded the session
            // This prevents race conditions between getSession() and onAuthStateChange
            if (!sessionLoaded) {
              sessionLoaded = true;
              console.log(`[Auth] ✅ Setting loading to false NOW (event: ${event})`);
              acceptSession(session);
              setLoading(false);
              clearTimeout(timeoutId);
              clearTimeout(safetyTimeoutId);
              console.log(`[Auth] ✅ State updated: loading=false, user=${!!session?.user}, session=${!!session}`);
              
              // CRITICAL: After reload, check if roles are missing and refresh them
              if (session?.user) {
                // Check localStorage first (persists), then sessionStorage (backward compatibility)
                let storedUserId = localStorage.getItem('nav_userId');
                if (storedUserId === null) {
                  storedUserId = sessionStorage.getItem('nav_userId');
                }
                let storedAdmin = localStorage.getItem('nav_isAdmin');
                if (storedAdmin === null) {
                  storedAdmin = sessionStorage.getItem('nav_isAdmin');
                }
                let storedSetter = localStorage.getItem('nav_isSetter');
                if (storedSetter === null) {
                  storedSetter = sessionStorage.getItem('nav_isSetter');
                }
                
                // If roles are missing or user ID doesn't match, refresh roles
                if (storedUserId !== session.user.id || storedAdmin === null || storedSetter === null) {
                  console.log('[Auth] Roles missing or user changed after reload, refreshing roles');
                  // Use setTimeout to avoid blocking the initial load
                  setTimeout(() => {
                    checkAndStoreRoles(session.user.id, session.access_token ?? '').catch(err => {
                      console.error('[Auth] Error refreshing roles after reload:', err);
                    });
                  }, 500);
                }
                
                // CRITICAL: Also trigger a refetch of queries after reload
                // This ensures data is fresh after page reload
                setTimeout(async () => {
                  try {
                    const { refetchOnVisibilityChange } = await import('@/utils/cacheUtils');
                    const queryClient = (window as Window & { __queryClient?: { clear: () => void } }).__queryClient;
                    if (queryClient) {
                      await refetchOnVisibilityChange(queryClient);
                    }
                  } catch (refetchError) {
                    console.error('[Auth] Error refetching queries after reload:', refetchError);
                  }
                }, 1000);
              }
            } else {
              // Session already loaded, just update state without changing loading
              console.log(`[Auth] Session already loaded, updating state only (event: ${event})`);
              acceptSession(session);
            }
            
            // The SDK awaits this callback while holding its auth lock. All
            // Supabase I/O must run after it returns, never awaited from here.
            // Refreshing a token is not a profile change or a reason to rewrite it.
            if (!session) synchronizedProfile = '';
            const profileKey = session ? JSON.stringify([session.user.id, session.user.email, session.user.user_metadata]) : '';
            if (session?.user && event !== 'TOKEN_REFRESHED' && profileKey !== synchronizedProfile) {
              synchronizedProfile = profileKey;
              setTimeout(() => { void (async () => {
              if (!mounted || lastSession.current?.user.id !== session.user.id || intentionalSignOut.current) return;
              const meta = session.user.user_metadata as UserMetadata;
              // Always try to sync - even if metadata is empty, we might need to update email
              // Add email to metadata if not present
              const metadataWithEmail = {
                ...meta,
                email: session.user.email || meta?.email
              };
              await syncMetadataToProfiles(session.user.id, metadataWithEmail);
              
              // Check and store roles when user signs in
              if (event === 'SIGNED_IN') {
                await checkAndStoreRoles(session.user.id, session.access_token ?? '');
              }
              
              // Prefetch critical data immediately after login for instant navigation
              console.log('[Auth] User logged in, prefetching critical data...');
              
              // Prefetch sectors data
              queryClient.prefetchQuery({
                queryKey: ['sectors'],
                queryFn: async () => {
                  const { data, error } = await supabase
                    .from('sectors')
                    .select('*')
                    .order('name');
                  if (error) throw error;
                  return data;
                },
              });
              
              // Prefetch boulders data
              queryClient.prefetchQuery({
                queryKey: ['boulders'],
                queryFn: async () => {
                  const { data, error } = await supabase
                    .from('boulders')
                    .select('*')
                    .order('created_at', { ascending: false });
                  if (error) throw error;
                  return data;
                },
              });
              
              console.log('[Auth] Critical data prefetch initiated');
              })().catch(() => { synchronizedProfile = ''; console.warn('[Auth] Background account synchronization failed'); }); }, 0);
            }
          } catch (error: unknown) {
            // Ignore storage access errors
            if (error?.message?.includes('storage') || error?.message?.includes('Storage')) {
              console.warn('[Auth] Storage error in auth state change (ignored):', error.message);
              // Still set loading to false even on storage errors
              if (mounted) {
                setLoading(false);
                clearTimeout(timeoutId);
              }
              return;
            }
            console.error('[Auth] Error in auth state change:', error);
            // Ensure loading is set to false on any error
            if (mounted) {
              setLoading(false);
              clearTimeout(timeoutId);
            }
          }
        }
      );
      subscription = sub;
    } catch (error: unknown) {
      // Ignore storage access errors when setting up auth state listener
      if (error?.message?.includes('storage') || error?.message?.includes('Storage')) {
        console.warn('[Auth] Storage error setting up auth listener (ignored):', error.message);
      } else {
        console.error('[Auth] Error setting up auth listener:', error);
      }
    }

    // Wrap getSession in try-catch to handle storage errors
    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          // Ignore storage-related errors
          if (error.message?.includes('storage') || error.message?.includes('Storage')) {
            console.warn('[Auth] Storage error loading session (ignored):', error.message);
            setLoading(false);
            clearTimeout(timeoutId);
            return;
          }
          
          console.error('[Auth] Error loading initial session:', error);
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }
        
        const loadingDuration = Date.now() - loadingStartTime;
        const hasSession = !!session;
        const hasUser = !!session?.user;
        const userId = session?.user?.id || null;
        
        console.log(`[Auth] Initial session loaded: ${userId || 'no user'}`);
        console.log(`[Auth] Loading ended (duration: ${loadingDuration}ms)`);
        console.log(`[Auth] Session status after reload: {hasSession: ${hasSession}, hasUser: ${hasUser}, userId: ${userId}}`);
        
        // Only set loading to false if we haven't already loaded the session
        // This prevents race conditions between getSession() and onAuthStateChange
        if (!sessionLoaded) {
          sessionLoaded = true;
          console.log(`[Auth] ✅ Setting loading to false NOW (getSession)`);
          acceptSession(session);
          setLoading(false);
          clearTimeout(timeoutId);
          clearTimeout(safetyTimeoutId);
          console.log(`[Auth] ✅ State updated: loading=false, user=${!!session?.user}, session=${!!session}`);
        } else {
          // Session already loaded via onAuthStateChange, just update state
          console.log(`[Auth] Session already loaded via onAuthStateChange, updating state only`);
          acceptSession(session);
        }
        
        // Profile synchronization is deferred by INITIAL_SESSION/SIGNED_IN.
        // Do not duplicate it here or rewrite profiles on every tab resume.
        if (session?.user) {
          
          // Check and store roles if not already in localStorage
          try {
            // Check localStorage first (persists), then sessionStorage (backward compatibility)
            let storedUserId = localStorage.getItem('nav_userId');
            if (storedUserId === null) {
              storedUserId = sessionStorage.getItem('nav_userId');
            }
            if (storedUserId !== session.user.id) {
              await checkAndStoreRoles(session.user.id, session.access_token ?? '');
            } else {
              let storedAdmin = localStorage.getItem('nav_isAdmin');
              let storedSetter = localStorage.getItem('nav_isSetter');
              if (storedAdmin === null) storedAdmin = sessionStorage.getItem('nav_isAdmin');
              if (storedSetter === null) storedSetter = sessionStorage.getItem('nav_isSetter');
              if (storedAdmin === null || storedSetter === null) {
                console.log('[Auth] Roles missing in storage, refreshing roles');
                await checkAndStoreRoles(session.user.id, session.access_token ?? '');
              }
            }
          } catch (storageError) {
            console.warn('[Auth] Error checking stored roles:', storageError);
            await checkAndStoreRoles(session.user.id, session.access_token ?? '');
          }
        }
      } catch (error: unknown) {
        if (!mounted) return;
        
        // Ignore storage-related errors
        if (error?.message?.includes('storage') || error?.message?.includes('Storage')) {
          console.warn('[Auth] Storage error in getSession (ignored):', error.message);
          setLoading(false);
          clearTimeout(timeoutId);
          clearTimeout(safetyTimeoutId);
          return;
        }
        
        // Check if it's a timeout error
        if (error?.message?.includes('timeout')) {
          console.warn('[Auth] getSession timeout - continuing without session');
          setLoading(false);
          clearTimeout(timeoutId);
          clearTimeout(safetyTimeoutId);
          return;
        }
        
        console.error('[Auth] Exception loading initial session:', error);
        setLoading(false);
        clearTimeout(timeoutId);
        clearTimeout(safetyTimeoutId);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      clearTimeout(safetyTimeoutId);
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          // Ignore errors when unsubscribing
          console.warn('[Auth] Error unsubscribing:', error);
        }
      }
    };
  }, []); // Remove loading dependency to prevent infinite loops - only run once on mount

  // Resume and reconnect share the same bounded session coordinator as REST.
  // No full-page loading state: an open editor must stay mounted.
  useEffect(() => {
    if (loading) return;
    let mounted = true;
    let checking = false;
    const resume = async () => {
      if (document.visibilityState !== 'visible' || checking || intentionalSignOut.current) return;
      checking = true;
      try {
        const current = await getCurrentSession();
        if (!mounted || intentionalSignOut.current) return;
        acceptSession(current);
        if (current) {
          await checkAndStoreRoles(current.user.id, current.access_token);
          if (!mounted) return;
          // Retry mounted reads, not mutations or upload jobs.
          await queryClient.refetchQueries({ type: 'active' });
        }
      } catch {
        // A network outage is not a logout. Requests expose their own retry UI.
        console.warn('[Auth] Session check unavailable; keeping the current workspace');
      } finally { checking = false; }
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    };
  }, [loading, acceptSession, queryClient]);

  // Check and store roles via direct user_roles REST (avoids has_role RPC overload ambiguity)
  const checkAndStoreRoles = async (userId: string, accessToken: string) => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key || !accessToken) return;
    try {
      console.log('[Auth] Checking roles for user:', userId);
      const [adminRes, setterRes] = await Promise.all([
        authenticatedFetch(`${url}/rest/v1/user_roles?user_id=eq.${userId}&role=eq.admin&select=user_id`, {
          method: 'GET',
          headers: { apikey: key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        }),
        authenticatedFetch(`${url}/rest/v1/user_roles?user_id=eq.${userId}&role=eq.setter&select=user_id`, {
          method: 'GET',
          headers: { apikey: key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        }),
      ]);
      // A failed role lookup is unknown, never an authoritative role revocation.
      if (!adminRes.ok || !setterRes.ok || lastSession.current?.user.id !== userId) return;
      const adminData = await adminRes.json();
      const setterData = await setterRes.json();
      if (!Array.isArray(adminData) || !Array.isArray(setterData)) return;
      const isAdmin = Array.isArray(adminData) && adminData.length > 0;
      const isSetter = Array.isArray(setterData) && setterData.length > 0;
      try {
        localStorage.setItem('nav_isAdmin', String(isAdmin));
        localStorage.setItem('nav_isSetter', String(isSetter));
        localStorage.setItem('nav_userId', userId);
        sessionStorage.setItem('nav_isAdmin', String(isAdmin));
        sessionStorage.setItem('nav_isSetter', String(isSetter));
        sessionStorage.setItem('nav_userId', userId);
        console.log('[Auth] Roles stored:', { isAdmin, isSetter, userId });
      } catch (storageError) {
        console.warn('[Auth] Error storing roles:', storageError);
      }
    } catch (error) {
      console.error('[Auth] Error checking roles:', error);
    }
  };

  async function withSingleRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      const looksTransient = msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('failed to fetch');
      if (!looksTransient) throw error;
      // one short retry for intermittent network/backend hiccups
      await new Promise((resolve) => setTimeout(resolve, 450));
      return await operation();
    }
  }

  const signIn = async (email: string, password: string) => {
    setAuthTransition('signing-in');
    try {
      const { data, error } = await withSingleRetry(() => supabase.auth.signInWithPassword({
        email,
        password,
      }));

      if (error) {
        // User-friendly German error messages
        let errorMessage = 'Anmeldung fehlgeschlagen';
        if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid credentials') || error.message.includes('Wrong password')) {
          errorMessage = 'Ungültige Anmeldedaten. Bitte überprüfe deine E-Mail-Adresse und dein Passwort.';
        } else if (error.message.includes('Email not confirmed') || error.message.includes('email not confirmed')) {
          errorMessage = 'Bitte bestätige zuerst deine E-Mail-Adresse. Wir haben dir eine Bestätigungs-E-Mail gesendet.';
        } else if (error.message.includes('User not found') || error.message.includes('user not found')) {
          errorMessage = 'Kein Konto mit dieser E-Mail-Adresse gefunden. Bitte registriere dich zuerst.';
        } else if (error.message.includes('Too many requests') || error.message.includes('rate limit')) {
          errorMessage = 'Zu viele Anmeldeversuche. Bitte warte einen Moment und versuche es erneut.';
        } else {
          errorMessage = 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
        }
        toast.error('Anmeldung fehlgeschlagen', {
          description: errorMessage,
          duration: 5200,
        });
        throw error;
      }

      if (data.session?.user) {
        await checkAndStoreRoles(data.session.user.id, data.session.access_token ?? '');
      }

      toast.success('Erfolgreich angemeldet!');
      window.location.assign('/');
    } catch (error) {
      setAuthTransition(null);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, meta?: { firstName?: string; lastName?: string; birthDate?: string }) => {
    setAuthTransition('signing-up');
    try {
      const redirectUrl = `${window.location.origin}/auth/callback?next=/`;

      // Validate email format before sending to Supabase
      const emailTrimmed = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailTrimmed || !emailRegex.test(emailTrimmed)) {
        const errorMessage = 'Ungültige E-Mail-Adresse. Bitte überprüfe deine Eingabe.';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Clean and validate names - only use non-empty strings
      const firstName = meta?.firstName?.trim() || undefined;
      const lastName = meta?.lastName?.trim() || undefined;
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined;
      const birthDate = meta?.birthDate?.trim() || undefined;

      const { data, error } = await withSingleRetry(() => supabase.auth.signUp({
        email: emailTrimmed,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName || null,
            last_name: lastName || null,
            full_name: fullName || null,
            birth_date: birthDate || null,
          }
        }
      }));

      if (error) {
        // User-friendly error messages with more specific checks
        let errorMessage = 'Registrierung fehlgeschlagen';
        const errorMsgLower = error.message.toLowerCase();
        const authError = error as { status?: number; code?: string | number };
        const errorCode = authError.status || authError.code;

        // Check for specific error types
        if (errorMsgLower.includes('already registered') ||
            errorMsgLower.includes('already exists') ||
            errorMsgLower.includes('user already registered') ||
            errorCode === 422) {
          errorMessage = 'Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an oder verwende eine andere E-Mail.';
        } else if (errorMsgLower.includes('password') ||
                   errorMsgLower.includes('password is too weak') ||
                   errorMsgLower.includes('password should be at least')) {
          errorMessage = 'Das Passwort ist zu schwach. Bitte verwende mindestens 6 Zeichen.';
        } else if (errorMsgLower.includes('invalid email') ||
                   errorMsgLower.includes('email format') ||
                   errorMsgLower.includes('email is invalid') ||
                   (errorMsgLower.includes('email') && errorMsgLower.includes('invalid'))) {
          errorMessage = 'Ungültige E-Mail-Adresse. Bitte überprüfe deine Eingabe.';
        } else if (errorMsgLower.includes('error sending confirmation email') ||
                   errorMsgLower.includes('confirmation email') ||
                   errorCode === 500) {
          errorMessage = 'Fehler beim Senden der Bestätigungs-E-Mail. Bitte versuche es später erneut oder kontaktiere den Support.';
        } else {
          // Show original error message for debugging, but in German if possible
          errorMessage = 'Registrierung fehlgeschlagen: ' + error.message;
        }
        toast.error(errorMessage);
        throw error;
      }

      // Note: We cannot update profiles table here because there's no session yet
      // The data is stored in user_metadata and will be synced when user logs in after email confirmation
      // The sync happens in onAuthStateChange when session becomes available

      // Check if email confirmation is required
      // If user exists but no session, email confirmation is required
      if (data?.user && !data.session) {
        toast.success('Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse. Wir haben dir eine E-Mail gesendet.');
      } else if (data?.session) {
        // User is already logged in (email confirmation disabled)
        toast.success('Erfolgreich registriert! Du kannst dich jetzt anmelden.');
      } else {
        // Fallback message
        toast.success('Registrierung erfolgreich! Bitte überprüfe deine E-Mail zur Bestätigung.');
      }
    } finally {
      setAuthTransition(null);
    }
  };

  const resendConfirmation = async (emailAddress: string) => {
    const emailTrimmed = emailAddress.trim();
    if (!emailTrimmed) {
      toast.error('Bitte E-Mail-Adresse eingeben.');
      return;
    }
    const redirectUrl = `${window.location.origin}/auth/callback?next=/`;
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: emailTrimmed,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('already confirmed')) {
        toast.error(msg.includes('already confirmed')
          ? 'Dieses Konto ist bereits bestätigt. Bitte melde dich an.'
          : 'Bitte warte einige Minuten, bevor du die E-Mail erneut anforderst.');
      } else {
        toast.error('Fehler: ' + error.message);
      }
      throw error;
    }
    toast.success('Falls ein unbestätigtes Konto existiert, wurde eine neue Bestätigungs-E-Mail gesendet. Prüfe auch den Spam-Ordner.');
  };

  const signOut = async () => {
    if (authTransition === 'signing-out') return;
    setAuthTransition('signing-out');
    intentionalSignOut.current = true;
    setReauthRequired(false);

    // Try to sign out from Supabase first with a short timeout for fast UX
    // This ensures the session is properly invalidated on the server
    let signOutSuccess = false;
    try {
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sign out timeout')), 1500); // 1.5s timeout for fast UX
      });
      
      await Promise.race([signOutPromise, timeoutPromise]);
      signOutSuccess = true;
      console.log('[Auth] ✅ Supabase sign out successful');
    } catch (error: unknown) {
      // If timeout or error, we'll continue with local logout anyway
      console.warn('[Auth] Sign out timeout or error (continuing with local logout):', error);
    }
    
    // Clear local state immediately (optimistic logout for instant UI feedback)
    setUser(null);
    setSession(null);
    
    // Clear persisted data immediately
    try {
      localStorage.removeItem('greetingName');
      localStorage.removeItem('nav_isAdmin');
      localStorage.removeItem('nav_isSetter');
      localStorage.removeItem('nav_userId');
      sessionStorage.removeItem('nav_isAdmin');
      sessionStorage.removeItem('nav_isSetter');
      sessionStorage.removeItem('nav_userId');
      
      // Also clear Supabase auth storage keys to ensure complete logout
      // These are used by Supabase to persist sessions
      const supabaseStorageKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      supabaseStorageKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore errors
        }
      });
      
      const supabaseSessionKeys = Object.keys(sessionStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      supabaseSessionKeys.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch {
          // Ignore errors
        }
      });
    } catch {
      // Ignore storage errors
    }
    
    // Clear React Query cache
    try {
      queryClient.clear();
    } catch (error) {
      console.warn('[Auth] Error clearing query cache:', error);
    }
    
    // Redirect immediately for instant feedback without depending on Router context
    window.location.assign('/auth');
    
    // Show toast
    if (signOutSuccess) {
      toast.success('Erfolgreich abgemeldet!');
    } else {
      toast.success('Abgemeldet!');
    }
    
    // If signOut didn't complete in time, try again in background (non-blocking)
    if (!signOutSuccess) {
      supabase.auth.signOut().catch((error) => {
        console.warn('[Auth] Background sign out retry failed (non-critical):', error);
      });
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await withSingleRetry(() => supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    }));
    
    if (error) {
      // User-friendly German error messages
      let errorMessage = 'Fehler beim Zurücksetzen des Passworts';
      if (error.message.includes('User not found') || error.message.includes('user not found')) {
        errorMessage = 'Kein Konto mit dieser E-Mail-Adresse gefunden. Bitte überprüfe deine Eingabe.';
      } else if (error.message.includes('Too many requests') || error.message.includes('rate limit')) {
        errorMessage = 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.';
      } else if (error.message.includes('email')) {
        errorMessage = 'Ungültige E-Mail-Adresse. Bitte überprüfe deine Eingabe.';
      } else {
        errorMessage = 'Fehler beim Senden des Passwort-Links. Bitte versuche es erneut.';
      }
      toast.error(errorMessage);
      throw error;
    }
    
    toast.success('Passwort-Link wurde an deine E-Mail gesendet!');
  };

  // Preload sector images when user is logged in
  usePreloadSectorImages(!!session && !reauthRequired);
  
  // Preload boulder thumbnails when user is logged in
  usePreloadBoulderThumbnails(!!session && !reauthRequired);

  const reconnectSession = async (password: string) => {
    const expected = lastSession.current;
    if (!expected?.user.email) throw new Error('Kein Konto verfügbar');
    const { data, error } = await supabase.auth.signInWithPassword({ email: expected.user.email, password });
    if (error || !data.session || data.session.user.id !== expected.user.id) throw new Error('Anmeldung fehlgeschlagen');
    acceptSession(data.session);
    // No redirect, reload, mutation retry or cache clear for the same account.
    void queryClient.refetchQueries({ type: 'active' });
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut, resetPassword, resendConfirmation, loading, authTransition, reauthRequired }}>
      {children}
      {reauthRequired && user?.email && <SessionRecoveryDialog email={user.email} onReconnect={reconnectSession} onSignOut={signOut} />}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
