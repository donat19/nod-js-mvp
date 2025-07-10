const { testConnection } = require('../config/database');
const DatabaseMigrator = require('../database/migrator');
require('dotenv').config();

async function setupDatabase() {
  console.log('🔧 Setting up database...');
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Could not connect to database. Please check:');
      console.error('  - PostgreSQL is running');
      console.error('  - Database credentials in .env are correct');
      console.error('  - Database exists (create it manually if needed)');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful!');
    
    // Run migrations
    console.log('🚀 Running database migrations...');
    const migrator = new DatabaseMigrator();
    await migrator.migrate();
    
    console.log('✅ Database setup completed successfully!');
    console.log('🎉 Your database is ready to use!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

setupDatabase();
