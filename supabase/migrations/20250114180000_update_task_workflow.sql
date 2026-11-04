-- Update task workflow to support photo proof and admin approval
-- Add new status for pending approval
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'rejected';

-- Add columns for photo proof and approval
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS proof_photo_url TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for approval queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_approved_by ON public.tasks(approved_by);
CREATE INDEX IF NOT EXISTS idx_tasks_rejected_by ON public.tasks(rejected_by);

-- Update RLS policies for new columns
-- Tasks can be updated by assigned users or admins
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can update their assigned tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Admins can manage all tasks" ON public.tasks;
    
    -- Create new policies
    CREATE POLICY "Users can update their assigned tasks" ON public.tasks
    FOR UPDATE TO authenticated
    USING (
        -- User is assigned to the task
        EXISTS (
            SELECT 1 FROM task_assignees ta 
            WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
        )
        -- Or user created the task
        OR created_by = auth.uid()
    );
    
    CREATE POLICY "Admins can manage all tasks" ON public.tasks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );
    
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
