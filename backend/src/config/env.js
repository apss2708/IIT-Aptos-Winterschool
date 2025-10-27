require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/treasure-hunt',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  aptos: {
    nodeUrl: process.env.APTOS_NODE_URL || 'https://fullnode.devnet.aptoslabs.com/v1',
    faucetUrl: process.env.APTOS_FAUCET_URL || 'https://faucet.devnet.aptoslabs.com',
  },
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
  ipfs: {
    endpoint: process.env.IPFS_ENDPOINT,
    projectId: process.env.IPFS_PROJECT_ID,
    projectSecret: process.env.IPFS_PROJECT_SECRET,
  },
  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  game: {
    maxQuestRadius: parseInt(process.env.MAX_QUEST_RADIUS) || 5000,
    minTreasureDistance: parseInt(process.env.MIN_TREASURE_DISTANCE) || 100,
  },
};

module.exports = config;