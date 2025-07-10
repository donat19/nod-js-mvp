const { query, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.phone = data.phone;
    this.email = data.email;
    this.name = data.name;
    this.google_id = data.google_id;
    this.is_verified = data.is_verified || false;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Static methods for database operations

  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
        [id]
      );
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByPhone(phone) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE phone = $1 AND is_active = TRUE',
        [phone]
      );
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding user by phone:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
        [email]
      );
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findByGoogleId(googleId) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE google_id = $1 AND is_active = TRUE',
        [googleId]
      );
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding user by Google ID:', error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      const { phone, email, name, google_id, password } = userData;
      
      // Hash password if provided
      let password_hash = null;
      if (password) {
        password_hash = await bcrypt.hash(password, 10);
      }

      const result = await query(
        `INSERT INTO users (phone, email, name, google_id, password_hash) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [phone, email, name, google_id, password_hash]
      );

      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async getAll(limit = 50, offset = 0) {
    try {
      const result = await query(
        'SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return result.rows.map(row => new User(row));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Instance methods

  async save() {
    try {
      if (this.id) {
        // Update existing user
        const result = await query(
          `UPDATE users 
           SET phone = $1, email = $2, name = $3, is_verified = $4, updated_at = CURRENT_TIMESTAMP
           WHERE id = $5 
           RETURNING *`,
          [this.phone, this.email, this.name, this.is_verified, this.id]
        );
        
        if (result.rows.length > 0) {
          Object.assign(this, result.rows[0]);
        }
      } else {
        // Create new user (this should use the static create method instead)
        throw new Error('Use User.create() for new users');
      }
      
      return this;
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  async delete() {
    try {
      // Soft delete - mark as inactive
      await query(
        'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [this.id]
      );
      
      this.is_active = false;
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async verify() {
    try {
      this.is_verified = true;
      await this.save();
      return this;
    } catch (error) {
      console.error('Error verifying user:', error);
      throw error;
    }
  }

  async validatePassword(password) {
    try {
      if (!this.password_hash) {
        return false;
      }
      return await bcrypt.compare(password, this.password_hash);
    } catch (error) {
      console.error('Error validating password:', error);
      return false;
    }
  }

  // Return user data without sensitive information
  toJSON() {
    return {
      id: this.id,
      phone: this.phone,
      email: this.email,
      name: this.name,
      is_verified: this.is_verified,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Return minimal user data for JWT tokens
  toTokenPayload() {
    return {
      id: this.id,
      phone: this.phone,
      email: this.email,
      is_verified: this.is_verified
    };
  }
}

module.exports = User;
