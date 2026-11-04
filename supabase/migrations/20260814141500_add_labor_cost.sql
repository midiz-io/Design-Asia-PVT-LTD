-- Add labor_cost to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(14,2) DEFAULT 0;
