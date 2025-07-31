# AutoHub Real-Time Chat System

## Overview

This comprehensive chat system provides real-time messaging capabilities for the AutoHub car marketplace, enabling buyers and sellers to communicate seamlessly about car listings.

## Features

### Core Chat Features
- **Real-time messaging** with WebSocket integration
- **Conversation management** between buyers and sellers
- **Message read status** tracking
- **Typing indicators** for live feedback
- **File attachments** with image optimization
- **Message reactions** (emojis)
- **Full-text search** across message history
- **Conversation settings** (mute, notifications, custom names)

### Advanced Features
- **Message templates** for quick replies
- **Analytics tracking** for usage insights
- **Message threading** for organized discussions
- **Scheduled messages** for future delivery
- **Delivery status tracking** (sent, delivered, read)
- **Auto-cleanup** of typing indicators and inactive connections

## Architecture

### Database Structure

#### Core Tables (Basic Chat)
1. **conversations** - Main conversation records
2. **messages** - Individual messages
3. **message_read_status** - Read status tracking
4. **conversation_participants** - Participant management

#### Enhanced Tables (Advanced Features)
5. **message_attachments** - File attachments
6. **message_reactions** - Emoji reactions
7. **typing_indicators** - Real-time typing status
8. **conversation_settings** - User preferences
9. **message_templates** - Quick reply templates
10. **chat_analytics** - Usage analytics
11. **message_search_index** - Full-text search
12. **message_threads** - Threaded conversations
13. **message_delivery_status** - Delivery tracking
14. **scheduled_messages** - Future message scheduling
15. **chat_rooms** - Room-based conversations (future)

### Backend Components

#### Models
- **Conversation.js** - Core conversation operations
- **Message.js** - Message CRUD operations
- **ChatEnhancements.js** - Advanced feature models
  - MessageAttachment
  - MessageReaction
  - TypingIndicator
  - ConversationSettings
  - MessageTemplate

#### API Routes
- **`/api/chats`** - Core chat endpoints
- **`/api/chats/enhanced`** - Advanced feature endpoints

#### WebSocket Service
- **chatWebSocketService.js** - Real-time connection management
- Event handling for typing, reactions, message delivery
- Connection cleanup and heartbeat monitoring

### Frontend Components

#### JavaScript Files
- **chatWebSocket.js** - WebSocket client wrapper
- **realTimeChat.js** - Chat UI management
- Integration with existing AutoHub interface

#### UI Features
- Real-time message updates
- Typing indicators with animated dots
- Connection status display
- File upload with drag-and-drop
- Emoji reactions
- Message search functionality

## API Documentation

### Core Chat Endpoints

#### Get Conversations
```
GET /api/chats/conversations
```
Returns list of user's conversations with unread counts.

#### Get Messages
```
GET /api/chats/:conversationId/messages
```
Returns paginated messages for a conversation.

#### Send Message
```
POST /api/chats/:conversationId/messages
Body: { message: "text", message_type: "text" }
```
Sends a new message and broadcasts via WebSocket.

#### Mark as Read
```
POST /api/chats/:conversationId/read
```
Marks all messages in conversation as read.

### Enhanced Chat Endpoints

#### Upload Attachment
```
POST /api/chats/messages/:messageId/attachments
Form-data: file upload
```
Uploads file attachment with automatic image optimization.

#### Add Reaction
```
POST /api/chats/messages/:messageId/reactions
Body: { reaction: "👍" }
```
Adds emoji reaction to message.

#### Typing Indicators
```
POST /api/chats/:conversationId/typing
Body: { is_typing: true }
```
Updates typing status for real-time indicators.

#### Message Templates
```
GET /api/chats/templates
POST /api/chats/templates
Body: { name, template_text, category }
```
Manage quick reply templates.

#### Search Messages
```
GET /api/chats/search?q=keyword&conversation_id=uuid
```
Full-text search across message history.

## WebSocket Events

### Client to Server
- `authenticate` - User authentication
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `heartbeat` - Keep connection alive

### Server to Client
- `authenticated` - Authentication confirmed
- `new_message` - Real-time message broadcast
- `message_read` - Read status update
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `reaction_added` - New reaction added
- `user_joined_conversation` - User joined
- `user_left_conversation` - User left

