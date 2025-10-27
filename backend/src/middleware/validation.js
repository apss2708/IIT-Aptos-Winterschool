const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

// User validation rules
const validateUser = [
  body('walletAddress')
    .isEthereumAddress()
    .withMessage('Valid wallet address is required'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  handleValidationErrors,
];

// Quest validation rules
const validateQuest = [
  body('title')
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard', 'expert'])
    .withMessage('Difficulty must be one of: easy, medium, hard, expert'),
  body('estimatedTime')
    .isInt({ min: 5, max: 480 })
    .withMessage('Estimated time must be between 5 and 480 minutes'),
  body('treasures')
    .isArray({ min: 1, max: 20 })
    .withMessage('Quest must have between 1 and 20 treasures'),
  body('treasures.*.name')
    .isLength({ min: 3, max: 50 })
    .withMessage('Treasure name must be between 3 and 50 characters'),
  body('treasures.*.location.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('treasures.*.location.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  handleValidationErrors,
];

// Location validation rules
const validateLocation = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  body('questId')
    .isMongoId()
    .withMessage('Valid quest ID is required'),
  body('treasureId')
    .isMongoId()
    .withMessage('Valid treasure ID is required'),
  handleValidationErrors,
];

// NFT validation rules
const validateNFT = [
  body('tokenId')
    .notEmpty()
    .withMessage('Token ID is required'),
  body('metadata.name')
    .isLength({ min: 1, max: 50 })
    .withMessage('NFT name must be between 1 and 50 characters'),
  handleValidationErrors,
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

module.exports = {
  validateUser,
  validateQuest,
  validateLocation,
  validateNFT,
  validatePagination,
  handleValidationErrors,
};