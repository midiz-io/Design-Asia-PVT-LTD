-- Update existing profiles if they exist, or skip if users don't exist yet
-- Note: Test users should be created through Supabase Auth UI in the dashboard

-- Ensure admin role exists for first user if profile exists
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::user_role
FROM profiles
WHERE email = 'admin@taskvision.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create some sample petty cash categories
INSERT INTO petty_cash_categories (name, description, budget_limit, is_active) VALUES
  ('Transportation', 'Travel and transportation expenses', 5000.00, true),
  ('Office Supplies', 'Office supplies and materials', 2000.00, true),
  ('Meals', 'Client meals and team lunches', 3000.00, true),
  ('Maintenance', 'Equipment and facility maintenance', 10000.00, true)
ON CONFLICT DO NOTHING;

-- Create some sample inventory locations
INSERT INTO inventory_locations (name, description, location_type, address, latitude, longitude, capacity) VALUES
  ('Main Warehouse', 'Primary storage facility', 'warehouse', '123 Industrial Park', 40.7128, -74.0060, 10000),
  ('Downtown Office', 'City center office location', 'office', '456 Business Ave', 40.7580, -73.9855, 500),
  ('Service Van #1', 'Mobile inventory unit', 'vehicle', 'Mobile', NULL, NULL, 100)
ON CONFLICT DO NOTHING;

-- Create sample geofences (using first admin user as creator, or skip if no admin)
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT user_id INTO admin_user_id FROM user_roles WHERE role = 'admin' LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO geofences (name, description, latitude, longitude, radius_meters, created_by, is_active) VALUES
      ('Main Warehouse Zone', 'Geofence around main warehouse', 40.7128, -74.0060, 500, admin_user_id, true),
      ('Downtown Office Zone', 'Geofence around downtown office', 40.7580, -73.9855, 300, admin_user_id, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;