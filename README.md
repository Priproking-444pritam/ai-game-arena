# 🎮 AI Game Arena

> **Ten browser games powered by real AI algorithms** — play solo, challenge friends in live PvP, or unlock webcam games as you level up.

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)

---

## 🕹️ The 10 Games

| Level | Game | Algorithm | Special |
|-------|------|-----------|---------|
| 1 | 🐍 Snake AI | A\* Pathfinding | Watch AI solve it after you play |
| 2 | 🔢 Sudoku | Backtracking | Animated step-by-step solver |
| 3 | 🔴 Connect-4 | Minimax + α-β | Adjustable AI difficulty |
| 4 | 🧩 Maze AI | Heuristic A\* | Manhattan vs Euclidean comparison |
| 5 | 👑 N-Queens | CSP + Backtrack | Visualized constraint solving |
| 6 | 🎯 Tic Tac Toe | Minimax | **Live PvP** — invite friends! |
| 7 | 🧠 AI Trivia | — | 8 topics, timed, streak system |
| 8 | ♟️ Chess vs AI | Minimax + PST | Piece-square table evaluation |
| 9 | ✋ Hand Slicer | MediaPipe | Webcam hand tracking, 20 levels |
| 10 | 🎵 Hand Rhythm | MediaPipe | Hit beats with hand gestures |

---

## ✨ Features

- 🔐 **Auth system** — register, login, JWT tokens
- ⚡ **XP & levelling** — every game awards XP, levels unlock new games
- 🔴 **Live PvP** — challenge any user to Tic Tac Toe, invite expires in 10 min
- 🏆 **Leaderboard** — per-game rankings with W/L stats
- 📊 **Dashboard** — games played, win rate, recent scores
- 🔑 **Unlock code** — type `LEVEL0` to unlock all 10 games instantly
- 📱 **Responsive** — works on desktop and tablet

---

## 🛠️ Tech Stack

**Frontend** — React 18 · Vite · React Router v6 · Axios · MediaPipe

**Backend** — Node.js · Express · MongoDB · Mongoose · JWT · bcryptjs

---

## 🚀 Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) running locally **OR** a free [MongoDB Atlas](https://www.mongodb.com/atlas) URI

---

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/ai-game-arena.git
cd ai-game-arena
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create a file called `.env` inside the `backend` folder:
```
MONGODB_URI=mongodb://localhost:27017/ai-game-arena
JWT_SECRET=your_super_secret_key_change_this
PORT=5000
CLIENT_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```
You should see:
```
✅ MongoDB Connected
🚀 Server running on port 5000
```

### 3. Frontend setup
Open a **new terminal**:
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app
Go to **http://localhost:5173** — register an account and play! 🎮

---

## 📁 Project Structure

```
ai-game-arena/
├── backend/
│   ├── controllers/        ← Business logic
│   ├── models/             ← MongoDB schemas
│   ├── routes/             ← API endpoints
│   ├── middleware/         ← JWT auth guard
│   └── server.js
├── frontend/
│   └── src/
│       ├── games/          ← All 10 game components
│       ├── pages/          ← Home, GameHub, Leaderboard, Dashboard
│       ├── components/     ← Navbar
│       └── context/        ← Auth + API
└── README.md
```

---

## 🎯 Level System

Every 200 XP = 1 level. Each level unlocks the next game (Level 1 → Snake, Level 10 → Hand Rhythm).

| Result | XP Gained |
|--------|-----------|
| Win (basic games) | +50 XP |
| Win (Chess) | +500 XP |
| Draw | +40 XP |
| Loss / Complete | +10–20 XP |

**Secret unlock:** Enter `LEVEL0` in the unlock code field to unlock all 10 games instantly.

---

## 🔴 Live PvP — How It Works

1. Both players log in (different browsers / devices on same network)
2. Player A → **Tic Tac Toe → Live PvP** → enters Player B's username
3. Player B sees a flashing invite — has **10 minutes** to accept
4. Board syncs every ~2 seconds for both players
5. Scores carry across rounds; both players can request a rematch

---



---

## 📄 License

MIT — free to use, modify, and share.

---

*Built with React, Node.js, MongoDB, and a lot of AI algorithms.*
