-- Migration: Add admin role and user management features
-- Date: 2025-07-09
-- Description: Add admin role column and improve user management

-- Add admin role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for admin role
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Add a few more useful columns for admin management
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);

-- Update the user_profiles view to include new fields
DROP VIEW IF EXISTS user_profiles;
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    id,
    phone,
    email,
    name,
    is_verified,
    is_admin,
    last_login_at,
    login_count,
    created_at,
    updated_at
FROM users
WHERE is_active = TRUE;

-- Create admin activity log table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for admin activity logs
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_user_id ON admin_activity_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_user_id ON admin_activity_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_activity_logs(action);

-- Create function to log admin activities
CREATE OR REPLACE FUNCTION log_admin_activity(
    p_admin_user_id UUID,
    p_action VARCHAR,
    p_target_user_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO admin_activity_logs (
        admin_user_id, action, target_user_id, details, ip_address, user_agent
    )
    VALUES (
        p_admin_user_id, p_action, p_target_user_id, p_details, p_ip_address, p_user_agent
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;