## Installation & Setup

### 1. Install Dependencies
```bash
npm install ws multer sharp
```

### 2. Run Database Migrations
```bash
node scripts/migrate.js
```

### 3. Start Server
```bash
node server.js
```

### 4. Access Chat Interface
```
http://localhost:3000/chats.html
```

## Configuration

### Environment Variables
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=autohub
DB_USER=your_user
DB_PASSWORD=your_password
```

### File Upload Settings
- **Maximum file size**: 10MB
- **Supported formats**: Images (JPEG, PNG, WebP)
- **Storage location**: `public/uploads/chat/`
- **Image optimization**: Automatic WebP conversion

## Usage Examples

### Initialize WebSocket Client
```javascript
const chatClient = new ChatWebSocketClient();
chatClient.connect(userId, sessionId);

// Listen for new messages
chatClient.on('new_message', (message) => {
    displayMessage(message);
});

// Join conversation
chatClient.joinConversation(conversationId);
```

### Send Message with API
```javascript
const response = await fetch('/api/chats/conv123/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        message: 'Hello!',
        message_type: 'text'
    })
});
```

### Upload File Attachment
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/chats/messages/msg123/attachments', {
    method: 'POST',
    body: formData
});
```

## Performance Considerations

### Database Optimization
- **Indexed columns**: conversation_id, sender_id, created_at
- **Full-text search**: PostgreSQL tsvector for message content
- **Partitioning**: Consider partitioning for large message volumes
- **Cleanup jobs**: Automatic cleanup of old typing indicators

### WebSocket Management
- **Connection limits**: Monitor concurrent connections
- **Heartbeat monitoring**: 30-second intervals
- **Auto-reconnection**: Exponential backoff strategy
- **Memory cleanup**: Regular cleanup of inactive connections

### File Storage
- **Image optimization**: Sharp for WebP conversion
- **File validation**: Type and size checking
- **CDN integration**: Ready for external storage services

## Security Features

### Authentication
- Session-based authentication for WebSocket connections
- Route-level authentication for API endpoints
- User permission checking for conversation access

### Input Validation
- Message content sanitization
- File type and size validation
- SQL injection prevention with parameterized queries

### Rate Limiting
- API endpoint rate limiting
- WebSocket message throttling
- File upload rate limiting

## Monitoring & Analytics

### Built-in Analytics
- Message volume tracking
- User engagement metrics
- Conversation duration analysis
- Popular template usage

### Logging
- Winston-based logging system
- WebSocket connection events
- Error tracking and debugging
- Performance monitoring

## Future Enhancements

### Planned Features
- **Voice messages** with audio upload
- **Video calls** integration
- **Message encryption** for privacy
- **Group conversations** beyond buyer-seller
- **Bot integration** for automated responses
- **Mobile push notifications**
- **Message translation** for international users

### Scalability Considerations
- **Redis clustering** for WebSocket scaling
- **Message queue** for heavy traffic
- **Database sharding** for large datasets
- **CDN integration** for file delivery
- **Microservice architecture** for chat components

## Troubleshooting

### Common Issues

#### WebSocket Connection Failed
- Check server is running on correct port
- Verify WebSocket endpoint accessibility
- Check browser console for connection errors

#### Messages Not Appearing
- Verify user authentication
- Check conversation permissions
- Confirm WebSocket event listeners

#### File Upload Issues
- Check file size limits (10MB max)
- Verify supported file types
- Ensure proper form encoding

### Debug Mode
Enable debug logging:
```javascript
// Set LOG_LEVEL=debug in environment
process.env.LOG_LEVEL = 'debug';
```

### Database Queries
Check migration status:
```sql
SELECT * FROM migrations ORDER BY applied_at DESC;
```

Verify chat tables:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%chat%';
```

## Support

For technical support or feature requests, please refer to the main AutoHub documentation or contact the development team.

---

## Version History

- **v1.0** - Basic chat functionality
- **v1.1** - WebSocket integration
- **v2.0** - Advanced features (attachments, reactions, templates)
- **v2.1** - Performance optimizations and analytics

*Last updated: January 2025*
