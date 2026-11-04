-- Fix tasks INSERT RLS policy to allow managers and supervisors to create tasks
-- This fixes the "new row violates row-level security policy for table 'tasks'" error

-- Drop the old restrictive policy that only allowed admins
DROP POLICY IF EXISTS "Admins can create tasks" ON public.tasks;

-- Create new policy allowing all authenticated users to create tasks
CREATE POLICY "All authenticated users can create tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager', 'supervisor', 'employee')
  )
);

-- Also ensure the task creator is set correctly
-- Users creating tasks must set themselves as the creator
CREATE POLICY "Task creator must be current user"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());
