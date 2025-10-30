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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Sync user_metadata to profiles table when session becomes available
        if (session?.user) {
          const meta = session.user.user_metadata as any;
          const payload: any = {};
          if (meta?.first_name) payload.first_name = meta.first_name;
          if (meta?.last_name) payload.last_name = meta.last_name;
          if (meta?.full_name) payload.full_name = meta.full_name;
          if (meta?.birth_date) payload.birth_date = meta.birth_date;
          if (Object.keys(payload).length > 0) {
            supabase.from('profiles').update(payload).eq('id', session.user.id);
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
    const { error } = await supabase.auth.signUp({
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
      toast.error('Registrierung fehlgeschlagen: ' + error.message);
      throw error;
    }
    
    toast.success('Erfolgreich registriert! Du kannst dich jetzt anmelden.');
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
