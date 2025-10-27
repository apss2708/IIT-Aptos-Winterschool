const crypto = require('crypto');
const logger = require('../config/logger');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.authTagLength = 16;
  }

  // Generate encryption key from secret
  generateKey(secret) {
    return crypto.createHash('sha256').update(secret).digest();
  }

  // Encrypt data
  encrypt(data, secret) {
    try {
      const key = this.generateKey(secret);
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('treasure-hunt'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data
  decrypt(encryptedObject, secret) {
    try {
      const { encryptedData, iv, authTag } = encryptedObject;
      const key = this.generateKey(secret);
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(Buffer.from('treasure-hunt'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash data (one-way)
  hash(data, salt = null) {
    try {
      const hash = crypto.createHash('sha256');
      
      if (salt) {
        hash.update(salt);
      }
      
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      logger.error('Hashing error:', error);
      throw new Error('Failed to hash data');
    }
  }

  // Generate random token
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate QR code data
  generateQRData(treasureId, questId, secret) {
    try {
      const data = {
        treasureId,
        questId,
        timestamp: Date.now(),
        nonce: this.generateToken(8)
      };
      
      const dataString = JSON.stringify(data);
      const signature = this.hash(dataString, secret);
      
      return {
        ...data,
        signature
      };
    } catch (error) {
      logger.error('QR data generation error:', error);
      throw new Error('Failed to generate QR data');
    }
  }

  // Verify QR code data
  verifyQRData(qrData, secret) {
    try {
      const { signature, ...data } = qrData;
      const dataString = JSON.stringify(data);
      const expectedSignature = this.hash(dataString, secret);
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('QR data verification error:', error);
      return false;
    }
  }

  // Generate location proof hash
  generateLocationProof(locationData, secret) {
    const { latitude, longitude, accuracy, timestamp, walletAddress } = locationData;
    
    const dataString = `${latitude},${longitude},${accuracy},${timestamp},${walletAddress}`;
    return this.hash(dataString, secret);
  }

  // Generate NFT metadata hash
  generateNFTMetadataHash(metadata) {
    const sortedMetadata = this.sortObject(metadata);
    const metadataString = JSON.stringify(sortedMetadata);
    return this.hash(metadataString);
  }

  // Helper: Sort object keys alphabetically
  sortObject(obj) {
    return Object.keys(obj).sort().reduce((result, key) => {
      result[key] = obj[key];
      return result;
    }, {});
  }

  // Generate secure random number
  generateSecureRandom(min, max) {
    const range = max - min + 1;
    const bytes = Math.ceil(Math.log2(range) / 8);
    const maxValue = Math.pow(2, bytes * 8);
    
    let value;
    do {
      const randomBytes = crypto.randomBytes(bytes);
      value = randomBytes.readUIntBE(0, bytes);
    } while (value >= maxValue - (maxValue % range));
    
    return min + (value % range);
  }
}

module.exports = new EncryptionService();