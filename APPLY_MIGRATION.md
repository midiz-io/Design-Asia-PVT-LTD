# Apply Migration to Supabase

To fix the `new row violates row-level security policy for table "jobs"` error and allow Supervisors, Managers, and Employees (when granted `edit_only` access) to create and edit jobs, execute the following migration SQL in your Supabase SQL Editor.

## Instructions:

1. Go to your Supabase project dashboard: https://oywlestrprggkaxenxsq.supabase.co
2. Navigate to **SQL Editor** in the left sidebar.
3. Click **New Query**.
4. Copy and paste the SQL script below.
5. Click **Run** (or Press `Ctrl + Enter`).

---

## Migration SQL Script

```sql
-- Migration: Update RLS policies to support dynamic user permissions via has_permission

-- 1. Ensure has_permission supports Admin override and handles multi-role lookup cleanly with fallback
CREATE OR REPLACE FUNCTION public.has_permission(
  user_uuid UUID,
  target_resource resource_type,
  required_permission permission_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_permission permission_type;
  is_admin BOOLEAN;
BEGIN
  -- 1. Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'admin'
  ) INTO is_admin;
  
  IF is_admin THEN
    RETURN required_permission != 'no_access';
  END IF;

  -- 2. Get highest permission level for the user's role(s) on the resource
  SELECT p.permission INTO user_permission
  FROM public.permissions p
  INNER JOIN public.user_roles ur ON ur.role = p.role
  WHERE ur.user_id = user_uuid AND p.resource = target_resource
  ORDER BY 
    CASE p.permission
      WHEN 'edit_only' THEN 1
      WHEN 'view_only' THEN 2
      WHEN 'no_access' THEN 3
      ELSE 4
    END
  LIMIT 1;

  -- 3. Fallback: If no explicit permission row exists for jobs, managers and supervisors get edit_only by default
  IF user_permission IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = user_uuid AND role IN ('manager', 'supervisor')
    ) AND target_resource = 'jobs' THEN
      user_permission := 'edit_only';
    ELSE
      RETURN FALSE;
    END IF;
  END IF;

  -- 4. Evaluate required permission level
  CASE required_permission
    WHEN 'view_only' THEN
      RETURN user_permission IN ('view_only', 'edit_only');
    WHEN 'edit_only' THEN
      RETURN user_permission = 'edit_only';
    WHEN 'no_access' THEN
      RETURN user_permission = 'no_access';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;


-- 2. Update JOBS RLS Policies
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authorized users can manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authorized users can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authorized users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authorized users can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authorized users can delete jobs" ON public.jobs;

CREATE POLICY "Authorized users can view jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'jobs', 'view_only'));

CREATE POLICY "Authorized users can insert jobs" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'jobs', 'edit_only'));

CREATE POLICY "Authorized users can update jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'jobs', 'edit_only'))
  WITH CHECK (public.has_permission(auth.uid(), 'jobs', 'edit_only'));

CREATE POLICY "Authorized users can delete jobs" ON public.jobs
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'jobs', 'edit_only'));


-- 3. Update JOB_MATERIALS RLS Policies
ALTER TABLE public.job_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view job materials" ON public.job_materials;
DROP POLICY IF EXISTS "Admins can manage job materials" ON public.job_materials;
DROP POLICY IF EXISTS "Authorized users can view job materials" ON public.job_materials;
DROP POLICY IF EXISTS "Authorized users can insert job materials" ON public.job_materials;
DROP POLICY IF EXISTS "Authorized users can update job materials" ON public.job_materials;
DROP POLICY IF EXISTS "Authorized users can delete job materials" ON public.job_materials;

CREATE POLICY "Authorized users can view job materials" ON public.job_materials
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'jobs', 'view_only'));

CREATE POLICY "Authorized users can insert job materials" ON public.job_materials
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'jobs', 'edit_only'));

CREATE POLICY "Authorized users can update job materials" ON public.job_materials
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'jobs', 'edit_only'))
  WITH CHECK (public.has_permission(auth.uid(), 'jobs', 'edit_only'));

CREATE POLICY "Authorized users can delete job materials" ON public.job_materials
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'jobs', 'edit_only'));


-- 4. Update JOB_LABOR RLS Policies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_labor') THEN
    ALTER TABLE public.job_labor ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authorized users can view job labor" ON public.job_labor;
    DROP POLICY IF EXISTS "Authorized users can insert job labor" ON public.job_labor;
    DROP POLICY IF EXISTS "Authorized users can update job labor" ON public.job_labor;
    DROP POLICY IF EXISTS "Authorized users can delete job labor" ON public.job_labor;

    CREATE POLICY "Authorized users can view job labor" ON public.job_labor
      FOR SELECT TO authenticated
      USING (public.has_permission(auth.uid(), 'jobs', 'view_only'));

    CREATE POLICY "Authorized users can insert job labor" ON public.job_labor
      FOR INSERT TO authenticated
      WITH CHECK (public.has_permission(auth.uid(), 'jobs', 'edit_only'));

    CREATE POLICY "Authorized users can update job labor" ON public.job_labor
      FOR UPDATE TO authenticated
      USING (public.has_permission(auth.uid(), 'jobs', 'edit_only'))
      WITH CHECK (public.has_permission(auth.uid(), 'jobs', 'edit_only'));

    CREATE POLICY "Authorized users can delete job labor" ON public.job_labor
      FOR DELETE TO authenticated
      USING (public.has_permission(auth.uid(), 'jobs', 'edit_only'));
  END IF;
END $$;
```
