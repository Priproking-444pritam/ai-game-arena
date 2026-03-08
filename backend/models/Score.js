const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  game: {
    type: String,
    required: true,
    enum: ['snake', 'sudoku', 'connect4', 'maze', 'nqueens', 'handslicer', 'handrhythm', 'tictactoe', 'trivia', 'chess']
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  result: {
    type: String,
    enum: ['win', 'loss', 'draw', 'completed'],
    default: 'completed'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast leaderboard queries
scoreSchema.index({ game: 1, score: -1 });
scoreSchema.index({ user: 1, game: 1 });

module.exports = mongoose.model('Score', scoreSchema);