// Test script for Twilio direct SMS messaging
require('dotenv').config();

const smsService = require('./services/smsService');

async function testDirectSMS() {
  console.log('=== Testing Twilio Direct SMS Functionality ===\n');

  // Test phone number (use your own number for testing)
  const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '+1234567890';
  
  console.log('Environment Variables Check:');
  console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Missing');
  console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Missing');
  console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? '✓ Set' : '✗ Missing');
  console.log('Test Phone Number:', testPhoneNumber);
  console.log('');

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.log('❌ Missing required Twilio environment variables');
    console.log('Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your .env file');
    return;
  }

  try {
    // Test 1: Send a direct message
    console.log('Test 1: Sending direct message...');
    const directResult = await smsService.sendDirectMessage(
      testPhoneNumber, 
      'Hello! This is a test message from your Node.js MVP app using Twilio Messages API.'
    );
    console.log('Direct message result:', directResult);
    console.log('');

    // Test 2: Send custom verification code
    console.log('Test 2: Sending custom verification code...');
    const customVerifyResult = await smsService.sendCustomVerificationCode(testPhoneNumber, '123456');
    console.log('Custom verification result:', customVerifyResult);
    console.log('');

    // Test 3: Send welcome message
    console.log('Test 3: Sending welcome message...');
    const welcomeResult = await smsService.sendWelcomeMessage(testPhoneNumber, 'John Doe');
    console.log('Welcome message result:', welcomeResult);
    console.log('');

    // Test 4: Send notification
    console.log('Test 4: Sending notification...');
    const notificationResult = await smsService.sendNotification(
      testPhoneNumber, 
      'Your account settings have been updated successfully.'
    );
    console.log('Notification result:', notificationResult);
    console.log('');

    console.log('=== Direct SMS Tests Complete ===');

  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test
if (require.main === module) {
  testDirectSMS().catch(console.error);
}

module.exports = testDirectSMS;
