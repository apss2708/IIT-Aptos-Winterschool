const Location = require('../models/Location');
const Quest = require('../models/Quest'); // Changed from Treasure to Quest
const GameSession = require('../models/GameSession');
const User = require('../models/User');
const locationVerificationService = require('../services/locationVerificationService');
const notificationService = require('../services/notificationService');
const logger = require('../config/logger');

// @desc    Verify location for treasure claim
// @route   POST /api/location/verify
// @access  Private
const verifyLocation = async (req, res) => {
  try {
    const {
      questId,
      treasureId,
      latitude,
      longitude,
      accuracy,
      verificationType,
      verificationData,
      deviceInfo,
    } = req.body;

    // Find the quest and the specific treasure within it
    const quest = await Quest.findById(questId);
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: 'Quest not found',
      });
    }

    // Find the treasure within the quest's treasures array
    const treasure = quest.treasures.id(treasureId);
    if (!treasure) {
      return res.status(404).json({
        success: false,
        message: 'Treasure not found in this quest',
      });
    }

    if (treasure.isClaimed) {
      return res.status(400).json({
        success: false,
        message: 'Treasure already claimed',
      });
    }

    // Check active game session
    const gameSession = await GameSession.findOne({
      userId: req.user._id,
      questId,
      status: 'active',
    });

    if (!gameSession) {
      return res.status(400).json({
        success: false,
        message: 'No active game session found for this quest',
      });
    }

    // Verify location based on verification type
    const userData = {
      userId: req.user._id,
      walletAddress: req.user.walletAddress,
      questId,
      treasureId,
    };

    const treasureData = {
      targetLocation: treasure.location,
      radius: treasure.radius,
      verificationData: treasure.verificationData,
    };

    let verificationResult;

    switch (verificationType) {
      case 'gps':
        verificationResult = await locationVerificationService.verifyGPSLocation(
          userData,
          treasureData,
          { latitude, longitude, accuracy, timestamp: new Date() }
        );
        break;

      case 'qr_code':
        verificationResult = await locationVerificationService.verifyQRCode(
          userData,
          treasureData,
          verificationData
        );
        break;

      case 'photo':
        verificationResult = await locationVerificationService.verifyPhoto(
          userData,
          treasureData,
          verificationData
        );
        break;

      case 'multi_factor':
        verificationResult = await locationVerificationService.multiFactorVerification(
          userData,
          treasureData,
          verificationData
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid verification type',
        });
    }

    // Create location verification record
    const locationRecord = await Location.create({
      userId: req.user._id,
      walletAddress: req.user.walletAddress,
      questId,
      treasureId,
      coordinates: {
        latitude,
        longitude,
        accuracy,
      },
      verificationData: {
        type: verificationType,
        proof: verificationResult.proof,
        confidence: verificationResult.confidence,
      },
      status: verificationResult.status,
      metadata: {
        deviceInfo,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    // If verification successful, update game state
    if (verificationResult.success) {
      // Mark treasure as claimed
      treasure.isClaimed = true;
      treasure.claimedBy = req.user.walletAddress;
      treasure.claimedAt = new Date();
      await quest.save();

      // Update game session
      gameSession.progress.treasuresFound.push({
        treasureId: treasureId,
        foundAt: new Date(),
        timeTaken: Math.floor((new Date() - gameSession.lastActivity) / 1000),
      });
      
      gameSession.progress.currentTreasure += 1;
      gameSession.lastActivity = new Date();
      await gameSession.save();

      // Update user stats
      const user = await User.findById(req.user._id);
      user.totalPoints += treasure.points;
      user.gameStats.totalTreasures += 1;
      
      // Calculate distance traveled (simplified)
      if (gameSession.sessionData.path && gameSession.sessionData.path.length > 0) {
        const lastLocation = gameSession.sessionData.path[gameSession.sessionData.path.length - 1];
        const distance = locationVerificationService.calculateDistance(
          lastLocation.latitude,
          lastLocation.longitude,
          latitude,
          longitude
        );
        user.gameStats.totalDistance += distance;
      }
      
      await user.save();

      // Send notifications
      const notificationPayload = await notificationService.notifyTreasureFound(
        gameSession._id.toString(),
        req.io,
        treasure,
        user
      );

      logger.info(`Treasure claimed: ${treasureId} by ${req.user.walletAddress}`);
    }

    res.status(200).json({
      success: verificationResult.success,
      message: verificationResult.success 
        ? 'Treasure claimed successfully!' 
        : verificationResult.reason,
      data: {
        verification: verificationResult,
        locationRecord: {
          id: locationRecord._id,
          status: locationRecord.status,
          confidence: locationRecord.verificationData.confidence,
        },
        treasure: verificationResult.success ? {
          name: treasure.name,
          points: treasure.points,
          nextTreasure: gameSession.progress.currentTreasure,
        } : null,
      },
    });

  } catch (error) {
    logger.error('Location verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during location verification',
    });
  }
};

