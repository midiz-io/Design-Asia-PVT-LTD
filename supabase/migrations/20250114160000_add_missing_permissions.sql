-- Add new values to the resource_type enum
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'employee_tracking';
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'meet';
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'index';
