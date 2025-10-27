const express = require('express');
const {
  getNFTCollection,
  mintNFT,
  transferNFT,
  getNFTMetadata,
  verifyOwnership,
  getNFTLeaderboard,
} = require('../controllers/nftController');
const { auth, optionalAuth } = require('../middleware/auth');
const { validateNFT, validatePagination } = require('../middleware/validation');

const router = express.Router();

router.get('/collection', auth, getNFTCollection);
router.get('/leaderboard', optionalAuth, getNFTLeaderboard);
router.get('/metadata/:tokenId', getNFTMetadata);
router.get('/verify-ownership/:tokenId', auth, verifyOwnership);
router.post('/mint', auth, mintNFT);
router.post('/transfer', auth, validateNFT, transferNFT);

module.exports = router;