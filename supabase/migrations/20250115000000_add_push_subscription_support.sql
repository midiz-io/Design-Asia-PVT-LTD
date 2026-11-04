-- Add push subscription support to profiles table
-- This migration adds a column to store push notification subscriptions

-- Add push_subscription column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_push_subscription 
ON profiles USING GIN (push_subscription);

-- Add notification preferences
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "push_enabled": true,
  "email_enabled": true,
  "task_notifications": true,
  "job_notifications": true,
  "system_notifications": true,
  "emergency_notifications": true,
  "quiet_hours": {
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  }
}'::jsonb;

-- Create function to update push subscription
CREATE OR REPLACE FUNCTION update_push_subscription(
  user_id UUID,
  subscription_data JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET push_subscription = subscription_data
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get users with push subscriptions
CREATE OR REPLACE FUNCTION get_users_with_push_subscriptions()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  push_subscription JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.role,
    p.push_subscription
  FROM profiles p
  WHERE p.push_subscription IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get users by role with push subscriptions
CREATE OR REPLACE FUNCTION get_users_by_role_with_push_subscriptions(target_role TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  push_subscription JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.role,
    p.push_subscription
  FROM profiles p
  WHERE p.role = target_role 
    AND p.push_subscription IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_push_subscription(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_with_push_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_by_role_with_push_subscriptions(TEXT) TO authenticated;

-- Add RLS policies for push subscription data
CREATE POLICY "Users can update their own push subscription" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own push subscription" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Add notification settings table for more granular control
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON notification_settings(notification_type);

-- Add RLS policies for notification settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification settings" ON notification_settings
  FOR ALL USING (auth.uid() = user_id);

-- Create function to get notification settings for a user
CREATE OR REPLACE FUNCTION get_user_notification_settings(target_user_id UUID)
RETURNS TABLE (
  notification_type TEXT,
  enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ns.notification_type,
    ns.enabled
  FROM notification_settings ns
  WHERE ns.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_notification_settings(UUID) TO authenticated;

-- Insert default notification types
INSERT INTO notification_settings (user_id, notification_type, enabled)
SELECT 
  p.id,
  unnest(ARRAY[
    'task_assigned',
    'task_completed',
    'task_overdue',
    'job_created',
    'job_updated',
    'system_announcement',
    'emergency_alert',
    'user_mention',
    'approval_required',
    'approval_completed'
  ]),
  true
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM notification_settings ns 
  WHERE ns.user_id = p.id
)
ON CONFLICT (user_id, notification_type) DO NOTHING;
