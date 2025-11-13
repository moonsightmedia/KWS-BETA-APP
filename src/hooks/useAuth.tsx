import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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

  // Sync function to transfer user_metadata to profiles table
  const syncMetadataToProfiles = async (userId: string, metadata: any) => {
    if (!userId || !metadata) return;
    
    const payload: any = {};
    if (metadata.first_name) payload.first_name = metadata.first_name;
    if (metadata.last_name) payload.last_name = metadata.last_name;
    if (metadata.full_name) payload.full_name = metadata.full_name;
    if (metadata.birth_date) payload.birth_date = metadata.birth_date;
    
    if (Object.keys(payload).length === 0) {
      console.debug('[Profile Sync] Keine Metadaten zum Synchronisieren gefunden');
      return;
    }
    
    console.log('[Profile Sync] Starte Synchronisation:', payload);
    
    // First check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();
    
    if (checkError) {
      console.error('[Profile Sync] Fehler beim Prüfen des Profils:', checkError);
      return;
    }
    
    if (existingProfile) {
      // Profile exists, update it
      const { error: updateError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);
      
      if (updateError) {
        console.error('[Profile Sync] Fehler beim Update:', updateError);
      } else {
        console.log('[Profile Sync] Profildaten erfolgreich aktualisiert');
      }
    } else {
      // Profile doesn't exist yet, create it (trigger should have done this, but just in case)
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: metadata.email || null,
          ...payload
        });
      
      if (insertError) {
        console.error('[Profile Sync] Fehler beim Erstellen:', insertError);
      } else {
        console.log('[Profile Sync] Profil erfolgreich erstellt');
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Set a timeout to ensure loading doesn't hang forever
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Session loading timeout - setting loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;
          
          // Ignore storage-related errors in the callback
          try {
            console.log('[Auth] Auth state changed:', event, session?.user?.id);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            clearTimeout(timeoutId);
            
            // Sync user_metadata to profiles table when session becomes available
            if (session?.user) {
              const meta = session.user.user_metadata as any;
              if (meta && (meta.first_name || meta.last_name || meta.birth_date)) {
                await syncMetadataToProfiles(session.user.id, meta);
              }
            }
          } catch (error: any) {
            // Ignore storage access errors
            if (error?.message?.includes('storage') || error?.message?.includes('Storage')) {
              console.warn('[Auth] Storage error in auth state change (ignored):', error.message);
              return;
            }
            console.error('[Auth] Error in auth state change:', error);
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
        
        console.log('[Auth] Initial session loaded:', session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        clearTimeout(timeoutId);
        
        // Also sync on initial session load
        if (session?.user) {
          const meta = session.user.user_metadata as any;
          if (meta && (meta.first_name || meta.last_name || meta.birth_date)) {
            await syncMetadataToProfiles(session.user.id, meta);
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
          return;
        }
        
        console.error('[Auth] Exception loading initial session:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          // Ignore errors when unsubscribing
          console.warn('[Auth] Error unsubscribing:', error);
        }
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast.error('Anmeldung fehlgeschlagen: ' + error.message);
      throw error;
    }
    
    toast.success('Erfolgreich angemeldet!');
    navigate('/');
  };

  const signUp = async (email: string, password: string, meta?: { firstName?: string; lastName?: string; birthDate?: string }) => {
    const redirectUrl = `${window.location.origin}/auth`;
    const fullName = [meta?.firstName, meta?.lastName].filter(Boolean).join(' ').trim() || undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: meta?.firstName || null,
          last_name: meta?.lastName || null,
          full_name: fullName || null,
          birth_date: meta?.birthDate || null,
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
      toast.error('Abmeldung fehlgeschlagen: ' + error.message);
      throw error;
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
      toast.error('Fehler beim Zurücksetzen: ' + error.message);
      throw error;
    }
    
    toast.success('Passwort-Link wurde an deine E-Mail gesendet!');
  };

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
