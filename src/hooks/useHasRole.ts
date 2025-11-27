import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useHasRole = (role: 'admin' | 'user' | 'setter') => {
  const { user } = useAuth();
  const [hasRole, setHasRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setHasRole(false);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: role });
        if (error) {
          console.error(`[useHasRole] Error checking role "${role}" for user ${user.id}:`, error);
          setHasRole(false);
        } else {
          const hasRoleValue = !!data;
          console.log(`[useHasRole] Role "${role}" check for user ${user.id}:`, hasRoleValue);
          setHasRole(hasRoleValue);
        }
      } catch (error) {
        console.error(`[useHasRole] Exception checking role "${role}" for user ${user.id}:`, error);
        setHasRole(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [user, role]);

  return { hasRole, loading };
};


