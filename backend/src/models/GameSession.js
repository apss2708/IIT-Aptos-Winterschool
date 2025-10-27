const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned', 'paused'],
    default: 'active',
  },
  progress: {
    currentTreasure: {
      type: Number,
      default: 1,
    },
    treasuresFound: [{
      treasureId: mongoose.Schema.Types.ObjectId,
      foundAt: {
        type: Date,
        default: Date.now,
      },
      timeTaken: Number, // seconds to find this treasure
    }],
    totalTime: {
      type: Number, // in seconds
      default: 0,
    },
    distanceTraveled: {
      type: Number, // in meters
      default: 0,
    },
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: Date,
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  score: {
    type: Number,
    default: 0,
  },
  bonuses: {
    speedBonus: { type: Number, default: 0 },
    completionBonus: { type: Number, default: 0 },
    streakBonus: { type: Number, default: 0 },
  },
  challenges: {
    timeLimit: Number, // in minutes
    mustCompleteInOrder: { type: Boolean, default: true },
    noHints: { type: Boolean, default: false },
  },
  sessionData: {
    startLocation: {
      latitude: Number,
      longitude: Number,
    },
    path: [{
      latitude: Number,
      longitude: Number,
      timestamp: Date,
    }],
    hintsUsed: [{
      treasureId: mongoose.Schema.Types.ObjectId,
      usedAt: Date,
      hintType: String,
    }],
  },
}, {
  timestamps: true,
});

// Indexes
gameSessionSchema.index({ userId: 1, questId: 1 });
gameSessionSchema.index({ walletAddress: 1 });
gameSessionSchema.index({ status: 1 });
gameSessionSchema.index({ startTime: -1 });
gameSessionSchema.index({ 'progress.currentTreasure': 1 });

// Update lastActivity before saving
gameSessionSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  
  // Calculate total time if session is active
  if (this.status === 'active') {
    this.progress.totalTime = Math.floor((new Date() - this.startTime) / 1000);
  }
  
  next();
});

// Virtual for completion percentage
gameSessionSchema.virtual('completionPercentage').get(function() {
  const quest = this.parent().questId;
  if (!quest || !quest.treasures) return 0;
  return (this.progress.treasuresFound.length / quest.treasures.length) * 100;
});

// Method to add found treasure
gameSessionSchema.methods.addFoundTreasure = function(treasureId, timeTaken = null) {
  this.progress.treasuresFound.push({
    treasureId,
    foundAt: new Date(),
    timeTaken: timeTaken || Math.floor((new Date() - this.lastActivity) / 1000),
  });
  
  this.progress.currentTreasure += 1;
  
  // Check if quest is completed
  const quest = this.parent().questId;
  if (quest && this.progress.treasuresFound.length === quest.treasures.length) {
    this.status = 'completed';
    this.endTime = new Date();
    this.calculateFinalScore();
  }
};

// Method to calculate final score
gameSessionSchema.methods.calculateFinalScore = function() {
  const quest = this.parent().questId;
  if (!quest) return;
  
  let baseScore = this.progress.treasuresFound.reduce((sum, treasure) => {
    const treasureData = quest.treasures.id(treasure.treasureId);
    return sum + (treasureData?.points || 0);
  }, 0);
  
  // Speed bonus (complete faster than estimated time)
  const totalTimeMinutes = this.progress.totalTime / 60;
  const estimatedTime = quest.estimatedTime;
  if (totalTimeMinutes < estimatedTime) {
    const timeSaved = estimatedTime - totalTimeMinutes;
    this.bonuses.speedBonus = Math.floor((timeSaved / estimatedTime) * 100);
  }
  
  // Completion bonus (find all treasures)
  if (this.progress.treasuresFound.length === quest.treasures.length) {
    this.bonuses.completionBonus = Math.floor(baseScore * 0.2); // 20% bonus
  }
  
  this.score = baseScore + this.bonuses.speedBonus + this.bonuses.completionBonus;
};

// Static method to get active sessions for user
gameSessionSchema.statics.getActiveSessions = function(walletAddress) {
  return this.find({
    walletAddress: walletAddress.toLowerCase(),
    status: 'active',
  }).populate('questId', 'title description difficulty estimatedTime');
};

module.exports = mongoose.model('GameSession', gameSessionSchema);