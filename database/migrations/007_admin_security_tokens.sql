-- Migration: Create admin access tokens table
-- Date: 2025-08-05
-- Description: Create secure admin access token system with time-based expiry

-- Create admin_access_tokens table for secure admin access
CREATE TABLE IF NOT EXISTS admin_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(255) NOT NULL UNIQUE,
    admin_code VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by_ip INET,
    used_by_user_agent TEXT,
    created_by_terminal BOOLEAN DEFAULT TRUE,
    access_granted BOOLEAN DEFAULT FALSE,
    security_notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_tokens_token ON admin_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_admin_tokens_expires ON admin_access_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_tokens_used ON admin_access_tokens(used);
CREATE INDEX IF NOT EXISTS idx_admin_tokens_created ON admin_access_tokens(created_at);

-- Create function to automatically clean expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_admin_tokens()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete tokens expired more than 24 hours ago
    DELETE FROM admin_access_tokens 
    WHERE expires_at < NOW() - INTERVAL '24 hours';
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger to cleanup on new token creation
CREATE TRIGGER cleanup_expired_admin_tokens_trigger
    AFTER INSERT ON admin_access_tokens
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_expired_admin_tokens();

-- Add admin session tracking table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_id UUID REFERENCES admin_access_tokens(id) ON DELETE SET NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason TEXT
);

-- Create indexes for admin sessions
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_activity ON admin_sessions(last_activity);

-- Create function to update last activity
CREATE OR REPLACE FUNCTION update_admin_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for admin session activity updates
CREATE TRIGGER update_admin_session_activity_trigger
    BEFORE UPDATE ON admin_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_session_activity();

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES admin_sessions(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for admin activity log
CREATE INDEX IF NOT EXISTS idx_admin_log_user ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_session ON admin_activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_action ON admin_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_log_created ON admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_log_success ON admin_activity_log(success);
CREATE INDEX IF NOT EXISTS idx_admin_log_ip ON admin_activity_log(ip_address);

-- Create GIN index for details JSONB field
CREATE INDEX IF NOT EXISTS idx_admin_log_details_gin ON admin_activity_log USING GIN (details);

-- Add comments for documentation
COMMENT ON TABLE admin_access_tokens IS 'Secure time-limited admin access tokens generated from server terminal';
COMMENT ON TABLE admin_sessions IS 'Active admin sessions with tracking and automatic expiry';
COMMENT ON TABLE admin_activity_log IS 'Comprehensive logging of all admin actions for security auditing';

COMMENT ON COLUMN admin_access_tokens.token IS 'Cryptographically secure access token';
COMMENT ON COLUMN admin_access_tokens.admin_code IS 'Time-based verification code';
COMMENT ON COLUMN admin_access_tokens.used IS 'Whether token has been used (one-time use)';
COMMENT ON COLUMN admin_access_tokens.created_by_terminal IS 'Whether token was created from server terminal';

COMMENT ON COLUMN admin_sessions.session_token IS 'Secure session token for authenticated admin';
COMMENT ON COLUMN admin_sessions.last_activity IS 'Timestamp of last admin activity';
COMMENT ON COLUMN admin_sessions.is_active IS 'Whether session is currently active';

COMMENT ON COLUMN admin_activity_log.action IS 'Type of admin action performed';
COMMENT ON COLUMN admin_activity_log.resource IS 'Resource type affected by action';
COMMENT ON COLUMN admin_activity_log.details IS 'Additional action details in JSON format';

-- Create view for admin security overview
CREATE OR REPLACE VIEW admin_security_overview AS
SELECT 
    -- Token statistics
    (SELECT COUNT(*) FROM admin_access_tokens WHERE expires_at > NOW()) as active_tokens,
    (SELECT COUNT(*) FROM admin_access_tokens WHERE used = true) as used_tokens,
    (SELECT COUNT(*) FROM admin_access_tokens WHERE expires_at < NOW()) as expired_tokens,
    
    -- Session statistics
    (SELECT COUNT(*) FROM admin_sessions WHERE is_active = true AND expires_at > NOW()) as active_sessions,
    (SELECT COUNT(DISTINCT admin_user_id) FROM admin_sessions WHERE is_active = true) as active_admins,
    
    -- Recent activity
    (SELECT COUNT(*) FROM admin_activity_log WHERE created_at > NOW() - INTERVAL '24 hours') as actions_last_24h,
    (SELECT COUNT(*) FROM admin_activity_log WHERE success = false AND created_at > NOW() - INTERVAL '24 hours') as failed_actions_24h,
    
    -- Last token generation
    (SELECT MAX(created_at) FROM admin_access_tokens) as last_token_generated,
    
    -- Security metrics
    (SELECT COUNT(DISTINCT ip_address) FROM admin_activity_log WHERE created_at > NOW() - INTERVAL '7 days') as unique_ips_7d;

-- Create function to revoke admin session
CREATE OR REPLACE FUNCTION revoke_admin_session(session_id_param UUID, reason_param TEXT DEFAULT 'Manual revocation')
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE admin_sessions 
    SET 
        is_active = false,
        revoked_at = CURRENT_TIMESTAMP,
        revoked_reason = reason_param
    WHERE id = session_id_param AND is_active = true;
    
    RETURN FOUND;
END;
$$ language 'plpgsql';

-- Create function to revoke all admin sessions for a user
CREATE OR REPLACE FUNCTION revoke_all_user_admin_sessions(user_id_param UUID, reason_param TEXT DEFAULT 'Security revocation')
RETURNS INTEGER AS $$
DECLARE
    revoked_count INTEGER;
BEGIN
    UPDATE admin_sessions 
    SET 
        is_active = false,
        revoked_at = CURRENT_TIMESTAMP,
        revoked_reason = reason_param
    WHERE admin_user_id = user_id_param AND is_active = true;
    
    GET DIAGNOSTICS revoked_count = ROW_COUNT;
    RETURN revoked_count;
END;
$$ language 'plpgsql';

-- Create scheduled cleanup function
CREATE OR REPLACE FUNCTION cleanup_admin_security_data()
RETURNS VOID AS $$
BEGIN
    -- Remove expired tokens older than 7 days
    DELETE FROM admin_access_tokens 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    -- Remove expired sessions older than 30 days
    DELETE FROM admin_sessions 
    WHERE expires_at < NOW() - INTERVAL '30 days';
    
    -- Archive old activity logs (keep 90 days)
    DELETE FROM admin_activity_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Log cleanup action
    INSERT INTO admin_activity_log (action, details, success)
    VALUES ('SYSTEM_CLEANUP', '{"type": "admin_security_cleanup"}', true);
END;
$$ language 'plpgsql';
