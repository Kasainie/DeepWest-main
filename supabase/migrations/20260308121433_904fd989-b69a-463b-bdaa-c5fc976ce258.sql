
DROP POLICY "Company members can view pages" ON public.website_pages;
DROP POLICY "Company members can insert pages" ON public.website_pages;
DROP POLICY "Company members can update pages" ON public.website_pages;
DROP POLICY "Company members can delete pages" ON public.website_pages;

CREATE POLICY "Company members can view pages"
  ON public.website_pages FOR SELECT
  TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can insert pages"
  ON public.website_pages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can update pages"
  ON public.website_pages FOR UPDATE
  TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can delete pages"
  ON public.website_pages FOR DELETE
  TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
