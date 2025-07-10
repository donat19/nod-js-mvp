const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const smsService = require('../services/smsService');
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
      
      // Generate JWT token
      const token = jwt.sign(
        user.toTokenPayload(),
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ 
        message: isNewUser ? 'Account created and phone number verified successfully' : 'Welcome back! Phone number verified successfully',
        token: token,
        user: user.toJSON(),
        isNewUser: isNewUser,
        status: verificationResult.status
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
  // TODO: Implement logout logic (invalidate token, etc.)
  res.json({ message: 'Logged out successfully' });
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data from database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    res.json({ 
      message: 'Token is valid', 
      user: user.toJSON(),
      valid: true
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data from database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    res.json({ 
      user: user.toJSON(),
      valid: true
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
