const { AptosClient, AptosAccount, FaucetClient } = require("aptos");
const { getNetworkConfig } = require("../config/network_config");

async function initializeTreasureHunt() {
    const networkConfig = getNetworkConfig("testnet");
    const client = new AptosClient(networkConfig.nodeUrl);
    const faucetClient = new FaucetClient(networkConfig.nodeUrl, networkConfig.faucetUrl);

    // Create admin account
    const admin = new AptosAccount();
    await faucetClient.fundAccount(admin.address(), 100000000);

    // Deploy module (this would be done via CLI, so we just log the address)
    console.log("Admin address:", admin.address().toString());
    console.log("Use this address to publish the module with Aptos CLI");

    return admin.address().toString();
}

initializeTreasureHunt().catch(console.error);