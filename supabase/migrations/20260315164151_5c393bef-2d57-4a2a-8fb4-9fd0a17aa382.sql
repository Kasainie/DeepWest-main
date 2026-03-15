-- Remove switch_password_hash from being readable by regular members
-- Drop and recreate SELECT policy to exclude sensitive column via a view approach
-- Since RLS can't filter columns, we'll revoke direct SELECT on switch_password_hash 
-- by using column-level security instead

-- Revoke column-level access: only service_role should read the hash
REVOKE ALL ON public.companies FROM authenticated;
GRANT SELECT (id, name, slug, owner_id, email, phone, address, description, logo_url, is_paused, created_at, updated_at) ON public.companies TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.companies TO authenticated;