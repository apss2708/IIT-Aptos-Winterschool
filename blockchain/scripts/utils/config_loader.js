const fs = require('fs');
const path = require('path');

class ConfigLoader {
    constructor() {
        this.configs = {};
        this.loadAllConfigs();
    }

    loadAllConfigs() {
        try {
            // Load network configuration
            const networkConfigPath = path.join(__dirname, '../../config/network_config.js');
            this.configs.network = require(networkConfigPath);

            // Load constants
            const constantsPath = path.join(__dirname, '../../config/constants.js');
            this.configs.constants = require(constantsPath);

            // Load contract addresses
            const addressesPath = path.join(__dirname, '../../config/contract_addresses.js');
            if (fs.existsSync(addressesPath)) {
                this.configs.addresses = require(addressesPath);
            } else {
                this.configs.addresses = {};
            }

            // Load environment variables
            this.loadEnvironmentConfig();

        } catch (error) {
            console.error('Error loading configurations:', error);
            throw error;
        }
    }

    loadEnvironmentConfig() {
        this.configs.environment = {
            // Network configuration
            network: process.env.APTOS_NETWORK || 'testnet',
            nodeUrl: process.env.APTOS_NODE_URL,
            faucetUrl: process.env.APTOS_FAUCET_URL,
            moduleAddress: process.env.MODULE_ADDRESS,

            // API Keys (for external services)
            openaiApiKey: process.env.OPENAI_API_KEY,
            geminiApiKey: process.env.GEMINI_API_KEY,

            // Security
            privateKey: process.env.PRIVATE_KEY,
            jwtSecret: process.env.JWT_SECRET,

            // Service URLs
            clueServiceUrl: process.env.CLUE_SERVICE_URL,
            antiCheatServiceUrl: process.env.ANTICHEAT_SERVICE_URL,
            npcServiceUrl: process.env.NPC_SERVICE_URL,

            // Database
            databaseUrl: process.env.DATABASE_URL,

            // Logging
            logLevel: process.env.LOG_LEVEL || 'info'
        };
    }

    getConfig(configType, key = null) {
        if (!this.configs[configType]) {
            throw new Error(`Configuration type not found: ${configType}`);
        }

        if (key) {
            return this.configs[configType][key];
        }

        return this.configs[configType];
    }

    getNetworkConfig(network = null) {
        const targetNetwork = network || this.configs.environment.network;
        return this.configs.network.NETWORK_CONFIG[targetNetwork];
    }

    getModuleAddress() {
        return this.configs.environment.moduleAddress || 
               this.getNetworkConfig().moduleAddress;
    }

    getServiceUrl(serviceName) {
        const serviceUrls = {
            clue: this.configs.environment.clueServiceUrl,
            antiCheat: this.configs.environment.antiCheatServiceUrl,
            npc: this.configs.environment.npcServiceUrl
        };

        return serviceUrls[serviceName];
    }

    validateConfig() {
        const errors = [];

        // Validate required environment variables
        const required = ['APTOS_NETWORK', 'MODULE_ADDRESS'];
        for (const req of required) {
            if (!process.env[req]) {
                errors.push(`Missing required environment variable: ${req}`);
            }
        }

        // Validate network configuration
        const network = this.getNetworkConfig();
        if (!network) {
            errors.push(`Invalid network configuration for: ${this.configs.environment.network}`);
        }

        if (errors.length > 0) {
            throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }

        return true;
    }

    // Dynamic configuration updates
    updateConfig(configType, updates) {
        if (!this.configs[configType]) {
            this.configs[configType] = {};
        }

        Object.assign(this.configs[configType], updates);
    }

    // Save configuration to file
    saveConfigToFile(configType, filePath) {
        try {
            const configData = JSON.stringify(this.configs[configType], null, 2);
            fs.writeFileSync(filePath, configData, 'utf8');
            console.log(`Configuration saved to: ${filePath}`);
        } catch (error) {
            console.error('Error saving configuration:', error);
            throw error;
        }
    }

    // Load configuration from file
    loadConfigFromFile(configType, filePath) {
        try {
            if (fs.existsSync(filePath)) {
                const configData = fs.readFileSync(filePath, 'utf8');
                this.configs[configType] = JSON.parse(configData);
                console.log(`Configuration loaded from: ${filePath}`);
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            throw error;
        }
    }

    // Get all configuration for debugging
    getAllConfig() {
        return {
            ...this.configs,
            environment: {
                ...this.configs.environment,
                privateKey: this.configs.environment.privateKey ? '***' : undefined
            }
        };
    }
}

module.exports = ConfigLoader;
