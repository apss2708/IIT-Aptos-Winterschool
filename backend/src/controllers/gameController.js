const GameSession = require('../models/GameSession');
const User = require('../models/User');
const Quest = require('../models/Quest');
const notificationService = require('../services/notificationService');
const logger = require('../config/logger');

// @desc    Get active game sessions
// @route   GET /api/game/sessions/active
// @access  Private
const getActiveSessions = async (req, res) => {
  try {
    const sessions = await GameSession.getActiveSessions(req.user.walletAddress);

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    logger.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching active sessions',
    });
  }
};

// @desc    Get game session details
// @route   GET /api/game/sessions/:id
// @access  Private
const getGameSession = async (req, res) => {
  try {
    const session = await GameSession.findById(req.params.id)
      .populate('questId', 'title description difficulty treasures estimatedTime');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found',
      });
    }

    // Check if user owns the session
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this game session',
      });
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error('Get game session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching game session',
    });
  }
};

// @desc    Abandon game session
// @route   POST /api/game/sessions/:id/abandon
// @access  Private
const abandonGameSession = async (req, res) => {
  try {
    const session = await GameSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found',
      });
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this game session',
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active sessions can be abandoned',
      });
    }

    session.status = 'abandoned';
    session.endTime = new Date();
    await session.save();

    // Update quest participants count
    await Quest.findByIdAndUpdate(session.questId, {
      $inc: { currentParticipants: -1 },
    });

    logger.info(`Game session abandoned: ${session._id} by ${req.user.walletAddress}`);

    res.status(200).json({
      success: true,
      message: 'Game session abandoned successfully',
      data: {
        sessionId: session._id,
        status: session.status,
      },
    });
  } catch (error) {
    logger.error('Abandon game session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while abandoning game session',
    });
  }
};

// @desc    Pause game session
// @route   POST /api/game/sessions/:id/pause
// @access  Private
const pauseGameSession = async (req, res) => {
  try {
    const session = await GameSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found',
      });
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this game session',
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active sessions can be paused',
      });
    }

    session.status = 'paused';
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Game session paused successfully',
      data: {
        sessionId: session._id,
        status: session.status,
        pausedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Pause game session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while pausing game session',
    });
  }
};

// @desc    Resume game session
// @route   POST /api/game/sessions/:id/resume
// @access  Private
const resumeGameSession = async (req, res) => {
  try {
    const session = await GameSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found',
      });
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this game session',
      });
    }

    if (session.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: 'Only paused sessions can be resumed',
      });
    }

    session.status = 'active';
    session.lastActivity = new Date();
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Game session resumed successfully',
      data: {
        sessionId: session._id,
        status: session.status,
        resumedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Resume game session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resuming game session',
    });
  }
};

// @desc    Get game statistics
// @route   GET /api/game/stats
// @access  Private
const getGameStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('completedQuests.questId', 'title difficulty')
      .select('totalPoints level gameStats completedQuests nftCollection');

    // Calculate additional stats
    const completedSessions = await GameSession.countDocuments({
      userId: req.user._id,
      status: 'completed',
    });

    const abandonedSessions = await GameSession.countDocuments({
      userId: req.user._id,
      status: 'abandoned',
    });

    const totalPlayTime = await GameSession.aggregate([
      {
        $match: {
          userId: req.user._id,
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          totalPlayTime: { $sum: '$progress.totalTime' },
        },
      },
    ]);

    const favoriteDifficulty = await GameSession.aggregate([
      {
        $match: {
          userId: req.user._id,
          status: 'completed',
        },
      },
      {
        $lookup: {
          from: 'quests',
          localField: 'questId',
          foreignField: '_id',
          as: 'quest',
        },
      },
      {
        $unwind: '$quest',
      },
      {
        $group: {
          _id: '$quest.difficulty',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    const stats = {
      basic: {
        totalPoints: user.totalPoints,
        level: user.level,
        completedQuests: user.completedQuests.length,
        nftsCollected: user.nftCollection.length,
        totalTreasures: user.gameStats.totalTreasures,
        totalDistance: user.gameStats.totalDistance,
        currentStreak: user.gameStats.streak,
        longestStreak: user.gameStats.longestStreak,
      },
      sessions: {
        completed: completedSessions,
        abandoned: abandonedSessions,
        successRate: completedSessions + abandonedSessions > 0 
          ? (completedSessions / (completedSessions + abandonedSessions)) * 100 
          : 0,
        totalPlayTime: totalPlayTime[0]?.totalPlayTime || 0,
      },
      preferences: {
        favoriteDifficulty: favoriteDifficulty[0]?._id || 'None',
      },
      achievements: await this.calculateAchievements(user),
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get game stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching game statistics',
    });
  }
};

// @desc    Get global leaderboard
// @route   GET /api/game/leaderboard
// @access  Public
const getLeaderboard = async (req, res) => {
  try {
    const { type = 'points', limit = 100 } = req.query;

    let sortCriteria = {};
    switch (type) {
      case 'points':
        sortCriteria = { totalPoints: -1 };
        break;
      case 'treasures':
        sortCriteria = { 'gameStats.totalTreasures': -1 };
        break;
      case 'quests':
        sortCriteria = { 'completedQuests': -1 };
        break;
      case 'distance':
        sortCriteria = { 'gameStats.totalDistance': -1 };
        break;
      default:
        sortCriteria = { totalPoints: -1 };
    }

    const leaderboard = await User.getLeaderboard(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        type,
        leaderboard: leaderboard.map((user, index) => ({
          rank: index + 1,
          walletAddress: user.walletAddress,
          username: user.username,
          totalPoints: user.totalPoints,
          level: user.level,
          gameStats: user.gameStats,
          value: type === 'points' ? user.totalPoints :
                 type === 'treasures' ? user.gameStats.totalTreasures :
                 type === 'quests' ? user.completedQuests.length :
                 user.gameStats.totalDistance,
        })),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leaderboard',
    });
  }
};

