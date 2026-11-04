-- Create task_extension_requests table
CREATE TABLE IF NOT EXISTS public.task_extension_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_role TEXT NOT NULL CHECK (requester_role IN ('employee', 'supervisor', 'manager')),
  request_type TEXT NOT NULL CHECK (request_type IN ('overdue', 'incomplete')),
  reason TEXT NOT NULL,
  proposed_due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.task_extension_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own requests
CREATE POLICY "Users can create extension requests"
  ON public.task_extension_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Allow users to read their own requests
CREATE POLICY "Users can view their own extension requests"
  ON public.task_extension_requests
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

-- Allow admins to read all extension requests
CREATE POLICY "Admins can view all extension requests"
  ON public.task_extension_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update (approve/reject) extension requests
CREATE POLICY "Admins can update extension requests"
  ON public.task_extension_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.handle_extension_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_extension_requests_updated_at
  BEFORE UPDATE ON public.task_extension_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_extension_request_updated_at();
