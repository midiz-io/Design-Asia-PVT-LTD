-- Insert missing permission resources
INSERT INTO permissions (role, resource, permission) VALUES
  -- Administrator permissions (full access to all)
  ('admin', 'employee_tracking', 'edit_only'),
  ('admin', 'meet', 'edit_only'),
  ('admin', 'index', 'edit_only'),
  
  -- Manager permissions
  ('manager', 'employee_tracking', 'edit_only'),
  ('manager', 'meet', 'edit_only'),
  ('manager', 'index', 'view_only'),
  
  -- Supervisor permissions
  ('supervisor', 'employee_tracking', 'view_only'),
  ('supervisor', 'meet', 'edit_only'),
  ('supervisor', 'index', 'view_only'),
  
  -- Employee permissions
  ('employee', 'employee_tracking', 'no_access'),
  ('employee', 'meet', 'edit_only'),
  ('employee', 'index', 'view_only')
ON CONFLICT (role, resource) DO NOTHING;
