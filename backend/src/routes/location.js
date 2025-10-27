const express = require('express');
const {
  verifyLocation,
  trackLocation,
  getVerificationHistory,
  getNearbyQuests,
  completeQuest,
} = require('../controllers/locationController');
const { auth, optionalAuth } = require('../middleware/auth');
const { validateLocation, validatePagination } = require('../middleware/validation');
const { locationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/verify', auth, locationLimiter, validateLocation, verifyLocation);
router.post('/track', auth, trackLocation);
router.post('/complete-quest', auth, completeQuest);
router.get('/history', auth, validatePagination, getVerificationHistory);
router.get('/nearby-quests', optionalAuth, getNearbyQuests);

module.exports = router;