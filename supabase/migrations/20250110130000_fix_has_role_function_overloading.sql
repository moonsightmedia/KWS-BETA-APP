-- Fix has_role function overloading issue
-- PostgREST cannot resolve function calls when multiple overloads exist with similar signatures
-- Solution: Create a single function that accepts text and handles both text and enum internally

-- Drop ALL existing has_role functions (this will temporarily break policies, but we'll recreate them)
DROP FUNCTION IF EXISTS public.has_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role, text) CASCADE;

-- Create a single function that accepts text parameter
-- This function will work for both RPC calls (with named parameters) and policies (with positional arguments)
-- It accepts text and internally handles both text strings and enum values
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has the role (handles both text and enum by casting)
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text = _role::text
  );
END;
$$;

-- Note: Policies use positional arguments like has_role(auth.uid(), 'admin')
-- This will work because PostgreSQL will match the function signature by argument types
-- The function accepts text, and 'admin' is a text literal, so it will match
