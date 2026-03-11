
-- Add switch_password_hash column to companies (bcrypt hash stored here)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS switch_password_hash text DEFAULT NULL;
