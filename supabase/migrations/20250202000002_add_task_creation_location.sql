-- Migration to add employee creation location to tasks table
-- This stores the GPS coordinates where an employee was when they created the task

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS creation_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS creation_longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS creation_location_name TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN public.tasks.creation_latitude IS 'GPS latitude of the employee when they created the task';
COMMENT ON COLUMN public.tasks.creation_longitude IS 'GPS longitude of the employee when they created the task';
COMMENT ON COLUMN public.tasks.creation_location_name IS 'Human-readable address/location name where the task was created';
