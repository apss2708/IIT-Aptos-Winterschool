const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  username: {
    type: String,
    trim: true,
    default: function() {
      return `Explorer${Math.random().toString(36).substr(2, 6)}`;
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  level: {
    type: Number,
    default: 1,
  },
  completedQuests: [{
    questId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quest',
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    score: Number,
    timeTaken: Number, // in seconds
  }],
  nftCollection: [{
    tokenId: String,
    metadata: Object,
    acquiredAt: {
      type: Date,
      default: Date.now,
    },
    questId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quest',
    },
  }],
  gameStats: {
    totalTreasures: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 }, // in meters
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    averageCompletionTime: { type: Number, default: 0 },
  },
  preferences: {
    notifications: { type: Boolean, default: true },
    privacy: { type: String, enum: ['public', 'private'], default: 'public' },
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for performance
userSchema.index({ walletAddress: 1 });
userSchema.index({ totalPoints: -1 });
userSchema.index({ 'gameStats.totalTreasures': -1 });
userSchema.index({ lastActive: -1 });

// Update lastActive before saving
userSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

// Static method to get leaderboard
userSchema.statics.getLeaderboard = function(limit = 50) {
  return this.find({ 'preferences.privacy': 'public' })
    .sort({ totalPoints: -1, 'gameStats.totalTreasures': -1 })
    .limit(limit)
    .select('walletAddress username totalPoints level gameStats');
};

// Method to calculate rank
userSchema.methods.getRank = async function() {
  const count = await this.constructor.countDocuments({
    totalPoints: { $gt: this.totalPoints },
    'preferences.privacy': 'public'
  });
  return count + 1;
};

module.exports = mongoose.model('User', userSchema);