// @desc    Track user location during quest
// @route   POST /api/location/track
// @access  Private
const trackLocation = async (req, res) => {
  try {
    const { sessionId, latitude, longitude, accuracy, altitude, heading, speed } = req.body;

    const gameSession = await GameSession.findById(sessionId);
    
    if (!gameSession || gameSession.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found',
      });
    }

    // Initialize path array if it doesn't exist
    if (!gameSession.sessionData.path) {
      gameSession.sessionData.path = [];
    }

    // Add location to session path
    gameSession.sessionData.path.push({
      latitude,
      longitude,
      accuracy,
      altitude,
      heading,
      speed,
      timestamp: new Date(),
    });

    gameSession.lastActivity = new Date();
    await gameSession.save();

    // Check proximity to next treasure
    const quest = await Quest.findById(gameSession.questId);
    if (quest && quest.treasures) {
      const nextTreasure = quest.treasures.find(t => t.order === gameSession.progress.currentTreasure);
      
      if (nextTreasure && !nextTreasure.isClaimed) {
        const distance = locationVerificationService.calculateDistance(
          latitude,
          longitude,
          nextTreasure.location.latitude,
          nextTreasure.location.longitude
        );

        // Send proximity alert if within 50m
        if (distance <= 50) {
          await notificationService.notifyProximityAlert(
            sessionId,
            req.io,
            nextTreasure,
            distance,
            req.user
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Location tracked successfully',
      data: {
        sessionId: gameSession._id,
        currentTreasure: gameSession.progress.currentTreasure,
        treasuresFound: gameSession.progress.treasuresFound ? gameSession.progress.treasuresFound.length : 0,
      },
    });
  } catch (error) {
    logger.error('Location tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during location tracking',
    });
  }
};

// @desc    Get location verification history
// @route   GET /api/location/history
// @access  Private
const getVerificationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, questId, status } = req.query;
    
    let query = { userId: req.user._id };
    
    if (questId) query.questId = questId;
    if (status) query.status = status;

    const verifications = await Location.find(query)
      .populate('questId', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Location.countDocuments(query);

    res.status(200).json({
      success: true,
      count: verifications.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: verifications,
    });
  } catch (error) {
    logger.error('Get verification history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching verification history',
    });
  }
};

// @desc    Get nearby active quests
// @route   GET /api/location/nearby-quests
// @access  Public
const getNearbyQuests = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5000, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const quests = await Quest.find({
      isActive: true,
      isPublic: true,
      startLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(maxDistance),
        },
      },
    }).limit(parseInt(limit))
    .select('title description difficulty category estimatedTime startLocation stats tags');

    res.status(200).json({
      success: true,
      count: quests.length,
      data: quests,
    });
  } catch (error) {
    logger.error('Get nearby quests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching nearby quests',
    });
  }
};

