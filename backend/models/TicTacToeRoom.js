const mongoose = require('mongoose');

const TicTacToeRoomSchema = new mongoose.Schema({
  inviteCode: { type: String, unique: true },

  // Players
  playerX: { id: mongoose.Schema.Types.ObjectId, username: String },
  playerO: { id: mongoose.Schema.Types.ObjectId, username: String },

  // Invite / game status
  status: {
    type: String,
    enum: ['pending', 'active', 'finished', 'declined', 'expired'],
    default: 'pending'
  },

  // Board state — 9 cells, empty string = empty
  board:   { type: [String], default: () => Array(9).fill('') },
  turn:    { type: String,   default: 'X' },
  winner:  { type: String,   default: null },   // 'X' | 'O' | 'draw'
  winLine: { type: [Number], default: () => [] },
  moves:   { type: Number,   default: 0 },

  // Running score across rounds
  scoreX: { type: Number, default: 0 },
  scoreO: { type: Number, default: 0 },
  draws:  { type: Number, default: 0 },

  // Rematch flags
  rematchRequestX: { type: Boolean, default: false },
  rematchRequestO: { type: Boolean, default: false },

  // Timing
  invitedAt:  { type: Date, default: Date.now },
  startedAt:  { type: Date },
  finishedAt: { type: Date },

}, { timestamps: true });

// Auto-delete pending invites after 10 minutes
TicTacToeRoomSchema.index(
  { invitedAt: 1 },
  { expireAfterSeconds: 600, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('TicTacToeRoom', TicTacToeRoomSchema);