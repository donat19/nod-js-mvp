-- Migration: Create chats system tables
-- Date: 2025-07-30
-- Description: Create tables for chat functionality between users regarding car ads

-- Create conversations table (chat rooms)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID NOT NULL REFERENCES personal_ads(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed', 'archived'
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one conversation per buyer-seller-ad combination
    UNIQUE(ad_id, buyer_id, seller_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'offer', 'system'
    is_read BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB, -- For storing additional data like image URLs, offer amounts, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create message_read_status table to track read status for each participant
CREATE TABLE IF NOT EXISTS message_read_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one read status per user per message
    UNIQUE(message_id, user_id)
);

-- Create conversation_participants table (for future group chat support)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'participant', -- 'participant', 'admin', 'moderator'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure one participation record per user per conversation
    UNIQUE(conversation_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_ad_id ON conversations(ad_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);

CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_read_at ON message_read_status(read_at);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_is_active ON conversation_participants(is_active);

-- Create GIN index for JSONB metadata search
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin ON messages USING GIN (metadata);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_seller ON conversations(buyer_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread_by_user ON messages(conversation_id, is_read) WHERE is_read = FALSE;

-- Add triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for conversations
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add triggers for messages
CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation's last_message_at when new message is added
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at, updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update conversation when new message is added
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Function to automatically add participants when conversation is created
CREATE OR REPLACE FUNCTION add_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
    -- Add buyer as participant
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (NEW.id, NEW.buyer_id, 'participant')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
    
    -- Add seller as participant
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (NEW.id, NEW.seller_id, 'participant')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to add participants when conversation is created
CREATE TRIGGER add_participants_on_conversation_create
    AFTER INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION add_conversation_participants();

-- Add some useful views for common queries
CREATE OR REPLACE VIEW conversation_details AS
SELECT 
    c.id as conversation_id,
    c.ad_id,
    c.buyer_id,
    c.seller_id,
    c.status,
    c.last_message_at,
    c.created_at,
    -- Ad details
    a.title as ad_title,
    a.make,
    a.model,
    a.year,
    a.price,
    -- Buyer details
    u_buyer.name as buyer_name,
    u_buyer.phone as buyer_phone,
    -- Seller details
    u_seller.name as seller_name,
    u_seller.phone as seller_phone,
    -- Unread message count
    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = FALSE) as unread_count
FROM conversations c
LEFT JOIN personal_ads a ON c.ad_id = a.id
LEFT JOIN users u_buyer ON c.buyer_id = u_buyer.id
LEFT JOIN users u_seller ON c.seller_id = u_seller.id;

-- Add comments for documentation
COMMENT ON TABLE conversations IS 'Stores chat conversations between buyers and sellers for specific car ads';
COMMENT ON TABLE messages IS 'Stores individual messages within conversations';
COMMENT ON TABLE message_read_status IS 'Tracks read status of messages for each user';
COMMENT ON TABLE conversation_participants IS 'Stores participants in conversations (supports future group chats)';

COMMENT ON COLUMN conversations.status IS 'active: ongoing conversation, closed: manually closed, archived: old conversations';
COMMENT ON COLUMN messages.message_type IS 'text: regular text message, image: image attachment, offer: price offer, system: system-generated message';
COMMENT ON COLUMN messages.metadata IS 'JSON field for storing additional message data like image URLs, offer amounts, etc.';
