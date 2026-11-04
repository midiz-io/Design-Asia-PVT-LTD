-- Ensure all statuses are present and move existing 'pending' tasks to 'not_started'
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'not_started' BEFORE 'pending';

-- Move existing tasks from 'pending' to 'not_started' if they haven't been touched
-- (In this system, 'pending' was the default initial status)
UPDATE tasks SET status = 'not_started' WHERE status = 'pending';
