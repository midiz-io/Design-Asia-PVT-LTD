-- Add job_report to resource_type enum
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'job_report';

COMMIT;

-- Insert default permissions for the new resource
INSERT INTO permissions (role, resource, permission) VALUES
('admin', 'job_report', 'edit_only'),
('manager', 'job_report', 'view_only'),
('supervisor', 'job_report', 'no_access'),
('employee', 'job_report', 'no_access')
ON CONFLICT (role, resource) DO NOTHING;
