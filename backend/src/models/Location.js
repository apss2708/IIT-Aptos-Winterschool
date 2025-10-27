const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  walletAddress: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  questId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quest',
    required: true,
  },
  treasureId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number, // in meters
      default: 0,
    },
    altitude: Number,
    heading: Number,
    speed: Number,
  },
  verificationData: {
    type: {
      type: String,
      enum: ['gps', 'qr_scan', 'photo', 'nfc', 'bluetooth'],
      required: true,
    },
    proof: String, // Hash, image URL, or scanned data
    timestamp: {
      type: Date,
      default: Date.now,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1,
    },
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'suspicious'],
    default: 'pending',
  },
  verifiedBy: {
    type: String, // System or admin wallet address
  },
  verifiedAt: Date,
  rejectionReason: String,
  metadata: {
    deviceInfo: String,
    ipAddress: String,
    userAgent: String,
    batteryLevel: Number,
  },
}, {
  timestamps: true,
});

// Indexes for performance
locationSchema.index({ userId: 1, questId: 1 });
locationSchema.index({ walletAddress: 1 });
locationSchema.index({ 'coordinates': '2dsphere' });
locationSchema.index({ status: 1 });
locationSchema.index({ createdAt: 1 });

// Static method to find nearby verifications
locationSchema.statics.findNearbyVerifications = function(latitude, longitude, maxDistance = 100, limit = 10) {
  return this.find({
    status: 'verified',
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
  }).limit(limit);
};

// Method to check if verification is within radius
locationSchema.methods.isWithinRadius = function(targetLat, targetLng, radius) {
  const distance = this.calculateDistance(
    this.coordinates.latitude,
    this.coordinates.longitude,
    targetLat,
    targetLng
  );
  return distance <= radius;
};

// Calculate distance using Haversine formula
locationSchema.methods.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

module.exports = mongoose.model('Location', locationSchema);