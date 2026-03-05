# 🎮 AI GAME ARENA — Full Stack

A full-stack web application featuring 5 classic games powered by real AI algorithms. Built with React + Vite (frontend), Node.js + Express (backend), and MongoDB.

---

## 📁 Project Structure

```
ai-game-arena/
├── backend/                    # Node.js + Express API
│   ├── controllers/
│   │   ├── authController.js   # Register, login, JWT auth
│   │   └── scoreController.js  # Submit scores, leaderboard
│   ├── middleware/
│   │   └── auth.js             # JWT protect middleware
│   ├── models/
│   │   ├── User.js             # User schema (bcrypt, levels, XP)
│   │   └── Score.js            # Score schema (game, result, metadata)
│   ├── routes/
│   │   ├── auth.js             # POST /api/auth/register|login, GET /me
│   │   ├── scores.js           # POST /api/scores, GET leaderboard
│   │   └── users.js            # GET profile, top players
│   ├── server.js               # Express app entry
│   ├── .env.example            # Environment variables template
│   └── package.json
│
└── frontend/                   # React + Vite SPA
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx  # Auth state, API calls, score submit
    │   ├── components/
    │   │   └── Navbar.jsx       # Sticky nav with user profile
    │   ├── pages/
    │   │   ├── HomePage.jsx     # Landing page
    │   │   ├── LoginPage.jsx    # Login with JWT
    │   │   ├── RegisterPage.jsx # Register with validation
    │   │   ├── DashboardPage.jsx# User stats, XP progress
    │   │   ├── GameHubPage.jsx  # Game selector + runner
    │   │   ├── LeaderboardPage.jsx # Per-game + global rankings
    │   │   └── ProfilePage.jsx  # Public player profile
    │   ├── games/
    │   │   ├── SnakeGame.jsx    # Snake + A* AI pathfinding
    │   │   ├── SudokuGame.jsx   # Sudoku + backtracking solver
    │   │   ├── Connect4Game.jsx # Connect-4 + Minimax α-β
    │   │   ├── MazeGame.jsx     # Maze + Manhattan/Euclidean A*
    │   │   └── NQueensGame.jsx  # N-Queens + CSP backtracking
    │   ├── styles/
    │   │   └── globals.css      # Dark cyberpunk theme, CSS variables
    │   ├── App.jsx              # React Router routes
    │   └── main.jsx             # Entry point
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** v18+ — [nodejs.org](https://nodejs.org)
- **MongoDB** — Either local install or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)
- **npm** v9+

---

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### Step 2: Configure Environment Variables

```bash
# In the backend/ directory, create a .env file:
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-game-arena
JWT_SECRET=your_super_secret_key_here_make_it_long_and_random
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

**Using MongoDB Atlas?** Replace `MONGODB_URI` with your Atlas connection string:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ai-game-arena?retryWrites=true&w=majority
```

---

### Step 3: Start the Backend

```bash
cd backend

# Development (with auto-reload)
npm run dev

# OR Production
npm start
```

You should see:
```
✅ MongoDB Connected
🚀 Server running on port 5000
```

---

### Step 4: Start the Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x ready in 300ms

  ➜  Local:   http://localhost:5173/
```

---

### Step 5: Open the App

Visit: **http://localhost:5173**

Register an account and start playing!

---

## 🎮 The Games

| Game | Algorithm | Description |
|------|-----------|-------------|
| 🐍 **Snake AI** | A* Pathfinding | Navigate the snake, then watch A* solve it optimally |
| 🔢 **Sudoku** | Backtracking | Solve puzzles or watch animated AI backtracking |
| 🔴 **Connect-4** | Minimax + α-β | Beat the AI using Minimax with alpha-beta pruning |
| 🧩 **Maze AI** | Heuristic A* | Race to goal, compare Manhattan vs Euclidean paths |
| ♛ **N-Queens** | CSP Backtracking | Place queens safely, or animate CSP solving |

---

## 🔐 Auth Flow

1. **Register** — Username, email, bcrypt-hashed password → JWT issued
2. **Login** — Email + password → JWT returned, stored in localStorage
3. **Protected routes** — JWT verified via `Authorization: Bearer <token>` header
4. **XP system** — Win = +50 XP, Complete = +20 XP, Loss = +10 XP
5. **Level system** — Level = floor(XP / 200) + 1

---

## 📊 Database Schema

### User
```js
{
  username: String (unique, 3-20 chars)
  email: String (unique)
  password: String (bcrypt hashed, never returned)
  level: Number (default: 1)
  xp: Number (default: 0)
  totalGamesPlayed: Number
  totalWins: Number
  bio: String
  createdAt: Date
}
```

### Score
```js
{
  user: ObjectId (ref: User)
  username: String
  game: Enum ['snake','sudoku','connect4','maze','nqueens']
  score: Number
  difficulty: Enum ['easy','medium','hard']
  result: Enum ['win','loss','draw','completed']
  metadata: Mixed (extra game data)
  createdAt: Date
}
```

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login, get JWT |
| GET | `/api/auth/me` | Yes | Get current user |

### Scores
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/scores` | Yes | Submit a game score |
| GET | `/api/scores/leaderboard/:game` | No | Top scores per game |
| GET | `/api/scores/my/:game` | Yes | Your scores per game |
| GET | `/api/scores/stats` | No | Global stats |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/profile/:username` | No | Public profile |
| PATCH | `/api/users/profile` | Yes | Update bio |
| GET | `/api/users/top` | No | Top XP players |

---

## 🎨 Tech Stack

### Frontend
- **React 18** + **Vite** (instant HMR)
- **React Router v6** (SPA routing)
- **Axios** (HTTP client with interceptors)
- **react-hot-toast** (beautiful notifications)
- Custom CSS with CSS variables (no Tailwind needed)
- Dark cyberpunk aesthetic with `Exo 2` + `Space Mono` + `Rajdhani` fonts

### Backend
- **Node.js** + **Express 4**
- **Mongoose** (MongoDB ODM)
- **bcryptjs** (password hashing, 12 rounds)
- **jsonwebtoken** (JWT auth, 7-day expiry)
- **CORS** configured for frontend origin

### Database
- **MongoDB** (local or Atlas)
- Indexed queries for fast leaderboards
- Aggregation pipeline for per-game rankings

---

## 🛠 Production Deployment

### Backend (e.g., Railway, Render, Heroku)
1. Set environment variables on your hosting platform
2. Set `NODE_ENV=production`
3. Set `CLIENT_URL` to your frontend domain
4. Deploy the `backend/` folder

### Frontend (e.g., Vercel, Netlify)
1. Build: `cd frontend && npm run build`
2. Deploy the `frontend/dist/` folder
3. Set environment variable `VITE_API_URL` if backend is on a different domain
4. Update `vite.config.js` proxy if needed

---

## 📝 Development Tips

- Backend uses `nodemon` for auto-reload in dev mode
- Frontend Vite proxy forwards `/api/*` to `http://localhost:5000`
- MongoDB must be running before starting backend
- JWT secrets should be 32+ random characters in production
- Use `mongosh` or MongoDB Compass to inspect data during development

---

Built with ❤️ — React + Node.js + MongoDB
