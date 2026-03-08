
-- Sales transactions table
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  department text NOT NULL DEFAULT 'restaurant',
  category text NOT NULL DEFAULT 'food',
  description text,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  reference_id uuid,
  reference_type text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sales" ON public.sales FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Manager+ can insert sales" ON public.sales FOR INSERT WITH CHECK (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Manager+ can update sales" ON public.sales FOR UPDATE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Owner/admin can delete sales" ON public.sales FOR DELETE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin']));

-- Payment tenders table (daily/shift tender tracking)
CREATE TABLE public.payment_tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tender_date date NOT NULL DEFAULT CURRENT_DATE,
  shift text NOT NULL DEFAULT 'day',
  payment_method text NOT NULL DEFAULT 'cash',
  expected_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric NOT NULL DEFAULT 0,
  variance numeric GENERATED ALWAYS AS (actual_amount - expected_amount) STORED,
  notes text,
  reconciled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_tenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenders" ON public.payment_tenders FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Manager+ can insert tenders" ON public.payment_tenders FOR INSERT WITH CHECK (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Manager+ can update tenders" ON public.payment_tenders FOR UPDATE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Owner/admin can delete tenders" ON public.payment_tenders FOR DELETE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin']));

-- Expense categories table
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  budget_monthly numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expense categories" ON public.expense_categories FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Manager+ can insert expense categories" ON public.expense_categories FOR INSERT WITH CHECK (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Manager+ can update expense categories" ON public.expense_categories FOR UPDATE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Owner/admin can delete expense categories" ON public.expense_categories FOR DELETE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin']));

-- Expenses table
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  receipt_url text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expenses" ON public.expenses FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Manager+ can insert expenses" ON public.expenses FOR INSERT WITH CHECK (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Manager+ can update expenses" ON public.expenses FOR UPDATE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Owner/admin can delete expenses" ON public.expenses FOR DELETE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin']));
