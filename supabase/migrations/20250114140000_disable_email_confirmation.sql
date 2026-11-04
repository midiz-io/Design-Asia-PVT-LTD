-- Disable email confirmation requirement for admin-created users
-- This allows admins to create users without requiring email verification

-- Note: This setting should be configured in the Supabase Dashboard
-- Go to Authentication > Settings > Email Auth and disable "Enable email confirmations"

-- Alternative: Create a function to manually confirm users
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user's email_confirmed_at timestamp
  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE id = user_id_param;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.confirm_user_email TO authenticated;
