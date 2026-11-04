-- Migration to fix the task auto-pause issue by allowing task creators to track time
-- Root cause: restrictive RLS on task_time_entries table

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Time entries readable by assigned users" ON public.task_time_entries;
DROP POLICY IF EXISTS "Time entries insert by assigned users" ON public.task_time_entries;
DROP POLICY IF EXISTS "Time entries update by owner" ON public.task_time_entries;

-- New SELECT policy: Assigned users, task creators, or admins
-- Also allowing users to see their own entries regardless of assignment
CREATE POLICY "Time entries readable by assigned users or creators" ON public.task_time_entries
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.task_assignees ta
    WHERE ta.task_id = task_time_entries.task_id AND ta.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_time_entries.task_id AND t.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- New INSERT policy: User can insert own entry if assigned or creator
CREATE POLICY "Time entries insert by assigned users or creators" ON public.task_time_entries
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND (
    EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = task_time_entries.task_id AND ta.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_time_entries.task_id AND t.created_by = auth.uid()
    )
  )
);

-- New UPDATE policy: Owner can update their own entries (needed to set ended_at)
CREATE POLICY "Time entries update by owner" ON public.task_time_entries
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
