// SMS service using Twilio Verify API and Messages API

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const crypto = require('crypto');

class SMSService {
  constructor() {
    this.client = require('twilio')(accountSid, authToken);
    // In-memory store for active verification codes to prevent collisions
    // In production, use Redis or database for distributed systems
    this.activeCodesCache = new Map();
    this.codeGenerationLock = new Map(); // Prevent concurrent generation for same phone
  }

  // Generate cryptographically secure unique verification code
  async generateUniqueVerificationCode(phoneNumber, retryCount = 0) {
    const MAX_RETRIES = 10;
    
    if (retryCount >= MAX_RETRIES) {
      throw new Error('Unable to generate unique verification code after maximum retries');
    }

    // Use crypto.randomInt for cryptographically secure random numbers
    const code = crypto.randomInt(100000, 999999).toString();
    
    // Check for collisions with all active codes (not just same phone)
    const isCodeInUse = Array.from(this.activeCodesCache.values()).some(entry => entry.code === code);
    
    if (isCodeInUse) {
      console.log(`Code collision detected: ${code}, retrying... (attempt ${retryCount + 1})`);
      // Exponential backoff to reduce collision probability
      const delay = Math.pow(2, retryCount) * 10; // 10ms, 20ms, 40ms, etc.
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.generateUniqueVerificationCode(phoneNumber, retryCount + 1);
    }

    // Add timestamp and metadata for better tracking
    const codeEntry = {
      code: code,
      phoneNumber: phoneNumber,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      used: false,
      attempts: 0
    };

    // Store the code with a unique key (phone + timestamp)
    const codeKey = `${phoneNumber}_${Date.now()}`;
    this.activeCodesCache.set(codeKey, codeEntry);

    // Clean up expired codes periodically
    this.cleanupExpiredCodes();

    console.log(`Generated unique code for ${phoneNumber}: ${code}`);
    return { code, codeKey };
  }

  // Clean up expired verification codes
  cleanupExpiredCodes() {
    const now = new Date();
    const expiredKeys = [];

    for (const [key, entry] of this.activeCodesCache.entries()) {
      if (entry.expiresAt < now || entry.used) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.activeCodesCache.delete(key);
    });

