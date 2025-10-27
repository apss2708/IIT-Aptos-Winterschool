const axios = require('axios');
const config = require('../config/env');
const logger = require('../config/logger');

class BlockchainService {
  constructor() {
    this.aptosNodeUrl = config.aptos.nodeUrl;
    this.aptosFaucetUrl = config.aptos.faucetUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  // Get account information
  async getAccount(address) {
    try {
      const response = await axios.get(
        `${this.aptosNodeUrl}/accounts/${address}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      logger.error('Get account error:', error.response?.data || error.message);
      throw new Error('Failed to get account information');
    }
  }

  // Get account resources
  async getAccountResources(address) {
    try {
      const response = await axios.get(
        `${this.aptosNodeUrl}/accounts/${address}/resources`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      logger.error('Get account resources error:', error.response?.data || error.message);
      throw new Error('Failed to get account resources');
    }
  }

  // Submit transaction
  async submitTransaction(signedTransaction) {
    try {
      const response = await axios.post(
        `${this.aptosNodeUrl}/transactions`,
        signedTransaction,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      logger.error('Submit transaction error:', error.response?.data || error.message);
      throw new Error('Failed to submit transaction');
    }
  }

  // Get transaction by hash
  async getTransaction(hash) {
    try {
      const response = await axios.get(
        `${this.aptosNodeUrl}/transactions/by_hash/${hash}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      logger.error('Get transaction error:', error.response?.data || error.message);
      throw new Error('Failed to get transaction');
    }
  }

  // Wait for transaction confirmation
  async waitForTransaction(hash, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const transaction = await this.getTransaction(hash);
        
        if (transaction.type === 'pending_transaction') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        if (transaction.success) {
          return transaction;
        } else {
          throw new Error(`Transaction failed: ${transaction.vm_status}`);
        }
      } catch (error) {
        if (error.message.includes('Failed to get transaction')) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Transaction confirmation timeout');
  }

  // Fund account from faucet (for testing)
  async fundAccount(address, amount = 100000) {
    try {
      const response = await axios.post(
        `${this.aptosFaucetUrl}/mint`,
        {
          address,
          amount,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      logger.error('Fund account error:', error.response?.data || error.message);
      throw new Error('Failed to fund account');
    }
  }

  // Get NFT collection
  async getNFTCollection(address, collectionName) {
    try {
      const resources = await this.getAccountResources(address);
      const tokenStore = resources.find(resource => 
        resource.type === '0x3::token::TokenStore'
      );
      
      if (!tokenStore) {
        return [];
      }
      
      // This is a simplified implementation
      // In a real scenario, you'd query the specific collection
      return tokenStore.data?.token_data?.map(token => ({
        tokenId: token.id.token_data_id,
        name: token.id.token_data_id.name,
        collection: token.id.token_data_id.collection,
        description: token.description,
        uri: token.uri,
        maximum: token.maximum,
        supply: token.supply,
        royaltyPointsPerMillion: token.royalty.royalty_points_per_million,
      })) || [];
    } catch (error) {
      logger.error('Get NFT collection error:', error);
      return [];
    }
  }

  // Mint NFT reward
  async mintNFTReward(creatorAddress, recipientAddress, nftMetadata) {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd call your Move contract
      const transactionPayload = {
        type: 'entry_function_payload',
        function: `${creatorAddress}::treasure_hunt::mint_reward_nft`,
        type_arguments: [],
        arguments: [
          recipientAddress,
          nftMetadata.name,
          nftMetadata.description,
          nftMetadata.image,
          JSON.stringify(nftMetadata.attributes || []),
        ],
      };
      
      logger.info('NFT minting payload:', transactionPayload);
      
      // In a real implementation, this would be signed and submitted
      return {
        success: true,
        message: 'NFT minting simulation complete',
        transactionHash: 'simulated_tx_hash_' + Date.now(),
      };
    } catch (error) {
      logger.error('Mint NFT error:', error);
      throw new Error('Failed to mint NFT');
    }
  }

  // Transfer tokens as reward
  async transferTokenReward(senderAddress, recipientAddress, amount) {
    try {
      // This is a simplified implementation
      const transactionPayload = {
        type: 'entry_function_payload',
        function: '0x1::aptos_account::transfer',
        type_arguments: [],
        arguments: [recipientAddress, amount],
      };
      
      logger.info('Token transfer payload:', transactionPayload);
      
      // In a real implementation, this would be signed and submitted
      return {
        success: true,
        message: 'Token transfer simulation complete',
        transactionHash: 'simulated_tx_hash_' + Date.now(),
      };
    } catch (error) {
      logger.error('Transfer token error:', error);
      throw new Error('Failed to transfer tokens');
    }
  }

  // Verify on-chain transaction
  async verifyTransaction(transactionHash, expectedEvents = []) {
    try {
      const transaction = await this.getTransaction(transactionHash);
      
      if (!transaction.success) {
        return {
          verified: false,
          reason: 'Transaction failed on-chain',
          transaction,
        };
      }
      
      // Check for expected events
      if (expectedEvents.length > 0 && transaction.events) {
        const foundEvents = expectedEvents.filter(expectedEvent =>
          transaction.events.some(event => 
            event.type.includes(expectedEvent)
          )
        );
        
        if (foundEvents.length !== expectedEvents.length) {
          return {
            verified: false,
            reason: 'Expected events not found in transaction',
            transaction,
            missingEvents: expectedEvents.filter(e => !foundEvents.includes(e)),
          };
        }
      }
      
      return {
        verified: true,
        transaction,
      };
    } catch (error) {
      logger.error('Verify transaction error:', error);
      return {
        verified: false,
        reason: error.message,
      };
    }
  }

  // Get blockchain events
  async getEvents(eventKey, limit = 25) {
    try {
      const response = await axios.get(
        `${this.aptosNodeUrl}/events/${eventKey}?limit=${limit}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      logger.error('Get events error:', error.response?.data || error.message);
      throw new Error('Failed to get events');
    }
  }
}

module.exports = new BlockchainService();