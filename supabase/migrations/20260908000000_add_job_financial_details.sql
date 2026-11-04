-- Add job financial details to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_date DATE,
  ADD COLUMN IF NOT EXISTS quotation_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS invoice_no TEXT,
  ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS payment_details TEXT;
