-- Add job_status enum and status column to jobs table
DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('Started', 'In Progress', 'Completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS status job_status DEFAULT 'Started';
