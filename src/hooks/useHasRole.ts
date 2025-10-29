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
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', role)
          .maybeSingle();
        if (error) {
          setHasRole(false);
        } else {
          setHasRole(!!data);
        }
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [user, role]);

  return { hasRole, loading };
};


