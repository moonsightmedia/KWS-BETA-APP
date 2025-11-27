import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useIsAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
        if (error) {
          console.error(`[useIsAdmin] Error checking admin status for user ${user.id}:`, error);
          setIsAdmin(false);
        } else {
          const isAdminValue = !!data;
          console.log(`[useIsAdmin] Admin check for user ${user.id}:`, isAdminValue);
          setIsAdmin(isAdminValue);
        }
      } catch (error) {
        console.error(`[useIsAdmin] Exception checking admin status for user ${user.id}:`, error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
};
