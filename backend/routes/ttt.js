const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const {
  sendInvite, getPending, acceptInvite, declineInvite,
  getRoom, makeMove, requestRematch, leaveRoom
} = require('../controllers/tttController')

router.post('/invite',        protect, sendInvite)
router.get('/pending',        protect, getPending)
router.post('/:id/accept',    protect, acceptInvite)
router.post('/:id/decline',   protect, declineInvite)
router.get('/:id',            protect, getRoom)
router.post('/:id/move',      protect, makeMove)
router.post('/:id/rematch',   protect, requestRematch)
router.post('/:id/leave',     protect, leaveRoom)

module.exports = router
