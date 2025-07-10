const DatabaseMigrator = require('../database/migrator');
require('dotenv').config();

async function runMigrations() {
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.migrate();
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
