# Logging Configuration

This application uses **Winston** for comprehensive logging across all components.

## Log Levels

- **error** (0): Critical errors that require immediate attention
- **warn** (1): Warning conditions that should be monitored
- **info** (2): General operational messages
- **http** (3): HTTP request/response logging
- **debug** (4): Detailed debugging information

## Log Outputs

### Development Environment
- **Console**: All log levels with colorized output
- **File**: `logs/debug.log` - Debug level and above (limited to 1MB, 2 files max)

### Production Environment
- **Console**: Warning level and above (no debug/info spam)
- **Files**:
  - `logs/error.log` - Error level only (5MB max, 5 files rotation)
  - `logs/combined.log` - All levels (5MB max, 5 files rotation)
  - `logs/exceptions.log` - Uncaught exceptions
  - `logs/rejections.log` - Unhandled promise rejections

## What Gets Logged

### VIN Lookup Route (`/api/vin/lookup`)
- **Request Start**: VIN lookup initiated with partial VIN, client IP, user agent
- **Validation**: VIN format validation failures with details
- **API Calls**: NHTSA API response times and status codes
- **Data Processing**: Number of fields extracted from VIN data
- **Errors**: Comprehensive error logging with VIN, client info, and error details
- **Success**: Vehicle info summary with processing time

### Database Operations
- **Connections**: New client connections with process ID
- **Queries**: Query execution time, row count, truncated query text
- **Transactions**: Start, commit, and rollback events with transaction IDs
- **Errors**: Detailed PostgreSQL error information

### Server Operations
- **Startup**: Server initialization, port, environment, database connection status
- **404 Errors**: Missing routes with request details
- **HTTP Requests**: All incoming requests via Morgan (combined format)
- **Unhandled Errors**: Application errors with full request context

## Log Format

### Console (Development)
```
2025-07-23 16:53:06 info: Server starting up
```

### File (JSON)
```json
{
  "level": "info",
  "message": "VIN lookup completed successfully",
  "vin": "1G1BC5SM...",
  "vehicle": "2018 Chevrolet Cruze",
  "fieldsReturned": 45,
  "totalDuration": 1250,
  "clientIP": "127.0.0.1",
  "timestamp": "2025-07-23 16:53:06"
}
```

## Environment Variables

- `LOG_LEVEL`: Override default log level (default: 'debug' in dev, 'info' in prod)
- `NODE_ENV`: Determines logging configuration ('production' vs 'development')

## Privacy & Security

- **VIN Privacy**: Only first 8 characters of VIN are logged for privacy
- **Error Context**: Full stack traces only in development environment
- **Sensitive Data**: No passwords, tokens, or sensitive user data in logs
- **Client Identification**: IP addresses and user agents logged for security monitoring

## Monitoring

In production, monitor these log patterns:
- High frequency of VIN lookup errors
- Database connection failures
- Unusual 404 patterns (potential attacks)
- Response time degradation in VIN lookups
- PostgreSQL error patterns

## Log Rotation

- **Development**: Manual cleanup recommended
- **Production**: Automatic rotation (5MB files, 5 files kept)
- **Exceptions/Rejections**: No automatic rotation (manual monitoring required)

## Example Log Entries

### Successful VIN Lookup
```json
{
  "level": "info",
  "message": "VIN lookup completed successfully",
  "vin": "1G1BC5SM...",
  "vehicle": "2018 Chevrolet Cruze",
  "fieldsReturned": 45,
  "totalDuration": 1250,
  "clientIP": "192.168.1.100",
  "timestamp": "2025-07-23 16:53:06"
}
```

### Database Error
```json
{
  "level": "error",
  "message": "Database query error",
  "query": "SELECT * FROM users WHERE...",
  "error": {
    "message": "relation \"users\" does not exist",
    "code": "42P01",
    "severity": "ERROR"
  },
  "duration": 15,
  "timestamp": "2025-07-23 16:53:06"
}
```

### VIN Lookup Error
```json
{
  "level": "error",
  "message": "VIN lookup error occurred",
  "vin": "1G1BC5SM...",
  "error": {
    "message": "timeout of 10000ms exceeded",
    "code": "ECONNABORTED"
  },
  "totalDuration": 10015,
  "clientIP": "192.168.1.100",
  "timestamp": "2025-07-23 16:53:06"
}
```
