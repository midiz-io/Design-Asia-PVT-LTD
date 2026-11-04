-- Fix task_assignees RLS policy to allow supervisors to manage task assignments
-- This fixes the "new row violates row-level security policy for table 'task_assignees'" error

-- Drop the old restrictive policy that only allowed admins
DROP POLICY IF EXISTS "Admins can manage task assignments" ON public.task_assignees;

-- Create new policy allowing admins, managers, and supervisors to manage task assignments
CREATE POLICY "Supervisors and above can manage task assignments"
ON public.task_assignees FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager', 'supervisor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager', 'supervisor')
  )
);
