const { AptosClient, TxnBuilderTypes, BCS } = require("aptos");

class TransactionHelpers {
    constructor(client) {
        this.client = client;
    }

    // Create and sign transaction with retry logic
    async createAndSignTransaction(sender, payload, options = {}) {
        const maxRetries = options.maxRetries || 3;
        const retryDelay = options.retryDelay || 1000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const txnRequest = await this.client.generateTransaction(
                    sender.address(), 
                    payload, 
                    options
                );
                
                const signedTxn = await this.client.signTransaction(sender, txnRequest);
                return signedTxn;
            } catch (error) {
                if (attempt === maxRetries) throw error;
                console.log(`Transaction attempt ${attempt} failed, retrying...`);
                await this.sleep(retryDelay * attempt);
            }
        }
    }

    // Submit transaction with wait and confirmation
    async submitAndWait(signedTxn, options = {}) {
        const maxWaitTime = options.maxWaitTime || 30000; // 30 seconds
        const checkInterval = options.checkInterval || 1000;
        
        try {
            const txnResult = await this.client.submitTransaction(signedTxn);
            
            // Wait for transaction confirmation
            const startTime = Date.now();
            while (Date.now() - startTime < maxWaitTime) {
                try {
                    const txn = await this.client.waitForTransaction(txnResult.hash, {
                        timeoutSecs: Math.floor(checkInterval / 1000)
                    });
                    
                    if (txn && txn.success) {
                        return {
                            hash: txnResult.hash,
                            success: true,
                            version: txn.version,
                            timestamp: txn.timestamp
                        };
                    }
                } catch (waitError) {
                    // Continue waiting
                }
                
                await this.sleep(checkInterval);
            }
            
            throw new Error(`Transaction timeout: ${txnResult.hash}`);
            
        } catch (error) {
            console.error('Transaction submission failed:', error);
            throw error;
        }
    }

    // Create payload for Move function calls
    createMovePayload(functionId, typeArguments = [], arguments = []) {
        return {
            type: "entry_function_payload",
            function: functionId,
            type_arguments: typeArguments,
            arguments: arguments
        };
    }

    // Encode vector<u8> for Move arguments
    encodeU8Vector(data) {
        if (typeof data === 'string') {
            // Hex string to bytes
            if (data.startsWith('0x')) {
                data = data.slice(2);
            }
            return Array.from(Buffer.from(data, 'hex'));
        } else if (Array.isArray(data)) {
            return data;
        } else if (Buffer.isBuffer(data)) {
            return Array.from(data);
        } else {
            throw new Error('Unsupported data type for u8 vector');
        }
    }

    // Decode vector<u8> from Move response
    decodeU8Vector(data) {
        return Buffer.from(data).toString('hex');
    }

    // Convert address to proper format
    normalizeAddress(address) {
        if (address.startsWith('0x')) {
            return address;
        }
        return `0x${address}`;
    }

    // Sleep utility
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Batch transaction processing
    async processBatch(transactions, concurrency = 5) {
        const results = [];
        
        for (let i = 0; i < transactions.length; i += concurrency) {
            const batch = transactions.slice(i, i + concurrency);
            const batchResults = await Promise.allSettled(
                batch.map(txn => this.submitAndWait(txn))
            );
            results.push(...batchResults);
        }
        
        return results;
    }

    // Estimate gas for transaction
    async estimateGas(sender, payload) {
        try {
            const txnRequest = await this.client.generateTransaction(
                sender.address(),
                payload
            );
            
            // This is a simplified estimation
            // In production, you might use more sophisticated methods
            const baseGas = 1000;
            const argumentSize = JSON.stringify(payload.arguments).length;
            const estimatedGas = baseGas + (argumentSize * 10);
            
            return Math.min(estimatedGas, 1000000); // Cap at 1M
        } catch (error) {
            console.warn('Gas estimation failed, using default');
            return 100000; // Default gas
        }
    }

    // Create BCS serializer for complex types
    createBCSSerializer() {
        const serializer = new BCS.Serializer();
        return serializer;
    }

    // Create BCS deserializer
    createBCSDeserializer(data) {
        const deserializer = new BCS.Deserializer(data);
        return deserializer;
    }
}

module.exports = TransactionHelpers;