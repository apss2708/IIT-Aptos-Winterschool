const { AptosClient, AptosAccount } = require("aptos");
const { getNetworkConfig } = require("../config/network_config");
const { TransactionHelpers } = require("./transaction_helpers");

class NFTUpdater {
    constructor(network = "testnet") {
        this.networkConfig = getNetworkConfig(network);
        this.client = new AptosClient(this.networkConfig.nodeUrl);
        this.moduleAddress = this.networkConfig.moduleAddress;
        this.transactionHelpers = new TransactionHelpers(this.client);
    }

    async mintDynamicNFT(creatorAccount, huntId, treasureId, metadataUri, initialProperties) {
        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::dynamic_nft::mint_dynamic_nft`,
            arguments: [
                huntId.toString(),
                treasureId.toString(),
                metadataUri,
                initialProperties
            ],
            type_arguments: []
        };

        try {
            const txnResult = await this.transactionHelpers.submitAndWait(
                await this.transactionHelpers.createAndSignTransaction(creatorAccount, payload)
            );

            console.log(`✅ Dynamic NFT minted for treasure ${treasureId}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to mint dynamic NFT:", error);
            throw error;
        }
    }

    async updateNFTProperty(ownerAccount, propertyName, propertyValue) {
        // Convert property value to bytes
        const valueBytes = Array.from(Buffer.from(propertyValue, 'utf8'));

        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::dynamic_nft::update_nft_property`,
            arguments: [
                propertyName,
                valueBytes
            ],
            type_arguments: []
        };

        try {
            const txnResult = await this.transactionHelpers.submitAndWait(
                await this.transactionHelpers.createAndSignTransaction(ownerAccount, payload)
            );

            console.log(`✅ NFT property updated: ${propertyName}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to update NFT property:", error);
            throw error;
        }
    }

    async applyAIEnhancement(ownerAccount, enhancementType, enhancementData) {
        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::dynamic_nft::apply_ai_enhancement`,
            arguments: [
                enhancementType,
                Array.from(Buffer.from(enhancementData, 'hex'))
            ],
            type_arguments: []
        };

        try {
            const txnResult = await this.transactionHelpers.submitAndWait(
                await this.transactionHelpers.createAndSignTransaction(ownerAccount, payload)
            );

            console.log(`✅ AI enhancement applied: ${enhancementType}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to apply AI enhancement:", error);
            throw error;
        }
    }

    async transferNFT(currentOwnerAccount, newOwnerAddress) {
        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::dynamic_nft::transfer_nft`,
            arguments: [newOwnerAddress],
            type_arguments: []
        };

        try {
            const txnResult = await this.transactionHelpers.submitAndWait(
                await this.transactionHelpers.createAndSignTransaction(currentOwnerAccount, payload)
            );

            console.log(`✅ NFT transferred to: ${newOwnerAddress}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to transfer NFT:", error);
            throw error;
        }
    }

    async getNFTProperties(ownerAddress) {
        try {
            const resource = await this.client.getAccountResource(
                ownerAddress,
                `${this.moduleAddress}::dynamic_nft::DynamicNFT`
            );

            // In production, you would decode the property map
            return {
                treasureId: resource.treasure_id,
                huntId: resource.hunt_id,
                upgradeCount: resource.upgrade_count,
                aiEnhancements: resource.ai_enhancements,
                createdAt: resource.created_at,
                lastUpdated: resource.last_updated
            };
        } catch (error) {
            console.log(`NFT not found for address: ${ownerAddress}`);
            return null;
        }
    }

    async initializeCollection(creatorAccount, huntId, collectionName, description, maxSupply) {
        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::dynamic_nft::initialize_collection`,
            arguments: [
                huntId.toString(),
                collectionName,
                description,
                maxSupply.toString()
            ],
            type_arguments: []
        };

        try {
            const txnResult = await this.transactionHelpers.submitAndWait(
                await this.transactionHelpers.createAndSignTransaction(creatorAccount, payload)
            );

            console.log(`✅ NFT collection initialized: ${collectionName}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to initialize collection:", error);
            throw error;
        }
    }

    // Batch update multiple NFT properties
    async batchUpdateProperties(ownerAccount, updates) {
        const transactions = [];
        
        for (const update of updates) {
            const valueBytes = Array.from(Buffer.from(update.value, 'utf8'));
            
            const payload = {
                type: "entry_function_payload",
                function: `${this.moduleAddress}::dynamic_nft::update_nft_property`,
                arguments: [update.propertyName, valueBytes],
                type_arguments: []
            };

            const signedTxn = await this.transactionHelpers.createAndSignTransaction(
                ownerAccount, 
                payload
            );
            transactions.push(signedTxn);
        }

        const results = await this.transactionHelpers.processBatch(transactions);
        return results;
    }
}

module.exports = NFTUpdater;