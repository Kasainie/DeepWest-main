
CREATE TABLE public.website_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT DEFAULT '',
  meta_title TEXT,
  meta_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);

ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view pages"
  ON public.website_pages FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Company members can insert pages"
  ON public.website_pages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Company members can update pages"
  ON public.website_pages FOR UPDATE
  TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Company members can delete pages"
  ON public.website_pages FOR DELETE
  TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));
