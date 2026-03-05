const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Score = require('../models/Score');
const { protect } = require('../middleware/auth');

// GET /api/users/profile/:username
router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const recentScores = await Score.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        level: user.level,
        xp: user.xp,
        totalGamesPlayed: user.totalGamesPlayed,
        totalWins: user.totalWins,
        winRate: user.winRate,
        bio: user.bio,
        createdAt: user.createdAt
      },
      recentScores
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/users/profile  (update bio)
router.patch('/profile', protect, async (req, res) => {
  try {
    const { bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { bio },
      { new: true, runValidators: true }
    );
    res.json({ success: true, message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/top  - top players overall
router.get('/top', async (req, res) => {
  try {
    const users = await User.find()
      .sort({ xp: -1 })
      .limit(10)
      .select('username level xp totalGamesPlayed totalWins');

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
