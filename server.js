const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const { testConnection } = require('./config/database');
const logger = require('./config/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const adminSecurityRoutes = require('./routes/adminSecurity');
const personalAdsRoutes = require('./routes/personalAds');
const imageRoutes = require('./routes/images');
const vinLookupRoutes = require('./routes/vinLookup');
const chatRoutes = require('./routes/chats');
const chatEnhancementsRoutes = require('./routes/chatEnhancements');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"]
    }
  }
}));

// HTTP request logging using Winston
app.use(morgan('combined', { stream: logger.stream }));

app.use(cors());
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Cookie session configuration
app.use(cookieSession({
  name: 'mvp-session',
  keys: [process.env.SESSION_SECRET || 'your-secret-key-change-in-production'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  httpOnly: true,
  sameSite: 'strict'
}));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Serve car data JSON file
app.get('/api/car-data', (req, res) => {
  const carDataPath = path.join(__dirname, 'all_car_json', 'car_data_with_specs.json');
  res.sendFile(carDataPath);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', adminSecurityRoutes.router);
app.use('/api/personal-ads', personalAdsRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/vin', vinLookupRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/chats', chatEnhancementsRoutes);

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', async (req, res) => {
  try {
    // Check for admin session
    const sessionToken = req.cookies.admin_session;
    
    if (!sessionToken) {
      // No admin session, redirect to generate access token
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Admin Access Required</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error-code { font-size: 72px; color: #dc3545; margin-bottom: 20px; }
            h1 { color: #343a40; margin-bottom: 20px; }
            p { color: #6c757d; margin-bottom: 30px; line-height: 1.6; }
            .command { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; margin: 20px 0; }
            .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-code">🔐</div>
            <h1>Admin Access Required</h1>
            <p>You need a valid admin session to access this panel. Please generate a secure access token from the server terminal.</p>
            <div class="command">
              <strong>Terminal Command:</strong><br>
              node scripts/generate-admin-access.js
            </div>
            <p>Or use the batch script:</p>
            <div class="command">
              scripts\\admin-access.bat generate
            </div>
            <a href="/" class="btn">Return to Home</a>
          </div>
        </body>
        </html>
      `);
    }

    // Validate admin session
    const { AdminSecurityService } = require('./routes/adminSecurity');
    const adminSecurity = new AdminSecurityService();
    const session = await adminSecurity.validateAdminSession(sessionToken);
    
    if (!session.valid) {
      // Invalid session, clear cookie and show access required
      res.clearCookie('admin_session');
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Session Expired</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error-code { font-size: 72px; color: #ffc107; margin-bottom: 20px; }
            h1 { color: #343a40; margin-bottom: 20px; }
            p { color: #6c757d; margin-bottom: 30px; line-height: 1.6; }
            .command { background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; margin: 20px 0; }
            .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-code">⏰</div>
            <h1>Admin Session Expired</h1>
            <p>Your admin session has expired or is invalid. Please generate a new access token from the server terminal.</p>
            <div class="command">
              <strong>Generate New Token:</strong><br>
              node scripts/generate-admin-access.js
            </div>
            <a href="/" class="btn">Return to Home</a>
          </div>
        </body>
        </html>
      `);
    }

    // Valid session, serve admin panel
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    
  } catch (error) {
    console.error('Error checking admin session:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/my-ads', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'my-ads.html'));
});

app.get('/chats', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chats.html'));
});

app.get('/ad/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ad-detail.html'));
});

// 404 handler
app.use((req, res) => {
  logger.warn('404 - Route not found', {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    clientIP: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  });
  
  // Check if it's an API request
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({ message: 'API route not found' });
  } else {
    // Serve 404.html for regular page requests
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled application error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers['user-agent'],
      clientIP: req.ip || req.connection.remoteAddress,
      body: req.body ? JSON.stringify(req.body) : undefined
    },
    timestamp: new Date().toISOString()
  });
  
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const http = require('http');
const ChatWebSocketServer = require('./services/chatWebSocketService');

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const chatWS = new ChatWebSocketServer(server);
app.chatWebSocket = chatWS; // Make it available to routes

server.listen(PORT, async () => {
  logger.info('Server starting up', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket chat server available at ws://localhost:${PORT}/ws/chat`);
  
  // Test database connection on startup
  const dbConnected = await testConnection();
  if (dbConnected) {
    logger.info('Database connection verified successfully');
    console.log('✅ Database connection verified');
  } else {
    logger.error('Database connection failed during startup');
    console.log('❌ Database connection failed - check your configuration');
  }
  
  logger.info('Server startup completed', {
    port: PORT,
    databaseConnected: dbConnected,
    webSocketEnabled: true,
    timestamp: new Date().toISOString()
  });
});
