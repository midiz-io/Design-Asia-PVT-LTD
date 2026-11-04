-- Remove email confirmation requirement completely
-- This migration ensures no email confirmation is required for any user registration

-- Create function to auto-confirm user emails immediately upon creation
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically confirm the user's email when they are created
  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-confirm emails on user creation
DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;
CREATE TRIGGER auto_confirm_email_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user_email();

-- Update the existing handle_new_user function to ensure email is confirmed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure email is confirmed immediately
  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  
  -- Assign default employee role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

-- Create function for admins to disable/enable user accounts
CREATE OR REPLACE FUNCTION public.admin_disable_user(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can disable user accounts';
  END IF;
  
  -- Disable the user account by setting banned_until to a future date
  UPDATE auth.users 
  SET banned_until = '2099-12-31 23:59:59+00'
  WHERE id = user_id_param;
  
  -- Log the action
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    user_id_param,
    'warning',
    'Account Disabled',
    'Your account has been disabled by an administrator. Please contact support for assistance.'
  );
END;
$$;

-- Create function for admins to enable user accounts
CREATE OR REPLACE FUNCTION public.admin_enable_user(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can enable user accounts';
  END IF;
  
  -- Enable the user account by clearing the banned_until field
  UPDATE auth.users 
  SET banned_until = NULL
  WHERE id = user_id_param;
  
  -- Log the action
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    user_id_param,
    'success',
    'Account Enabled',
    'Your account has been enabled by an administrator. You can now access the system.'
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_disable_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_enable_user TO authenticated;

-- Create function to get user account status
CREATE OR REPLACE FUNCTION public.get_user_account_status(user_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  is_active BOOLEAN,
  is_banned BOOLEAN,
  email_confirmed BOOLEAN,
  created_at TIMESTAMPTZ,
  last_sign_in TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can view user account status';
  END IF;
  
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    p.full_name,
    CASE WHEN au.banned_until IS NULL OR au.banned_until < NOW() THEN true ELSE false END as is_active,
    CASE WHEN au.banned_until IS NOT NULL AND au.banned_until > NOW() THEN true ELSE false END as is_banned,
    CASE WHEN au.email_confirmed_at IS NOT NULL THEN true ELSE false END as email_confirmed,
    au.created_at,
    au.last_sign_in_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE au.id = user_id_param;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_account_status TO authenticated;
