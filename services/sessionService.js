// Session management service for user authentication

const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SessionService {
  // Set user session in cookie
  static setUserSession(req, user, token = null) {
    // Generate JWT token if not provided
    if (!token) {
      token = jwt.sign(
        user.toTokenPayload(),
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
    }

    // Store user session data in cookie
    req.session = {
      userId: user.id,
      userPhone: user.phone,
      userEmail: user.email,
      userName: user.name,
      isVerified: user.is_verified,
      isActive: user.is_active,
      isAdmin: user.is_admin,
      token: token,
      loginTime: new Date().toISOString()
    };

    return token;
  }

  // Get user from session
  static async getUserFromSession(req) {
    if (!req.session || !req.session.userId) {
      return null;
    }

    try {
      // Verify the token is still valid
      if (req.session.token) {
        jwt.verify(req.session.token, process.env.JWT_SECRET);
      }

      // Get fresh user data from database
      const user = await User.findById(req.session.userId);
      
      if (!user || !user.is_active) {
        // Clear invalid session
        this.clearUserSession(req);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Session validation error:', error);
      // Clear invalid session
      this.clearUserSession(req);
      return null;
    }
  }

  // Update session with fresh user data
  static async refreshUserSession(req, user = null) {
    if (!req.session || !req.session.userId) {
      return false;
    }

    try {
      // Get fresh user data if not provided
      if (!user) {
        user = await User.findById(req.session.userId);
        if (!user) {
          this.clearUserSession(req);
          return false;
        }
      }

      // Update session with fresh data
      req.session.userPhone = user.phone;
      req.session.userEmail = user.email;
      req.session.userName = user.name;
      req.session.isVerified = user.is_verified;
      req.session.isActive = user.is_active;
      req.session.isAdmin = user.is_admin;
      req.session.lastRefresh = new Date().toISOString();

      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }

  // Clear user session
  static clearUserSession(req) {
    if (req.session) {
      req.session = null;
    }
  }

  // Check if user is logged in
  static isLoggedIn(req) {
    return !!(req.session && req.session.userId && req.session.token);
  }

  // Check if user is admin
  static isAdmin(req) {
    return this.isLoggedIn(req) && req.session.isAdmin === true;
  }

  // Check if user is verified
  static isVerified(req) {
    return this.isLoggedIn(req) && req.session.isVerified === true;
  }

  // Get session info for client
  static getSessionInfo(req) {
    if (!this.isLoggedIn(req)) {
      return null;
    }

    return {
      userId: req.session.userId,
      phone: req.session.userPhone,
      email: req.session.userEmail,
      name: req.session.userName,
      isVerified: req.session.isVerified,
      isActive: req.session.isActive,
      isAdmin: req.session.isAdmin,
      loginTime: req.session.loginTime,
      lastRefresh: req.session.lastRefresh
    };
  }

  // Middleware to require authentication
  static requireAuth(req, res, next) {
    if (!SessionService.isLoggedIn(req)) {
      return res.status(401).json({ 
        message: 'Authentication required',
        authenticated: false 
      });
    }
    next();
  }

  // Middleware to require verified user
  static requireVerified(req, res, next) {
    if (!SessionService.isLoggedIn(req)) {
      return res.status(401).json({ 
        message: 'Authentication required',
        authenticated: false 
      });
    }

    if (!SessionService.isVerified(req)) {
      return res.status(403).json({ 
        message: 'Account verification required',
        verified: false 
      });
    }

    next();
  }

  // Middleware to require admin access
  static requireAdmin(req, res, next) {
    if (!SessionService.isLoggedIn(req)) {
      return res.status(401).json({ 
        message: 'Authentication required',
        authenticated: false 
      });
    }

    if (!SessionService.isAdmin(req)) {
      return res.status(403).json({ 
        message: 'Admin access required',
        admin: false 
      });
    }

    next();
  }

  // Middleware to load user from session
  static async loadUser(req, res, next) {
    req.user = await SessionService.getUserFromSession(req);
    next();
  }
}

module.exports = SessionService;
