# AutoMax - Premium Car Sales Platform

A comprehensive Node.js car sales platform with SMS authentication, session management, and vehicle inventory system, powered by PostgreSQL.

## Project Overview

AutoMax is a modern car dealership platform featuring secure authentication, persistent user sessions, and a robust vehicle management system. The platform supports both guest browsing and authenticated user experiences with personalized features.

## Project Structure

```
├── server.js                    # Main Express server
├── package.json                 # Dependencies and scripts
├── .env                         # Environment variables
├── public/                      # Static frontend files
│   ├── index.html              # Main landing page
│   ├── login.html              # SMS authentication page
│   ├── dashboard.html          # User dashboard
│   ├── settings.html           # Account settings page
│   ├── admin.html              # Admin panel
│   └── js/                     # Frontend JavaScript
│       ├── session.js          # Session management utilities
│       ├── index.js            # Main page functionality
│       ├── login.js            # Authentication logic
│       ├── dashboard.js        # Dashboard features
│       ├── settings.js         # Settings management
│       └── admin.js            # Admin panel functionality
├── routes/                      # API endpoints
│   ├── auth.js                 # Authentication & session routes
│   ├── users.js                # User management routes
│   └── cars.js                 # Vehicle inventory API (ready for future use)
├── middleware/                  # Express middleware
│   └── auth.js                 # Authentication middleware
├── models/                      # Data models
│   ├── User.js                 # User model with full CRUD
│   ├── Car.js                  # Vehicle model with search/filtering
│   └── VerificationCode.js     # SMS verification model
├── services/                    # Business logic
│   ├── smsService.js           # SMS with collision detection
│   ├── sessionService.js       # Cookie-based session management
│   └── googleOAuthService.js   # Google OAuth integration
├── config/                      # Configuration
│   └── database.js             # PostgreSQL connection & pooling
├── database/migrations/         # Database schema
│   ├── 001_create_users_table.sql     # User authentication
│   ├── 002_add_admin_features.sql     # Admin roles & logging
│   └── 003_create_cars_table.sql      # Vehicle inventory system
├── scripts/                     # Utility scripts
│   ├── migrate.js              # Database migration runner
│   ├── migrate-cars.js         # Cars table migration
│   ├── rollback.js             # Migration rollback
│   └── setup-db.js             # Initial database setup
└── docs/                        # Documentation
    └── POSTGRESQL.md            # Database documentation
```

## Key Features

### 🔐 Authentication & Security
- ✅ SMS verification with Twilio integration
- ✅ Anti-collision verification code generation
- ✅ Cookie-based persistent sessions
- ✅ JWT token fallback authentication
- ✅ Secure session management with HTTPOnly cookies
- ✅ Rate limiting and security middleware
- ✅ Admin role-based access control
- ✅ **Secure admin access with terminal-generated time-limited tokens**
- ✅ **Cryptographic admin authentication with one-time use codes**
- ✅ **Complete security audit logging and session management**

### 👥 User Management
- ✅ Phone number-based registration
- ✅ Profile management (name, email updates)
- ✅ Session persistence across browser restarts
- ✅ User dashboard with account overview
- ✅ Settings page with preferences
- ✅ Admin panel for user management

### 🚗 Vehicle Platform (Database Ready)
- ✅ Complete cars table with all vehicle attributes
- ✅ Car inquiries system for lead tracking
- ✅ Saved cars functionality for user favorites
- ✅ Advanced search and filtering capabilities
- ✅ Featured vehicles system
- ✅ Image and feature storage (JSON)
- ✅ VIN tracking and dealer notes

### � Real-Time Chat System
- ✅ **WebSocket-based real-time messaging**
- ✅ **Conversation management between buyers and sellers**
- ✅ **File attachments with automatic image optimization**
- ✅ **Message reactions (emoji support)**
- ✅ **Typing indicators with auto-cleanup**
- ✅ **Message read status tracking**
- ✅ **Full-text search across message history**
- ✅ **Conversation settings (mute, pin, custom names)**
- ✅ **Message templates for quick replies**
- ✅ **Chat analytics and usage tracking**
- ✅ **Scheduled messages for future delivery**
- ✅ **Message threading and delivery status**

