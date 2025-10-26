const { AptosClient, FaucetClient } = require("aptos");

class CustomAptosClient {
    constructor(network = "testnet") {
        this.networkConfig = getNetworkConfig(network);
        this.client = new AptosClient(this.networkConfig.nodeUrl);
        if (this.networkConfig.faucetUrl) {
            this.faucetClient = new FaucetClient(this.networkConfig.nodeUrl, this.networkConfig.faucetUrl);
        }
    }

    async getAccountResources(address) {
        return await this.client.getAccountResources(address);
    }

    async getTableItem(tableHandle, key) {
        return await this.client.getTableItem(tableHandle, key);
    }

    // Add other utility methods as needed
}

module.exports = CustomAptosClient;