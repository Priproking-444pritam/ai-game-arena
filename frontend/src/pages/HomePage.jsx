import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ALL_GAMES = [
  { id:'snake',      icon:'🐍', name:'Snake AI',     desc:'Guide your snake, then watch A* pathfinding show the optimal route.',   color:'#00ff88', tag:'A* Algorithm'   },
  { id:'sudoku',     icon:'🔢', name:'Sudoku',        desc:'Solve the puzzle or let the AI backtrack its way to a perfect solution.', color:'#00f5ff', tag:'Backtracking'   },
  { id:'connect4',   icon:'🔴', name:'Connect-4',     desc:'Outwit the AI using Minimax with alpha-beta pruning — if you can.',      color:'#bf00ff', tag:'Minimax AI'      },
  { id:'maze',       icon:'🧩', name:'Maze AI',       desc:'Race through the maze, compare your path with heuristic algorithms.',    color:'#ffd700', tag:'Heuristic Search'},
  { id:'nqueens',    icon:'👑', name:'N-Queens',      desc:'Place queens with no conflicts — or watch animated backtracking solve it.',color:'#ff6b00', tag:'CSP Solver'     },
  { id:'tictactoe',  icon:'🎯', name:'Tic Tac Toe',   desc:'Classic game against Minimax AI or challenge a friend in live PvP!',    color:'#00f5ff', tag:'Minimax · PvP'   },
  { id:'trivia',     icon:'🧠', name:'AI Trivia',     desc:'Race the clock across 8 topics. Beat your streak!',                     color:'#ffd700', tag:'8 Topics · Timer' },
  { id:'chess',      icon:'♟️', name:'Chess vs AI',   desc:'Full chess against Minimax AI with piece-square table evaluation.',      color:'#ff6b00', tag:'Minimax · Chess' },
  { id:'handslicer', icon:'✋', name:'Hand Slicer',   desc:'Catch shapes with your real hand using your webcam. 20 levels!',        color:'#ff0066', tag:'MediaPipe · Cam' },
  { id:'handrhythm', icon:'🎵', name:'Hand Rhythm',   desc:'Hit circles in sync with the beat using hand gestures.',               color:'#bf00ff', tag:'MediaPipe · Rhythm'},
]

const PREVIEW_GAMES = ALL_GAMES.slice(0, 3)

