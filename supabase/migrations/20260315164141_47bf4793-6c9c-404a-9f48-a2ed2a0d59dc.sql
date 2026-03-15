-- 1. Fix login_attempts RLS - add INSERT policy for anon (needed for rate limiting)
CREATE POLICY "Anyone can insert login attempts"
ON public.login_attempts FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Only admins can read login attempts
CREATE POLICY "Service role can select login attempts"
ON public.login_attempts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for old login attempts cleanup
CREATE POLICY "Service role can delete login attempts"
ON public.login_attempts FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));