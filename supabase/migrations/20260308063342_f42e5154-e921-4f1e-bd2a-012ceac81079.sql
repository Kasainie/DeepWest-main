
-- Company invitations table
CREATE TABLE public.company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(company_id, email)
);

-- Enable RLS
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Company members can view invitations"
  ON public.company_invitations FOR SELECT
  TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Owner/admin can create invitations"
  ON public.company_invitations FOR INSERT
  TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

CREATE POLICY "Owner/admin can delete invitations"
  ON public.company_invitations FOR DELETE
  TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

CREATE POLICY "Owner/admin can update invitations"
  ON public.company_invitations FOR UPDATE
  TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- Allow anyone authenticated to read invitation by token (for accepting)
CREATE POLICY "Anyone can read invitation by token"
  ON public.company_invitations FOR SELECT
  TO authenticated
  USING (true);