### 📱 Personal Ads System
- ✅ **Complete personal ads CRUD operations**
- ✅ **Ad creation, editing, and management**
- ✅ **Advanced search and filtering**
- ✅ **Image upload and optimization**
- ✅ **Location-based filtering**
- ✅ **Ad status management (active, sold, expired)**

### �🛠 Technical Infrastructure
- ✅ PostgreSQL with connection pooling
- ✅ Comprehensive database migrations (15+ tables)
- ✅ Modular Express.js architecture
- ✅ Error handling and logging with Winston
- ✅ API-ready endpoints for all major functionality
- ✅ Performance-optimized database indexes
- ✅ JSONB support for flexible data storage
- ✅ Soft delete functionality
- ✅ **WebSocket server with connection management**
- ✅ **Real-time event broadcasting**
- ✅ **File upload processing with Sharp**

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
See [PostgreSQL Documentation](docs/POSTGRESQL.md) for detailed setup instructions.

**Quick Setup:**
```bash
# Install PostgreSQL (if not already installed)
# Create database and user
# Configure .env file

# Setup database and run migrations
npm run db:setup
```

### 3. Configure Environment
Copy and update `.env` file with your credentials:
```bash
cp .env.example .env
# Edit .env with your database and API credentials
```

### 4. Start Development Server
```bash
npm run dev
```

## Database Commands

```bash
# Setup database (recommended for first time)
npm run db:setup

# Run pending migrations
npm run migrate

# Rollback last migration
npm run db:rollback
```

## API Endpoints

### Authentication
- `POST /api/auth/sms/send` - Send SMS verification code
- `POST /api/auth/sms/verify` - Verify SMS code
- `POST /api/auth/sms/resend` - Resend SMS verification code
- `POST /api/auth/sms/send-direct` - Send direct SMS message
- `POST /api/auth/sms/welcome` - Send welcome SMS message
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/verify` - Verify JWT token

### User Management
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/stats` - Get user statistics

### Personal Ads
- `GET /api/personal-ads` - List personal ads with filtering
- `POST /api/personal-ads` - Create new personal ad
- `GET /api/personal-ads/:id` - Get personal ad details
- `PUT /api/personal-ads/:id` - Update personal ad
- `DELETE /api/personal-ads/:id` - Delete personal ad
- `POST /api/personal-ads/:id/contact` - Contact ad owner

### Real-Time Chat System
- `GET /api/chats/conversations` - Get user's conversations
- `POST /api/chats/conversations` - Create new conversation
- `GET /api/chats/:conversationId/messages` - Get conversation messages
- `POST /api/chats/:conversationId/messages` - Send new message
- `PUT /api/chats/:conversationId/messages/:messageId` - Edit message
- `DELETE /api/chats/:conversationId/messages/:messageId` - Delete message
- `POST /api/chats/:conversationId/read` - Mark messages as read

### Advanced Chat Features
- `POST /api/chats/enhanced/attachments` - Upload file attachments
- `GET /api/chats/enhanced/attachments/:id` - Get attachment details
- `POST /api/chats/enhanced/reactions` - Add message reaction
- `DELETE /api/chats/enhanced/reactions/:id` - Remove reaction
- `GET /api/chats/enhanced/reactions/:messageId` - Get message reactions
- `POST /api/chats/enhanced/typing` - Update typing status
- `GET /api/chats/enhanced/templates` - Get message templates
- `POST /api/chats/enhanced/templates` - Create message template
- `GET /api/chats/enhanced/search` - Search messages
- `POST /api/chats/enhanced/settings` - Update conversation settings

### Car Management (Ready for Implementation)
- `GET /api/cars` - List cars with filtering/search
- `POST /api/cars` - Create new car listing (admin)
- `GET /api/cars/:id` - Get car details
- `PUT /api/cars/:id` - Update car listing (admin)
- `DELETE /api/cars/:id` - Delete car listing (admin)
- `POST /api/cars/:id/inquire` - Submit car inquiry
- `POST /api/cars/:id/save` - Save car to favorites
- `DELETE /api/cars/:id/save` - Remove from favorites

