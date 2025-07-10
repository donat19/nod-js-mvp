const DatabaseMigrator = require('../database/migrator');
require('dotenv').config();

async function rollbackMigration() {
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.rollback();
    console.log('✅ Rollback completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

rollbackMigration();
