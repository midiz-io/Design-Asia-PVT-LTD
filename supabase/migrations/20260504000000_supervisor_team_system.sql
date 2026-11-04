-- Create supervisor_employees table to link supervisors with their team members
CREATE TABLE IF NOT EXISTS public.supervisor_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supervisor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(supervisor_id, employee_id)
);

-- Enable Row Level Security
ALTER TABLE public.supervisor_employees ENABLE ROW LEVEL SECURITY;

-- Policies for supervisor_employees
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supervisor_employees' AND policyname = 'Supervisors can manage their own team') THEN
        CREATE POLICY "Supervisors can manage their own team"
        ON public.supervisor_employees FOR ALL
        TO authenticated
        USING (auth.uid() = supervisor_id OR public.is_admin(auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supervisor_employees' AND policyname = 'Employees can view who their supervisor is') THEN
        CREATE POLICY "Employees can view who their supervisor is"
        ON public.supervisor_employees FOR SELECT
        TO authenticated
        USING (auth.uid() = employee_id OR public.is_admin(auth.uid()) OR auth.uid() = supervisor_id);
    END IF;
END $$;

-- Update tasks policies to allow supervisors more control over their team's tasks
-- Allow supervisors to view tasks assigned to their team
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Supervisors can view tasks of their team') THEN
        CREATE POLICY "Supervisors can view tasks of their team"
        ON public.tasks FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.supervisor_employees
            WHERE supervisor_id = auth.uid()
            AND employee_id IN (
              SELECT user_id FROM public.task_assignees WHERE task_id = tasks.id
            )
          )
        );
    END IF;
END $$;

-- Update creation and update policies for tasks to include supervisors
DROP POLICY IF EXISTS "Admins can create tasks" ON public.tasks;
CREATE POLICY "Admins and Supervisors can create tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'supervisor'));

DROP POLICY IF EXISTS "Admins can update tasks" ON public.tasks;
CREATE POLICY "Admins and Supervisors can update tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid()) OR 
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.supervisor_employees
    WHERE supervisor_id = auth.uid()
    AND employee_id IN (
      SELECT user_id FROM public.task_assignees WHERE task_id = tasks.id
    )
  )
);

-- Update task_assignees policies to allow supervisors to manage assignments for tasks they created
DROP POLICY IF EXISTS "Admins can manage task assignments" ON public.task_assignees;
CREATE POLICY "Admins and Supervisors can manage task assignments"
ON public.task_assignees FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.tasks WHERE id = task_id AND created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.supervisor_employees se
    JOIN public.task_assignees ta ON ta.user_id = se.employee_id
    WHERE se.supervisor_id = auth.uid() AND ta.task_id = task_assignees.task_id
  )
);

-- Enable realtime for supervisor_employees
ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisor_employees;
