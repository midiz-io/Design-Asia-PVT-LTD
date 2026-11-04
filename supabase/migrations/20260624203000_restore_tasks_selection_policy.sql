-- Restore tasks selection policy to only allow authorized roles to view relevant tasks
-- Admin & Manager: Can view all tasks
-- Supervisor: Can view tasks they created or tasks assigned to their team members
-- Employee: Can view tasks they created or tasks assigned to them

DROP POLICY IF EXISTS "Tasks selection policy" ON public.tasks;

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
