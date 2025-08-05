const express = require('express');
const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../config/logger');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

/**
 * Secure Admin Access Route Handler
 * Handles time-limited admin access tokens generated from server terminal
 */

class AdminSecurityService {
  constructor() {
    this.maxSessionDuration = 4 * 60 * 60 * 1000; // 4 hours
    this.cleanupInterval = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Validate admin access token and code
   */
  async validateAdminToken(token, adminCode, clientInfo) {
    try {
      // Find the token in database
      const result = await query(`
        SELECT id, admin_code, expires_at, used, created_at
        FROM admin_access_tokens 
        WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
      `, [token]);

      if (result.rows.length === 0) {
        await this.logSecurityEvent('TOKEN_VALIDATION_FAILED', 'Token not found or expired', clientInfo);
        return { valid: false, reason: 'Token not found or expired' };
      }

      const tokenRecord = result.rows[0];

      // Check if token was already used
      if (tokenRecord.used) {
        await this.logSecurityEvent('TOKEN_REUSE_ATTEMPT', 'Attempt to reuse consumed token', clientInfo, { tokenId: tokenRecord.id });
        return { valid: false, reason: 'Token already used' };
      }

      // Validate admin code
      if (tokenRecord.admin_code !== adminCode) {
        await this.logSecurityEvent('ADMIN_CODE_MISMATCH', 'Invalid admin code provided', clientInfo, { tokenId: tokenRecord.id });
        return { valid: false, reason: 'Invalid admin code' };
      }

      // Mark token as used
      await query(`
        UPDATE admin_access_tokens 
        SET 
          used = true, 
          used_at = CURRENT_TIMESTAMP,
          used_by_ip = $1,
          used_by_user_agent = $2,
          access_granted = true
        WHERE id = $3
      `, [clientInfo.ip, clientInfo.userAgent, tokenRecord.id]);

      await this.logSecurityEvent('TOKEN_VALIDATION_SUCCESS', 'Admin token successfully validated', clientInfo, { tokenId: tokenRecord.id });

      return { 
        valid: true, 
        tokenId: tokenRecord.id,
        tokenRecord: tokenRecord
      };

    } catch (error) {
      logger.error('Error validating admin token:', error);
      await this.logSecurityEvent('TOKEN_VALIDATION_ERROR', error.message, clientInfo);
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Create secure admin session
   */
  async createAdminSession(userId, tokenId, clientInfo) {
    try {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + this.maxSessionDuration);

      const result = await query(`
        INSERT INTO admin_sessions (
          admin_user_id, token_id, session_token, ip_address, 
          user_agent, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, session_token, expires_at
      `, [userId, tokenId, sessionToken, clientInfo.ip, clientInfo.userAgent, expiresAt]);

      const session = result.rows[0];

      await this.logAdminActivity(userId, session.id, 'ADMIN_SESSION_CREATED', null, null, {
        sessionDuration: this.maxSessionDuration / 1000 / 60, // minutes
        expiresAt: expiresAt
      }, clientInfo);

      return {
        sessionId: session.id,
        sessionToken: session.session_token,
        expiresAt: session.expires_at
      };

    } catch (error) {
      logger.error('Error creating admin session:', error);
      throw error;
    }
  }

  /**
   * Validate admin session
   */
  async validateAdminSession(sessionToken) {
    try {
      const result = await query(`
        SELECT 
          s.id, s.admin_user_id, s.expires_at, s.is_active,
          u.id as user_id, u.name, u.email, u.phone, u.is_admin
        FROM admin_sessions s
        JOIN users u ON s.admin_user_id = u.id
        WHERE s.session_token = $1 
          AND s.is_active = true 
          AND s.expires_at > CURRENT_TIMESTAMP
      `, [sessionToken]);

      if (result.rows.length === 0) {
        return { valid: false, reason: 'Invalid or expired session' };
      }

      const session = result.rows[0];

      // Ensure user is admin
      if (!session.is_admin) {
        return { valid: false, reason: 'User is not an admin' };
      }

      // Update last activity
      await query(`
        UPDATE admin_sessions 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [session.id]);

      return {
        valid: true,
        sessionId: session.id,
        userId: session.user_id,
        user: {
          id: session.user_id,
          name: session.name,
          email: session.email,
          phone: session.phone,
          is_admin: session.is_admin
        }
      };

    } catch (error) {
      logger.error('Error validating admin session:', error);
      return { valid: false, reason: 'Session validation error' };
    }
  }

  /**
   * Log security events
   */
  async logSecurityEvent(action, details, clientInfo, additionalData = {}) {
    try {
      await query(`
        INSERT INTO admin_activity_log (
          action, details, ip_address, user_agent, success
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        action,
        JSON.stringify({ ...additionalData, details }),
        clientInfo.ip,
        clientInfo.userAgent,
        action.includes('SUCCESS')
      ]);
    } catch (error) {
      logger.error('Error logging security event:', error);
    }
  }

  /**
   * Log admin activity
   */
  async logAdminActivity(userId, sessionId, action, resource, resourceId, details, clientInfo) {
    try {
      await query(`
        INSERT INTO admin_activity_log (
          admin_user_id, session_id, action, resource, resource_id, 
          details, ip_address, user_agent, success
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
        userId, sessionId, action, resource, resourceId,
        JSON.stringify(details), clientInfo.ip, clientInfo.userAgent
      ]);
    } catch (error) {
      logger.error('Error logging admin activity:', error);
    }
  }

  /**
   * Get client information from request
   */
  getClientInfo(req) {
    return {
      ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown'
    };
  }
}

const adminSecurity = new AdminSecurityService();

/**
 * GET /admin-secure-access - Handle secure admin access with token - DIRECT ACCESS
 */
router.get('/admin-secure-access', async (req, res) => {
  try {
    const { token, code } = req.query;
    const clientInfo = adminSecurity.getClientInfo(req);

    // Validate required parameters
    if (!token || !code) {
      await adminSecurity.logSecurityEvent('ADMIN_ACCESS_INVALID_PARAMS', 'Missing token or code', clientInfo);
      return res.status(400).json({
        success: false,
        message: 'Invalid access parameters'
      });
    }

    // Validate token and code
    const validation = await adminSecurity.validateAdminToken(token, code, clientInfo);

    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        message: validation.reason
      });
    }

    // Create admin session automatically (no login required)
    // Get the first admin user from database
    const adminUserResult = await query(`
      SELECT id, name, email, phone, is_admin 
      FROM users 
      WHERE is_admin = true 
      ORDER BY created_at ASC 
      LIMIT 1
    `);

    if (adminUserResult.rows.length === 0) {
      await adminSecurity.logSecurityEvent('ADMIN_ACCESS_NO_ADMIN', 'No admin users found in database', clientInfo);
      return res.status(500).json({
        success: false,
        message: 'No admin users configured. Please run: node scripts/setup-admin.js'
      });
    }

    const adminUser = adminUserResult.rows[0];
    const session = await adminSecurity.createAdminSession(adminUser.id, validation.tokenId, clientInfo);

    // Set secure session cookie for immediate admin access
    res.cookie('admin_session', session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: adminSecurity.maxSessionDuration
    });

    // Log direct admin access
    await adminSecurity.logAdminActivity(
      adminUser.id,
      session.sessionId,
      'ADMIN_DIRECT_ACCESS',
      'admin_panel',
      null,
      { 
        tokenId: validation.tokenId,
        accessMethod: 'direct_token_access',
        bypassLogin: true,
        adminUser: { id: adminUser.id, name: adminUser.name, email: adminUser.email }
      },
      clientInfo
    );

    // Redirect directly to admin panel
    res.redirect('/admin.html');

  } catch (error) {
    logger.error('Error in secure admin access:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/admin-security/authenticate - Complete admin authentication after token validation
 */
router.post('/api/admin-security/authenticate', async (req, res) => {
  try {
    const { token, code, userId } = req.body;
    const clientInfo = adminSecurity.getClientInfo(req);

    // Validate token first
    const validation = await adminSecurity.validateAdminToken(token, code, clientInfo);
    
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        message: validation.reason
      });
    }

    // Verify user is admin
    const userResult = await query(`
      SELECT id, name, email, phone, is_admin 
      FROM users 
      WHERE id = $1 AND is_admin = true
    `, [userId]);

    if (userResult.rows.length === 0) {
      await adminSecurity.logSecurityEvent('ADMIN_AUTH_INVALID_USER', 'Non-admin user attempted access', clientInfo, { userId });
      return res.status(403).json({
        success: false,
        message: 'User is not authorized for admin access'
      });
    }

    const user = userResult.rows[0];

    // Create admin session
    const session = await adminSecurity.createAdminSession(userId, validation.tokenId, clientInfo);

    // Set secure session cookie
    res.cookie('admin_session', session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: adminSecurity.maxSessionDuration
    });

    res.json({
      success: true,
      message: 'Admin authentication successful',
      data: {
        user: user,
        sessionExpiresAt: session.expiresAt,
        adminPanelUrl: '/admin.html'
      }
    });

  } catch (error) {
    logger.error('Error in admin authentication:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
});

/**
 * Middleware to require admin session
 */
const requireAdminSession = async (req, res, next) => {
  try {
    const sessionToken = req.cookies.admin_session;
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Admin session required'
      });
    }

    const session = await adminSecurity.validateAdminSession(sessionToken);
    
    if (!session.valid) {
      res.clearCookie('admin_session');
      return res.status(401).json({
        success: false,
        message: session.reason
      });
    }

    req.adminSession = session;
    req.adminUser = session.user;
    next();

  } catch (error) {
    logger.error('Error validating admin session:', error);
    res.status(500).json({
      success: false,
      message: 'Session validation error'
    });
  }
};

/**
 * GET /api/admin-security/status - Check admin session status
 */
router.get('/api/admin-security/status', requireAdminSession, async (req, res) => {
  try {
    const clientInfo = adminSecurity.getClientInfo(req);
    
    await adminSecurity.logAdminActivity(
      req.adminUser.id,
      req.adminSession.sessionId,
      'ADMIN_STATUS_CHECK',
      null,
      null,
      { endpoint: '/api/admin-security/status' },
      clientInfo
    );

    res.json({
      success: true,
      data: {
        authenticated: true,
        user: req.adminUser,
        sessionId: req.adminSession.sessionId
      }
    });

  } catch (error) {
    logger.error('Error checking admin status:', error);
    res.status(500).json({
      success: false,
      message: 'Status check error'
    });
  }
});

/**
 * POST /api/admin-security/logout - Logout admin session
 */
router.post('/api/admin-security/logout', requireAdminSession, async (req, res) => {
  try {
    const clientInfo = adminSecurity.getClientInfo(req);

    // Revoke session
    await query(`
      UPDATE admin_sessions 
      SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'User logout'
      WHERE id = $1
    `, [req.adminSession.sessionId]);

    await adminSecurity.logAdminActivity(
      req.adminUser.id,
      req.adminSession.sessionId,
      'ADMIN_LOGOUT',
      null,
      null,
      { reason: 'User logout' },
      clientInfo
    );

    res.clearCookie('admin_session');

    res.json({
      success: true,
      message: 'Admin logout successful'
    });

  } catch (error) {
    logger.error('Error logging out admin:', error);
    res.status(500).json({
      success: false,
      message: 'Logout error'
    });
  }
});

/**
 * GET /api/admin-security/activity - Get admin activity log
 */
router.get('/api/admin-security/activity', requireAdminSession, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const clientInfo = adminSecurity.getClientInfo(req);

    const result = await query(`
      SELECT 
        l.id, l.action, l.resource, l.resource_id, l.details,
        l.ip_address, l.success, l.created_at,
        u.name as admin_name
      FROM admin_activity_log l
      LEFT JOIN users u ON l.admin_user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    await adminSecurity.logAdminActivity(
      req.adminUser.id,
      req.adminSession.sessionId,
      'ADMIN_ACTIVITY_VIEW',
      'admin_activity_log',
      null,
      { limit, offset },
      clientInfo
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching admin activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity log'
    });
  }
});

/**
 * GET /api/admin-security/overview - Get security overview
 */
router.get('/api/admin-security/overview', requireAdminSession, async (req, res) => {
  try {
    const clientInfo = adminSecurity.getClientInfo(req);

    const result = await query('SELECT * FROM admin_security_overview');

    await adminSecurity.logAdminActivity(
      req.adminUser.id,
      req.adminSession.sessionId,
      'ADMIN_SECURITY_OVERVIEW',
      'admin_security',
      null,
      {},
      clientInfo
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching security overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security overview'
    });
  }
});

module.exports = { 
  router, 
  requireAdminSession, 
  AdminSecurityService 
};
