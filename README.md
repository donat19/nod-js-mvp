# Node.js MVP Application

A Node.js MVP application with SMS and Google OAuth authentication, powered by PostgreSQL.

## Project Structure

```
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── public/                # Static files (HTML, CSS, JS)
│   ├── index.html         # Main page
│   ├── login.html         # Login page
│   ├── dashboard.html     # Dashboard page
│   └── 404.html          # 404 error page
├── routes/                # API routes
│   ├── auth.js           # Authentication routes
│   └── users.js          # User management routes
├── middleware/            # Express middleware
│   └── auth.js           # Authentication middleware
├── models/               # Data models
│   ├── User.js           # User model with PostgreSQL integration
│   └── VerificationCode.js # SMS verification code model
├── services/             # Business logic services
│   ├── smsService.js     # SMS verification service
│   └── googleOAuthService.js # Google OAuth service
├── config/               # Configuration files
│   └── database.js       # PostgreSQL connection and helpers
├── database/             # Database related files
│   ├── migrations/       # SQL migration files
│   └── migrator.js       # Migration management system
├── scripts/              # Utility scripts
│   ├── migrate.js        # Run migrations
│   ├── rollback.js       # Rollback migrations
│   └── setup-db.js       # Database setup script
└── docs/                 # Documentation
    └── POSTGRESQL.md      # Comprehensive PostgreSQL guide
```

## Features

- ✅ SMS authentication with verification codes
- ✅ Google OAuth integration
- ✅ JWT token-based authentication
- ✅ PostgreSQL database with connection pooling
- ✅ Database migrations system
- ✅ Express.js REST API
- ✅ Rate limiting and security middleware
- ✅ Modular structure for scalability
- ✅ Comprehensive error handling
- ✅ Soft delete functionality

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

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/account` - Delete user account

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

// Verify code
const validCode = await VerificationCode.findValidCode('+1234567890', '123456');
if (validCode) {
  await validCode.markAsUsed();
}
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
- 🔧 Installation, configuration, and troubleshooting
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

## TODO

- [x] Complete Twilio SMS integration (Verify API)
- [x] Add direct SMS messaging (Messages API)
- [ ] Complete Google OAuth implementation
- [ ] Add comprehensive input validation
- [ ] Add unit and integration tests
- [ ] Add API documentation (Swagger)
- [ ] Add logging system (Winston)
- [ ] Add email verification
- [ ] Add password reset functionality
- [ ] Add user roles and permissions
- [ ] Add rate limiting per user
- [ ] Add API versioning
- [ ] Add health check endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
