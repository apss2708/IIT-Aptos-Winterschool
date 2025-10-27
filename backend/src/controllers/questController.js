const Quest = require('../models/Quest');
const GameSession = require('../models/GameSession');
const User = require('../models/User');
const aiQuestGeneratorService = require('../services/aiQuestGeneratorService');
const notificationService = require('../services/notificationService');
const logger = require('../config/logger');

// @desc    Get all quests
// @route   GET /api/quests
// @access  Public
const getQuests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      difficulty,
      category,
      nearLat,
      nearLng,
      maxDistance = 5000,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    let query = { isActive: true, isPublic: true };

    // Filter by difficulty
    if (difficulty) {
      query.difficulty = difficulty;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Location-based filtering
    if (nearLat && nearLng) {
      query.startLocation = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(nearLng), parseFloat(nearLat)],
          },
          $maxDistance: parseInt(maxDistance),
        },
      };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const quests = await Quest.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-treasures.verificationData -__v');

    const total = await Quest.countDocuments(query);

    res.status(200).json({
      success: true,
      count: quests.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: quests,
    });
  } catch (error) {
    logger.error('Get quests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quests',
    });
  }
};

// @desc    Get single quest
// @route   GET /api/quests/:id
// @access  Public
const getQuest = async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id)
      .select('-treasures.verificationData -__v');

    if (!quest) {
      return res.status(404).json({
        success: false,
        message: 'Quest not found',
      });
    }

    // Check if user can participate
    let canParticipate = false;
    if (req.user) {
      const user = await User.findById(req.user._id);
      canParticipate = quest.canParticipate(
        user.level,
        user.completedQuests
      );
    }

    res.status(200).json({
      success: true,
      data: {
        ...quest.toObject(),
        canParticipate,
      },
    });
  } catch (error) {
    logger.error('Get quest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quest',
    });
  }
};

// @desc    Create new quest
// @route   POST /api/quests
// @access  Private
const createQuest = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      category,
      treasures,
      startLocation,
      radius,
      estimatedTime,
      rewards,
      requirements,
      tags,
    } = req.body;

    const quest = await Quest.create({
      title,
      description,
      creator: req.user.walletAddress,
      difficulty,
      category,
      treasures,
      startLocation,
      radius,
      estimatedTime,
      rewards,
      requirements: requirements || {},
      tags,
    });

    logger.info(`New quest created: ${quest._id} by ${req.user.walletAddress}`);

    // Notify nearby users about new quest
    if (req.io && quest.isPublic) {
      notificationService.notifyNewQuestAvailable(req.io, quest);
    }

    res.status(201).json({
      success: true,
      message: 'Quest created successfully',
      data: quest,
    });
  } catch (error) {
    logger.error('Create quest error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating quest',
    });
  }
};

// @desc    Generate quest with AI
// @route   POST /api/quests/generate
// @access  Private
const generateQuest = async (req, res) => {
  try {
    const {
      theme,
      difficulty,
      location,
      numberOfTreasures,
      estimatedTime,
      customInstructions,
    } = req.body;

    const generatedQuest = await aiQuestGeneratorService.generateQuest({
      theme,
      difficulty,
      location,
      numberOfTreasures,
      estimatedTime,
      customInstructions,
    });

    // Add creator information
    generatedQuest.creator = req.user.walletAddress;

    res.status(200).json({
      success: true,
      message: 'Quest generated successfully',
      data: generatedQuest,
    });
  } catch (error) {
    logger.error('Generate quest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating quest',
    });
  }
};

// @desc    Start quest
// @route   POST /api/quests/:id/start
// @access  Private
const startQuest = async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: 'Quest not found',
      });
    }

    if (!quest.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Quest is not active',
      });
    }

    // Check if user can participate
    const user = await User.findById(req.user._id);
    if (!quest.canParticipate(user.level, user.completedQuests)) {
      return res.status(403).json({
        success: false,
        message: 'You do not meet the requirements for this quest',
      });
    }

    // Check for existing active session
    const existingSession = await GameSession.findOne({
      userId: req.user._id,
      questId: quest._id,
      status: 'active',
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active session for this quest',
        data: { sessionId: existingSession._id },
      });
    }

    // Create new game session
    const gameSession = await GameSession.create({
      userId: req.user._id,
      walletAddress: req.user.walletAddress,
      questId: quest._id,
      sessionData: {
        startLocation: req.body.startLocation,
      },
    });

    // Update quest participants count
    quest.currentParticipants += 1;
    await quest.save();

    // Join socket room
    if (req.io) {
      req.io.emit('join_quest', `quest_${quest._id}`);
    }

    logger.info(`Quest started: ${quest._id} by ${req.user.walletAddress}`);

    res.status(200).json({
      success: true,
      message: 'Quest started successfully',
      data: {
        sessionId: gameSession._id,
        quest: {
          id: quest._id,
          title: quest.title,
          treasures: quest.treasures.map(t => ({
            id: t._id,
            name: t.name,
            order: t.order,
            points: t.points,
          })),
        },
      },
    });
  } catch (error) {
    logger.error('Start quest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while starting quest',
    });
  }
};

// @desc    Update quest
// @route   PUT /api/quests/:id
// @access  Private
const updateQuest = async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: 'Quest not found',
      });
    }

    // Check if user is the creator
    if (quest.creator !== req.user.walletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this quest',
      });
    }

    const updatedQuest = await Quest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Quest updated successfully',
      data: updatedQuest,
    });
  } catch (error) {
    logger.error('Update quest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating quest',
    });
  }
};

// @desc    Delete quest
// @route   DELETE /api/quests/:id
// @access  Private
const deleteQuest = async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    
    if (!quest) {
      return res.status(404).json({
        success: false,
        message: 'Quest not found',
      });
    }

    // Check if user is the creator
    if (quest.creator !== req.user.walletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this quest',
      });
    }

    await Quest.findByIdAndDelete(req.params.id);
    
    // Also delete associated game sessions
    await GameSession.deleteMany({ questId: req.params.id });

    logger.info(`Quest deleted: ${req.params.id} by ${req.user.walletAddress}`);

    res.status(200).json({
      success: true,
      message: 'Quest deleted successfully',
    });
  } catch (error) {
    logger.error('Delete quest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting quest',
    });
  }
};

// @desc    Get user's quests (created by user)
// @route   GET /api/quests/my-quests
// @access  Private
const getMyQuests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let query = { creator: req.user.walletAddress };
    
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const quests = await Quest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-treasures.verificationData -__v');

    const total = await Quest.countDocuments(query);

    res.status(200).json({
      success: true,
      count: quests.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: quests,
    });
  } catch (error) {
    logger.error('Get my quests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching your quests',
    });
  }
};

module.exports = {
  getQuests,
  getQuest,
  createQuest,
  generateQuest,
  startQuest,
  updateQuest,
  deleteQuest,
  getMyQuests,
};