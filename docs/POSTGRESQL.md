# PostgreSQL Database Documentation

This document provides comprehensive instructions for setting up and using PostgreSQL with your Node.js MVP application.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Configuration](#configuration)
5. [Running Migrations](#running-migrations)
6. [Using the Database](#using-the-database)
7. [Common Operations](#common-operations)
8. [Troubleshooting](#troubleshooting)
9. [Database Schema](#database-schema)

## 🔧 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

## 📦 Installation

### 1. Install PostgreSQL

#### Windows:
1. Download PostgreSQL from [official website](https://www.postgresql.org/download/windows/)
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. Default port is `5432`

#### macOS:
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Or using MacPorts
sudo port install postgresql14 +universal
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Install Node.js Dependencies

```bash
npm install
```

## 🗄️ Database Setup

### 1. Create Database

Connect to PostgreSQL and create your database:

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Create database
CREATE DATABASE nodejs_mvp;

# Create a user for your application (optional but recommended)
CREATE USER your_app_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE nodejs_mvp TO your_app_user;

# Exit psql
\q
```

### 2. Configure Environment Variables

Update your `.env` file with your database credentials:

```env
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nodejs_mvp
DB_USER=postgres  # or your_app_user
DB_PASSWORD=your_postgres_password
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/nodejs_mvp
```

## ⚙️ Configuration

The database configuration is located in `config/database.js`. It includes:

- **Connection Pool**: Manages multiple database connections efficiently
- **Error Handling**: Proper error logging and handling
- **Query Helper**: Simplified query execution with logging
- **Transaction Support**: Helper for database transactions

### Connection Pool Settings:
- **max**: 20 connections (adjustable based on your needs)
- **idleTimeoutMillis**: 30 seconds
- **connectionTimeoutMillis**: 2 seconds

## 🔄 Running Migrations

Migrations help you manage database schema changes over time.

### Available Migration Commands:

```bash
# Run all pending migrations
npm run migrate

# Alternative command
npm run db:migrate

# Setup database (test connection + run migrations)
npm run db:setup

# Rollback last migration
npm run db:rollback
```

### Creating New Migrations:

1. Create a new SQL file in `database/migrations/` with format: `002_description.sql`
2. Write your SQL commands
3. Run `npm run migrate`

Example migration file (`database/migrations/002_add_user_preferences.sql`):
```sql
-- Migration: Add user preferences table
-- Date: 2025-07-09

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

## 💾 Using the Database

### User Model Examples:

```javascript
const User = require('./models/User');

// Create a new user
const newUser = await User.create({
  phone: '+1234567890',
  email: 'user@example.com',
  name: 'John Doe'
});

// Find user by phone
const user = await User.findByPhone('+1234567890');

// Find user by email
const user = await User.findByEmail('user@example.com');

// Update user
user.name = 'John Smith';
await user.save();

// Verify user
await user.verify();

// Delete user (soft delete)
await user.delete();

// Get all users with pagination
const users = await User.getAll(10, 0); // limit 10, offset 0
```

### Direct Database Queries:

```javascript
const { query, transaction } = require('./config/database');

// Simple query
const result = await query('SELECT * FROM users WHERE id = $1', [userId]);

// Transaction example
await transaction(async (client) => {
  await client.query('INSERT INTO users (name) VALUES ($1)', ['John']);
  await client.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [userId]);
});
```

### Verification Codes:

```javascript
const VerificationCode = require('./models/VerificationCode');

// Create verification code
const code = await VerificationCode.create('+1234567890', '123456', 5); // 5 minutes

// Verify code
const validCode = await VerificationCode.findValidCode('+1234567890', '123456');
if (validCode) {
  await validCode.markAsUsed();
}

// Cleanup expired codes
await VerificationCode.cleanupExpired();
```

## 🔄 Common Operations

### Database Backup:
```bash
# Create backup
pg_dump -U postgres -h localhost nodejs_mvp > backup.sql

# Restore backup
psql -U postgres -h localhost nodejs_mvp < backup.sql
```

### Database Reset (Development Only):
```bash
# Connect to PostgreSQL
psql -U postgres

# Drop and recreate database
DROP DATABASE nodejs_mvp;
CREATE DATABASE nodejs_mvp;
\q

# Run migrations again
npm run db:setup
```

### Viewing Database:
```bash
# Connect to your database
psql -U postgres -d nodejs_mvp

# List tables
\dt

# Describe table structure
\d users

# View data
SELECT * FROM users LIMIT 5;

# Exit
\q
```

## 🐛 Troubleshooting

### Common Issues:

#### 1. Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: 
- Ensure PostgreSQL is running: `brew services start postgresql` (macOS) or `sudo systemctl start postgresql` (Linux)
- Check if PostgreSQL is listening on port 5432

#### 2. Authentication Failed
```
Error: password authentication failed for user "postgres"
```
**Solution**:
- Reset PostgreSQL password
- Check credentials in `.env` file
- Ensure user has proper permissions

#### 3. Database Does Not Exist
```
Error: database "nodejs_mvp" does not exist
```
**Solution**:
- Create the database manually using `psql`
- Run `npm run db:setup`

#### 4. Migration Fails
```
Error applying migration: relation "users" already exists
```
**Solution**:
- Check if migration was already applied
- Use `npm run db:rollback` if needed
- Manually fix database state

### Useful Commands:

```bash
# Check PostgreSQL status
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Start PostgreSQL
brew services start postgresql        # macOS
sudo systemctl start postgresql       # Linux

# Restart PostgreSQL
brew services restart postgresql      # macOS
sudo systemctl restart postgresql     # Linux

# View PostgreSQL logs
tail -f /usr/local/var/log/postgres.log  # macOS
sudo journalctl -u postgresql -f         # Linux
```

## 📊 Database Schema

### Current Tables:

#### `users`
- `id` (UUID, Primary Key)
- `phone` (VARCHAR, Unique)
- `email` (VARCHAR, Unique) 
- `name` (VARCHAR)
- `google_id` (VARCHAR, Unique)
- `password_hash` (VARCHAR)
- `is_verified` (BOOLEAN)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `verification_codes`
- `id` (UUID, Primary Key)
- `phone` (VARCHAR)
- `code` (VARCHAR)
- `expires_at` (TIMESTAMP)
- `used` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### `user_sessions`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `token_hash` (VARCHAR)
- `expires_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `last_used_at` (TIMESTAMP)

#### `migrations`
- `id` (SERIAL, Primary Key)
- `filename` (VARCHAR)
- `applied_at` (TIMESTAMP)

### Views:

#### `user_profiles`
Safe view of user data excluding sensitive information.

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Connection Pooling**: Use connection pools for better performance
3. **Prepared Statements**: Always use parameterized queries (`$1`, `$2`, etc.)
4. **Soft Deletes**: Mark records as inactive instead of hard deletes
5. **Indexes**: Add indexes for frequently queried columns
6. **Backups**: Regular database backups
7. **User Permissions**: Create specific database users with limited permissions

## 🚀 Production Considerations

1. **Environment**: Set `NODE_ENV=production`
2. **SSL**: Enable SSL for database connections
3. **Connection Limits**: Adjust pool size based on server capacity
4. **Monitoring**: Set up database monitoring and alerting
5. **Backups**: Automated daily backups
6. **Logging**: Configure proper log rotation

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg library](https://node-postgres.com/)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl-best-practices.html)

---

For support or questions, refer to the main README.md or contact your development team.
