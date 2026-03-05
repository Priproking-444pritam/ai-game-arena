const TicTacToeRoom = require('../models/TicTacToeRoom');
const User = require('../models/User');
const crypto = require('crypto');

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a]===board[b] && board[a]===board[c])
      return { winner: board[a], line: [a,b,c] };
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return null;
}

// POST /api/ttt/invite  — send invite by username
const sendInvite = async (req, res) => {
  try {
    const { toUsername } = req.body;
    if (!toUsername) return res.status(400).json({ success:false, message:'Username required' });

    const target = await User.findOne({ username: toUsername });
    if (!target) return res.status(404).json({ success:false, message:'User not found' });
    if (target._id.equals(req.user._id))
      return res.status(400).json({ success:false, message:"Can't invite yourself" });

    // Check no existing pending invite between these two
    const existing = await TicTacToeRoom.findOne({
      'playerX.id': req.user._id,
      'playerO.id': target._id,
      status: 'pending'
    });
    if (existing) return res.status(400).json({ success:false, message:'Invite already sent' });

    const room = await TicTacToeRoom.create({
      inviteCode: crypto.randomBytes(6).toString('hex'),
      playerX: { id: req.user._id, username: req.user.username },
      playerO: { id: target._id,   username: target.username },
      status: 'pending',
    });

    res.json({ success:true, roomId: room._id, inviteCode: room.inviteCode });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success:false, message:'Server error' });
  }
};

// GET /api/ttt/pending — get incoming pending invites + my active rooms
const getPending = async (req, res) => {
  try {
    const incoming = await TicTacToeRoom.find({
      'playerO.id': req.user._id,
      status: 'pending',
    }).sort({ createdAt: -1 }).limit(10);

    const active = await TicTacToeRoom.find({
      $or: [{ 'playerX.id': req.user._id }, { 'playerO.id': req.user._id }],
      status: 'active',
    }).sort({ updatedAt: -1 }).limit(5);

    res.json({ success:true, incoming, active });
  } catch(err) {
    res.status(500).json({ success:false, message:'Server error' });
  }
};

// POST /api/ttt/:id/accept
const acceptInvite = async (req, res) => {
  try {
    const room = await TicTacToeRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ success:false, message:'Room not found' });
    if (!room.playerO.id.equals(req.user._id))
      return res.status(403).json({ success:false, message:'Not your invite' });
    if (room.status !== 'pending')
      return res.status(400).json({ success:false, message:'Invite already handled' });

    room.status = 'active';
    room.startedAt = new Date();
    await room.save();

    res.json({ success:true, room });
  } catch(err) {
    res.status(500).json({ success:false, message:'Server error' });
  }
};

// POST /api/ttt/:id/decline
const declineInvite = async (req, res) => {
  try {
    const room = await TicTacToeRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ success:false, message:'Room not found' });
    room.status = 'declined';
    await room.save();
    res.json({ success:true });
  } catch(err) {
    res.status(500).json({ success:false, message:'Server error' });
  }
};

// GET /api/ttt/:id — poll game state
const getRoom = async (req, res) => {
  try {
    const room = await TicTacToeRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ success:false, message:'Room not found' });
    // Verify user is a player
    const isX = room.playerX.id.equals(req.user._id);
    const isO = room.playerO.id.equals(req.user._id);
    if (!isX && !isO) return res.status(403).json({ success:false, message:'Not your room' });
    res.json({ success:true, room, mySymbol: isX?'X':'O' });
  } catch(err) {
    res.status(500).json({ success:false, message:'Server error' });
  }
};

// POST /api/ttt/:id/move  { index: 0-8 }
const makeMove = async (req, res) => {
  try {
    const room = await TicTacToeRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ success:false, message:'Room not found' });
    if (room.status !== 'active') return res.status(400).json({ success:false, message:'Game not active' });

    const isX = room.playerX.id.equals(req.user._id);
    const isO = room.playerO.id.equals(req.user._id);
    if (!isX && !isO) return res.status(403).json({ success:false, message:'Not your room' });

    const mySymbol = isX ? 'X' : 'O';
    if (room.turn !== mySymbol) return res.status(400).json({ success:false, message:"Not your turn" });

    const { index } = req.body;
    if (index < 0 || index > 8 || room.board[index])
      return res.status(400).json({ success:false, message:'Invalid move' });

    // Apply move
    const board = [...room.board];
    board[index] = mySymbol;
    room.board = board;
    room.moves += 1;

    const result = checkWinner(board);
    if (result) {
      room.status = 'finished';
      room.winner = result.winner;
      room.winLine = result.line;
      room.finishedAt = new Date();
      if (result.winner === 'X') room.scoreX += 1;
      else if (result.winner === 'O') room.scoreO += 1;
      else room.draws += 1;
    } else {
      room.turn = mySymbol === 'X' ? 'O' : 'X';
    }

    await room.save();
    res.json({ success:true, room });
  } catch(err) {
    res.status(500).json({ success:false, message:'Server error' });
  }
};

// POST /api/ttt/:id/rematch
const requestRematch = async (req, res) => {
  try {
    const room = await TicTacToeRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ success:false, message:'Room not found' });

    const isX = room.playerX.id.equals(req.user._id);
    const isO = room.playerO.id.equals(req.user._id);
    if (!isX && !isO) return res.status(403).json({ success:false });

    if (isX) room.rematchRequestX = true;
    if (isO) room.rematchRequestO = true;

    // Both requested — reset board
    if (room.rematchRequestX && room.rematchRequestO) {
      room.board = Array(9).fill('');
      room.turn = 'X';
      room.winner = null;
      room.winLine = [];
      room.moves = 0;
      room.status = 'active';
      room.rematchRequestX = false;
      room.rematchRequestO = false;
    }

    await room.save();
    res.json({ success:true, room });
  } catch(err) {
    res.status(500).json({ success:false, message:'Server error' });
  }
};

// POST /api/ttt/:id/leave
const leaveRoom = async (req, res) => {
  try {
    const room = await TicTacToeRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ success:false });
    if (room.status === 'active' || room.status === 'pending') {
      room.status = 'finished';
      // The one who left loses
      const isX = room.playerX.id.equals(req.user._id);
      room.winner = isX ? 'O' : 'X';
      await room.save();
    }
    res.json({ success:true });
  } catch(err) {
    res.status(500).json({ success:false });
  }
};

module.exports = { sendInvite, getPending, acceptInvite, declineInvite, getRoom, makeMove, requestRematch, leaveRoom };