### Admin Panel
- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/:id/status` - Update user status
- `GET /api/admin/stats` - Get system statistics
- `POST /api/admin/sms/send` - Send admin SMS messages

### Secure Admin Access System
- `GET /admin-secure-access` - Validate admin access token and code
- `POST /api/admin-security/authenticate` - Complete admin authentication
- `GET /api/admin-security/status` - Check admin session status
- `POST /api/admin-security/logout` - Logout admin session
- `GET /api/admin-security/activity` - Get admin activity log
- `GET /api/admin-security/overview` - Get security overview

### WebSocket Events
- **Connection**: `ws://localhost:3000/ws/chat`
- **Events**: authenticate, join_conversation, typing_start/stop, message_sent, message_read
- **Real-time**: Message delivery, typing indicators, reactions, user presence

### Session Management
- `GET /api/auth/session` - Get current session info
- `POST /api/auth/refresh` - Refresh authentication session
- `GET /api/auth/status` - Check authentication status

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
JWT_SECRET=your_jwt_secret

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nodejs_mvp
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/nodejs_mvp

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SERVICE_SID=your_twilio_verify_service_sid
TWILIO_PHONE_NUMBER=+1234567890

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Session Secret
SESSION_SECRET=your_session_secret
```

## Database Schema

### Current Tables:

#### Core Authentication & Users
- **users** - User accounts with authentication data
- **verification_codes** - SMS verification codes  
- **user_sessions** - JWT token management

#### Personal Ads System
- **personal_ads** - Personal ad listings with full specifications
- **cars** - Vehicle inventory with full specifications
- **car_inquiries** - Customer inquiries and lead tracking
- **saved_cars** - User favorite vehicles

#### Real-Time Chat System
- **conversations** - Chat conversations between users
- **messages** - Individual chat messages
- **message_read_status** - Message read tracking
- **conversation_participants** - Conversation participant management

#### Advanced Chat Features
- **message_attachments** - File attachments with optimization
- **message_reactions** - Emoji reactions to messages
- **typing_indicators** - Real-time typing status
- **conversation_settings** - User preferences per conversation
- **message_templates** - Quick reply templates
- **chat_analytics** - Usage analytics and insights
- **message_search_index** - Full-text search optimization
- **message_threads** - Threaded conversations
- **message_delivery_status** - Delivery tracking
- **scheduled_messages** - Future message scheduling
- **chat_rooms** - Room-based conversations (future)

#### System Tables
- **migrations** - Migration tracking

### Key Features:
- **UUID primary keys** - Secure, non-sequential identifiers
- **Soft delete functionality** - Data preservation with deleted_at timestamps
- **Automatic timestamps** - created_at, updated_at tracking
- **Proper indexing and foreign key constraints** - Performance and data integrity
- **JSONB storage** - Flexible metadata and feature storage
- **Full-text search indexes** - Optimized message and content search
- **Advanced search indexes** - Vehicle and personal ad filtering
- **WebSocket integration** - Real-time message delivery
- **File processing** - Automatic image optimization and storage

### Personal Ads Database Structure:
```sql
personal_ads table includes:
- Basic info: title, description, category, condition
- Pricing: price, price_type, negotiable
- Vehicle: make, model, year, mileage (if applicable)
- Location: city, state, postal_code
- Contact: contact_method, phone, email
- Media: images (JSON array), features (JSON)
- Status: status, featured, views, created_by
- Timestamps: created_at, updated_at, deleted_at
```

### Chat System Database Structure:
```sql
Comprehensive chat system with:
- Real-time messaging with WebSocket support
- File attachments with automatic optimization
- Message reactions and typing indicators
- Full-text search with PostgreSQL tsvector
- Analytics tracking and conversation insights
- Advanced settings and customization options
- Message scheduling and delivery tracking
```

## Usage Examples

### User Management:
```javascript
const User = require('./models/User');

// Create new user with phone verification
const user = await User.create({
  phone: '+1234567890',
  email: 'user@example.com', 
  name: 'John Doe'
});

// Find and update user profile
const user = await User.findByPhone('+1234567890');
user.name = 'John Smith';
await user.save();
```

### Personal Ads Management:
```javascript
const PersonalAd = require('./models/PersonalAd');

// Create new personal ad
const ad = await PersonalAd.create({
  title: '2019 Honda Civic for Sale',
  description: 'Excellent condition, low mileage',
  category: 'vehicles',
  subcategory: 'cars',
  price: 18500,
  make: 'Honda',
  model: 'Civic',
  year: 2019,
  mileage: 25000,
  city: 'Toronto',
  state: 'ON',
  created_by: userId
});

