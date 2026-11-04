-- Create functions for user management that can be called with elevated permissions

-- Function to create a user profile (can be called by admins)
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id_param UUID,
  full_name_param TEXT,
  email_param TEXT,
  phone_param TEXT DEFAULT NULL,
  department_param TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  retry_count INTEGER := 0;
  max_retries INTEGER := 5;
  user_exists BOOLEAN := FALSE;
BEGIN
  -- Retry mechanism to wait for user to be created in auth.users
  WHILE retry_count < max_retries AND NOT user_exists LOOP
    user_exists := EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_param);
    
    IF NOT user_exists THEN
      retry_count := retry_count + 1;
      -- Wait 500ms before retrying
      PERFORM pg_sleep(0.5);
    END IF;
  END LOOP;

  -- If user still doesn't exist after retries, raise exception
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User with ID % does not exist in auth.users after % retries', user_id_param, max_retries;
  END IF;

  -- Insert into profiles table or update if exists
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    department,
    created_at,
    updated_at
  ) VALUES (
    user_id_param,
    full_name_param,
    email_param,
    phone_param,
    department_param,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    department = EXCLUDED.department,
    updated_at = NOW();
END;
$$;

-- Function to assign user role (can be called by admins)
CREATE OR REPLACE FUNCTION public.assign_user_role(
  user_id_param UUID,
  role_param user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into user_roles table
  INSERT INTO public.user_roles (
    user_id,
    role,
    created_at
  ) VALUES (
    user_id_param,
    role_param,
    NOW()
  )
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role TO authenticated;
