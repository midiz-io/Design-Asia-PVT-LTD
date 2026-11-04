-- Create job_labor table
CREATE TABLE IF NOT EXISTS public.job_labor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  item_date DATE,
  description TEXT,
  quantity NUMERIC(12,2) DEFAULT 0,
  amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(14,2) GENERATED ALWAYS AS (COALESCE(quantity,0) * COALESCE(amount,0)) STORED
);

ALTER TABLE public.job_labor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job labor" ON public.job_labor
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_labor.job_id)
);

CREATE POLICY "Admins can manage job labor" ON public.job_labor
FOR ALL TO authenticated USING (
  public.is_admin(auth.uid())
) WITH CHECK (public.is_admin(auth.uid()));
