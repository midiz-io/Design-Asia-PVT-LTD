-- Migration to add 'not_started' status to task_status enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'not_started' BEFORE 'pending';
