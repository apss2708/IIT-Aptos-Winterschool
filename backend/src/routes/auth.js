const express = require('express');
const {
  loginWithWallet,
  getProfile,
  updateProfile,
  verifySignature,
  logout,
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/login', authLimiter, loginWithWallet);
router.post('/verify-signature', authLimiter, verifySignature);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, validateUser, updateProfile);
router.post('/logout', auth, logout);

module.exports = router;