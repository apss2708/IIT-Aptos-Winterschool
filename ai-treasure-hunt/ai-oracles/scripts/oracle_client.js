const { AptosClient, AptosAccount } = require("aptos");
const { getNetworkConfig } = require("../config/network_config");
const { TransactionHelpers } = require("./transaction_helpers");

class OracleClient {
    constructor(network = "testnet") {
        this.networkConfig = getNetworkConfig(network);
        this.client = new AptosClient(this.networkConfig.nodeUrl);
        this.moduleAddress = this.networkConfig.moduleAddress;
        this.transactionHelpers = new TransactionHelpers(this.client);
    }

    async createAIRequest(requesterAccount, requestType, inputData) {
        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::ai_oracle::create_ai_request`,
            arguments: [
                requestType,
                Array.from(Buffer.from(inputData, 'hex'))
            ],
            type_arguments: []
        };

        try {
            const txnResult = await this.transactionHelpers.submitAndWait(
                await this.transactionHelpers.createAndSignTransaction(requesterAccount, payload)
            );

            console.log(`✅ AI request created: ${txnResult.hash}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to create AI request:", error);
            throw error;
        }
    }

    async submitAIResponse(oracleAccount, requestId, resultData, confidenceScore) {
        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::ai_oracle::submit_ai_response`,
            arguments: [
                requestId.toString(),
                Array.from(Buffer.from(resultData, 'hex')),
                confidenceScore.toString()
            ],
            type_arguments: []
        };

        try {
            const txnResult = await this.transactionHelpers.submitAndWait(
                await this.transactionHelpers.createAndSignTransaction(oracleAccount, payload)
            );

            console.log(`✅ AI response submitted for request ${requestId}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to submit AI response:", error);
            throw error;
        }
    }

    async authorizeOracle(adminAccount, oracleAddress) {
        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::ai_oracle::authorize_oracle`,
            arguments: [oracleAddress],
            type_arguments: []
        };

        try {
            const txnResult = await this.transactionHelpers.submitAndWait(
                await this.transactionHelpers.createAndSignTransaction(adminAccount, payload)
            );

            console.log(`✅ Oracle authorized: ${oracleAddress}`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to authorize oracle:", error);
            throw error;
        }
    }

    async sendHeartbeat(oracleAccount) {
        const payload = {
            type: "entry_function_payload",
            function: `${this.moduleAddress}::ai_oracle::oracle_heartbeat`,
            arguments: [],
            type_arguments: []
        };

        try {
            const txnResult = await this.transactionHelpers.submitAndWait(
                await this.transactionHelpers.createAndSignTransaction(oracleAccount, payload)
            );

            console.log(`✅ Oracle heartbeat sent`);
            return txnResult.hash;
        } catch (error) {
            console.error("❌ Failed to send heartbeat:", error);
            throw error;
        }
    }

    async getOracleStats() {
        try {
            const resource = await this.client.getAccountResource(
                this.moduleAddress,
                `${this.moduleAddress}::ai_oracle::AIOracle`
            );

            return {
                requestCount: resource.request_count,
                authorizedOracles: resource.authorized_oracles,
                activeRequests: resource.active_requests,
                lastHeartbeat: resource.last_heartbeat
            };
        } catch (error) {
            console.error("Failed to get oracle stats:", error);
            return null;
        }
    }

    // Listen for oracle events
    async listenForOracleEvents(callback, eventType = null) {
        // This would set up event streaming in production
        // For now, we'll simulate with polling
        setInterval(async () => {
            try {
                const events = await this.client.getEventsByEventHandle(
                    this.moduleAddress,
                    `${this.moduleAddress}::ai_oracle::AIOracle`,
                    "oracle_events"
                );

                events.forEach(event => {
                    if (!eventType || event.type.includes(eventType)) {
                        callback(event);
                    }
                });
            } catch (error) {
                console.error("Error listening for oracle events:", error);
            }
        }, 5000); // Poll every 5 seconds
    }

    // Batch process multiple AI requests
    async batchProcessRequests(oracleAccount, requests) {
        const transactions = [];
        
        for (const request of requests) {
            const payload = {
                type: "entry_function_payload",
                function: `${this.moduleAddress}::ai_oracle::submit_ai_response`,
                arguments: [
                    request.requestId.toString(),
                    Array.from(Buffer.from(request.resultData, 'hex')),
                    request.confidenceScore.toString()
                ],
                type_arguments: []
            };

            const signedTxn = await this.transactionHelpers.createAndSignTransaction(
                oracleAccount, 
                payload
            );
            transactions.push(signedTxn);
        }

        const results = await this.transactionHelpers.processBatch(transactions);
        return results;
    }
}

module.exports = OracleClient;