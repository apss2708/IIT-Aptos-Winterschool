const NETWORK_CONFIG = {
    local: {
        nodeUrl: "http://localhost:8080",
        faucetUrl: "http://localhost:8081",
        moduleAddress: process.env.MODULE_ADDRESS || "0x123",
        chainId: 4
    },
    testnet: {
        nodeUrl: "https://fullnode.testnet.aptoslabs.com",
        faucetUrl: "https://faucet.testnet.aptoslabs.com",
        moduleAddress: process.env.MODULE_ADDRESS || "0x123",
        chainId: 2
    },
    mainnet: {
        nodeUrl: "https://fullnode.mainnet.aptoslabs.com",
        faucetUrl: null,
        moduleAddress: process.env.MODULE_ADDRESS,
        chainId: 1
    }
};

// Environment-based configuration
const getNetworkConfig = (network = null) => {
    const envNetwork = process.env.APTOS_NETWORK || 'testnet';
    const targetNetwork = network || envNetwork;
    
    if (!NETWORK_CONFIG[targetNetwork]) {
        throw new Error(`Unsupported network: ${targetNetwork}`);
    }
    
    return NETWORK_CONFIG[targetNetwork];
};

module.exports = {
    NETWORK_CONFIG,
    getNetworkConfig
};
