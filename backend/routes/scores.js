const express = require('express');
const router = express.Router();
const { submitScore, getLeaderboard, getLeaderboardWithWL, getMyScores, getGlobalStats, getRecentScores } = require('../controllers/scoreController');
const { protect } = require('../middleware/auth');

router.post('/', protect, submitScore);
router.get('/leaderboard/:game', getLeaderboardWithWL);
router.get('/recent', protect, getRecentScores);
router.get('/my/:game', protect, getMyScores);
router.get('/stats', getGlobalStats);

module.exports = router;