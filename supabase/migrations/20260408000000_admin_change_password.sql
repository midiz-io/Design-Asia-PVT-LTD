-- Note: Supabase provides pgcrypto in the "extensions" schema by default.

-- Function to allow admins to reset another user's password
CREATE OR REPLACE FUNCTION public.admin_update_user_password(
  target_user_id_param UUID,
  new_password_param TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can change user passwords';
  END IF;

  -- Update the auth.users table encrypted_password
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password_param, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id_param;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_update_user_password(UUID, TEXT) TO authenticated;
