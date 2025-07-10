// Test script to verify Twilio SMS functionality
require('dotenv').config();
const smsService = require('./services/smsService');

async function testTwilioSMS() {
  console.log('🧪 Testing Twilio SMS Integration...');
  console.log('📋 Configuration Check:');
  console.log('  Account SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
  console.log('  Auth Token:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
  console.log('  Verify Service SID:', process.env.TWILIO_VERIFY_SERVICE_SID ? '✅ Set' : '❌ Missing');
  
  // Test phone number - replace with your number for testing
  const testPhone = process.env.TEST_PHONE_NUMBER || '+17099865919'; // Use env var or default
  
  console.log('\n📱 Testing phone number:', testPhone);
  console.log('📝 Note: Make sure this is your actual phone number to receive the SMS\n');
  
  try {
    console.log('� Sending verification code...');
    const sendResult = await smsService.sendVerificationCode(testPhone);
    
    console.log('📊 Send Result:');
    console.log('  Success:', sendResult.success);
    console.log('  Message:', sendResult.message);
    console.log('  Status:', sendResult.status);
    console.log('  SID:', sendResult.sid);
    
    if (sendResult.success) {
      console.log('\n✅ SMS sent successfully!');
      console.log('📱 Check your phone for the verification code');
      console.log('\n🔧 To test verification manually, run:');
      console.log(`  node -e "require('./services/smsService').verifyCode('${testPhone}', 'YOUR_CODE').then(console.log)"`);
      
      console.log('\n💡 Or use the login page at: http://localhost:3000/login.html');
    } else {
      console.log('\n❌ Failed to send SMS');
      console.log('🔍 Error details:', sendResult.error || 'Unknown error');
      
      console.log('\n🛠️  Troubleshooting:');
      console.log('  1. Check your Twilio credentials in .env file');
      console.log('  2. Verify your Verify Service SID is correct');
      console.log('  3. Ensure phone number is in E.164 format (+1XXXXXXXXXX)');
      console.log('  4. Check your Twilio account balance and status');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
    console.log('\n🔍 Common issues:');
    console.log('  - Invalid Twilio credentials');
    console.log('  - Network connectivity issues');
    console.log('  - Verify Service not properly configured');
  }
}

// Example verification test function
async function testVerification(phoneNumber, code) {
  console.log(`🔍 Testing verification for ${phoneNumber} with code: ${code}`);
  
  try {
    const verifyResult = await smsService.verifyCode(phoneNumber, code);
    
    console.log('📊 Verification Result:');
    console.log('  Success:', verifyResult.success);
    console.log('  Message:', verifyResult.message);
    console.log('  Status:', verifyResult.status);
    
    return verifyResult;
  } catch (error) {
    console.error('❌ Verification test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Only run if called directly
if (require.main === module) {
  testTwilioSMS();
}

module.exports = { testTwilioSMS, testVerification };
