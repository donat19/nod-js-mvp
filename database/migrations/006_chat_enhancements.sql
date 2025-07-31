-- Migration: Enhanced chat system for future features
-- Date: 2025-07-30
-- Description: Add advanced structures for future chat enhancements

-- Create chat_rooms table for organized chat categories
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    room_type VARCHAR(20) DEFAULT 'direct', -- 'direct', 'group', 'public', 'support'
    max_participants INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create message_attachments table for file sharing
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(50), -- 'image', 'document', 'video', 'audio'
    mime_type VARCHAR(100),
    thumbnail_path VARCHAR(500), -- For image/video thumbnails
    is_processed BOOLEAN DEFAULT FALSE,
    upload_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create message_reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL, -- 'like', 'love', 'laugh', 'wow', 'sad', 'angry'
    emoji VARCHAR(10), -- Store actual emoji character
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one reaction per user per message per type
    UNIQUE(message_id, user_id, reaction_type)
);

-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS typing_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one typing indicator per user per conversation
    UNIQUE(conversation_id, user_id)
);

-- Create message_threads table for reply threads
CREATE TABLE IF NOT EXISTS message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    reply_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    thread_depth INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent circular references
    UNIQUE(parent_message_id, reply_message_id)
);

-- Create conversation_settings table for user preferences
CREATE TABLE IF NOT EXISTS conversation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    is_muted BOOLEAN DEFAULT FALSE,
    muted_until TIMESTAMP WITH TIME ZONE,
    is_pinned BOOLEAN DEFAULT FALSE,
    custom_name VARCHAR(100), -- User can rename conversation
    theme VARCHAR(20) DEFAULT 'default', -- 'default', 'dark', 'blue', etc.
    settings_json JSONB, -- For future custom settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- One setting record per user per conversation
    UNIQUE(conversation_id, user_id)
);

-- Create message_delivery_status table for delivery tracking
CREATE TABLE IF NOT EXISTS message_delivery_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- One delivery status per user per message
    UNIQUE(message_id, user_id)
);

-- Create scheduled_messages table for delayed sending
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create conversation_templates table for quick replies
CREATE TABLE IF NOT EXISTS conversation_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    template_text TEXT NOT NULL,
    category VARCHAR(50), -- 'greeting', 'pricing', 'availability', 'custom'
    is_global BOOLEAN DEFAULT FALSE, -- System-wide templates
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_analytics table for insights
CREATE TABLE IF NOT EXISTS chat_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'message_sent', 'message_read', 'conversation_started', etc.
    event_data JSONB,
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create message_search_index table for full-text search
CREATE TABLE IF NOT EXISTS message_search_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    search_vector tsvector,
    content_hash VARCHAR(64), -- For deduplication
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance optimization

-- Chat rooms indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_active ON chat_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);

-- Message attachments indexes
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_file_type ON message_attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_message_attachments_upload_status ON message_attachments(upload_status);

-- Message reactions indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_type ON message_reactions(reaction_type);

-- Typing indicators indexes
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation_id ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user_id ON typing_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_activity ON typing_indicators(last_activity);

-- Message threads indexes
CREATE INDEX IF NOT EXISTS idx_message_threads_parent ON message_threads(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_reply ON message_threads(reply_message_id);

-- Conversation settings indexes
CREATE INDEX IF NOT EXISTS idx_conversation_settings_conversation_id ON conversation_settings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_settings_user_id ON conversation_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_settings_pinned ON conversation_settings(is_pinned);
CREATE INDEX IF NOT EXISTS idx_conversation_settings_muted ON conversation_settings(is_muted);

-- Message delivery status indexes
CREATE INDEX IF NOT EXISTS idx_message_delivery_status_message_id ON message_delivery_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_delivery_status_user_id ON message_delivery_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_delivery_status_status ON message_delivery_status(status);

-- Scheduled messages indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_conversation_id ON scheduled_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_sender_id ON scheduled_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON scheduled_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_is_sent ON scheduled_messages(is_sent);

-- Conversation templates indexes
CREATE INDEX IF NOT EXISTS idx_conversation_templates_user_id ON conversation_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_templates_category ON conversation_templates(category);
CREATE INDEX IF NOT EXISTS idx_conversation_templates_global ON conversation_templates(is_global);
CREATE INDEX IF NOT EXISTS idx_conversation_templates_active ON conversation_templates(is_active);

-- Chat analytics indexes
CREATE INDEX IF NOT EXISTS idx_chat_analytics_conversation_id ON chat_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_user_id ON chat_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_event_type ON chat_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_created_at ON chat_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_session_id ON chat_analytics(session_id);

-- Message search indexes
CREATE INDEX IF NOT EXISTS idx_message_search_message_id ON message_search_index(message_id);
CREATE INDEX IF NOT EXISTS idx_message_search_conversation_id ON message_search_index(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_search_vector ON message_search_index USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_message_search_hash ON message_search_index(content_hash);

-- Add triggers for automated functionality

-- Trigger to clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove typing indicators older than 10 seconds
    DELETE FROM typing_indicators 
    WHERE last_activity < NOW() - INTERVAL '10 seconds';
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger to update typing indicator timestamp
CREATE OR REPLACE FUNCTION update_typing_indicator()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_typing_indicator_timestamp
    BEFORE UPDATE ON typing_indicators
    FOR EACH ROW
    EXECUTE FUNCTION update_typing_indicator();

-- Trigger to update conversation settings timestamp
CREATE TRIGGER update_conversation_settings_updated_at
    BEFORE UPDATE ON conversation_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update template timestamp
CREATE TRIGGER update_conversation_templates_updated_at
    BEFORE UPDATE ON conversation_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create message search index
CREATE OR REPLACE FUNCTION create_message_search_index()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO message_search_index (message_id, conversation_id, search_vector, content_hash)
    VALUES (
        NEW.id,
        NEW.conversation_id,
        to_tsvector('english', COALESCE(NEW.message_text, '')),
        md5(NEW.message_text)
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create search index when message is inserted
CREATE TRIGGER create_message_search_index_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION create_message_search_index();

-- Function to update search index when message is edited
CREATE OR REPLACE FUNCTION update_message_search_index()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE message_search_index
    SET search_vector = to_tsvector('english', COALESCE(NEW.message_text, '')),
        content_hash = md5(NEW.message_text),
        indexed_at = CURRENT_TIMESTAMP
    WHERE message_id = NEW.id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update search index when message is updated
CREATE TRIGGER update_message_search_index_trigger
    AFTER UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_search_index();

-- Create views for advanced queries

-- View for conversation statistics
CREATE OR REPLACE VIEW conversation_stats AS
WITH response_times AS (
    SELECT 
        conversation_id,
        EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY conversation_id ORDER BY created_at))) as response_time_seconds
    FROM messages
    WHERE created_at IS NOT NULL
)
SELECT 
    c.id as conversation_id,
    c.ad_id,
    c.buyer_id,
    c.seller_id,
    COUNT(m.id) as total_messages,
    COUNT(CASE WHEN m.sender_id = c.buyer_id THEN 1 END) as buyer_messages,
    COUNT(CASE WHEN m.sender_id = c.seller_id THEN 1 END) as seller_messages,
    MAX(m.created_at) as last_message_time,
    MIN(m.created_at) as first_message_time,
    COUNT(CASE WHEN m.message_type = 'offer' THEN 1 END) as offer_count,
    COUNT(CASE WHEN m.message_type = 'image' THEN 1 END) as image_count,
    (SELECT AVG(response_time_seconds) FROM response_times rt WHERE rt.conversation_id = c.id AND rt.response_time_seconds IS NOT NULL) as avg_response_time_seconds
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY c.id, c.ad_id, c.buyer_id, c.seller_id;

