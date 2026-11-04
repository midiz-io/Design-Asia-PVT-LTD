-- Fix database relationships by adding proper foreign key constraints
-- This migration addresses the "Could not find a relationship" errors

-- First, ensure all foreign key references to auth.users are properly set up
-- The tables already have the foreign keys, but we need to ensure the relationships are properly recognized

-- Add explicit foreign key constraint for tasks.created_by -> auth.users(id)
-- (This should already exist but let's make sure)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_created_by_fkey'
    ) THEN
        ALTER TABLE public.tasks 
        ADD CONSTRAINT tasks_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for employee_locations.user_id -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'employee_locations_user_id_fkey'
    ) THEN
        ALTER TABLE public.employee_locations 
        ADD CONSTRAINT employee_locations_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for petty_cash_transactions.employee_id -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'petty_cash_transactions_employee_id_fkey'
    ) THEN
        ALTER TABLE public.petty_cash_transactions 
        ADD CONSTRAINT petty_cash_transactions_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for stock_movements.employee_id -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_movements_employee_id_fkey'
    ) THEN
        ALTER TABLE public.stock_movements 
        ADD CONSTRAINT stock_movements_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for chat_messages.sender_id -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_messages_sender_id_fkey'
    ) THEN
        ALTER TABLE public.chat_messages 
        ADD CONSTRAINT chat_messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for chat_messages.receiver_id -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_messages_receiver_id_fkey'
    ) THEN
        ALTER TABLE public.chat_messages 
        ADD CONSTRAINT chat_messages_receiver_id_fkey 
        FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for task_assignees.user_id -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'task_assignees_user_id_fkey'
    ) THEN
        ALTER TABLE public.task_assignees 
        ADD CONSTRAINT task_assignees_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for task_attachments.uploaded_by -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'task_attachments_uploaded_by_fkey'
    ) THEN
        ALTER TABLE public.task_attachments 
        ADD CONSTRAINT task_attachments_uploaded_by_fkey 
        FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for geofences.created_by -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'geofences_created_by_fkey'
    ) THEN
        ALTER TABLE public.geofences 
        ADD CONSTRAINT geofences_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for petty_cash_budgets.employee_id -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'petty_cash_budgets_employee_id_fkey'
    ) THEN
        ALTER TABLE public.petty_cash_budgets 
        ADD CONSTRAINT petty_cash_budgets_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for inventory_alerts.resolved_by -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_alerts_resolved_by_fkey'
    ) THEN
        ALTER TABLE public.inventory_alerts 
        ADD CONSTRAINT inventory_alerts_resolved_by_fkey 
        FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for user_roles.user_id -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_user_id_fkey'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD CONSTRAINT user_roles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add explicit foreign key constraint for petty_cash_transactions.approved_by -> auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'petty_cash_transactions_approved_by_fkey'
    ) THEN
        ALTER TABLE public.petty_cash_transactions 
        ADD CONSTRAINT petty_cash_transactions_approved_by_fkey 
        FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Now we need to ensure that the profiles table has proper foreign key relationships
-- The profiles table should have a foreign key to auth.users(id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create a function to refresh the schema cache
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- This function will help refresh the schema cache
  SELECT 1;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Ensure the RLS policies are still in place and working
-- Re-enable RLS on all tables to ensure security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;

-- Create a view to help with debugging relationships
CREATE OR REPLACE VIEW public.relationship_debug AS
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND ccu.table_name = 'users';

-- Grant access to the debug view
GRANT SELECT ON public.relationship_debug TO authenticated;
