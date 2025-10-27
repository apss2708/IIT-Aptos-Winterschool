const ORACLE_CONFIG = {
    // Network configurations
    networks: {
        testnet: {
            nodeUrl: "https://fullnode.testnet.aptoslabs.com",
            moduleAddress: process.env.MODULE_ADDRESS || "0x123",
            chainId: 2,
            gasLimit: 100000
        },
        mainnet: {
            nodeUrl: "https://fullnode.mainnet.aptoslabs.com", 
            moduleAddress: process.env.MODULE_ADDRESS,
            chainId: 1,
            gasLimit: 200000
        }
    },

    // AI Service endpoints
    aiServices: {
        clueGenerator: process.env.CLUE_SERVICE_URL || "http://localhost:8001",
        antiCheat: process.env.ANTICHEAT_SERVICE_URL || "http://localhost:8003",
        npcGuardian: process.env.NPC_SERVICE_URL || "http://localhost:8002",
        worldBuilder: process.env.WORLD_SERVICE_URL || "http://localhost:8004"
    },

    // Oracle settings
    oracle: {
        pollingInterval: 30000, // 30 seconds
        maxRetries: 3,
        retryDelay: 5000,
        timeout: 30000,
        batchSize: 10
    },

    // ZK Proof settings
    zkSettings: {
        enabled: process.env.ZK_ENABLED === 'true',
        proofSystem: "groth16",
        verificationKeyPath: "./keys/verification_key.json",
        circuitPath: "./circuits/treasure_hunt.circuit"
    },

    // Security settings
    security: {
        hmacSecret: process.env.HMAC_SECRET || "default-secret",
        jwtSecret: process.env.JWT_SECRET || "default-jwt-secret",
        encryptionKey: process.env.ENCRYPTION_KEY || "default-encryption-key"
    },

    // Performance settings
    performance: {
        maxConcurrentRequests: 100,
        requestTimeout: 30000,
        cacheTtl: 3600, // 1 hour
        rateLimit: {
            windowMs: 60000, // 1 minute
            max: 100 // max requests per window
        }
    },

    // Logging settings
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'combined',
        file: {
            enabled: true,
            path: './logs/oracle.log',
            maxSize: '10m',
            maxFiles: '7d'
        }
    }
};

module.exports = ORACLE_CONFIG;