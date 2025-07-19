// Temporary SQLite database configuration for testing
// Use this if PostgreSQL password reset is taking too long

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create SQLite database
const dbPath = path.join(__dirname, '..', 'database', 'automax.sqlite');
const db = new sqlite3.Database(dbPath);

// Helper function to execute queries
const query = async (text, params = []) => {
  return new Promise((resolve, reject) => {
    if (text.toUpperCase().startsWith('SELECT')) {
      db.all(text, params, (err, rows) => {
        if (err) {
          console.error('SQLite query error:', err);
          reject(err);
        } else {
          resolve({ rows, rowCount: rows.length });
        }
      });
    } else {
      db.run(text, params, function(err) {
        if (err) {
          console.error('SQLite query error:', err);
          reject(err);
        } else {
          resolve({ rowCount: this.changes, lastID: this.lastID });
        }
      });
    }
  });
};

// Test connection function
const testConnection = async () => {
  try {
    await query('SELECT 1 as test');
    console.log('SQLite database connection successful');
    return true;
  } catch (error) {
    console.error('SQLite database connection failed:', error.message);
    return false;
  }
};

// Initialize database tables
const initializeTables = async () => {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        phone TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create verification_codes table
    await query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('SQLite tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize SQLite tables:', error);
    return false;
  }
};

module.exports = {
  query,
  testConnection,
  initializeTables
};