// Search ads with filters
const ads = await PersonalAd.search({
  category: 'vehicles',
  make: 'Honda',
  minPrice: 15000,
  maxPrice: 25000,
  city: 'Toronto'
});
```

### Real-Time Chat System:
```javascript
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

// Create conversation between buyer and seller
const conversation = await Conversation.create({
  ad_id: adId,
  buyer_id: buyerId,
  seller_id: sellerId
});

// Send message with WebSocket notification
const message = await Message.create({
  conversation_id: conversationId,
  sender_id: userId,
  message_text: 'Is this item still available?',
  message_type: 'text'
});

// WebSocket will automatically notify participants
```

### Advanced Chat Features:
```javascript
const { MessageReaction, MessageTemplate, ConversationSettings } = require('./models/ChatEnhancements');

// Add emoji reaction to message
await MessageReaction.addReaction(messageId, userId, 'like', '👍');

// Use message template
const template = await MessageTemplate.findByUser(userId, 'greeting');
const message = await Message.create({
  conversation_id: conversationId,
  sender_id: userId,
  message_text: template.template_text,
  message_type: 'text'
});

// Update conversation settings
await ConversationSettings.createOrUpdate({
  conversation_id: conversationId,
  user_id: userId,
  is_muted: true,
  custom_name: 'Honda Civic Discussion'
});
```

### Car Inventory Management:
```javascript
const Car = require('./models/Car');

// Create new car listing
const car = await Car.create({
  make: 'Toyota',
  model: 'Camry', 
  year: 2022,
  mileage: 15000,
  price: 28500,
  condition: 'excellent',
  features: ['navigation', 'backup_camera', 'bluetooth'],
  images: ['image1.jpg', 'image2.jpg']
});

// Search cars with filters
const cars = await Car.search({
  make: 'Toyota',
  minPrice: 20000,
  maxPrice: 35000,
  condition: 'excellent'
});
```

### WebSocket Chat Integration:
```javascript
// Initialize WebSocket connection
const ws = new WebSocket('ws://localhost:3000/ws/chat');

// Authenticate user
ws.send(JSON.stringify({
  type: 'authenticate',
  data: { userId: userId, sessionId: sessionId }
}));

// Join conversation
ws.send(JSON.stringify({
  type: 'join_conversation',
  data: { conversationId: conversationId }
}));

// Listen for real-time messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'new_message') {
    displayMessage(message.message);
  }
};

// Send typing indicator
ws.send(JSON.stringify({
  type: 'typing_start',
  data: {}
}));
```

### SMS Verification with Collision Protection:
```javascript
const { generateUniqueVerificationCode } = require('./services/smsService');

// Generate collision-safe verification code
const result = await generateUniqueVerificationCode('+1234567890');
if (result.success) {
  console.log(`Sent code ${result.code} to ${result.phone}`);
}

// Verify code (supports both Twilio Verify and custom codes)
const isValid = await verifyCode('+1234567890', '123456');
```

### Session Management:
```javascript
const { SessionService } = require('./services/sessionService');

// Set user session with persistent cookie
SessionService.setUserSession(req, user);

// Get user from session
const currentUser = await SessionService.getUserFromSession(req);

// Require authentication middleware
app.get('/dashboard', SessionService.requireAuth, (req, res) => {
  res.render('dashboard', { user: req.user });
});
```

### Secure Admin Access System:
```javascript
// Generate secure admin access token (from terminal)
// Command: node scripts/generate-admin-access.js [duration]

// DIRECT ACCESS - Click generated URL for immediate admin panel access
// URL: http://localhost:3000/admin-secure-access?token=TOKEN&code=CODE
// This automatically creates an admin session and redirects to admin panel

// Check admin session status programmatically
const status = await fetch('/api/admin-security/status');

// View admin activity log
const activity = await fetch('/api/admin-security/activity?limit=50');

