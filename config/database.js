const { Pool } = require('pg');
const logger = require('./logger');
require('dotenv').config();

// PostgreSQL connection pool configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nodejs_mvp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test database connection
pool.on('connect', (client) => {
  logger.info('New PostgreSQL client connected', {
    processId: client.processID,
    timestamp: new Date().toISOString()
  });
});

pool.on('error', (err, client) => {
  logger.error('PostgreSQL connection error', {
    error: {
      message: err.message,
      code: err.code,
      severity: err.severity,
      detail: err.detail
    },
    processId: client ? client.processID : 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Database query executed', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration,
      rowCount: res.rowCount,
      paramCount: params ? params.length : 0,
      timestamp: new Date().toISOString()
    });
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Database query error', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      error: {
        message: error.message,
        code: error.code,
        severity: error.severity,
        detail: error.detail
      },
      duration,
      paramCount: params ? params.length : 0,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Helper function for transactions
const transaction = async (callback) => {
  const client = await pool.connect();
  const transactionId = Math.random().toString(36).substring(7);
  
  try {
    logger.debug('Database transaction started', {
      transactionId,
      timestamp: new Date().toISOString()
    });
    
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    
    logger.debug('Database transaction committed', {
      transactionId,
      timestamp: new Date().toISOString()
    });
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    
    logger.error('Database transaction rolled back', {
      transactionId,
      error: {
        message: error.message,
        code: error.code,
        severity: error.severity
      },
      timestamp: new Date().toISOString()
    });
    
    throw error;
  } finally {
    client.release();
  }
};

// Test connection function
const testConnection = async () => {
  try {
    const start = Date.now();
    const result = await query('SELECT NOW()');
    const duration = Date.now() - start;
    
    logger.info('Database connection test successful', {
      serverTime: result.rows[0].now,
      duration,
      timestamp: new Date().toISOString()
    });
    
    console.log('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    logger.error('Database connection test failed', {
      error: {
        message: error.message,
        code: error.code,
        severity: error.severity,
        detail: error.detail
      },
      timestamp: new Date().toISOString()
    });
    
    console.error('Database connection failed:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection
};