// @desc    Use hint
// @route   POST /api/game/hint
// @access  Private
const useHint = async (req, res) => {
  try {
    const { sessionId, treasureId, hintType = 'basic' } = req.body;

    const session = await GameSession.findById(sessionId)
      .populate('questId');

    if (!session || session.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found',
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active sessions can use hints',
      });
    }

    const treasure = session.questId.treasures.id(treasureId);
    if (!treasure) {
      return res.status(404).json({
        success: false,
        message: 'Treasure not found',
      });
    }

    // Check if hint already used for this treasure
    const existingHint = session.sessionData.hintsUsed.find(
      hint => hint.treasureId.toString() === treasureId
    );

    if (existingHint) {
      return res.status(400).json({
        success: false,
        message: 'Hint already used for this treasure',
      });
    }

    // Add hint usage
    session.sessionData.hintsUsed.push({
      treasureId,
      usedAt: new Date(),
      hintType,
    });

    await session.save();

    // Generate hint based on type
    let hint;
    switch (hintType) {
      case 'detailed':
        hint = `The treasure "${treasure.name}" is located near: ${treasure.location.name || 'a specific location'}. ${treasure.clue}`;
        break;
      case 'distance':
        // This would require current location to calculate distance
        hint = `You're getting closer to "${treasure.name}". Keep exploring the area!`;
        break;
      case 'basic':
      default:
        hint = treasure.clue;
    }

    res.status(200).json({
      success: true,
      message: 'Hint used successfully',
      data: {
        hint,
        hintType,
        treasureName: treasure.name,
        hintsRemaining: this.calculateHintsRemaining(session),
      },
    });
  } catch (error) {
    logger.error('Use hint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while using hint',
    });
  }
};

// Helper method to calculate achievements
async function calculateAchievements(user) {
  const achievements = [];

  // Treasure Hunter Achievement
  if (user.gameStats.totalTreasures >= 10) {
    achievements.push({
      name: 'Treasure Hunter',
      description: 'Found 10 treasures',
      icon: '🏆',
      unlockedAt: new Date(),
    });
  }

  // Quest Master Achievement
  if (user.completedQuests.length >= 5) {
    achievements.push({
      name: 'Quest Master',
      description: 'Completed 5 quests',
      icon: '⭐',
      unlockedAt: new Date(),
    });
  }

  // Distance Explorer Achievement
  if (user.gameStats.totalDistance >= 10000) { // 10km
    achievements.push({
      name: 'Distance Explorer',
      description: 'Traveled 10km while treasure hunting',
      icon: '🚶',
      unlockedAt: new Date(),
    });
  }

  // NFT Collector Achievement
  if (user.nftCollection.length >= 3) {
    achievements.push({
      name: 'NFT Collector',
      description: 'Collected 3 NFTs',
      icon: '🖼️',
      unlockedAt: new Date(),
    });
  }

  return achievements;
}

// Helper method to calculate remaining hints
function calculateHintsRemaining(session) {
  const maxHints = 3; // Maximum hints per session
  const usedHints = session.sessionData.hintsUsed.length;
  return Math.max(0, maxHints - usedHints);
}

module.exports = {
  getActiveSessions,
  getGameSession,
  abandonGameSession,
  pauseGameSession,
  resumeGameSession,
  getGameStats,
  getLeaderboard,
  useHint,
};