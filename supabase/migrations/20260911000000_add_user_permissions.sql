CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource resource_type NOT NULL,
  permission permission_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, resource)
);

-- Enable RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage user_permissions
CREATE POLICY "Admins can manage user_permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Replace the get_user_permissions function to merge role permissions and user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE (
  resource resource_type,
  permission permission_type
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.resource,
    COALESCE(up.permission, p.permission) as permission
  FROM permissions p
  INNER JOIN user_roles ur ON ur.role = p.role
  LEFT JOIN user_permissions up ON up.user_id = ur.user_id AND up.resource = p.resource
  WHERE ur.user_id = user_uuid;
END;
$$;

-- Create function to update user specific permissions
CREATE OR REPLACE FUNCTION update_user_permission(
  target_user_id UUID,
  target_resource resource_type,
  new_permission permission_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can update user permissions';
  END IF;
  
  -- Update or insert user permission
  INSERT INTO user_permissions (user_id, resource, permission)
  VALUES (target_user_id, target_resource, new_permission)
  ON CONFLICT (user_id, resource)
  DO UPDATE SET 
    permission = new_permission,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$;

-- Update has_permission to use the user_permissions as well
CREATE OR REPLACE FUNCTION has_permission(
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
BEGIN
  -- Get user's permission for the resource (override first, then fallback to role)
  SELECT COALESCE(up.permission, p.permission) INTO user_permission
  FROM permissions p
  INNER JOIN user_roles ur ON ur.role = p.role
  LEFT JOIN user_permissions up ON up.user_id = ur.user_id AND up.resource = p.resource
  WHERE ur.user_id = user_uuid AND p.resource = target_resource;
  
  -- If no permission found, return false
  IF user_permission IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check permission hierarchy
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
