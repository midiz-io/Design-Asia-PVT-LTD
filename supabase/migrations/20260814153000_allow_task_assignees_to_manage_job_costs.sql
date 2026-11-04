-- Allow task assignees to manage job materials
DO $$ BEGIN
  DROP POLICY IF EXISTS "Assignees can manage job materials" ON public.job_materials;
  CREATE POLICY "Assignees can manage job materials" ON public.job_materials
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.task_assignees ta ON t.id = ta.task_id
      WHERE t.job_id = job_materials.job_id AND ta.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.task_assignees ta ON t.id = ta.task_id
      WHERE t.job_id = job_materials.job_id AND ta.user_id = auth.uid()
    )
  );
EXCEPTION WHEN others THEN NULL; END $$;

-- Allow task assignees to manage job labor
DO $$ BEGIN
  DROP POLICY IF EXISTS "Assignees can manage job labor" ON public.job_labor;
  CREATE POLICY "Assignees can manage job labor" ON public.job_labor
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.task_assignees ta ON t.id = ta.task_id
      WHERE t.job_id = job_labor.job_id AND ta.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.task_assignees ta ON t.id = ta.task_id
      WHERE t.job_id = job_labor.job_id AND ta.user_id = auth.uid()
    )
  );
EXCEPTION WHEN others THEN NULL; END $$;
