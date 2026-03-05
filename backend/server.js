const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const authRoutes   = require('./routes/auth')
const scoreRoutes  = require('./routes/scores')
const userRoutes   = require('./routes/users')
const tttRoutes    = require('./routes/ttt')

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth',   authRoutes)
app.use('/api/scores', scoreRoutes)
app.use('/api/users',  userRoutes)
app.use('/api/ttt',    tttRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'OK' }))

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }))
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ success: false, message: 'Server error', error: err.message })
})

const PORT = process.env.PORT || 5000
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-game-arena')
  .then(() => {
    console.log('✅ MongoDB Connected')
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
  })
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1) })

module.exports = app