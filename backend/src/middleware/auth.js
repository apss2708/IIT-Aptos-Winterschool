const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const logger = require('../config/logger');

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Find user by wallet address from token
      const user = await User.findOne({ 
        walletAddress: decoded.walletAddress.toLowerCase() 
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found.',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      logger.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication.',
    });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await User.findOne({ 
          walletAddress: decoded.walletAddress.toLowerCase() 
        });
        
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we don't fail the request
        logger.warn('Optional auth - invalid token:', error.message);
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
};

// Admin auth (creator of resource)
const creatorAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const resource = await req.model.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    if (resource.creator !== req.user.walletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Not the creator of this resource.',
      });
    }

    next();
  } catch (error) {
    logger.error('Creator auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authorization.',
    });
  }
};

// Generate JWT token
const generateToken = (walletAddress) => {
  return jwt.sign(
    { walletAddress: walletAddress.toLowerCase() },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

module.exports = {
  auth,
  optionalAuth,
  creatorAuth,
  generateToken,
};