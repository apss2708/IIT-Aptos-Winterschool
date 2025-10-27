const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const encryptionService = require('../services/encryptionService');
const logger = require('../config/logger');

// @desc    Authenticate user with wallet
// @route   POST /api/auth/login
// @access  Public
const loginWithWallet = async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required',
      });
    }

    // In a real implementation, you would verify the signature here
    // For now, we'll trust the wallet address and create/login user
    
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (!user) {
      // Create new user
      user = await User.create({
        walletAddress: walletAddress.toLowerCase(),
        username: `Explorer${Math.random().toString(36).substr(2, 6)}`,
      });
      
      logger.info(`New user created: ${walletAddress}`);
    } else {
      // Update last active
      user.lastActive = new Date();
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(walletAddress);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: {
          walletAddress: user.walletAddress,
          username: user.username,
          totalPoints: user.totalPoints,
          level: user.level,
          gameStats: user.gameStats,
        },
        token,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('completedQuests.questId', 'title difficulty')
      .populate('nftCollection.questId', 'title')
      .select('-__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Calculate rank
    const rank = await user.getRank();

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          rank,
        },
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { username, email, preferences } = req.body;
    
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
    });
  }
};

// @desc    Verify wallet signature
// @route   POST /api/auth/verify-signature
// @access  Public
const verifySignature = async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address, signature, and message are required',
      });
    }

    // In a real implementation, you would verify the cryptographic signature here
    // This is a simplified version that always returns true for demo purposes
    const isValidSignature = true; // Replace with actual signature verification

    if (!isValidSignature) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    // Generate nonce for next authentication
    const nonce = encryptionService.generateToken();

    res.status(200).json({
      success: true,
      message: 'Signature verified successfully',
      data: {
        verified: true,
        nonce,
      },
    });
  } catch (error) {
    logger.error('Verify signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signature verification',
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // We could implement a token blacklist here if needed
    
    logger.info(`User logged out: ${req.user.walletAddress}`);
    
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
    });
  }
};

module.exports = {
  loginWithWallet,
  getProfile,
  updateProfile,
  verifySignature,
  logout,
};