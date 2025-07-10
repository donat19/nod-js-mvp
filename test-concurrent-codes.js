// Test script for asynchronous verification code generation with collision detection
require('dotenv').config();

const smsService = require('./services/smsService');

async function testConcurrentCodeGeneration() {
  console.log('=== Testing Concurrent Verification Code Generation ===\n');

  const testPhones = [
    '+15551234567',
    '+15551234568', 
    '+15551234569',
    '+15551234570',
    '+15551234571'
  ];

  console.log('Environment Variables Check:');
  console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Missing');
  console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Missing');
  console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? '✓ Set' : '✗ Missing');
  console.log('');

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.log('❌ Missing required Twilio environment variables');
    console.log('This test will only check code generation logic, not SMS sending');
    console.log('');
  }

  try {
    console.log('🧪 Test 1: Sequential code generation (should all be unique)');
    const sequentialCodes = [];
    
    for (let i = 0; i < 5; i++) {
      const result = await smsService.generateUniqueVerificationCode(testPhones[i]);
      sequentialCodes.push(result.code);
      console.log(`Phone ${testPhones[i]}: ${result.code}`);
    }
    
    const uniqueSequential = new Set(sequentialCodes);
    console.log(`✓ Generated ${sequentialCodes.length} codes, ${uniqueSequential.size} unique`);
    console.log(`Result: ${uniqueSequential.size === sequentialCodes.length ? '✅ PASS - All codes unique' : '❌ FAIL - Duplicates found'}\n`);

    console.log('🧪 Test 2: Concurrent code generation (stress test for collisions)');
    const concurrentPromises = testPhones.map(phone => 
      smsService.generateUniqueVerificationCode(phone)
    );
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentCodes = concurrentResults.map(result => result.code);
    
    concurrentResults.forEach((result, index) => {
      console.log(`Phone ${testPhones[index]}: ${result.code} (generated concurrently)`);
    });
    
    const uniqueConcurrent = new Set(concurrentCodes);
    console.log(`✓ Generated ${concurrentCodes.length} codes concurrently, ${uniqueConcurrent.size} unique`);
    console.log(`Result: ${uniqueConcurrent.size === concurrentCodes.length ? '✅ PASS - All concurrent codes unique' : '❌ FAIL - Duplicates found'}\n`);

    console.log('🧪 Test 3: High-volume concurrent generation (100 codes)');
    const highVolumePhones = Array.from({length: 100}, (_, i) => `+1555${String(i).padStart(7, '0')}`);
    const highVolumePromises = highVolumePhones.map(phone => 
      smsService.generateUniqueVerificationCode(phone)
    );
    
    const startTime = Date.now();
    const highVolumeResults = await Promise.all(highVolumePromises);
    const endTime = Date.now();
    
    const highVolumeCodes = highVolumeResults.map(result => result.code);
    const uniqueHighVolume = new Set(highVolumeCodes);
    
    console.log(`✓ Generated ${highVolumeCodes.length} codes in ${endTime - startTime}ms`);
    console.log(`✓ ${uniqueHighVolume.size} unique codes`);
    console.log(`Result: ${uniqueHighVolume.size === highVolumeCodes.length ? '✅ PASS - All high-volume codes unique' : '❌ FAIL - Duplicates found'}\n`);

    console.log('🧪 Test 4: Code verification test');
    const testPhone = '+15551111111';
    const codeResult = await smsService.generateUniqueVerificationCode(testPhone);
    console.log(`Generated code for verification test: ${codeResult.code}`);
    
    // Test correct code
    const verifyCorrect = await smsService.verifyCustomCode(testPhone, codeResult.code);
    console.log(`Verification with correct code: ${verifyCorrect.success ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test wrong code
    const verifyWrong = await smsService.verifyCustomCode(testPhone, '000000');
    console.log(`Verification with wrong code: ${!verifyWrong.success ? '✅ PASS (correctly rejected)' : '❌ FAIL (should have been rejected)'}`);
    
    // Test code reuse (should fail)
    const verifyReuse = await smsService.verifyCustomCode(testPhone, codeResult.code);
    console.log(`Verification with reused code: ${!verifyReuse.success ? '✅ PASS (correctly rejected reuse)' : '❌ FAIL (should reject reused code)'}\n`);

    console.log('🧪 Test 5: Code cleanup and expiration');
    console.log(`Active codes before cleanup: ${smsService.activeCodesCache.size}`);
    smsService.cleanupExpiredCodes();
    console.log(`Active codes after cleanup: ${smsService.activeCodesCache.size}`);
    console.log('✅ Cleanup test completed\n');

    console.log('=== All Tests Completed ===');
    console.log('📊 Summary:');
    console.log('- Sequential generation: Unique code guarantee');
    console.log('- Concurrent generation: Collision detection and retry');
    console.log('- High-volume generation: Performance and uniqueness at scale');
    console.log('- Code verification: Correct validation and reuse prevention');
    console.log('- Code management: Cleanup and expiration handling');

  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test
if (require.main === module) {
  testConcurrentCodeGeneration().catch(console.error);
}

module.exports = testConcurrentCodeGeneration;