// Manual session management (optional)
const response = await fetch('/api/admin-security/authenticate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: adminToken,
    code: adminCode,
    userId: adminUserId
  })
});
```

## Twilio SMS Setup

This project uses the official [Twilio Node.js SDK](https://github.com/twilio/twilio-node) with Twilio Verify Service for secure SMS authentication.

### 1. Twilio Account Setup

1. **Sign up for Twilio**: [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. **Get your credentials** from the [Twilio Console](https://console.twilio.com/):
   - Account SID
   - Auth Token

### 2. Create a Verify Service

1. Go to [Twilio Console > Verify Services](https://console.twilio.com/us1/develop/verify/services)
2. Click "Create new Verify Service"
3. Give it a name (e.g., "NodeJS MVP App")
4. Copy the **Service SID**

### 3. Environment Configuration

Add these variables to your `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. SMS Features

This application supports two types of SMS messaging:

#### Twilio Verify API (Recommended for verification)
✅ **Automatic Code Generation**: Twilio generates secure 6-digit codes  
✅ **Rate Limiting**: Built-in protection against spam  
✅ **Multiple Channels**: SMS and Voice support  
✅ **Fraud Protection**: Twilio's built-in security features  

#### Twilio Messages API (For custom messaging)
✅ **Direct SMS Sending**: Send custom messages directly  
✅ **Welcome Messages**: Automatic welcome messages for new users  
✅ **Notifications**: Send custom notifications and alerts  
✅ **Custom Verification**: Send custom verification codes  

### 5. Available SMS Functions

```javascript
const smsService = require('./services/smsService');

// Verification using Twilio Verify API
await smsService.sendVerificationCode('+1234567890');
await smsService.verifyCode('+1234567890', '123456');

// Unique verification codes with collision detection
await smsService.sendUniqueVerificationCode('+1234567890');
await smsService.verifyCustomCode('+1234567890', '123456');

// Direct messaging using Twilio Messages API
await smsService.sendDirectMessage('+1234567890', 'Your custom message');
await smsService.sendWelcomeMessage('+1234567890', 'John Doe');
await smsService.sendNotification('+1234567890', 'Account updated');
await smsService.sendCustomVerificationCode('+1234567890', '123456');
```

### 6. Asynchronous Code Generation with Collision Detection

This application includes a sophisticated verification code system that prevents code collisions even when multiple users request codes simultaneously:

#### Features:
✅ **Cryptographically Secure**: Uses `crypto.randomInt()` for secure random generation  
✅ **Collision Detection**: Checks against all active codes across all users  
✅ **Automatic Retry**: Regenerates codes with exponential backoff on collision  
✅ **Concurrent Safety**: Thread-safe generation with locking mechanisms  
✅ **Code Expiration**: Automatic cleanup of expired codes  
✅ **Anti-Reuse**: Prevents verification code reuse  

#### How it works:
1. When a user requests a verification code, the system generates a cryptographically secure 6-digit code
2. Before sending, it checks if this code is already in use by ANY user
3. If a collision is detected, it automatically generates a new code with exponential backoff
4. The code is stored with expiration timestamp and user metadata
5. Verification checks both custom codes and Twilio Verify API codes
6. Used codes are marked as consumed to prevent reuse

#### API Endpoints:
- `POST /api/auth/sms/send-unique` - Send collision-safe verification code
- `POST /api/auth/sms/send` - Standard Twilio Verify API (fallback)  

### 7. Testing

Test your SMS functionality:

```bash
# Test SMS verification (Verify API)
node test-sms.js

# Test direct SMS messaging (Messages API)
node test-direct-sms.js

# Test concurrent code generation and collision detection
node test-concurrent-codes.js
```

The test scripts will verify your Twilio configuration and test the collision detection system.

### 7. Troubleshooting

- **Invalid credentials**: Double-check Account SID and Auth Token
- **Service not found**: Verify your Verify Service SID
- **Phone number required**: Set TWILIO_PHONE_NUMBER for direct messaging
- **SMS not received**: Check phone number format (+1XXXXXXXXXX for Canadian numbers)
- **Rate limiting**: Twilio has built-in rate limits for security
- **Direct messages failing**: Ensure your Twilio phone number is verified and active

## Documentation

- 📖 [PostgreSQL Setup Guide](docs/POSTGRESQL.md) - Comprehensive database documentation
- � [Chat System Documentation](docs/CHAT_SYSTEM.md) - Complete real-time chat guide
- 📝 [API Reference](docs/API_REFERENCE.md) - Comprehensive API documentation
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- 📊 [Logging Configuration](docs/LOGGING.md) - Winston logging setup
- �🔧 Installation, configuration, and troubleshooting
- 💾 Database operations and examples
- 🚀 Production deployment considerations

