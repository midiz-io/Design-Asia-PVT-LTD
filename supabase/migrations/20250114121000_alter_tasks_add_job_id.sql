-- Add optional relation from tasks to jobs
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id);

CREATE INDEX IF NOT EXISTS tasks_job_id_idx ON public.tasks(job_id);

