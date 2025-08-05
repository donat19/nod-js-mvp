const { query } = require('../config/database');

async function createDefaultAdmin() {
  try {
    console.log('Checking for admin users...');
    
    const result = await query(`
      SELECT id, name, email, phone, is_admin 
      FROM users 
      WHERE is_admin = true 
      LIMIT 5
    `);

    console.log('Current admin users:');
    console.table(result.rows);

    if (result.rows.length === 0) {
      console.log('\nNo admin users found. Creating default admin...');
      
      const admin = await query(`
        INSERT INTO users (name, email, phone, is_admin, created_at) 
        VALUES ('System Admin', 'admin@automax.com', '+1234567890', true, CURRENT_TIMESTAMP) 
        RETURNING *
      `);

      console.log('Default admin created:');
      console.table(admin.rows);
      
      return admin.rows[0].id;
    } else {
      console.log('\nAdmin users already exist.');
      console.table(result.rows);
      
      return result.rows[0].id;
    }

  } catch (error) {
    console.error('❌ Error setting up admin user:', error.message);
    process.exit(1);
  }
}

async function main() {
  const adminId = await createDefaultAdmin();
  console.log(`\n✅ Admin user setup complete! Admin ID: ${adminId}`);
  process.exit(0);
}

main();
