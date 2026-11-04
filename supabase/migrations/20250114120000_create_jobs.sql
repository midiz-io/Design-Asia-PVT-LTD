-- Jobs feature: categories, jobs, and job materials
DO $$ BEGIN
  CREATE TYPE job_category AS ENUM ('DA', 'TB', 'AI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category job_category NOT NULL,
  customer_name TEXT NOT NULL,
  job_number TEXT NOT NULL,
  contact_no TEXT,
  sales_person TEXT,
  start_date DATE,
  completion_date DATE,
  contractor_name TEXT,
  note TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS jobs_job_number_unique ON public.jobs(job_number);

CREATE TABLE IF NOT EXISTS public.job_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  item_date DATE,
  description TEXT,
  quantity NUMERIC(12,2) DEFAULT 0,
  rate NUMERIC(12,2) DEFAULT 0,
  amount NUMERIC(14,2) GENERATED ALWAYS AS (COALESCE(quantity,0) * COALESCE(rate,0)) STORED
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_materials ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  CREATE POLICY "Users can view jobs" ON public.jobs
  FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage jobs" ON public.jobs
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view job materials" ON public.job_materials
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_materials.job_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage job materials" ON public.job_materials
  FOR ALL TO authenticated USING (
    public.is_admin(auth.uid())
  ) WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

