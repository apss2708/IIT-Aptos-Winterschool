const { AptosClient, AptosAccount, FaucetClient } = require("aptos");
const { Network, Provider } = require("aptos");
const config = require("../../config/network_config");

class TreasureHuntClient {
    constructor(network = "testnet") {
        this.networkConfig = config[network];
        this.client = new AptosClient(this.networkConfig.nodeUrl);
        if (this.networkConfig.faucetUrl) {
            this.faucetClient = new FaucetClient(
                this.networkConfig.nodeUrl,
                this.networkConfig.faucetUrl
            );
        }
        this.moduleAddress = this.networkConfig.moduleAddress;
    }

    async initializePlayer(account) {
        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::treasure_hunt::register_player`,
            arguments: [],
            type_arguments: []
        };

        try {
            const txnRequest = await this.client.generateTransaction(
                account.address(),
                payload
            );

            const signedTxn = await this.client.signTransaction(account, txnRequest);
            const txnResult = await this.client.submitTransaction(signedTxn);
            await this.client.waitForTransaction(txnResult.hash);

            console.log(`✅ Player registered: ${account.address()}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to register player:", error);
            throw error;
        }
    }

    async createTreasureHunt(creatorAccount, title, description, rewardPool, aiIntegration = true) {
        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::treasure_hunt::create_treasure_hunt`,
            arguments: [title, description, rewardPool.toString(), aiIntegration],
            type_arguments: []
        };

        try {
            const txnRequest = await this.client.generateTransaction(
                creatorAccount.address(),
                payload
            );

            const signedTxn = await this.client.signTransaction(creatorAccount, txnRequest);
            const txnResult = await this.client.submitTransaction(signedTxn);
            await this.client.waitForTransaction(txnResult.hash);

            console.log(`✅ Treasure Hunt created: ${title}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to create treasure hunt:", error);
            throw error;
        }
    }

    async addTreasure(creatorAccount, huntId, locationHash, rewardAmount, metadataUri, difficultyLevel = 50, aiEnhanced = true) {
        // Convert location hash to Uint8Array
        const locationBytes = Array.from(Buffer.from(locationHash, 'hex'));

        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::treasure_hunt::add_treasure_to_hunt`,
            arguments: [
                huntId.toString(),
                locationBytes,
                rewardAmount.toString(),
                metadataUri,
                difficultyLevel.toString(),
                aiEnhanced
            ],
            type_arguments: []
        };

        try {
            const txnRequest = await this.client.generateTransaction(
                creatorAccount.address(),
                payload
            );

            const signedTxn = await this.client.signTransaction(creatorAccount, txnRequest);
            const txnResult = await this.client.submitTransaction(signedTxn);
            await this.client.waitForTransaction(txnResult.hash);

            console.log(`✅ Treasure added to hunt ${huntId}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to add treasure:", error);
            throw error;
        }
    }

    async claimTreasure(claimerAccount, treasureId, locationProof, trustScore = 100) {
        // Convert location proof to Uint8Array
        const proofBytes = Array.from(Buffer.from(locationProof, 'hex'));

        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::treasure_hunt::claim_treasure`,
            arguments: [
                treasureId.toString(),
                proofBytes,
                trustScore.toString()
            ],
            type_arguments: []
        };

        try {
            const txnRequest = await this.client.generateTransaction(
                claimerAccount.address(),
                payload
            );

            const signedTxn = await this.client.signTransaction(claimerAccount, txnRequest);
            const txnResult = await this.client.submitTransaction(signedTxn);
            await this.client.waitForTransaction(txnResult.hash);

            console.log(`✅ Treasure ${treasureId} claimed by ${claimerAccount.address()}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to claim treasure:", error);
            throw error;
        }
    }

    async updateTrustScore(adminAccount, playerAddress, trustScore) {
        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::treasure_hunt::update_trust_score`,
            arguments: [playerAddress, trustScore.toString()],
            type_arguments: []
        };

        try {
            const txnRequest = await this.client.generateTransaction(
                adminAccount.address(),
                payload
            );

            const signedTxn = await this.client.signTransaction(adminAccount, txnRequest);
            const txnResult = await this.client.submitTransaction(signedTxn);
            await this.client.waitForTransaction(txnResult.hash);

            console.log(`✅ Trust score updated for ${playerAddress}: ${trustScore}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to update trust score:", error);
            throw error;
        }
    }

    async getPlayerStats(playerAddress) {
        try {
            const resource = await this.client.getAccountResource(
                playerAddress,
                `${this.moduleAddress}::treasure_hunt::PlayerStats`
            );

            return resource;
        } catch (error) {
            console.log(`Player stats not found for ${playerAddress}`);
            return null;
        }
    }

    async getGlobalStats() {
        try {
            const resource = await this.client.getAccountResource(
                this.moduleAddress,
                `${this.moduleAddress}::treasure_hunt::GlobalConfig`
            );

            return resource;
        } catch (error) {
            console.error("Failed to get global stats:", error);
            throw error;
        }
    }
}

module.exports = TreasureHuntClient;

// Example usage
async function main() {
    const client = new TreasureHuntClient("testnet");
    
    // Create test accounts
    const admin = new AptosAccount();
    const player = new AptosAccount();
    
    console.log("Admin address:", admin.address().toString());
    console.log("Player address:", player.address().toString());
    
    // Fund accounts (testnet only)
    if (client.faucetClient) {
        await client.faucetClient.fundAccount(admin.address(), 100000000);
        await client.faucetClient.fundAccount(player.address(), 100000000);
    }
    
    // Initialize player
    await client.initializePlayer(player);
    
    // Create treasure hunt
    const huntTx = await client.createTreasureHunt(
        admin,
        "Ancient Ruins Adventure",
        "Discover hidden treasures in ancient ruins with AI-enhanced clues",
        "1000000",
        true
    );
    
    console.log("Treasure hunt created:", huntTx);
}

if (require.main === module) {
    main().catch(console.error);
}