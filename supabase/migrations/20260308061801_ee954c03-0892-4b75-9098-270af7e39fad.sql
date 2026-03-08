
-- Companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  address text,
  phone text,
  email text,
  description text,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Company members junction table
CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Add company_id to profiles for "current company"
ALTER TABLE public.profiles ADD COLUMN current_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Security definer: check company membership
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_company_role(_user_id uuid, _company_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.company_members
  WHERE user_id = _user_id AND company_id = _company_id
  LIMIT 1
$$;

-- Companies RLS: members can view, owner/admin can update
CREATE POLICY "Members can view their company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (public.is_company_member(auth.uid(), id));

CREATE POLICY "Anyone authenticated can create a company"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner/admin can update company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (public.get_company_role(auth.uid(), id) IN ('owner', 'admin'));

CREATE POLICY "Owner can delete company"
  ON public.companies FOR DELETE
  TO authenticated
  USING (public.get_company_role(auth.uid(), id) = 'owner');

-- Company members RLS
CREATE POLICY "Members can view company members"
  ON public.company_members FOR SELECT
  TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Owner/admin can insert members"
  ON public.company_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin')
    OR NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = company_members.company_id)
  );

CREATE POLICY "Owner/admin can update members"
  ON public.company_members FOR UPDATE
  TO authenticated
  USING (public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

CREATE POLICY "Owner/admin can delete members"
  ON public.company_members FOR DELETE
  TO authenticated
  USING (public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- Updated at trigger for companies
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true);

-- Storage RLS for company logos
CREATE POLICY "Anyone can view company logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Users can update their uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
