#!/usr/bin/env node

/**
 * Secure Admin Access Token Generator
 * Generates time-limited admin access tokens for enhanced security
 * Usage: node scripts/generate-admin-access.js [duration-minutes]
 */

const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../config/logger');

class AdminAccessGenerator {
  constructor() {
    this.defaultDuration = 30; // 30 minutes default
    this.maxDuration = 120; // 2 hours maximum
  }

  /**
   * Generate a cryptographically secure admin access token
   */
  generateSecureToken() {
    // Generate 32 bytes of random data
    const tokenBytes = crypto.randomBytes(32);
    
    // Convert to URL-safe base64
    const token = tokenBytes
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return token;
  }

  /**
   * Generate a time-based secure code
   */
  generateTimeBasedCode() {
    const timestamp = Math.floor(Date.now() / 1000);
    const secret = process.env.ADMIN_SECRET || 'default-secret-change-in-production';
    
    // Create HMAC with timestamp
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(timestamp.toString());
    
    const hash = hmac.digest('hex');
    
    // Take first 8 characters for a shorter code
    return hash.substring(0, 8).toUpperCase();
  }

  /**
   * Store admin access token in database
   */
  async storeAdminToken(token, durationMinutes, adminCode) {
    try {
      const expiresAt = new Date(Date.now() + (durationMinutes * 60 * 1000));
      
      // Clean up expired tokens first
      await query(`
        DELETE FROM admin_access_tokens 
        WHERE expires_at < CURRENT_TIMESTAMP
      `);
      
      // Store new token
      const result = await query(`
        INSERT INTO admin_access_tokens (
          token, 
          admin_code, 
          expires_at, 
          created_at,
          used,
          created_by_terminal
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, false, true)
        RETURNING id, token, admin_code, expires_at
      `, [token, adminCode, expiresAt]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error storing admin token:', error);
      throw error;
    }
  }

  /**
   * Generate admin access link with token
   */
  generateAdminLink(token, adminCode, expiresAt) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const adminPath = `/admin-secure-access?token=${token}&code=${adminCode}`;
    
    return {
      fullUrl: `${baseUrl}${adminPath}`,
      token: token,
      adminCode: adminCode,
      expiresAt: expiresAt,
      validFor: this.getTimeUntilExpiry(expiresAt)
    };
  }

  /**
   * Get human-readable time until expiry
   */
  getTimeUntilExpiry(expiresAt) {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;
    
    if (diffMs <= 0) return 'Expired';
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Display formatted output to terminal
   */
  displayAccessInfo(linkInfo) {
    console.log('\n' + '='.repeat(70));
    console.log('🔐 SECURE ADMIN ACCESS GENERATED');
    console.log('='.repeat(70));
    console.log(`
📋 Admin Access Details:
   🔗 URL: ${linkInfo.fullUrl}
   🎫 Token: ${linkInfo.token}
   🔢 Code: ${linkInfo.adminCode}
   ⏰ Expires: ${linkInfo.expiresAt.toLocaleString()}
   ⏳ Valid for: ${linkInfo.validFor}

⚠️  SECURITY NOTICE:
   • This link expires automatically in ${linkInfo.validFor}
   • One-time use only (becomes invalid after first use)
   • Do not share this link via insecure channels
   • Access is logged for security auditing

🚀 Quick Access:
   ${linkInfo.fullUrl}
    `);
    console.log('='.repeat(70) + '\n');
  }

  /**
   * Main generation function
   */
  async generateAdminAccess(durationMinutes = null) {
    try {
      // Validate duration
      const duration = durationMinutes || this.defaultDuration;
      if (duration > this.maxDuration) {
        throw new Error(`Duration cannot exceed ${this.maxDuration} minutes`);
      }

      // Generate secure components
      const token = this.generateSecureToken();
      const adminCode = this.generateTimeBasedCode();

      // Store in database
      const tokenRecord = await this.storeAdminToken(token, duration, adminCode);

      // Generate access link
      const linkInfo = this.generateAdminLink(
        tokenRecord.token, 
        tokenRecord.admin_code, 
        tokenRecord.expires_at
      );

      // Display to terminal
      this.displayAccessInfo(linkInfo);

      // Log generation
      logger.info('Admin access token generated', {
        tokenId: tokenRecord.id,
        duration: duration,
        expiresAt: tokenRecord.expires_at,
        generatedFromTerminal: true
      });

      return linkInfo;

    } catch (error) {
      console.error('❌ Error generating admin access:', error.message);
      logger.error('Admin access generation failed:', error);
      process.exit(1);
    }
  }
}

// CLI functionality
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const durationArg = args[0];
    
    let duration = null;
    if (durationArg) {
      duration = parseInt(durationArg);
      if (isNaN(duration) || duration <= 0) {
        console.error('❌ Invalid duration. Please provide a positive number of minutes.');
        process.exit(1);
      }
    }

    // Generate admin access
    const generator = new AdminAccessGenerator();
    await generator.generateAdminAccess(duration);

    // Exit successfully
    process.exit(0);

  } catch (error) {
    console.error('❌ Failed to generate admin access:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = AdminAccessGenerator;