    console.log(`Cleaned up ${expiredKeys.length} expired/used verification codes`);
  }

  // Verify custom generated code
  async verifyCustomCode(phoneNumber, inputCode) {
    const formattedPhone = phoneNumber;
    let foundEntry = null;
    let foundKey = null;

    // Find the code entry for this phone number
    for (const [key, entry] of this.activeCodesCache.entries()) {
      if (entry.phoneNumber === formattedPhone && entry.code === inputCode && !entry.used) {
        // Check if code is still valid (not expired)
        if (entry.expiresAt > new Date()) {
          foundEntry = entry;
          foundKey = key;
          break;
        }
      }
    }

    if (!foundEntry) {
      return {
        success: false,
        message: 'Invalid or expired verification code',
        status: 'denied'
      };
    }

    // Increment attempt counter
    foundEntry.attempts++;

    // Mark code as used
    foundEntry.used = true;
    foundEntry.verifiedAt = new Date();

    console.log(`Code verified successfully for ${phoneNumber}: ${inputCode}`);

    return {
      success: true,
      message: 'Phone number verified',
      status: 'approved',
      codeKey: foundKey
    };
  }

  async sendVerificationCode(phoneNumber) {
    try {
      console.log(`Sending verification code to ${phoneNumber}`);
      
      // Use Twilio Verify API to send verification code
      const verification = await this.client.verify.v2.services(verifyServiceSid)
        .verifications
        .create({ to: phoneNumber, channel: 'sms' });

      console.log(`Verification sent: ${verification.status}`);
      
      return { 
        success: true, 
        message: 'Verification code sent',
        status: verification.status,
        sid: verification.sid,
        method: 'twilio_verify'
      };
    } catch (error) {
      console.error('SMS send error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to send SMS',
        error: error.code
      };
    }
  }

  // Send custom unique verification code via direct messaging
  async sendUniqueVerificationCode(phoneNumber) {
    try {
      console.log(`Sending unique verification code to ${phoneNumber}`);
      
      if (!twilioPhoneNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured');
      }
      
      // Prevent concurrent generation for the same phone number
      const lockKey = `lock_${phoneNumber}`;
      if (this.codeGenerationLock.has(lockKey)) {
        // Wait for existing generation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.sendUniqueVerificationCode(phoneNumber);
      }
      
      // Set lock for this phone number
      this.codeGenerationLock.set(lockKey, true);
      
      try {
        // Generate unique code
        const { code, codeKey } = await this.generateUniqueVerificationCode(phoneNumber);
        
        // Send via direct message
        const message = `Your verification code is: ${code}. This code expires in 10 minutes. Never share this code with anyone.`;
        const messageResult = await this.client.messages.create({
          body: message,
          from: twilioPhoneNumber,
          to: phoneNumber
        });

        console.log(`Unique verification code sent: ${messageResult.status} (SID: ${messageResult.sid})`);
        
        return { 
          success: true, 
          message: 'Verification code sent',
          status: messageResult.status,
          sid: messageResult.sid,
          codeKey: codeKey,
          method: 'custom_unique'
        };
      } finally {
        // Remove lock
        this.codeGenerationLock.delete(lockKey);
      }
      
    } catch (error) {
      console.error('Unique verification code send error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to send verification code',
        error: error.code
      };
    }
  }

  async verifyCode(phoneNumber, code) {
    try {
      console.log(`Verifying code for ${phoneNumber}: ${code}`);
      
      // First try to verify with custom code system
      const customResult = await this.verifyCustomCode(phoneNumber, code);
      
      if (customResult.success) {
        console.log(`Custom verification successful for ${phoneNumber}`);
        return customResult;
      }
      
      // If custom verification fails, try Twilio Verify API
      try {
        const verification_check = await this.client.verify.v2.services(verifyServiceSid)
          .verificationChecks
          .create({to: phoneNumber, code: code});
        
        console.log(`Twilio verification status: ${verification_check.status}`);
        
        const isValid = verification_check.status === 'approved';
        
        // Provide specific error messages based on status
        let message;
        if (isValid) {
          message = 'Phone number verified';
        } else if (verification_check.status === 'pending') {
          message = 'Invalid verification code. Please check the code and try again.';
        } else if (verification_check.status === 'max_attempts_reached') {
          message = 'Maximum verification attempts reached. Please request a new code.';
        } else {
          message = 'Invalid verification code. Please try again.';
        }
        
        return { 
          success: isValid, 
          message: message,
          status: verification_check.status,
          sid: verification_check.sid,
          method: 'twilio_verify'
        };
      } catch (twilioError) {
        console.error('Twilio verify error:', twilioError);
        
        // Handle specific Twilio errors
        let errorMessage = 'Failed to verify code';
        
        if (twilioError.code === 20404) {
          errorMessage = 'Verification code has expired. Please request a new code.';
        } else if (twilioError.code === 20429) {
          errorMessage = 'Too many verification attempts. Please wait before trying again.';
        } else if (twilioError.code === 60200) {
          errorMessage = 'Invalid verification code. Please check the code and try again.';
        } else if (twilioError.code === 60202) {
          errorMessage = 'Maximum verification attempts reached. Please request a new code.';
        } else if (twilioError.message) {
          errorMessage = twilioError.message;
        }
        
        return { 
          success: false, 
          message: errorMessage,
          error: twilioError.code,
          method: 'twilio_verify'
        };
      }
      
    } catch (error) {
      console.error('SMS verify error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to verify code',
        error: error.code
      };
    }
  }

  // Helper method to check verification status
  async getVerificationStatus(phoneNumber) {
    try {
      const verifications = await this.client.verify.v2.services(verifyServiceSid)
        .verifications
        .list({ to: phoneNumber, limit: 1 });
      
      return verifications.length > 0 ? verifications[0] : null;
    } catch (error) {
      console.error('Error getting verification status:', error);
      return null;
    }
  }

  // Direct message sending using Twilio Messages API
  async sendDirectMessage(phoneNumber, message) {
    try {
      console.log(`Sending direct message to ${phoneNumber}: ${message}`);
      
      if (!twilioPhoneNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured');
      }
      
      // Use Twilio Messages API to send direct SMS
      const messageResult = await this.client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phoneNumber
      });

      console.log(`Message sent: ${messageResult.status} (SID: ${messageResult.sid})`);
      
      return { 
        success: true, 
        message: 'SMS sent successfully',
        status: messageResult.status,
        sid: messageResult.sid,
        messageSid: messageResult.sid
      };
    } catch (error) {
      console.error('Direct SMS send error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to send SMS',
        error: error.code
      };
    }
  }

  // Send custom verification code using direct messaging
  async sendCustomVerificationCode(phoneNumber, code) {
    try {
      const message = `Your verification code is: ${code}. This code expires in 10 minutes.`;
      return await this.sendDirectMessage(phoneNumber, message);
    } catch (error) {
      console.error('Custom verification code send error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to send verification code',
        error: error.code
      };
    }
  }

  // Send welcome message
  async sendWelcomeMessage(phoneNumber, name) {
    try {
      const message = `Welcome to our platform, ${name}! Your account has been successfully verified.`;
      return await this.sendDirectMessage(phoneNumber, message);
    } catch (error) {
      console.error('Welcome message send error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to send welcome message',
        error: error.code
      };
    }
  }

  // Send notification message
  async sendNotification(phoneNumber, notificationText) {
    try {
      return await this.sendDirectMessage(phoneNumber, notificationText);
    } catch (error) {
      console.error('Notification send error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to send notification',
        error: error.code
      };
    }
  }
}

module.exports = new SMSService();
