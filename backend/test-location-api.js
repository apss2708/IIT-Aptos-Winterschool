const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testLocationAPI() {
  console.log('🌐 Testing Location Verification API Endpoints\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Health Check
    console.log('1. 🏥 Testing Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('   ✅ Status:', health.data.status);
    console.log('   🔧 Service:', health.data.service);

    // Test 2: Get All Quests
    console.log('\n2. 📋 Testing Get All Quests...');
    const quests = await axios.get(`${BASE_URL}/api/quests?limit=5`);
    console.log('   ✅ Success:', quests.data.success);
    console.log('   📊 Count:', quests.data.count);
    console.log('   📝 Total:', quests.data.total);
    
    if (quests.data.data && quests.data.data.length > 0) {
      console.log('   🗺️ Available Quests:');
      quests.data.data.forEach((quest, index) => {
        console.log(`      ${index + 1}. ${quest.title} (ID: ${quest._id})`);
        console.log(`          Treasures: ${quest.treasures?.length || 0}`);
        if (quest.startLocation) {
          console.log(`          Start: ${quest.startLocation.name || 'Unknown'}`);
        }
      });
    }

    // Test 3: Nearby Quests with proper error handling
    console.log('\n3. 🗺️ Testing Nearby Quests...');
    try {
      const nearby = await axios.get(
        `${BASE_URL}/api/location/nearby-quests?latitude=40.7829&longitude=-73.9654&maxDistance=5000`
      );
      console.log('   ✅ Success:', nearby.data.success);
      console.log('   📍 Found:', nearby.data.count, 'quests nearby');
      
      if (nearby.data.data && nearby.data.data.length > 0) {
        nearby.data.data.forEach((quest, index) => {
          console.log(`      ${index + 1}. ${quest.title} (${quest.difficulty})`);
        });
      } else {
        console.log('   💡 No quests found in this area. Try different coordinates.');
      }
    } catch (error) {
      console.log('   ❌ Nearby Quests Error:', error.response?.data?.message || error.message);
      console.log('   💡 This might be normal if no quests exist at these coordinates.');
    }

    // Test 4: Leaderboard
    console.log('\n4. 🏆 Testing Leaderboard...');
    const leaderboard = await axios.get(`${BASE_URL}/api/game/leaderboard?limit=3`);
    console.log('   ✅ Success:', leaderboard.data.success);
    console.log('   📊 Leaderboard Type:', leaderboard.data.data.type);
    console.log('   👥 Entries:', leaderboard.data.data.leaderboard.length);

    // Test 5: Test specific quest details
    if (quests.data.data && quests.data.data.length > 0) {
      const firstQuest = quests.data.data[0];
      console.log('\n5. 🔍 Testing Specific Quest Details...');
      const questDetail = await axios.get(`${BASE_URL}/api/quests/${firstQuest._id}`);
      console.log('   ✅ Success:', questDetail.data.success);
      console.log('   📖 Title:', questDetail.data.data.title);
      console.log('   🎯 Difficulty:', questDetail.data.data.difficulty);
      console.log('   💎 Treasures:', questDetail.data.data.treasures.length);
      
      // Show treasure details
      if (questDetail.data.data.treasures.length > 0) {
        console.log('   🗺️ Treasure Locations:');
        questDetail.data.data.treasures.slice(0, 2).forEach((treasure, index) => {
          console.log(`      ${index + 1}. ${treasure.name}`);
          console.log(`         Location: ${treasure.location.latitude}, ${treasure.location.longitude}`);
          console.log(`         Radius: ${treasure.radius}m, Points: ${treasure.points}`);
        });
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 API Endpoint Tests Completed!');
    console.log('\n📋 Next Steps for Location Verification:');
    console.log('   1. Set up user authentication');
    console.log('   2. Create a game session');
    console.log('   3. Test actual location verification with auth tokens');
    console.log('   4. Test location tracking during active sessions');

  } catch (error) {
    console.error('❌ API Test failed:', error.response?.data?.message || error.message);
  }
}

// Run the API tests
testLocationAPI();