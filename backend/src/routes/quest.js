const express = require('express');
const {
  getQuests,
  getQuest,
  createQuest,
  generateQuest,
  startQuest,
  updateQuest,
  deleteQuest,
  getMyQuests,
} = require('../controllers/questController');
const { auth, optionalAuth } = require('../middleware/auth');
const { validateQuest, validatePagination } = require('../middleware/validation');

const router = express.Router();

router.get('/', optionalAuth, validatePagination, getQuests);
router.get('/my-quests', auth, validatePagination, getMyQuests);
router.get('/:id', optionalAuth, getQuest);
router.post('/', auth, validateQuest, createQuest);
router.post('/generate', auth, generateQuest);
router.post('/:id/start', auth, startQuest);
router.put('/:id', auth, validateQuest, updateQuest);
router.delete('/:id', auth, deleteQuest);

module.exports = router;