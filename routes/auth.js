const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const smsService = require('../services/smsService');
const SessionService = require('../services/sessionService');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// SMS Login - Send verification code
router.post('/sms/send', [
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone } = req.body;
    
    // Check if user already exists
    let user = await User.findByPhone(phone);
    let isExistingUser = !!user;
    
    // Send SMS using your Twilio configuration
    const result = await smsService.sendVerificationCode(phone);
    
    if (result.success) {
      res.json({ 
        message: result.message,
        phone: phone,
        status: result.status,
        isExistingUser: isExistingUser,
        method: result.method,
        userInfo: isExistingUser ? {
          name: user.name,
          email: user.email,
          created_at: user.created_at
        } : null
      });
    } else {
      res.status(500).json({ 
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('SMS send error:', error);
    res.status(500).json({ message: 'Failed to send SMS' });
  }
});

// SMS Login - Send unique verification code (anti-collision)
router.post('/sms/send-unique', [
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone } = req.body;
    
    // Check if user already exists
    let user = await User.findByPhone(phone);
    let isExistingUser = !!user;
    
    // Send unique verification code using custom system
    const result = await smsService.sendUniqueVerificationCode(phone);
    
    if (result.success) {
      res.json({ 
        message: result.message,
        phone: phone,
        status: result.status,
        isExistingUser: isExistingUser,
        method: result.method,
        codeKey: result.codeKey,
        userInfo: isExistingUser ? {
          name: user.name,
          email: user.email,
          created_at: user.created_at
        } : null
      });
    } else {
      res.status(500).json({ 
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Unique SMS send error:', error);
    res.status(500).json({ message: 'Failed to send unique verification code' });
  }
});

// SMS Login - Verify code
router.post('/sms/verify', [
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number'),
  body('code').isLength({ min: 4, max: 6 }).withMessage('Verification code must be 4-6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, code } = req.body;
    
    // Verify code using your Twilio configuration
    const verificationResult = await smsService.verifyCode(phone, code);
    
    if (verificationResult.success) {
      // Find or create user
      let user = await User.findByPhone(phone);
      let isNewUser = false;
      
      if (!user) {
        // Create new user if doesn't exist
        user = await User.create({
          phone: phone,
          is_verified: true
        });
        isNewUser = true;
        
        // Send welcome message to new users
        try {
          const userName = user.name || 'User';
          await smsService.sendWelcomeMessage(phone, userName);
        } catch (welcomeError) {
          console.error('Failed to send welcome message:', welcomeError);
          // Don't fail the registration if welcome message fails
        }
      } else {
        // Mark existing user as verified
        await user.verify();
      }
      
      // Generate JWT token and set session
      const token = SessionService.setUserSession(req, user);
      
      res.json({ 
        message: isNewUser ? 'Account created and phone number verified successfully' : 'Welcome back! Phone number verified successfully',
        token: token,
        user: user.toJSON(),
        isNewUser: isNewUser,
        status: verificationResult.status,
        sessionSet: true
      });
    } else {
      res.status(400).json({ 
        message: verificationResult.message,
        status: verificationResult.status
      });
    }
  } catch (error) {
    console.error('SMS verify error:', error);
    res.status(500).json({ message: 'Failed to verify code' });
  }
});

// SMS Login - Resend verification code
router.post('/sms/resend', [
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone } = req.body;
    
    // Send SMS using your Twilio configuration
    const result = await smsService.sendVerificationCode(phone);
    
    if (result.success) {
      res.json({ 
        message: 'Verification code resent successfully',
        phone: phone,
        status: result.status
      });
    } else {
      res.status(500).json({ 
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('SMS resend error:', error);
    res.status(500).json({ message: 'Failed to resend SMS' });
  }
});

// Direct SMS - Send custom message
router.post('/sms/send-direct', [
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number'),
  body('message').notEmpty().withMessage('Message cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, message } = req.body;
    
    // Send direct SMS using Twilio Messages API
    const result = await smsService.sendDirectMessage(phone, message);
    
    if (result.success) {
      res.json({ 
        message: 'SMS sent successfully',
        phone: phone,
        status: result.status,
        messageSid: result.messageSid
      });
    } else {
      res.status(500).json({ 
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Direct SMS send error:', error);
    res.status(500).json({ message: 'Failed to send SMS' });
  }
});

// Send welcome SMS to user
router.post('/sms/welcome', [
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number'),
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, name } = req.body;
    
    // Send welcome SMS
    const result = await smsService.sendWelcomeMessage(phone, name);
    
    if (result.success) {
      res.json({ 
        message: 'Welcome SMS sent successfully',
        phone: phone,
        status: result.status,
        messageSid: result.messageSid
      });
    } else {
      res.status(500).json({ 
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Welcome SMS send error:', error);
    res.status(500).json({ message: 'Failed to send welcome SMS' });
  }
});

// Google OAuth - Initiate
router.get('/google', (req, res) => {
  // TODO: Implement Google OAuth redirect
  const googleAuthURL = 'https://accounts.google.com/oauth/authorize'; // TODO: Build proper URL
  res.redirect(googleAuthURL);
});

// Google OAuth - Callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    // TODO: Exchange code for tokens
    // TODO: Get user info from Google
    // TODO: Create or find user in database
    // TODO: Generate JWT token
    
    res.redirect('/dashboard?token=jwt_token_here');
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect('/login?error=oauth_failed');
  }
});

// Logout
router.post('/logout', (req, res) => {
  // Clear session cookie
  SessionService.clearUserSession(req);
  res.json({ 
    message: 'Logged out successfully',
    sessionCleared: true
  });
});

// Check session status
router.get('/session', async (req, res) => {
  try {
    const sessionInfo = SessionService.getSessionInfo(req);
    
    if (!sessionInfo) {
      return res.json({
        authenticated: false,
        session: null
      });
    }

    // Get fresh user data to ensure session is still valid
    const user = await SessionService.getUserFromSession(req);
    
    if (!user) {
      return res.json({
        authenticated: false,
        session: null
      });
    }

    // Refresh session with current user data
    await SessionService.refreshUserSession(req, user);
    
    res.json({
      authenticated: true,
      session: SessionService.getSessionInfo(req),
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({ 
      message: 'Error checking session',
      authenticated: false 
    });
  }
});

// Verify token (supports both JWT and session)
router.get('/verify', async (req, res) => {
  try {
    // First check session
    const user = await SessionService.getUserFromSession(req);
    
    if (user) {
      return res.json({ 
        message: 'Session is valid', 
        user: user.toJSON(),
        valid: true,
        method: 'session'
      });
    }

    // Fallback to JWT token verification
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token or session provided' });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data from database
    const tokenUser = await User.findById(decoded.id);
    
    if (!tokenUser) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!tokenUser.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    res.json({ 
      message: 'Token is valid', 
      user: tokenUser.toJSON(),
      valid: true,
      method: 'jwt'
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid or expired token/session' });
  }
});

// Get current user profile (supports both session and JWT)
router.get('/profile', async (req, res) => {
  try {
    // First check session
    let user = await SessionService.getUserFromSession(req);
    let method = 'session';
    
    // Fallback to JWT token if no session
    if (!user) {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ message: 'No token or session provided' });
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get fresh user data from database
      user = await User.findById(decoded.id);
      method = 'jwt';
    }
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    res.json({ 
      user: user.toJSON(),
      valid: true,
      method: method,
      session: method === 'session' ? SessionService.getSessionInfo(req) : null
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(401).json({ message: 'Invalid or expired token/session' });
  }
});

// Update user profile (supports both session and JWT)
router.put('/profile', [
  body('name').optional().isLength({ min: 1 }).withMessage('Name must not be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // First check session
    let user = await SessionService.getUserFromSession(req);
    let method = 'session';
    
    // Fallback to JWT token if no session
    if (!user) {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ message: 'No token or session provided' });
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get fresh user data from database
      user = await User.findById(decoded.id);
      method = 'jwt';
    }
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Update user fields if provided
    const { name, email } = req.body;
    
    if (name !== undefined) {
      user.name = name;
    }
    
    if (email !== undefined) {
      user.email = email;
    }
    
    // Save updated user
    await user.save();
    
    // If using session, refresh the session with updated user data
    if (method === 'session') {
      await SessionService.refreshUserSession(req, user);
    }
    
    res.json({ 
      message: 'Profile updated successfully',
      user: user.toJSON(),
      method: method,
      session: method === 'session' ? SessionService.getSessionInfo(req) : null
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

module.exports = router;
