const express = require('express');
const router = express.Router();

// Simple placeholder routes
router.get('/leaderboard', (req, res) => {
  res.json({
    success: true,
    message: 'Leaderboard endpoint is working!',
    data: { leaderboard: [] }
  });
});

router.get('/stats', (req, res) => {
  res.json({
    success: true,
    message: 'Game stats endpoint is working!',
    data: {}
  });
});

module.exports = router;