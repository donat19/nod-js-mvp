const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

class DatabaseMigrator {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  // Create migrations table to track applied migrations
  async createMigrationsTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    try {
      await query(createTableSQL);
      console.log('Migrations table created successfully');
    } catch (error) {
      console.error('Error creating migrations table:', error);
      throw error;
    }
  }

  // Get list of applied migrations
  async getAppliedMigrations() {
    try {
      const result = await query('SELECT filename FROM migrations ORDER BY applied_at');
      return result.rows.map(row => row.filename);
    } catch (error) {
      console.error('Error getting applied migrations:', error);
      return [];
    }
  }

  // Get list of migration files
  getMigrationFiles() {
    try {
      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();
      return files;
    } catch (error) {
      console.error('Error reading migration files:', error);
      return [];
    }
  }

  // Apply a single migration
  async applyMigration(filename) {
    const filePath = path.join(this.migrationsPath, filename);
    
    try {
      const migrationSQL = fs.readFileSync(filePath, 'utf8');
      
      // Execute the migration
      await query(migrationSQL);
      
      // Record the migration as applied
      await query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      console.log(`✅ Applied migration: ${filename}`);
    } catch (error) {
      console.error(`❌ Error applying migration ${filename}:`, error);
      throw error;
    }
  }

  // Run all pending migrations
  async migrate() {
    try {
      console.log('🚀 Starting database migration...');
      
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Get applied migrations and available migration files
      const appliedMigrations = await this.getAppliedMigrations();
      const migrationFiles = this.getMigrationFiles();
      
      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(
        file => !appliedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations found. Database is up to date.');
        return;
      }
      
      console.log(`📄 Found ${pendingMigrations.length} pending migration(s):`);
      pendingMigrations.forEach(file => console.log(`  - ${file}`));
      
      // Apply each pending migration
      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
      }
      
      console.log('✅ All migrations completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  // Rollback last migration (basic implementation)
  async rollback() {
    try {
      const result = await query(
        'SELECT filename FROM migrations ORDER BY applied_at DESC LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        console.log('No migrations to rollback');
        return;
      }
      
      const lastMigration = result.rows[0].filename;
      console.log(`⚠️ Rolling back migration: ${lastMigration}`);
      
      // Remove from migrations table
      await query('DELETE FROM migrations WHERE filename = $1', [lastMigration]);
      
      console.log('⚠️ Note: SQL rollback must be done manually. Check your migration file for rollback instructions.');
      
    } catch (error) {
      console.error('Error during rollback:', error);
      throw error;
    }
  }
}

module.exports = DatabaseMigrator;
