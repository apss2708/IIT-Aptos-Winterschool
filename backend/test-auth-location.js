const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test wallet address (you can use any valid format)
const TEST_WALLET = '0x1234567890abcdef1234567890abcdef12345678';

async function testAuthenticationFlow() {
  console.log('🔐 Testing Authentication & Location Verification\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Login with wallet (simulated)
    console.log('1. 🔑 Testing Wallet Login...');
    const loginData = {
      walletAddress: TEST_WALLET,
      signature: '0xsimulatedsignature1234567890', // In real app, this would be actual signature
      message: 'Login to Treasure Hunt at ' + Date.now()
    };

    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
      console.log('   ✅ Login Success:', loginResponse.data.success);
      console.log('   👤 User:', loginResponse.data.data.user.username);
      console.log('   🎯 Points:', loginResponse.data.data.user.totalPoints);
      console.log('   🔐 Token Received:', loginResponse.data.data.token ? 'YES' : 'NO');
      
      const authToken = loginResponse.data.data.token;
      
      if (authToken) {
        // Step 2: Get user profile with auth token
        console.log('\n2. 👤 Testing Profile Access with Auth Token...');
        const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        console.log('   ✅ Profile Access Success:', profileResponse.data.success);
        console.log('   📊 User Stats:');
        console.log('      Level:', profileResponse.data.data.user.level);
        console.log('      Total Points:', profileResponse.data.data.user.totalPoints);
        console.log('      Treasures Found:', profileResponse.data.data.user.gameStats?.totalTreasures || 0);

        // Step 3: Test location verification with auth
        console.log('\n3. 📍 Testing Location Verification with Authentication...');
        await testLocationVerificationWithAuth(authToken);

      }
    } catch (loginError) {
      console.log('   ⚠️ Login may require actual wallet signature');
      console.log('   💡 For development, you might need to modify auth to accept test wallets');
      console.log('   📝 Error:', loginError.response?.data?.message || loginError.message);
    }

  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
  }
}

async function testLocationVerificationWithAuth(authToken) {
  try {
    // First, get available quests
    const questsResponse = await axios.get(`${BASE_URL}/api/quests?limit=3`);
    const quests = questsResponse.data.data;

    if (!quests || quests.length === 0) {
      console.log('   💡 No quests available for testing');
      return;
    }

    const testQuest = quests[0];
    const testTreasure = testQuest.treasures[0];

    console.log('   🎯 Using Quest:', testQuest.title);
    console.log('   💎 Testing Treasure:', testTreasure.name);
    console.log('   📍 Target Location:', testTreasure.location.latitude + ', ' + testTreasure.location.longitude);
    console.log('   🎯 Radius:', testTreasure.radius + 'm');

    // Test location verification
    const verificationData = {
      questId: testQuest._id,
      treasureId: testTreasure._id,
      latitude: testTreasure.location.latitude, // Exact location
      longitude: testTreasure.location.longitude,
      accuracy: 5,
      verificationType: 'gps',
      deviceInfo: 'Test Device - API Test'
    };

    console.log('   📡 Sending location verification request...');
    
    const verificationResponse = await axios.post(
      `${BASE_URL}/api/location/verify`,
      verificationData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('   ✅ Verification Response:');
    console.log('      Success:', verificationResponse.data.success);
    console.log('      Message:', verificationResponse.data.message);
    
    if (verificationResponse.data.data) {
      console.log('      Status:', verificationResponse.data.data.verification?.status);
      console.log('      Confidence:', verificationResponse.data.data.verification?.confidence);
    }

  } catch (error) {
    console.log('   ❌ Location verification failed:', error.response?.data?.message || error.message);
    console.log('   💡 This might require an active game session');
  }
}

// Run authentication tests
testAuthenticationFlow();