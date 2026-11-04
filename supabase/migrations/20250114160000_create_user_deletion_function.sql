-- Create a comprehensive user deletion function
CREATE OR REPLACE FUNCTION delete_user_completely(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_param) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found',
      'deleted_count', 0
    );
  END IF;

  -- Delete from user_roles table
  DELETE FROM user_roles WHERE user_id = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete from profiles table
  DELETE FROM profiles WHERE id = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete from employee_locations table
  DELETE FROM employee_locations WHERE user_id = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete from task_assignees table
  DELETE FROM task_assignees WHERE user_id = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete tasks created by the user
  DELETE FROM tasks WHERE created_by = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete from petty_cash_transactions table
  DELETE FROM petty_cash_transactions WHERE employee_id = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete from jobs table
  DELETE FROM jobs WHERE created_by = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete from geofences table
  DELETE FROM geofences WHERE created_by = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete from chat_messages table
  DELETE FROM chat_messages WHERE sender_id = user_id_param OR receiver_id = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete from task_attachments table
  DELETE FROM task_attachments WHERE uploaded_by = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete from petty_cash_budgets table
  DELETE FROM petty_cash_budgets WHERE employee_id = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Update petty_cash_transactions to remove approver reference
  UPDATE petty_cash_transactions SET approved_by = NULL WHERE approved_by = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Update stock_movements to remove employee reference
  UPDATE stock_movements SET employee_id = NULL WHERE employee_id = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Update inventory_alerts to remove resolver reference
  UPDATE inventory_alerts SET resolved_by = NULL WHERE resolved_by = user_id_param;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;

  -- Return success result
  RETURN json_build_object(
    'success', true,
    'message', 'User and related data deleted successfully',
    'deleted_count', deleted_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error deleting user: ' || SQLERRM,
      'deleted_count', deleted_count
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_user_completely(UUID) IS 'Completely deletes a user and all their related data from the database';