const STATS = [
  { label:'AI Games',       value:'10', icon:'🤖' },
  { label:'Algorithms',     value:'6+', icon:'⚡' },
  { label:'Live PvP',       value:'Yes', icon:'🔴' },
]

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div style={{ minHeight:'100vh' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ minHeight:'calc(100vh - 64px)', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', padding:'60px 24px', position:'relative', overflow:'hidden' }}>

        {/* Ambient orbs */}
        <div style={{ position:'absolute', top:'20%', left:'10%', width:'400px', height:'400px',
          background:'radial-gradient(circle, rgba(0,245,255,0.08) 0%, transparent 70%)',
          borderRadius:'50%', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'15%', right:'8%', width:'500px', height:'500px',
          background:'radial-gradient(circle, rgba(191,0,255,0.07) 0%, transparent 70%)',
          borderRadius:'50%', pointerEvents:'none' }}/>

        <div className="animate-fade-in-up" style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontSize:'80px', lineHeight:1, marginBottom:'16px', animation:'float 3s ease-in-out infinite' }}>🎮</div>

          <div style={{ display:'inline-block', background:'rgba(0,245,255,0.1)', border:'1px solid rgba(0,245,255,0.25)',
            borderRadius:'99px', padding:'6px 20px', fontSize:'12px', fontFamily:'var(--font-mono)',
            color:'var(--neon-cyan)', letterSpacing:'0.15em', marginBottom:'24px' }}>
            10 GAMES · POWERED BY AI ALGORITHMS
          </div>

          <h1 style={{ fontSize:'clamp(42px,8vw,88px)', fontFamily:'var(--font-display)', fontWeight:900,
            lineHeight:1, letterSpacing:'-0.03em',
            background:'linear-gradient(135deg, #fff 30%, var(--neon-cyan) 60%, var(--neon-purple) 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'8px' }}>
            AI GAME
          </h1>
          <h1 style={{ fontSize:'clamp(42px,8vw,88px)', fontFamily:'var(--font-display)', fontWeight:900,
            lineHeight:1, letterSpacing:'-0.03em',
            background:'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'24px' }}>
            ARENA
          </h1>
          <p style={{ fontSize:'18px', color:'var(--text-secondary)', maxWidth:'560px',
            margin:'0 auto 40px', lineHeight:1.7 }}>
            Ten games, each powered by a different AI algorithm.
            Play solo, challenge friends live, or unlock webcam games.
          </p>

          <div style={{ display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap' }}>
            {user ? (
              <Link to="/games" className="btn btn-primary" style={{ fontSize:'16px', padding:'14px 36px' }}>
                🚀 Enter Arena
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary" style={{ fontSize:'16px', padding:'14px 36px' }}>
                  Play Free
                </Link>
                <Link to="/login" className="btn btn-secondary" style={{ fontSize:'16px', padding:'14px 36px' }}>
                  Login
                </Link>
              </>
            )}
            <Link to="/leaderboard" className="btn btn-ghost" style={{ fontSize:'16px', padding:'14px 36px' }}>
              🏆 Leaderboard
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:'40px', justifyContent:'center', flexWrap:'wrap', marginTop:'56px',
          animation:'fadeInUp 0.5s ease 0.2s forwards', opacity:0 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'32px', marginBottom:'4px' }}>{s.icon}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'36px', fontWeight:900,
                color:'var(--neon-cyan)', textShadow:'0 0 20px rgba(0,245,255,0.5)' }}>{s.value}</div>
              <div style={{ fontSize:'11px', color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Games preview (3 cards + See More) ───────────────────────────── */}
      <section style={{ padding:'80px 24px', background:'rgba(0,0,0,0.3)' }}>
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <h2 style={{ fontSize:'42px', marginBottom:'12px', letterSpacing:'-0.02em' }}>
              THE GAMES
            </h2>
            <p style={{ color:'var(--text-secondary)', fontSize:'16px' }}>
              Each game features a real AI algorithm — visualized in real-time
            </p>
          </div>

          {/* 3 preview cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:'20px', marginBottom:'32px' }}>
            {PREVIEW_GAMES.map((game, i) => (
              <GameCard key={game.id} game={game} delay={i * 0.1} />
            ))}
          </div>

          {/* See More button */}
          <div style={{ textAlign:'center', marginTop:'16px' }}>
            <div style={{ fontSize:'13px', color:'var(--text-muted)', marginBottom:'14px' }}>
              + {ALL_GAMES.length - PREVIEW_GAMES.length} more games including Live PvP, Chess, Webcam games and more
            </div>
            <Link to={user ? '/games' : '/register'} style={{
              display:'inline-flex', alignItems:'center', gap:'10px',
              padding:'14px 36px', borderRadius:'12px', textDecoration:'none',
              background:'linear-gradient(135deg, rgba(0,245,255,0.1), rgba(191,0,255,0.1))',
              border:'1px solid rgba(0,245,255,0.3)',
              color:'var(--neon-cyan)', fontWeight:700, fontSize:'15px',
              transition:'all 0.2s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='linear-gradient(135deg,rgba(0,245,255,0.2),rgba(191,0,255,0.2))';e.currentTarget.style.transform='translateY(-2px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='linear-gradient(135deg,rgba(0,245,255,0.1),rgba(191,0,255,0.1))';e.currentTarget.style.transform='none'}}>
              🎮 See All 10 Games
              <span style={{ fontSize:'18px', opacity:0.7 }}>→</span>
            </Link>
          </div>

          {/* Mini game pill badges */}
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center', marginTop:'24px' }}>
            {ALL_GAMES.slice(3).map(g => (
              <Link key={g.id} to={user?'/games':'/register'} style={{
                display:'inline-flex', alignItems:'center', gap:'5px',
                padding:'5px 12px', borderRadius:'99px', textDecoration:'none',
                background:`${g.color}10`, border:`1px solid ${g.color}30`,
                color:g.color, fontSize:'12px', fontWeight:600, transition:'all 0.15s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.background=`${g.color}20`}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${g.color}10`}}>
                {g.icon} {g.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding:'100px 24px', textAlign:'center' }}>
        <div className="container">
          <div style={{ background:'linear-gradient(135deg, rgba(0,245,255,0.05), rgba(191,0,255,0.05))',
            border:'1px solid rgba(0,245,255,0.15)', borderRadius:'24px', padding:'60px 40px' }}>
            <h2 style={{ fontSize:'40px', marginBottom:'16px' }}>Ready to Challenge the AI?</h2>
            <p style={{ color:'var(--text-secondary)', fontSize:'18px', marginBottom:'36px' }}>
              Create a free account, level up through 10 games, and climb the leaderboard.
            </p>
            <Link to={user?'/games':'/register'} className="btn btn-primary" style={{ fontSize:'18px', padding:'16px 52px' }}>
              {user ? '🚀 Go to Games' : 'Get Started — Free'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid var(--border-dim)', padding:'24px', textAlign:'center',
        color:'var(--text-muted)', fontSize:'13px', fontFamily:'var(--font-mono)' }}>
        AI GAME ARENA © 2025 — Built with React · Node.js · MongoDB
      </footer>
    </div>
  )
}

function GameCard({ game, delay }) {
  return (
    <div className="card" style={{ animationDelay:`${delay}s`, cursor:'pointer',
      position:'relative', overflow:'hidden', transition:'all 0.2s' }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.borderColor=`${game.color}50`}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.borderColor='var(--border-dim)'}}>
      {/* Glow accent */}
      <div style={{ position:'absolute', top:0, right:0, width:'100px', height:'100px',
        background:`radial-gradient(circle, ${game.color}20 0%, transparent 70%)`, pointerEvents:'none' }}/>
      <div style={{ display:'flex', alignItems:'flex-start', gap:'16px' }}>
        <div style={{ width:'56px', height:'56px', minWidth:'56px',
          background:`${game.color}15`, border:`1px solid ${game.color}40`,
          borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px' }}>
          {game.icon}
        </div>
        <div style={{ flex:1 }}>
          <h3 style={{ fontSize:'20px', fontWeight:800, marginBottom:'6px' }}>{game.name}</h3>
          <p style={{ fontSize:'14px', color:'var(--text-secondary)', lineHeight:1.6, marginBottom:'12px' }}>
            {game.desc}
          </p>
          <span className="badge" style={{ background:`${game.color}15`, color:game.color,
            border:`1px solid ${game.color}40`, fontSize:'10px' }}>
            {game.tag}
          </span>
        </div>
      </div>
    </div>
  )
}