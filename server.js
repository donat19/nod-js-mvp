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
const personalAdsRoutes = require('./routes/personalAds');
const imageRoutes = require('./routes/images');
const vinLookupRoutes = require('./routes/vinLookup');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"]
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
app.use('/api/personal-ads', personalAdsRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/vin', vinLookupRoutes);

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

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/my-ads', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'my-ads.html'));
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

app.listen(PORT, async () => {
  logger.info('Server starting up', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  
  console.log(`Server is running on http://localhost:${PORT}`);
  
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
    timestamp: new Date().toISOString()
  });
});
