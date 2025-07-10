const { query } = require('../config/database');

class VerificationCode {
  constructor(data) {
    this.id = data.id;
    this.phone = data.phone;
    this.code = data.code;
    this.expires_at = data.expires_at;
    this.used = data.used || false;
    this.created_at = data.created_at;
  }

  static async create(phone, code, expiresInMinutes = 5) {
    try {
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
      
      const result = await query(
        `INSERT INTO verification_codes (phone, code, expires_at) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [phone, code, expiresAt]
      );

      return new VerificationCode(result.rows[0]);
    } catch (error) {
      console.error('Error creating verification code:', error);
      throw error;
    }
  }

  static async findValidCode(phone, code) {
    try {
      const result = await query(
        `SELECT * FROM verification_codes 
         WHERE phone = $1 AND code = $2 AND used = FALSE AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC 
         LIMIT 1`,
        [phone, code]
      );

      return result.rows.length > 0 ? new VerificationCode(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding verification code:', error);
      throw error;
    }
  }

  static async cleanupExpired() {
    try {
      const result = await query(
        'DELETE FROM verification_codes WHERE expires_at < CURRENT_TIMESTAMP'
      );
      console.log(`Cleaned up ${result.rowCount} expired verification codes`);
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
      throw error;
    }
  }

  async markAsUsed() {
    try {
      await query(
        'UPDATE verification_codes SET used = TRUE WHERE id = $1',
        [this.id]
      );
      this.used = true;
      return this;
    } catch (error) {
      console.error('Error marking verification code as used:', error);
      throw error;
    }
  }

  isValid() {
    return !this.used && new Date() < new Date(this.expires_at);
  }
}

module.exports = VerificationCode;