## Development

### Running Tests:
```bash
npm test  # (to be implemented)
```

### Code Style:
- Use ESLint for code linting
- Follow Node.js best practices
- Use async/await for asynchronous operations

## Production Deployment

1. Set `NODE_ENV=production`
2. Use SSL for database connections
3. Configure proper logging
4. Set up database backups
5. Use process managers (PM2)
6. Enable HTTPS
7. Configure reverse proxy (Nginx)

## TODO & Roadmap

### ✅ Completed Features:
- [x] Complete Twilio SMS integration (Verify API + Messages API)
- [x] Collision-safe verification code generation  
- [x] Cookie-based session management with JWT fallback
- [x] Complete car inventory database structure
- [x] User authentication and profile management
- [x] Admin panel and role-based access
- [x] **Secure admin access system with terminal-generated tokens**
- [x] **Time-limited admin authentication with cryptographic security**
- [x] **Complete admin activity logging and session management**
- [x] AutoMax car sales UI/UX design
- [x] PostgreSQL with comprehensive migrations
- [x] API endpoints for car management (ready for frontend)
- [x] **Complete real-time chat system**
- [x] **WebSocket integration for live messaging**
- [x] **Personal ads system with full CRUD operations**
- [x] **File attachments and image optimization**
- [x] **Message reactions and typing indicators**
- [x] **Full-text search across messages**
- [x] **Chat analytics and conversation management**
- [x] **Advanced chat features (templates, settings, reactions)**

### 🔄 In Progress:
- [ ] Car inventory frontend implementation
- [ ] Advanced search and filtering UI
- [ ] Image upload and management for personal ads
- [ ] Vehicle comparison features
- [ ] Personal ads frontend implementation

### 📋 Planned Features:
- [ ] Complete Google OAuth implementation
- [ ] Telegram Bot integration (Telegraf installed)
- [ ] Email verification and notifications
- [ ] Password reset functionality  
- [ ] Advanced user roles and permissions
- [ ] Comprehensive unit and integration tests
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Performance monitoring and analytics
- [ ] Mobile app API compatibility
- [ ] Vehicle history reports integration
- [ ] Financing calculator tools
- [ ] Dealer management system
- [ ] Multi-language support
- [ ] Push notifications for mobile apps
- [ ] Advanced moderation tools for chat
- [ ] Video calling integration
- [ ] Voice messages in chat
- [ ] Message encryption for privacy
- [ ] Group conversations beyond buyer-seller
- [ ] AI-powered chatbot assistance

### 🚀 Production Readiness:
- [ ] Security audit and penetration testing
- [ ] Load testing and performance optimization
- [ ] Backup and disaster recovery procedures  
- [ ] CI/CD pipeline setup
- [ ] Docker containerization
- [ ] Monitoring and alerting setup
- [ ] Add rate limiting per user
- [ ] Add API versioning
- [ ] Add health check endpoints

## Contributing

We welcome contributions to AutoMax! Please follow these guidelines:

### Development Setup:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Install dependencies: `npm install`
4. Set up environment variables (copy `.env.example` to `.env`)
5. Run database migrations: `npm run migrate`
6. Start development server: `npm run dev`

### Code Standards:
- Follow ESLint configuration
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

### Reporting Issues:
- Use GitHub Issues for bug reports
- Include steps to reproduce the issue
- Provide environment details (Node.js version, OS, etc.)
- Add relevant error messages and logs

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- 📧 Email: support@automax.com
- 💬 Discord: [AutoMax Community](https://discord.gg/automax)
- 📖 Documentation: [AutoMax Docs](./docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/automax/issues)

## Acknowledgments

- **Twilio** - SMS and verification services
- **PostgreSQL** - Robust database foundation  
- **Express.js** - Web application framework
- **Node.js** - Runtime environment
- **JWT** - Secure authentication tokens
- **Cookie-Session** - Session management
- **Telegraf** - Telegram Bot framework

---

**AutoMax** - Premium Car Sales Platform | Built with ❤️ using Node.js
