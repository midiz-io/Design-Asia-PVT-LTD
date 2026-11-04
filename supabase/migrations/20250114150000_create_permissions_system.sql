-- Create permission types enum
-- 'no_access': User cannot access the page at all - will see "No Access" message
-- 'view_only': User can view everything but cannot make any changes  
-- 'edit_only': User can both view and edit (create, update, delete)
CREATE TYPE permission_type AS ENUM ('view_only', 'edit_only', 'no_access');

-- Create resources enum for different system features
CREATE TYPE resource_type AS ENUM (
  'dashboard',
  'tasks',
  'jobs', 
  'chat',
  'petty_cash',
  'locations',
  'inventory',
  'geofences',
  'users',
  'reports',
  'permissions'
);

-- Create roles enum (if not already exists)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'supervisor', 'employee');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  resource resource_type NOT NULL,
  permission permission_type NOT NULL DEFAULT 'view_only',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, resource)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_role_resource ON permissions(role, resource);

-- Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ BEGIN
    -- Admins can view and manage all permissions
    CREATE POLICY "Admins can manage permissions" ON permissions
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM user_roles 
                WHERE user_id = auth.uid() 
                AND role = 'admin'
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Insert default permissions for each role and resource
INSERT INTO permissions (role, resource, permission) VALUES
-- Admin permissions (full access to everything)
('admin', 'dashboard', 'edit_only'),
('admin', 'tasks', 'edit_only'),
('admin', 'jobs', 'edit_only'),
('admin', 'chat', 'edit_only'),
('admin', 'petty_cash', 'edit_only'),
('admin', 'locations', 'edit_only'),
('admin', 'inventory', 'edit_only'),
('admin', 'geofences', 'edit_only'),
('admin', 'users', 'edit_only'),
('admin', 'reports', 'edit_only'),
('admin', 'permissions', 'edit_only'),

-- Manager permissions
('manager', 'dashboard', 'view_only'),
('manager', 'tasks', 'edit_only'),
('manager', 'jobs', 'edit_only'),
('manager', 'chat', 'view_only'),
('manager', 'petty_cash', 'edit_only'),
('manager', 'locations', 'view_only'),
('manager', 'inventory', 'view_only'),
('manager', 'geofences', 'no_access'),
('manager', 'users', 'no_access'),
('manager', 'reports', 'view_only'),
('manager', 'permissions', 'no_access'),

-- Supervisor permissions
('supervisor', 'dashboard', 'view_only'),
('supervisor', 'tasks', 'edit_only'),
('supervisor', 'jobs', 'edit_only'),
('supervisor', 'chat', 'view_only'),
('supervisor', 'petty_cash', 'view_only'),
('supervisor', 'locations', 'view_only'),
('supervisor', 'inventory', 'view_only'),
('supervisor', 'geofences', 'view_only'),
('supervisor', 'users', 'no_access'),
('supervisor', 'reports', 'no_access'),
('supervisor', 'permissions', 'no_access'),

-- Employee permissions
('employee', 'dashboard', 'view_only'),
('employee', 'tasks', 'view_only'),
('employee', 'jobs', 'view_only'),
('employee', 'chat', 'view_only'),
('employee', 'petty_cash', 'no_access'),
('employee', 'locations', 'view_only'),
('employee', 'inventory', 'no_access'),
('employee', 'geofences', 'no_access'),
('employee', 'users', 'no_access'),
('employee', 'reports', 'no_access'),
('employee', 'permissions', 'no_access')

ON CONFLICT (role, resource) DO NOTHING;

-- Create function to get user permissions
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
  SELECT p.resource, p.permission
  FROM permissions p
  INNER JOIN user_roles ur ON ur.role = p.role
  WHERE ur.user_id = user_uuid;
END;
$$;

-- Create function to update permissions (admin only)
CREATE OR REPLACE FUNCTION update_permission(
  target_role user_role,
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
    RAISE EXCEPTION 'Only admins can update permissions';
  END IF;
  
  -- Update or insert permission
  INSERT INTO permissions (role, resource, permission)
  VALUES (target_role, target_resource, new_permission)
  ON CONFLICT (role, resource)
  DO UPDATE SET 
    permission = new_permission,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$;

-- Create function to check if user has permission
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
  -- Get user's permission for the resource
  SELECT p.permission INTO user_permission
  FROM permissions p
  INNER JOIN user_roles ur ON ur.role = p.role
  WHERE ur.user_id = user_uuid AND p.resource = target_resource;
  
  -- If no permission found, return false
  IF user_permission IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check permission hierarchy
  -- no_access < view_only < edit_only
  -- - no_access: Cannot access at all
  -- - view_only: Can view but not edit
  -- - edit_only: Can both view and edit
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
