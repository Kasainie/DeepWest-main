
CREATE TABLE public.company_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  primary_color text DEFAULT '28 60% 42%',
  accent_color text DEFAULT '160 40% 40%',
  sidebar_color text DEFAULT '220 20% 8%',
  font_heading text DEFAULT 'Playfair Display',
  font_body text DEFAULT 'DM Sans',
  welcome_message text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view branding"
  ON public.company_branding FOR SELECT
  TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Owner/admin can insert branding"
  ON public.company_branding FOR INSERT
  TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

CREATE POLICY "Owner/admin can update branding"
  ON public.company_branding FOR UPDATE
  TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

CREATE POLICY "Owner/admin can delete branding"
  ON public.company_branding FOR DELETE
  TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

CREATE TRIGGER update_company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
