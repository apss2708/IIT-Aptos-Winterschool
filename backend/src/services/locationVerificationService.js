const geolib = require('geolib');
const crypto = require('crypto');
const Location = require('../models/Location');
const logger = require('../config/logger');

class LocationVerificationService {
  constructor() {
    this.requiredAccuracy = 50; // meters
    this.minDistanceForVerification = 5; // meters
  }

  // Verify GPS location
  async verifyGPSLocation(userData, treasureData, currentLocation) {
    try {
      const { userId, walletAddress, questId, treasureId } = userData;
      const { targetLocation, radius } = treasureData;
      const { latitude, longitude, accuracy, timestamp } = currentLocation;

      // Check GPS accuracy
      if (accuracy > this.requiredAccuracy) {
        return {
          success: false,
          status: 'rejected',
          reason: `GPS accuracy too low: ${accuracy}m (required: ${this.requiredAccuracy}m)`,
          confidence: 0.3,
        };
      }

      // Calculate distance to target
      const distance = geolib.getDistance(
        { latitude, longitude },
        { latitude: targetLocation.latitude, longitude: targetLocation.longitude }
      );

      // Check if within radius
      if (distance > radius) {
        return {
          success: false,
          status: 'rejected',
          reason: `Distance to treasure: ${distance}m (required within: ${radius}m)`,
          confidence: 0.5,
        };
      }

      // Check for suspicious activity (multiple verifications from same location)
      const recentVerifications = await Location.find({
        walletAddress,
        questId,
        status: 'verified',
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
      });

      const similarVerifications = recentVerifications.filter(verification => 
        this.calculateDistance(
          verification.coordinates.latitude,
          verification.coordinates.longitude,
          latitude,
          longitude
        ) < this.minDistanceForVerification
      );

      if (similarVerifications.length > 2) {
        return {
          success: false,
          status: 'suspicious',
          reason: 'Multiple verifications from similar location detected',
          confidence: 0.1,
        };
      }

      // Generate verification proof
      const proof = this.generateLocationProof({
        latitude,
        longitude,
        timestamp,
        walletAddress,
        treasureId,
      });

      return {
        success: true,
        status: 'verified',
        confidence: this.calculateConfidence(accuracy, distance, radius),
        proof,
        distance,
      };

    } catch (error) {
      logger.error('GPS location verification error:', error);
      throw new Error('Location verification failed');
    }
  }

  // Verify QR code
  async verifyQRCode(userData, treasureData, scannedData) {
    try {
      const { expectedData } = treasureData.verificationData;
      
      if (scannedData !== expectedData) {
        return {
          success: false,
          status: 'rejected',
          reason: 'Invalid QR code',
          confidence: 0,
        };
      }

      const proof = this.generateQRProof(scannedData, userData);
      
      return {
        success: true,
        status: 'verified',
        confidence: 0.9,
        proof,
      };

    } catch (error) {
      logger.error('QR code verification error:', error);
      throw new Error('QR code verification failed');
    }
  }

  // Verify photo evidence
  async verifyPhoto(userData, treasureData, photoData) {
    try {
      // In a real implementation, this would use computer vision
      // For now, we'll simulate verification
      const proof = this.generatePhotoProof(photoData, userData);
      
      // Simulate AI-based verification
      const confidence = Math.random() * 0.3 + 0.7; // 0.7-1.0 confidence
      
      return {
        success: confidence > 0.8,
        status: confidence > 0.8 ? 'verified' : 'pending',
        confidence,
        proof,
        requiresManualReview: confidence <= 0.8,
      };

    } catch (error) {
      logger.error('Photo verification error:', error);
      throw new Error('Photo verification failed');
    }
  }

  // Multi-factor verification
  async multiFactorVerification(userData, treasureData, verificationMethods) {
    try {
      const results = [];
      let totalConfidence = 0;
      let factors = 0;

      // GPS verification
      if (verificationMethods.gps) {
        const gpsResult = await this.verifyGPSLocation(
          userData, 
          treasureData, 
          verificationMethods.gps
        );
        results.push({ type: 'gps', ...gpsResult });
        if (gpsResult.success) {
          totalConfidence += gpsResult.confidence;
          factors++;
        }
      }

      // QR verification
      if (verificationMethods.qr) {
        const qrResult = await this.verifyQRCode(
          userData,
          treasureData,
          verificationMethods.qr
        );
        results.push({ type: 'qr', ...qrResult });
        if (qrResult.success) {
          totalConfidence += qrResult.confidence;
          factors++;
        }
      }

      // Photo verification
      if (verificationMethods.photo) {
        const photoResult = await this.verifyPhoto(
          userData,
          treasureData,
          verificationMethods.photo
        );
        results.push({ type: 'photo', ...photoResult });
        if (photoResult.success) {
          totalConfidence += photoResult.confidence;
          factors++;
        }
      }

      const averageConfidence = factors > 0 ? totalConfidence / factors : 0;
      const overallSuccess = averageConfidence >= 0.7 && factors >= 1;

      return {
        success: overallSuccess,
        status: overallSuccess ? 'verified' : 'rejected',
        confidence: averageConfidence,
        factors,
        results,
        proof: this.generateMultiFactorProof(results),
      };

    } catch (error) {
      logger.error('Multi-factor verification error:', error);
      throw new Error('Multi-factor verification failed');
    }
  }

  // Helper methods
  calculateDistance(lat1, lon1, lat2, lon2) {
    return geolib.getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
  }

  calculateConfidence(accuracy, distance, radius) {
    const accuracyScore = Math.max(0, 1 - (accuracy / this.requiredAccuracy));
    const distanceScore = Math.max(0, 1 - (distance / radius));
    return (accuracyScore + distanceScore) / 2;
  }

  generateLocationProof(locationData) {
    const dataString = JSON.stringify(locationData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  generateQRProof(scannedData, userData) {
    const dataString = `${scannedData}-${userData.walletAddress}-${Date.now()}`;
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  generatePhotoProof(photoData, userData) {
    // In real implementation, this would hash the actual image data
    const dataString = `${userData.walletAddress}-${Date.now()}`;
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  generateMultiFactorProof(results) {
    const dataString = results.map(r => r.proof).join('-');
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }
}

module.exports = new LocationVerificationService();