-- View for unread message counts per user
CREATE OR REPLACE VIEW user_unread_counts AS
SELECT 
    u.id as user_id,
    u.name,
    COUNT(CASE WHEN c.buyer_id = u.id OR c.seller_id = u.id THEN m.id END) as total_unread_messages,
    COUNT(DISTINCT CASE WHEN c.buyer_id = u.id OR c.seller_id = u.id THEN c.id END) as conversations_with_unread
FROM users u
LEFT JOIN conversations c ON (c.buyer_id = u.id OR c.seller_id = u.id)
LEFT JOIN messages m ON c.id = m.conversation_id 
    AND m.sender_id != u.id 
    AND NOT EXISTS (
        SELECT 1 FROM message_read_status mrs 
        WHERE mrs.message_id = m.id AND mrs.user_id = u.id
    )
GROUP BY u.id, u.name;

-- View for popular message templates
CREATE OR REPLACE VIEW popular_templates AS
SELECT 
    ct.id,
    ct.name,
    ct.template_text,
    ct.category,
    ct.usage_count,
    u.name as created_by_name,
    ct.created_at
FROM conversation_templates ct
LEFT JOIN users u ON ct.user_id = u.id
WHERE ct.is_active = TRUE
ORDER BY ct.usage_count DESC, ct.created_at DESC;

-- Add table comments for documentation
COMMENT ON TABLE chat_rooms IS 'Future support for different types of chat rooms beyond direct messaging';
COMMENT ON TABLE message_attachments IS 'File attachments for messages including images, documents, etc.';
COMMENT ON TABLE message_reactions IS 'Emoji reactions to messages for better engagement';
COMMENT ON TABLE typing_indicators IS 'Real-time typing status indicators';
COMMENT ON TABLE message_threads IS 'Support for threaded conversations and message replies';
COMMENT ON TABLE conversation_settings IS 'User-specific preferences for each conversation';
COMMENT ON TABLE message_delivery_status IS 'Detailed delivery tracking for each message';
COMMENT ON TABLE scheduled_messages IS 'Messages scheduled to be sent at future times';
COMMENT ON TABLE conversation_templates IS 'Quick reply templates and canned responses';
COMMENT ON TABLE chat_analytics IS 'Analytics and usage tracking for chat system';
COMMENT ON TABLE message_search_index IS 'Full-text search index for message content';

-- Add column comments
COMMENT ON COLUMN message_attachments.file_type IS 'Type of file: image, document, video, audio';
COMMENT ON COLUMN message_reactions.reaction_type IS 'Type of reaction: like, love, laugh, wow, sad, angry';
COMMENT ON COLUMN typing_indicators.last_activity IS 'Timestamp of last typing activity';
COMMENT ON COLUMN conversation_settings.notifications_enabled IS 'Whether user receives notifications for this conversation';
COMMENT ON COLUMN conversation_settings.is_muted IS 'Whether conversation is muted for this user';
COMMENT ON COLUMN conversation_settings.custom_name IS 'User can set custom name for conversation';
COMMENT ON COLUMN message_delivery_status.status IS 'Delivery status: sent, delivered, read, failed';
COMMENT ON COLUMN scheduled_messages.scheduled_for IS 'When the message should be sent';
COMMENT ON COLUMN conversation_templates.is_global IS 'Whether template is available to all users';
COMMENT ON COLUMN chat_analytics.event_type IS 'Type of event being tracked';
COMMENT ON COLUMN message_search_index.search_vector IS 'Full-text search vector for message content';
