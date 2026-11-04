-- Update supervisor_employees policies to restrict management to Admins only
-- Supervisors and Employees can still view their mappings

DROP POLICY IF EXISTS "Supervisors can manage their own team" ON public.supervisor_employees;
DROP POLICY IF EXISTS "Employees and Supervisors can view team mappings" ON public.supervisor_employees;
DROP POLICY IF EXISTS "Only Admins can manage supervisor teams" ON public.supervisor_employees;
DROP POLICY IF EXISTS "Users can view relevant team mappings" ON public.supervisor_employees;

-- Policy for Admin management (Full access)
CREATE POLICY "Only Admins can manage supervisor teams"
ON public.supervisor_employees FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Policy for viewing mappings (Admins, Supervisors, and the Employees themselves)
CREATE POLICY "Users can view relevant team mappings"
ON public.supervisor_employees FOR SELECT
TO authenticated
USING (
    public.is_admin(auth.uid()) OR 
    auth.uid() = supervisor_id OR 
    auth.uid() = employee_id
);
