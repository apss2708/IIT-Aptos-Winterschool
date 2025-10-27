const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test user data
const TEST_USER = {
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678'
};

let authToken;

async function completeGameFlowTest() {
  console.log('🎮 Complete Game Flow Test - Location Verification\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Login
    console.log('1. 🔑 Logging in...');
    await loginUser();

    // Step 2: Get available quests
    console.log('\n2. 📋 Getting available quests...');
    const quests = await getQuests();
    const testQuest = quests[0]; // Use first quest
    const testTreasure = testQuest.treasures[0];

    console.log(`   ✅ Selected: "${testQuest.title}"`);
    console.log(`   💎 First Treasure: "${testTreasure.name}"`);
    console.log(`   📍 Location: ${testTreasure.location.latitude}, ${testTreasure.location.longitude}`);
    console.log(`   🎯 Radius: ${testTreasure.radius}m`);

    // Step 3: Start game session
    console.log('\n3. 🎯 Starting game session...');
    const sessionId = await startGameSession(testQuest._id);
    
    if (!sessionId) {
      console.log('   ❌ Failed to start game session');
      return;
    }

    // Step 4: Test location verification with active session
    console.log('\n4. 📍 Testing Location Verification with Active Session...');
    await testLocationVerificationWithSession(testQuest, testTreasure, sessionId);

    // Step 5: Test location tracking
    console.log('\n5. 🛰️ Testing Location Tracking...');
    await testLocationTracking(sessionId, testTreasure);

    // Step 6: Complete the quest
    console.log('\n6. 🏁 Testing Quest Completion...');
    await completeQuest(sessionId);

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Complete Game Flow Test Finished!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function loginUser() {
  const loginData = {
    walletAddress: TEST_USER.walletAddress,
    signature: '0xsimulatedsignature1234567890',
    message: 'Login to Treasure Hunt at ' + Date.now()
  };

  const response = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
  authToken = response.data.data.token;
  console.log('   ✅ Logged in as:', response.data.data.user.username);
  console.log('   🔐 Token received');
}

async function getQuests() {
  const response = await axios.get(`${BASE_URL}/api/quests`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  return response.data.data;
}

async function startGameSession(questId) {
  try {
    const startData = {
      startLocation: {
        latitude: 40.7829,
        longitude: -73.9654,
        name: 'Test Start Location'
      }
    };

    const response = await axios.post(
      `${BASE_URL}/api/quests/${questId}/start`,
      startData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('   ✅ Game session started');
    console.log('   🆔 Session ID:', response.data.data.sessionId);
    return response.data.data.sessionId;

  } catch (error) {
    console.log('   ❌ Failed to start game session:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testLocationVerificationWithSession(quest, treasure, sessionId) {
  const testScenarios = [
    {
      name: "EXACT LOCATION - Should SUCCEED",
      lat: treasure.location.latitude,
      lng: treasure.location.longitude,
      accuracy: 5,
      expected: true
    },
    {
      name: "WITHIN RADIUS - Should SUCCEED", 
      lat: treasure.location.latitude + 0.0001,
      lng: treasure.location.longitude + 0.0001,
      accuracy: 10,
      expected: true
    },
    {
      name: "OUTSIDE RADIUS - Should FAIL",
      lat: treasure.location.latitude + 0.001,
      lng: treasure.location.longitude + 0.001, 
      accuracy: 5,
      expected: false
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n   🔍 Testing: ${scenario.name}`);
    
    const verificationData = {
      questId: quest._id,
      treasureId: treasure._id,
      sessionId: sessionId,
      latitude: scenario.lat,
      longitude: scenario.lng,
      accuracy: scenario.accuracy,
      verificationType: 'gps',
      deviceInfo: 'Test Device - Complete Flow Test'
    };

    try {
      const response = await axios.post(
        `${BASE_URL}/api/location/verify`,
        verificationData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const distance = calculateDistance(scenario.lat, scenario.lng, treasure.location.latitude, treasure.location.longitude);
      
      console.log(`      📍 Coordinates: ${scenario.lat.toFixed(6)}, ${scenario.lng.toFixed(6)}`);
      console.log(`      📏 Distance: ${Math.round(distance)}m (Radius: ${treasure.radius}m)`);
      console.log(`      📡 Accuracy: ${scenario.accuracy}m`);
      console.log(`      ✅ Success: ${response.data.success}`);
      console.log(`      💬 Message: ${response.data.message}`);
      
      if (response.data.data?.verification) {
        console.log(`      🎯 Status: ${response.data.data.verification.status}`);
        console.log(`      📊 Confidence: ${response.data.data.verification.confidence}`);
      }

      if (response.data.success === scenario.expected) {
        console.log(`      🎉 EXPECTATION MET!`);
      } else {
        console.log(`      ⚠️  UNEXPECTED RESULT!`);
      }

    } catch (error) {
      console.log(`      ❌ Error: ${error.response?.data?.message || error.message}`);
    }
  }
}

async function testLocationTracking(sessionId, treasure) {
  try {
    const trackingData = {
      sessionId: sessionId,
      latitude: treasure.location.latitude + 0.0002,
      longitude: treasure.location.longitude + 0.0002,
      accuracy: 8,
      altitude: 50,
      heading: 45,
      speed: 1.2
    };

    const response = await axios.post(
      `${BASE_URL}/api/location/track`,
      trackingData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('   ✅ Location tracking successful');
    console.log('   📊 Current treasure:', response.data.data.currentTreasure);
    console.log('   💎 Treasures found:', response.data.data.treasuresFound);

  } catch (error) {
    console.log('   ❌ Location tracking failed:', error.response?.data?.message || error.message);
  }
}

async function completeQuest(sessionId) {
  try {
    const completionData = {
      sessionId: sessionId
    };

    const response = await axios.post(
      `${BASE_URL}/api/location/complete-quest`,
      completionData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('   ✅ Quest completed successfully!');
    console.log('   🏆 Final score:', response.data.data.session.score);
    console.log('   💎 Treasures found:', response.data.data.session.treasuresFound);
    console.log('   ⏱️  Total time:', response.data.data.session.totalTime, 'seconds');
    console.log('   🎁 Rewards - Points:', response.data.data.rewards.points);
    console.log('   👤 User total points:', response.data.data.user.totalPoints);

  } catch (error) {
    console.log('   ❌ Quest completion failed:', error.response?.data?.message || error.message);
    console.log('   💡 This might be because not all treasures were found');
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Run the complete game flow test
completeGameFlowTest();