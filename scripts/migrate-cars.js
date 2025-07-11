const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigration() {
  try {
    console.log('Running cars table migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '003_create_cars_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await query(migrationSQL);
    
    console.log('✅ Cars table migration completed successfully!');
    console.log('Database now includes:');
    console.log('- cars table with all necessary fields');
    console.log('- car_inquiries table for customer inquiries');
    console.log('- saved_cars table for user favorites');
    console.log('- Views: available_cars, featured_cars');
    console.log('- Proper indexes for performance');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
