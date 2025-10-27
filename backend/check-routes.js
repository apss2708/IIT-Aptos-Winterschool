const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const requiredRoutes = ['auth', 'quest', 'location', 'nft', 'game'];

console.log('🔍 Checking for required route files...');

requiredRoutes.forEach(route => {
  const routePath = path.join(routesDir, `${route}.js`);
  if (fs.existsSync(routePath)) {
    console.log(`✅ ${route}.js exists`);
  } else {
    console.log(`❌ ${route}.js missing`);
  }
});

console.log('\n📁 Routes directory structure:');
try {
  const files = fs.readdirSync(routesDir);
  files.forEach(file => {
    console.log(`   - ${file}`);
  });
} catch (error) {
  console.log('❌ Routes directory not found');
}