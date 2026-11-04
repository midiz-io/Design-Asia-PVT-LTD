-- Add task_identification_code field to tasks table
-- This field allows manual entry of task identification codes

-- Add task_identification_code column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_identification_code TEXT;

-- Add index for better query performance on task identification codes
CREATE INDEX IF NOT EXISTS idx_tasks_identification_code 
ON public.tasks(task_identification_code);

-- Add comment to document the field
COMMENT ON COLUMN public.tasks.task_identification_code IS 'Manual task identification code entered by users for easier task tracking and reference';

-- Create a function to generate a default task identification code if none provided
CREATE OR REPLACE FUNCTION generate_task_identification_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a code in format: TASK-YYYYMMDD-XXXX
        new_code := 'TASK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.tasks WHERE task_identification_code = new_code) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-generate task identification code if not provided
CREATE OR REPLACE FUNCTION set_task_identification_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set if task_identification_code is null or empty
    IF NEW.task_identification_code IS NULL OR TRIM(NEW.task_identification_code) = '' THEN
        NEW.task_identification_code := generate_task_identification_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tasks table
DROP TRIGGER IF EXISTS trigger_set_task_identification_code ON public.tasks;
CREATE TRIGGER trigger_set_task_identification_code
    BEFORE INSERT ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_task_identification_code();

-- Add RLS policy for task_identification_code
-- Users can view task identification codes for tasks they have access to
-- This follows the same pattern as other task fields
