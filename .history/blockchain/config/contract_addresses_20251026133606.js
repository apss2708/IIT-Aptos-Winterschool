// Contract addresses for different networks
const CONTRACT_ADDRESSES = {
    local: {
        treasure_hunt: process.env.MODULE_ADDRESS || "0x123",
        nft_manager: process.env.MODULE_ADDRESS || "0x123",
        ai_oracle: process.env.MODULE_ADDRESS || "0x123",
        reward_pool: process.env.MODULE_ADDRESS || "0x123"
    },
    testnet: {
        treasure_hunt: process.env.MODULE_ADDRESS || "0x123",
        nft_manager: process.env.MODULE_ADDRESS || "0x123", 
        ai_oracle: process.env.MODULE_ADDRESS || "0x123",
        reward_pool: process.env.MODULE_ADDRESS || "0x123"
    },
    mainnet: {
        treasure_hunt: process.env.MODULE_ADDRESS,
        nft_manager: process.env.MODULE_ADDRESS,
        ai_oracle: process.env.MODULE_ADDRESS,
        reward_pool: process.env.MODULE_ADDRESS
    }
};

// Function addresses for common operations
const FUNCTION_ADDRESSES = {
    create_treasure_hunt: (moduleAddress) => 
        `${moduleAddress}::treasure_hunt::create_treasure_hunt`,
    
    add_treasure: (moduleAddress) =>
        `${moduleAddress}::treasure_hunt::add_treasure_to_hunt`,
    
    claim_treasure: (moduleAddress) =>
        `${moduleAddress}::treasure_hunt::claim_treasure`,
    
    register_player: (moduleAddress) =>
        `${moduleAddress}::treasure_hunt::register_player`,
    
    update_trust_score: (moduleAddress) =>
        `${moduleAddress}::treasure_hunt::update_trust_score`,
    
    request_ai_processing: (moduleAddress) =>
        `${moduleAddress}::zk_ai_oracle::request_ai_with_zk_proof`,
    
    submit_ai_proof: (moduleAddress) =>
        `${moduleAddress}::zk_ai_oracle::submit_zk_ai_proof`
};

// Resource addresses for querying
const RESOURCE_ADDRESSES = {
    player_stats: (moduleAddress, playerAddress) =>
        `${moduleAddress}::treasure_hunt::PlayerStats`,
    
    global_config: (moduleAddress) =>
        `${moduleAddress}::treasure_hunt::GlobalConfig`,
    
    treasure_hunt: (moduleAddress, creatorAddress) =>
        `${moduleAddress}::treasure_hunt::TreasureHunt`,
    
    ai_oracle: (moduleAddress) =>
        `${moduleAddress}::zk_ai_oracle::ZKAIOracle`
};

// Event addresses for monitoring
const EVENT_ADDRESSES = {
    treasure_claimed: (moduleAddress) =>
        `${moduleAddress}::treasure_hunt::TreasureClaimed`,
    
    hunt_created: (moduleAddress) =>
        `${moduleAddress}::treasure_hunt::TreasureHuntCreated`,
    
    ai_clue_generated: (moduleAddress) =>
        `${moduleAddress}::treasure_hunt_ai::AIClueGenerated`,
    
    oracle_requested: (moduleAddress) =>
        `${moduleAddress}::zk_ai_oracle::ZKProofRequested`
};

// Helper functions
const getContractAddress = (network, contractName) => {
    const networkAddresses = CONTRACT_ADDRESSES[network];
    if (!networkAddresses) {
        throw new Error(`Network not supported: ${network}`);
    }
    
    const address = networkAddresses[contractName];
    if (!address) {
        throw new Error(`Contract not found: ${contractName}`);
    }
    
    return address;
};

const getFunctionAddress = (network, functionName) => {
    const moduleAddress = getContractAddress(network, 'treasure_hunt');
    return FUNCTION_ADDRESSES[functionName](moduleAddress);
};

const getResourceAddress = (network, resourceName, ...args) => {
    const moduleAddress = getContractAddress(network, 'treasure_hunt');
    return RESOURCE_ADDRESSES[resourceName](moduleAddress, ...args);
};

const getEventAddress = (network, eventName) => {
    const moduleAddress = getContractAddress(network, 'treasure_hunt');
    return EVENT_ADDRESSES[eventName](moduleAddress);
};

module.exports = {
    CONTRACT_ADDRESSES,
    FUNCTION_ADDRESSES,
    RESOURCE_ADDRESSES,
    EVENT_ADDRESSES,
    getContractAddress,
    getFunctionAddress,
    getResourceAddress,
    getEventAddress
};