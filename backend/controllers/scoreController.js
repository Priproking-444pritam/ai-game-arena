const Score = require('../models/Score');
const User = require('../models/User');

// @desc    Submit a score
// @route   POST /api/scores
const submitScore = async (req, res) => {
  try {
    const { game, score, difficulty, result, metadata } = req.body;

    if (!game || score === undefined) {
      return res.status(400).json({ success: false, message: 'Game and score are required' });
    }

    const newScore = await Score.create({
      user: req.user._id,
      username: req.user.username,
      game,
      score,
      difficulty: difficulty || 'medium',
      result: result || 'completed',
      metadata: metadata || {}
    });

    // Update user stats atomically — avoids Mongoose validation on save()
    const xpGain = result === 'win' ? 50 : result === 'completed' ? 20 : 10;
    const isWin  = result === 'win';

    // $inc is atomic and skips pre-save hooks/validation entirely
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $inc: {
          xp: xpGain,
          totalGamesPlayed: 1,
          totalWins: isWin ? 1 : 0
        }
      },
      { new: true }   // return updated document
    );

    // Recalculate level from new XP and persist it
    const newLevel = Math.floor(updatedUser.xp / 200) + 1;
    if (updatedUser.level !== newLevel) {
      await User.findByIdAndUpdate(req.user._id, { level: newLevel });
      updatedUser.level = newLevel;
    }

    res.status(201).json({
      success: true,
      message: 'Score submitted!',
      score: newScore,
      xpGained: xpGain,
      newLevel: updatedUser.level,
      newXP: updatedUser.xp
    });
  } catch (err) {
    console.error('Score controller error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Get leaderboard for a game
// @route   GET /api/scores/leaderboard/:game
const getLeaderboard = async (req, res) => {
  try {
    const { game } = req.params;
    const { limit = 10 } = req.query;

    const pipeline = [
      { $match: { game } },
      { $sort: { score: -1 } },
      {
        $group: {
          _id: '$user',
          username: { $first: '$username' },
          bestScore: { $max: '$score' },
          gamesPlayed: { $sum: 1 }
        }
      },
      { $sort: { bestScore: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $project: {
          username: 1,
          bestScore: 1,
          gamesPlayed: 1,
          level: { $arrayElemAt: ['$userInfo.level', 0] }
        }
      }
    ];

    const leaderboard = await Score.aggregate(pipeline);

    res.json({ success: true, leaderboard });
  } catch (err) {
    console.error('Score controller error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Get user's scores for a game
// @route   GET /api/scores/my/:game
const getMyScores = async (req, res) => {
  try {
    const { game } = req.params;
    const scores = await Score.find({ user: req.user._id, game })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, scores });
  } catch (err) {
    console.error('Score controller error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Get all-time global stats
// @route   GET /api/scores/stats
const getGlobalStats = async (req, res) => {
  try {
    const totalGames = await Score.countDocuments();
    const totalUsers = await User.countDocuments();
    const gameStats = await Score.aggregate([
      { $group: { _id: '$game', count: { $sum: 1 }, avgScore: { $avg: '$score' } } }
    ]);

    res.json({ success: true, totalGames, totalUsers, gameStats });
  } catch (err) {
    console.error('Score controller error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};


// @desc    Get recent scores for logged-in user
// @route   GET /api/scores/recent
const getRecentScores = async (req, res) => {
  try {
    const scores = await Score.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('game score difficulty result metadata createdAt');
    res.json({ success: true, scores });
  } catch (err) {
    console.error('Score controller error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// @desc    Get wins/losses for leaderboard
const getLeaderboardWithWL = async (req, res) => {
  try {
    const { game } = req.params;
    const { limit = 10 } = req.query;
    const pipeline = [
      { $match: { game } },
      { $sort: { score: -1 } },
      {
        $group: {
          _id: '$user',
          username: { $first: '$username' },
          bestScore: { $max: '$score' },
          gamesPlayed: { $sum: 1 },
          wins:   { $sum: { $cond: [{ $eq: ['$result','win']  }, 1, 0] } },
          losses: { $sum: { $cond: [{ $eq: ['$result','loss'] }, 1, 0] } },
        }
      },
      { $sort: { bestScore: -1 } },
      { $limit: parseInt(limit) },
      { $lookup: { from:'users', localField:'_id', foreignField:'_id', as:'userInfo' } },
      { $project: { username:1, bestScore:1, gamesPlayed:1, wins:1, losses:1,
          level: { $arrayElemAt: ['$userInfo.level', 0] } } }
    ];
    const leaderboard = await Score.aggregate(pipeline);
    res.json({ success: true, leaderboard });
  } catch (err) {
    console.error('Score controller error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = { submitScore, getLeaderboard, getLeaderboardWithWL, getMyScores, getGlobalStats, getRecentScores };