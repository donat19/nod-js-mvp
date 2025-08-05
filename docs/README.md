# AutoMax - Premium Car Sales Platform Documentation

AutoMax is a comprehensive Node.js car sales platform with SMS authentication, session management, and vehicle inventory system, powered by PostgreSQL.

## Documentation Index

### 📋 Getting Started
- [Main README](../README.md) - Project overview and quick start guide
- [PostgreSQL Setup](POSTGRESQL.md) - Database installation and configuration
- [Environment Configuration](../README.md#environment-variables) - Required environment variables
- [Chat System Guide](CHAT_SYSTEM.md) - Complete real-time chat documentation
- [Logging Configuration](LOGGING.md) - Winston logging setup and monitoring
- [Deployment Guide](DEPLOYMENT.md) - Production deployment and server setup

### 🔧 Technical Documentation  
- [Database Schema](../README.md#database-schema) - Complete database structure (15+ tables)
- [API Reference](API_REFERENCE.md) - Comprehensive API documentation with examples
- [API Endpoints](../README.md#api-endpoints) - Quick reference for all REST API routes
- [WebSocket Documentation](API_REFERENCE.md#websocket-events) - Real-time event documentation
- [Authentication System](../README.md#authentication--security) - SMS, JWT, and session management
- [Personal Ads System](../README.md#personal-ads-system) - Personal advertisement management
- [Real-Time Chat System](CHAT_SYSTEM.md) - WebSocket messaging with advanced features
- [Chat Enhancement Features](CHAT_SYSTEM.md#advanced-features) - Reactions, templates, analytics

### 🚀 Production & Deployment
- [Deployment Guide](DEPLOYMENT.md) - Complete production deployment guide
- [Security Configuration](DEPLOYMENT.md#security-configuration) - Production security setup
- [Performance Optimization](DEPLOYMENT.md#performance-optimization) - Scaling and optimization
- [Monitoring & Logging](DEPLOYMENT.md#monitoring-and-logging) - Production monitoring
- [Backup & Recovery](DEPLOYMENT.md#disaster-recovery) - Disaster recovery procedures

### 🏗️ Architecture Overview

AutoMax follows a modular Node.js architecture:

```
├── server.js                    # Express server with middleware
├── routes/                      # REST API endpoints
│   ├── auth.js                 # Authentication & sessions  
│   ├── users.js                # User management
│   └── cars.js                 # Vehicle inventory API
├── models/                      # Data models  
│   ├── User.js                 # User model with CRUD
│   ├── Car.js                  # Vehicle model with search
│   └── VerificationCode.js     # SMS verification
├── services/                    # Business logic
│   ├── smsService.js           # SMS with collision detection
│   ├── sessionService.js       # Cookie-based sessions
│   └── googleOAuthService.js   # OAuth integration
├── middleware/                  # Express middleware
│   └── auth.js                 # Authentication middleware
├── config/                      # Configuration
│   └── database.js             # PostgreSQL connection
├── public/                      # Frontend assets
│   ├── index.html              # AutoMax homepage
│   ├── login.html              # SMS authentication
│   ├── dashboard.html          # User dashboard
│   └── js/                     # Frontend JavaScript
├── database/migrations/         # Database schema
└── docs/                        # Documentation
```

### 🎯 Key Features

#### ✅ Implemented:
- **Authentication**: SMS verification with anti-collision protection
- **Sessions**: Cookie-based persistence with JWT fallback  
- **Database**: Complete schema with 15+ tables (PostgreSQL)
- **API**: RESTful endpoints for all major functionality
- **UI**: AutoMax-themed car sales interface
- **Admin**: Role-based access control and management
- **Personal Ads**: Complete CRUD operations with advanced search
- **Real-Time Chat**: WebSocket messaging with advanced features
- **File Processing**: Image optimization and attachment handling
- **Analytics**: Chat usage tracking and conversation insights
- **Search**: Full-text search across messages and ads
- **Logging**: Comprehensive Winston-based logging system

#### 🔄 In Development:
- Personal ads frontend implementation
- Car inventory frontend implementation
- Advanced search and filtering UI
- Image upload management interface
- Admin dashboard enhancements
- Mobile-responsive chat interface

### 🚀 Development Workflow

#### Setting Up Development Environment:
```bash
# 1. Clone and install
git clone <repository-url>
cd automax
npm install

# 2. Database setup
npm run db:setup

# 3. Environment configuration  
cp .env.example .env
# Edit .env with your credentials

# 4. Start development
npm run dev
```

#### Database Operations:
```bash
# Migration management
npm run migrate        # Apply pending migrations
npm run db:rollback    # Rollback last migration
npm run db:setup       # Complete database setup

# Check database status
npm run db:status      # View migration status
```

#### Testing SMS Features:
```bash
# Test collision-safe verification codes
node scripts/test-sms-collision.js

# Test Twilio integration
node scripts/test-twilio.js

# Test session management
node scripts/test-sessions.js
```

### 📊 Database Structure

#### Core Tables:
- **users** - Authentication and profile data
- **verification_codes** - SMS verification with expiration
- **user_sessions** - JWT token management
- **personal_ads** - Personal advertisement listings
- **cars** - Complete vehicle inventory (ready for dealership use)
- **conversations** - Real-time chat conversations
- **messages** - Chat messages with rich content support
- **message_attachments** - File uploads with optimization
- **message_reactions** - Emoji reactions and engagement
- **message_templates** - Quick reply templates
- **conversation_settings** - User preferences per conversation
- **chat_analytics** - Usage tracking and insights
- **typing_indicators** - Real-time typing status
- **scheduled_messages** - Future message delivery
- **message_search_index** - Full-text search optimization

#### Advanced Features:
- **UUID Primary Keys** - Secure, non-sequential identifiers
- **Soft Deletes** - Data preservation with deleted_at timestamps
- **JSONB Storage** - Flexible feature and metadata storage
- **Full-Text Search** - Optimized car search with indexes
- **Foreign Key Constraints** - Data integrity enforcement

### 🔐 Security Features

#### Authentication:
- **Multi-Factor SMS** - Twilio Verify API with collision detection
- **Session Management** - HTTPOnly cookies with JWT fallback
- **Rate Limiting** - Protection against brute force attacks
- **CSRF Protection** - Cross-site request forgery prevention

#### Data Protection:
- **Input Validation** - Comprehensive request validation
- **SQL Injection Prevention** - Parameterized queries
- **XSS Protection** - Content security policies
- **Environment Isolation** - Secure environment variable management

### 📱 Frontend Architecture

#### AutoMax Interface:
- **Responsive Design** - Mobile-first car sales interface
- **Session Awareness** - Dynamic UI based on authentication state
- **Progressive Enhancement** - Works without JavaScript
- **Modern JavaScript** - ES6+ with fallbacks

#### Key Components:
- **SessionManager** - Client-side session handling
- **AutoMaxIndexManager** - Homepage functionality
- **AuthenticationFlow** - Login/logout handling
- **CarSearchInterface** - Vehicle filtering (ready for implementation)
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Session Secret
SESSION_SECRET=your_session_secret
```

## Database Schema

### Tables:
- **users** - User accounts with authentication data
- **verification_codes** - SMS verification codes
- **user_sessions** - JWT token management
- **migrations** - Migration tracking

### Key Features:
- UUID primary keys
- Soft delete functionality
- Automatic timestamps
- Proper indexing
- Foreign key constraints

## Usage Examples

### Creating Users:
```javascript
const User = require('./models/User');

// Create new user
const user = await User.create({
  phone: '+1234567890',
  email: 'user@example.com',
  name: 'John Doe'
});

// Find and update user
const user = await User.findByPhone('+1234567890');
user.name = 'John Smith';
await user.save();
```

### SMS Verification:
```javascript
const VerificationCode = require('./models/VerificationCode');

// Create and send code
const code = await VerificationCode.create('+1234567890', '123456');

### 💼 Business Logic

#### User Management:
```javascript
// Create user with profile validation
const user = await User.create({
  phone: '+1234567890',
  email: 'customer@automax.com',
  name: 'John Smith'
});

// Session-based authentication
SessionService.setUserSession(req, user);
const currentUser = await SessionService.getUserFromSession(req);
```

#### Car Inventory:
```javascript
// Advanced car search with filters
const cars = await Car.search({
  make: 'Toyota',
  model: 'Camry',
  minYear: 2020,
  maxPrice: 35000,
  condition: 'excellent',
  features: ['navigation', 'backup_camera']
});

// Save favorite cars
await car.saveForUser(userId);
```

#### SMS with Collision Protection:
```javascript
// Generate unique verification codes
const result = await generateUniqueVerificationCode('+1234567890');
// Automatic retry on collision with exponential backoff

// Verify with both Twilio and custom codes
const isValid = await verifyCode(phone, code);
```

## 🛠️ API Reference

All API endpoints return JSON responses with consistent error handling:

### Authentication Endpoints:
- `POST /api/auth/sms/send` - Send SMS verification  
- `POST /api/auth/sms/verify` - Verify SMS code
- `GET /api/auth/session` - Get session status
- `POST /api/auth/logout` - Logout and clear session

### Car Management Endpoints (Ready):
- `GET /api/cars` - Search cars with filters
- `POST /api/cars` - Create car listing (admin)
- `GET /api/cars/:id` - Get car details
- `PUT /api/cars/:id` - Update car (admin)
- `POST /api/cars/:id/inquire` - Submit inquiry
- `POST /api/cars/:id/save` - Save to favorites

### User Management:
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/saved-cars` - Get favorite cars

## 📋 Production Checklist

### Security:
- [x] SMS verification with collision detection
- [x] Session security with HTTPOnly cookies
- [x] JWT token validation  
- [x] SQL injection prevention
- [ ] Rate limiting per endpoint
- [ ] HTTPS enforcement
- [ ] Security headers

### Performance:
- [x] Database connection pooling
- [x] Optimized database indexes
- [x] Async/await throughout codebase
- [ ] Response caching
- [ ] Image optimization
- [ ] CDN integration

### Monitoring:
- [ ] Error logging (Winston)
- [ ] Performance metrics
- [ ] Health check endpoints
- [ ] Database monitoring
- [ ] Alert systems

## 🔗 External Integrations

### Current:
- **Twilio** - SMS verification and messaging
- **PostgreSQL** - Primary database
- **JWT** - Token-based authentication

### Planned:
- **Google OAuth** - Social authentication
- **Telegraf** - Telegram bot integration  
- **AWS S3** - Image storage
- **SendGrid** - Email notifications
- **Stripe** - Payment processing

---

For detailed technical implementation, see the [main README](../README.md) and [PostgreSQL documentation](POSTGRESQL.md).

MIT License - see LICENSE file for details.