// @desc    Complete quest
// @route   POST /api/location/complete-quest
// @access  Private
const completeQuest = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const gameSession = await GameSession.findById(sessionId)
      .populate('questId');
    
    if (!gameSession || gameSession.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found',
      });
    }

    if (gameSession.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game session is not active',
      });
    }

    // Calculate final score and complete session
    gameSession.status = 'completed';
    gameSession.endTime = new Date();
    
    // Calculate final score
    const quest = gameSession.questId;
    let baseScore = 0;
    
    if (gameSession.progress.treasuresFound) {
      baseScore = gameSession.progress.treasuresFound.reduce((sum, foundTreasure) => {
        const treasure = quest.treasures.id(foundTreasure.treasureId);
        return sum + (treasure?.points || 0);
      }, 0);
    }
    
    // Calculate bonuses
    const totalTimeMinutes = gameSession.progress.totalTime / 60;
    const estimatedTime = quest.estimatedTime;
    
    if (totalTimeMinutes < estimatedTime) {
      const timeSaved = estimatedTime - totalTimeMinutes;
      gameSession.bonuses.speedBonus = Math.floor((timeSaved / estimatedTime) * 100);
    }
    
    if (gameSession.progress.treasuresFound && quest.treasures && 
        gameSession.progress.treasuresFound.length === quest.treasures.length) {
      gameSession.bonuses.completionBonus = Math.floor(baseScore * 0.2);
    }
    
    gameSession.score = baseScore + gameSession.bonuses.speedBonus + gameSession.bonuses.completionBonus;
    
    await gameSession.save();

    // Update user completed quests
    const user = await User.findById(req.user._id);
    user.completedQuests.push({
      questId: gameSession.questId._id,
      score: gameSession.score,
      timeTaken: gameSession.progress.totalTime,
    });

    // Add NFT reward if available
    if (gameSession.questId.rewards && gameSession.questId.rewards.nftMetadata) {
      user.nftCollection.push({
        tokenId: `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: gameSession.questId.rewards.nftMetadata,
        questId: gameSession.questId._id,
      });
    }

    // Add points reward
    user.totalPoints += (gameSession.questId.rewards?.points || 0) + gameSession.score;
    await user.save();

    // Update quest stats
    const updatedQuest = await Quest.findById(gameSession.questId._id);
    if (updatedQuest.stats) {
      updatedQuest.stats.completions += 1;
      updatedQuest.stats.totalAttempts += 1;
      updatedQuest.stats.successRate = (updatedQuest.stats.completions / updatedQuest.stats.totalAttempts) * 100;
    }
    updatedQuest.currentParticipants = Math.max(0, (updatedQuest.currentParticipants || 0) - 1);
    await updatedQuest.save();

    // Send completion notification
    await notificationService.notifyQuestCompleted(
      sessionId,
      req.io,
      updatedQuest,
      user,
      gameSession.score
    );

    logger.info(`Quest completed: ${updatedQuest._id} by ${req.user.walletAddress}`);

    res.status(200).json({
      success: true,
      message: 'Quest completed successfully!',
      data: {
        session: {
          id: gameSession._id,
          score: gameSession.score,
          treasuresFound: gameSession.progress.treasuresFound ? gameSession.progress.treasuresFound.length : 0,
          totalTime: gameSession.progress.totalTime,
          bonuses: gameSession.bonuses,
        },
        rewards: {
          points: (gameSession.questId.rewards?.points || 0) + gameSession.score,
          nft: !!(gameSession.questId.rewards && gameSession.questId.rewards.nftMetadata),
        },
        user: {
          totalPoints: user.totalPoints,
          level: user.level,
        },
      },
    });
  } catch (error) {
    logger.error('Complete quest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing quest',
    });
  }
};

module.exports = {
  verifyLocation,
  trackLocation,
  getVerificationHistory,
  getNearbyQuests,
  completeQuest,
};