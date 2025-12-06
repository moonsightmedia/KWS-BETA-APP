import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { usePreloadSectorImages } from './usePreloadSectorImages';
import { usePreloadBoulderThumbnails } from './usePreloadBoulderThumbnails';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, meta?: { firstName?: string; lastName?: string; birthDate?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // Get queryClient at component level

  // Sync function to transfer user_metadata to profiles table
  const syncMetadataToProfiles = async (userId: string, metadata: any) => {
    if (!userId) return;
    
    const payload: any = {};
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
          
          const createPayload: any = {
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
    const loadingStartTime = Date.now();
    
    // Log loading start
    console.log('[Auth] Loading started');
    
    // Set a timeout to ensure loading doesn't hang forever
    // Increased to 5 seconds to allow Supabase requests to complete
    const timeoutId = setTimeout(() => {
      if (mounted) {
        const duration = Date.now() - loadingStartTime;
        console.warn(`[Auth] ⚠️ Timeout triggered (5s) - setting loading to false (duration: ${duration}ms)`);
        console.warn(`[Auth] ⚠️ Current state: user=${!!user}, session=${!!session}, loading=${loading}`);
        setLoading(false);
      }
    }, 5000); // 5 second timeout
    
    // Additional safety timeout: If still loading after 10 seconds, force reset
    const safetyTimeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.error('[Auth] CRITICAL: Auth still loading after 10s - forcing reset');
        setLoading(false);
        setSession(null);
        setUser(null);
        // Clear potentially corrupted session storage
        try {
          sessionStorage.removeItem('preserveRoute');
          sessionStorage.removeItem('isRefreshing');
        } catch (e) {
          // Ignore storage errors
        }
      }
    }, 10000); // 10 second safety timeout

    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
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
            
            console.log(`[Auth] ✅ Setting loading to false NOW (event: ${event})`);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            clearTimeout(timeoutId);
            console.log(`[Auth] ✅ State updated: loading=false, user=${!!session?.user}, session=${!!session}`);
            
            // Sync user_metadata to profiles table when session becomes available
            // This happens on SIGNED_IN, TOKEN_REFRESHED, and INITIAL_SESSION events
            if (session?.user) {
              const meta = session.user.user_metadata as any;
              // Always try to sync - even if metadata is empty, we might need to update email
              // Add email to metadata if not present
              const metadataWithEmail = {
                ...meta,
                email: session.user.email || meta?.email
              };
              console.log('[Auth] Syncing profile for user:', session.user.id, 'Event:', event, 'Metadata:', metadataWithEmail);
              await syncMetadataToProfiles(session.user.id, metadataWithEmail);
              
              // Check and store roles when user signs in
              if (event === 'SIGNED_IN') {
                await checkAndStoreRoles(session.user.id);
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
            }
          } catch (error: any) {
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
    } catch (error: any) {
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
            setSession(null);
            setUser(null);
            setLoading(false);
            clearTimeout(timeoutId);
            return;
          }
          
          console.error('[Auth] Error loading initial session:', error);
          setSession(null);
          setUser(null);
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
        
        console.log(`[Auth] ✅ Setting loading to false NOW (getSession)`);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(timeoutId);
        console.log(`[Auth] ✅ State updated: loading=false, user=${!!session?.user}, session=${!!session}`);
        
        // Also sync on initial session load
        if (session?.user) {
          const meta = session.user.user_metadata as any;
          // Always try to sync - even if metadata is empty, we might need to update email
          // Add email to metadata if not present
          const metadataWithEmail = {
            ...meta,
            email: session.user.email || meta?.email
          };
          await syncMetadataToProfiles(session.user.id, metadataWithEmail);
          
          // Check and store roles if not already in sessionStorage
          try {
            const storedUserId = sessionStorage.getItem('nav_userId');
            if (storedUserId !== session.user.id) {
              // Different user or no roles stored - check roles
              await checkAndStoreRoles(session.user.id);
            }
          } catch (storageError) {
            console.warn('[Auth] Error checking stored roles:', storageError);
            // If storage check fails, still try to check roles
            await checkAndStoreRoles(session.user.id);
          }
        }
      } catch (error: any) {
        if (!mounted) return;
        
        // Ignore storage-related errors
        if (error?.message?.includes('storage') || error?.message?.includes('Storage')) {
          console.warn('[Auth] Storage error in getSession (ignored):', error.message);
          setSession(null);
          setUser(null);
          setLoading(false);
          clearTimeout(timeoutId);
          clearTimeout(safetyTimeoutId);
          return;
        }
        
        // Check if it's a timeout error
        if (error?.message?.includes('timeout')) {
          console.warn('[Auth] getSession timeout - continuing without session');
          setSession(null);
          setUser(null);
          setLoading(false);
          clearTimeout(timeoutId);
          clearTimeout(safetyTimeoutId);
          return;
        }
        
        console.error('[Auth] Exception loading initial session:', error);
        setSession(null);
        setUser(null);
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
  }, [loading]);

  // Re-check session when tab becomes visible (after initial mount)
  // Only check current session, don't refresh it (refreshSession can invalidate valid sessions)
  useEffect(() => {
    if (loading) return; // Don't interfere with initial loading
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Auth] Tab visible - checking session');
        try {
          // Just check current session, don't refresh it
          // refreshSession() can invalidate valid sessions, so we only use it when necessary
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.warn('[Auth] Error getting session on visibility change:', error);
            return;
          }
          
          // Update state with current session if it changed
          if (session) {
            if (!user || session.user.id !== user.id) {
              console.log('[Auth] Session found on visibility change, updating state');
              setSession(session);
              setUser(session.user);
              
              // Check and store roles if not already stored
              const storedUserId = sessionStorage.getItem('nav_userId');
              if (storedUserId !== session.user.id) {
                await checkAndStoreRoles(session.user.id);
              }
            }
          } else if (user) {
            // Session is null but we have a user - session expired or logged out
            console.log('[Auth] Session is null on visibility change, clearing state');
            setSession(null);
            setUser(null);
          }
        } catch (error) {
          console.error('[Auth] Error in visibility change handler:', error);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, loading]);

  // Check and store roles once after login
  const checkAndStoreRoles = async (userId: string) => {
    try {
      console.log('[Auth] Checking roles for user:', userId);
      
      // Check both roles in parallel
      const [adminResult, setterResult] = await Promise.all([
        supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'setter' })
      ]);
      
      const isAdmin = !!adminResult.data;
      const isSetter = !!setterResult.data;
      
      // Store in sessionStorage
      try {
        sessionStorage.setItem('nav_isAdmin', String(isAdmin));
        sessionStorage.setItem('nav_isSetter', String(isSetter));
        sessionStorage.setItem('nav_userId', userId);
        console.log('[Auth] Roles stored:', { isAdmin, isSetter, userId });
      } catch (storageError) {
        console.warn('[Auth] Error storing roles in sessionStorage:', storageError);
      }
    } catch (error) {
      console.error('[Auth] Error checking roles:', error);
      // Don't throw - roles check failure shouldn't block login
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
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
      toast.error(errorMessage);
      throw error;
    }
    
    // After successful login, check and store roles once
    if (data.session?.user) {
      await checkAndStoreRoles(data.session.user.id);
    }
    
    toast.success('Erfolgreich angemeldet!');
    navigate('/');
  };

  const signUp = async (email: string, password: string, meta?: { firstName?: string; lastName?: string; birthDate?: string }) => {
    const redirectUrl = `${window.location.origin}/auth`;
    // Clean and validate names - only use non-empty strings
    const firstName = meta?.firstName?.trim() || undefined;
    const lastName = meta?.lastName?.trim() || undefined;
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined;
    const birthDate = meta?.birthDate?.trim() || undefined;
    
    const { data, error } = await supabase.auth.signUp({
      email,
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
    });
    
    if (error) {
      // User-friendly error messages
      let errorMessage = 'Registrierung fehlgeschlagen';
      if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('User already registered')) {
        errorMessage = 'Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an oder verwende eine andere E-Mail.';
      } else if (error.message.includes('Password')) {
        errorMessage = 'Das Passwort ist zu schwach. Bitte verwende mindestens 6 Zeichen.';
      } else if (error.message.includes('email')) {
        errorMessage = 'Ungültige E-Mail-Adresse. Bitte überprüfe deine Eingabe.';
      } else {
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
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error('Abmeldung fehlgeschlagen. Bitte versuche es erneut.');
      throw error;
    }
    
    // Clear persisted greeting name from localStorage
    try {
      localStorage.removeItem('greetingName');
    } catch {
      // Ignore localStorage errors
    }
    
    // Clear stored roles from sessionStorage
    try {
      sessionStorage.removeItem('nav_isAdmin');
      sessionStorage.removeItem('nav_isSetter');
      sessionStorage.removeItem('nav_userId');
      console.log('[Auth] Roles cleared from sessionStorage');
    } catch {
      // Ignore sessionStorage errors
    }
    
    toast.success('Erfolgreich abgemeldet!');
    navigate('/auth');
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    
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
  usePreloadSectorImages(!!session);
  
  // Preload boulder thumbnails when user is logged in
  usePreloadBoulderThumbnails(!!session);

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut, resetPassword, loading }}>
      {children}
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

