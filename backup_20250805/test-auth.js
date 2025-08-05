// Test script to verify login functionality and database operations
const User = require('./models/User');
const { query } = require('./config/database');

async function testUserOperations() {
    console.log('🧪 Testing User Operations...\n');
    
    try {
        // Test 1: Check if a user exists
        console.log('1. Testing user lookup...');
        const testPhone = '+17098531768';
        let user = await User.findByPhone(testPhone);
        
        if (user) {
            console.log('✅ Found existing user:', {
                id: user.id,
                phone: user.phone,
                name: user.name,
                is_verified: user.is_verified,
                created_at: user.created_at
            });
        } else {
            console.log('📍 No user found with phone:', testPhone);
            
            // Test 2: Create a new user
            console.log('2. Creating new test user...');
            user = await User.create({
                phone: testPhone,
                name: 'Test User',
                is_verified: true
            });
            console.log('✅ Created new user:', user.toJSON());
        }
        
        // Test 3: Test user verification
        console.log('3. Testing user verification...');
        if (!user.is_verified) {
            await user.verify();
            console.log('✅ User verified successfully');
        } else {
            console.log('✅ User already verified');
        }
        
        // Test 4: Test token payload
        console.log('4. Testing token payload...');
        const tokenPayload = user.toTokenPayload();
        console.log('✅ Token payload:', tokenPayload);
        
        // Test 5: Get all users count
        console.log('5. Getting user count...');
        const allUsers = await User.getAll(5, 0);
        console.log(`✅ Found ${allUsers.length} users in database`);
        
        console.log('\n🎉 All tests passed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testUserOperations().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { testUserOperations };
