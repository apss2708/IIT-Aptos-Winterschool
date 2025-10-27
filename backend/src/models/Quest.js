const mongoose = require('mongoose');

const treasureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  clue: {
    type: String,
    required: true,
  },
  location: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    name: String,
    address: String,
  },
  radius: {
    type: Number, // in meters
    default: 50,
    min: 10,
    max: 200,
  },
  points: {
    type: Number,
    default: 10,
    min: 5,
    max: 100,
  },
  order: {
    type: Number, // Sequence in the quest
    required: true,
    min: 1,
  },
  verificationType: {
    type: String,
    enum: ['gps', 'qr_code', 'photo', 'text', 'nfc'],
    default: 'gps',
  },
  verificationData: {
    type: String, // QR code data, photo hash, or text answer
  },
  isClaimed: {
    type: Boolean,
    default: false,
  },
  claimedBy: {
    type: String, // Wallet address of claimer
  },
  claimedAt: Date,
}, {
  _id: true,
});

const questSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  creator: {
    type: String, // Wallet address of creator
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'medium',
  },
  category: {
    type: String,
    enum: ['adventure', 'historical', 'nature', 'urban', 'mystery', 'custom'],
    default: 'adventure',
  },
  treasures: [treasureSchema],
  startLocation: {
    latitude: Number,
    longitude: Number,
    name: String,
  },
  radius: {
    type: Number, // in meters
    default: 1000,
    min: 100,
    max: 10000,
  },
  estimatedTime: {
    type: Number, // in minutes
    required: true,
    min: 5,
    max: 480,
  },
  rewards: {
    points: {
      type: Number,
      default: 0,
    },
    nftMetadata: {
      name: String,
      description: String,
      image: String,
      attributes: [{
        trait_type: String,
        value: String,
      }],
    },
  },
  requirements: {
    minLevel: {
      type: Number,
      default: 1,
    },
    requiredQuests: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quest',
    }],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  maxParticipants: {
    type: Number,
    default: 100,
  },
  currentParticipants: {
    type: Number,
    default: 0,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: Date,
  stats: {
    completions: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalAttempts: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
  },
  tags: [String],
}, {
  timestamps: true,
});

// Indexes
questSchema.index({ creator: 1 });
questSchema.index({ difficulty: 1 });
questSchema.index({ category: 1 });
questSchema.index({ isActive: 1, isPublic: 1 });
questSchema.index({ 'treasures.location': '2dsphere' });
questSchema.index({ startLocation: '2dsphere' });
questSchema.index({ tags: 1 });

// Virtual for total points
questSchema.virtual('totalPoints').get(function() {
  return this.treasures.reduce((sum, treasure) => sum + treasure.points, 0);
});

// Method to check if user can participate
questSchema.methods.canParticipate = function(userLevel, userCompletedQuests) {
  if (!this.isActive || !this.isPublic) return false;
  if (userLevel < this.requirements.minLevel) return false;
  if (this.currentParticipants >= this.maxParticipants) return false;
  
  // Check required quests
  const completedQuestIds = userCompletedQuests.map(q => q.questId.toString());
  const hasRequiredQuests = this.requirements.requiredQuests.every(questId =>
    completedQuestIds.includes(questId.toString())
  );
  
  return hasRequiredQuests;
};

// Static method to find quests near location
questSchema.statics.findNearLocation = function(latitude, longitude, maxDistance = 5000) {
  return this.find({
    isActive: true,
    isPublic: true,
    startLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
  });
};

module.exports = mongoose.model('Quest', questSchema);