-- Fix RLS policies for tasks and task_assignees to allow supervisors to see their team's data

-- 1. Update task_assignees SELECT policy
DROP POLICY IF EXISTS "Users can view task assignments" ON public.task_assignees;
DROP POLICY IF EXISTS "Users can view relevant task assignments" ON public.task_assignees;

CREATE POLICY "Users can view relevant task assignments"
ON public.task_assignees FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  public.is_admin(auth.uid()) OR
  public.has_role(auth.uid(), 'manager') OR
  EXISTS (
    SELECT 1 FROM public.tasks WHERE id = task_id AND created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.supervisor_employees
    WHERE supervisor_id = auth.uid() AND employee_id = task_assignees.user_id
  )
);

-- 2. Update tasks SELECT policy to be more inclusive for supervisors and managers
DROP POLICY IF EXISTS "Users can view assigned tasks or created tasks" ON public.tasks;
DROP POLICY IF EXISTS "Supervisors can view tasks of their team" ON public.tasks;
DROP POLICY IF EXISTS "Users can view relevant tasks" ON public.tasks;

CREATE POLICY "Users can view relevant tasks"
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
  EXISTS (
    SELECT 1 FROM public.supervisor_employees
    WHERE supervisor_id = auth.uid()
    AND employee_id IN (
      SELECT user_id FROM public.task_assignees WHERE task_id = tasks.id
    )
  )
);

-- 3. Ensure supervisor_employees is readable by the employees themselves too
DROP POLICY IF EXISTS "Employees can view who their supervisor is" ON public.supervisor_employees;
CREATE POLICY "Employees and Supervisors can view team mappings"
ON public.supervisor_employees FOR SELECT
TO authenticated
USING (auth.uid() = employee_id OR auth.uid() = supervisor_id OR public.is_admin(auth.uid()));
