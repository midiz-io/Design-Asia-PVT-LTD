-- Fix infinite recursion in RLS policies for tasks and task_assignees

-- 1. Drop old problematic policies first
DROP POLICY IF EXISTS "Admins and Supervisors can manage task assignments" ON public.task_assignees;
DROP POLICY IF EXISTS "Users can view relevant task assignments" ON public.task_assignees;
DROP POLICY IF EXISTS "Users can view task assignments" ON public.task_assignees;

DROP POLICY IF EXISTS "Users can view relevant tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks or created tasks" ON public.tasks;
DROP POLICY IF EXISTS "Supervisors can view tasks of their team" ON public.tasks;

-- 2. Create security definer functions to break recursion chain
-- These functions run with owner privileges and bypass RLS on the tables they query

CREATE OR REPLACE FUNCTION public.check_is_task_creator(_task_id UUID, _user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE id = _task_id AND created_by = _user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_is_supervisor_of_assignee(_task_id UUID, _supervisor_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.task_assignees ta
    JOIN public.supervisor_employees se ON ta.user_id = se.employee_id
    WHERE ta.task_id = _task_id AND se.supervisor_id = _supervisor_id
  );
END;
$$;

-- 3. Update task_assignees policy to be safe from recursion
-- Using check_is_task_creator() instead of a direct SELECT on tasks table
CREATE POLICY "Task assignees access policy"
ON public.task_assignees FOR ALL
TO authenticated
USING (
  auth.uid() = user_id OR
  public.is_admin(auth.uid()) OR
  public.has_role(auth.uid(), 'manager') OR
  public.check_is_task_creator(task_id, auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.supervisor_employees
    WHERE supervisor_id = auth.uid() AND employee_id = task_assignees.user_id
  )
);

-- 4. Update tasks SELECT policy to be safe from recursion
-- Using check_is_supervisor_of_assignee() instead of a complex join that triggers RLS
CREATE POLICY "Tasks selection policy"
ON public.tasks FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_id = tasks.id AND user_id = auth.uid()
  ) OR
  public.is_admin(auth.uid()) OR
  public.has_role(auth.uid(), 'manager') OR
  public.check_is_supervisor_of_assignee(id, auth.uid())
);
