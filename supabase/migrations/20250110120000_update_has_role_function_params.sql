-- Update has_role function to use correct parameter names matching TypeScript types
-- This fixes the RPC error: "Could not find the function public.has_role(role, user_id)"
-- Note: We use CREATE OR REPLACE to avoid dropping dependent policies

-- Create function with correct parameter names that match TypeScript types
-- PostgreSQL supports function overloading, so this will work alongside existing calls
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text = _role::text
  );
$$;

-- Also create an overload that accepts app_role enum directly
-- This is used by RLS policies and RPC calls
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  );
$$;

-- Note: The old function signatures (uid, role_text) may still exist for backward compatibility
-- but the new signatures with _user_id and _role will be used by RPC calls from TypeScript

