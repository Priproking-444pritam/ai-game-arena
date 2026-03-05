import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import SnakeGame      from '../games/SnakeGame'
import SudokuGame     from '../games/SudokuGame'
import Connect4Game   from '../games/Connect4Game'
import MazeGame       from '../games/MazeGame'
import NQueensGame    from '../games/NQueensGame'
import TicTacToeGame  from '../games/TicTacToeGame'
import TriviaGame     from '../games/TriviaGame'
import ChessGame      from '../games/ChessGame'
import HandSlicerGame from '../games/HandSlicerGame'
import HandRhythmGame from '../games/HandRhythmGame'

// ─── 10 Games ordered by level ────────────────────────────────────────────────
export const ALL_GAMES = [
  { level:1,  id:'snake',      name:'Snake AI',     icon:'🐍', color:'#00ff88', bg:'rgba(0,255,136,0.08)',   tag:'A* Pathfinding',      desc:'Navigate the snake, eat all fruits. Then watch A* AI solve it.',                        component:SnakeGame      },
  { level:2,  id:'sudoku',     name:'Sudoku',        icon:'🔢', color:'#00f5ff', bg:'rgba(0,245,255,0.08)',   tag:'Backtracking',        desc:'Fill the 9×9 grid. Watch backtracking AI animate the solution.',                        component:SudokuGame     },
  { level:3,  id:'connect4',   name:'Connect-4',     icon:'🔴', color:'#bf00ff', bg:'rgba(191,0,255,0.08)',   tag:'Minimax + α-β',       desc:'Connect four discs against a Minimax AI with alpha-beta pruning.',                      component:Connect4Game   },
  { level:4,  id:'maze',       name:'Maze AI',       icon:'🧩', color:'#ffd700', bg:'rgba(255,215,0,0.08)',   tag:'Heuristic A*',        desc:'Escape the maze, compare steps with Manhattan & Euclidean A*.',                         component:MazeGame       },
  { level:5,  id:'nqueens',    name:'N-Queens',      icon:'👑', color:'#ff6b00', bg:'rgba(255,107,0,0.08)',   tag:'CSP + Backtrack',     desc:'Place N queens with no conflicts. Watch backtracking solve step by step.',               component:NQueensGame    },
  { level:6,  id:'tictactoe',  name:'Tic Tac Toe',   icon:'🎯',  color:'#00f5ff', bg:'rgba(0,245,255,0.08)',   tag:'Minimax · 2 Player',  desc:'Classic game vs Minimax AI or a friend locally. Easy · Medium · Hard.',                 component:TicTacToeGame  },
  { level:7,  id:'trivia',     name:'AI Trivia',     icon:'🧠', color:'#ffd700', bg:'rgba(255,215,0,0.08)',   tag:'8 Topics · Timer',    desc:'8 questions across 8 topics. Race the clock and beat your streak!',                     component:TriviaGame     },
  { level:8,  id:'chess',      name:'Chess vs AI',   icon:'♟️', color:'#ff6b00', bg:'rgba(255,107,0,0.08)',   tag:'Minimax · Chess',     desc:'Full chess against Minimax AI with alpha-beta pruning and piece-square tables.',         component:ChessGame      },
  { level:9,  id:'handslicer', name:'Hand Slicer',   icon:'✋', color:'#ff0066', bg:'rgba(255,0,102,0.08)',   tag:'MediaPipe · Webcam',  desc:'20 levels. Catch the right shapes with your hand. Colours fade as speed rises!',         component:HandSlicerGame },
  { level:10, id:'handrhythm', name:'Hand Rhythm',   icon:'🎵', color:'#bf00ff', bg:'rgba(191,0,255,0.08)',   tag:'MediaPipe · Rhythm',  desc:'5 random songs. Hit circles in sync with the beat using your hand.',                    component:HandRhythmGame },
]

// ─── Locked overlay ───────────────────────────────────────────────────────────
function LockedOverlay({ game, userLevel }) {
  const progress = Math.min((userLevel / game.level) * 100, 100)
  const needed = game.level - userLevel
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:'60px 24px', textAlign:'center', gap:'16px' }}>
      <div style={{
        width:'90px', height:'90px', borderRadius:'50%',
        background:`radial-gradient(circle, ${game.color}20, transparent 70%)`,
        border:`2px solid ${game.color}30`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'40px', animation:'pulse-glow 2s ease-in-out infinite',
      }}>🔒</div>
      <div>
        <h2 style={{ fontSize:'26px', fontWeight:900, marginBottom:'6px', fontFamily:'var(--font-display)' }}>
          {game.name} — Locked
        </h2>
        <p style={{ color:'var(--text-secondary)', fontSize:'14px', maxWidth:'360px', margin:'0 auto' }}>
          Reach <strong style={{color:game.color}}>Level {game.level}</strong> to unlock this game!
        </p>
      </div>
      <div style={{ width:'100%', maxWidth:'320px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px', fontSize:'12px' }}>
          <span style={{ color:'var(--text-muted)' }}>Your level</span>
          <span style={{ color:game.color, fontFamily:'var(--font-mono)', fontWeight:700 }}>
            {userLevel} / {game.level}
          </span>
        </div>
        <div style={{ height:'8px', background:'var(--bg-elevated)', borderRadius:'99px', overflow:'hidden' }}>
          <div style={{
            height:'100%', width:`${progress}%`,
            background:`linear-gradient(to right, ${game.color}90, ${game.color})`,
            borderRadius:'99px', transition:'width 0.6s ease',
            boxShadow:`0 0 8px ${game.color}60`,
          }} />
        </div>
        <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'6px' }}>
          {needed} more level{needed!==1?'s':''} to go · Win games to earn XP!
        </div>
      </div>
      <div style={{ padding:'12px 18px', maxWidth:'360px',
        background:'rgba(0,245,255,0.04)', border:'1px solid rgba(0,245,255,0.1)',
        borderRadius:'10px', fontSize:'12px', color:'var(--text-muted)', lineHeight:1.8 }}>
        💡 <strong style={{ color:'var(--neon-cyan)' }}>How to level up:</strong>
        <br/>Win any game → +50–500 XP · Every 200 XP = 1 level
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GameHubPage() {
  const { user } = useAuth()
  const [activeGame, setActiveGame]   = useState(null)
  const [unlockInput, setUnlockInput] = useState('')
  const [unlockOpen,  setUnlockOpen]  = useState(false)
  const [unlocked,    setUnlocked]    = useState(() => localStorage.getItem('arena_unlocked') === 'true')

  const userLevel = unlocked ? 10 : (user?.level ?? 1)

  const games = ALL_GAMES.map(g => ({
    ...g,
    locked: g.level > userLevel,
  }))

  const handleUnlockCode = () => {
    if (unlockInput.trim().toUpperCase() === 'LEVEL0') {
      localStorage.setItem('arena_unlocked', 'true')
      setUnlocked(true)
      setUnlockOpen(false)
      setUnlockInput('')
      // show success toast via DOM (avoid importing toast here)
      const d = document.createElement('div')
      d.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#00ff88;color:#000;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;z-index:9999;animation:fadeIn 0.3s ease'
      d.textContent = '🎉 All games unlocked!'
      document.body.appendChild(d)
      setTimeout(() => d.remove(), 3000)
    } else {
      const d = document.createElement('div')
      d.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#ff4466;color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;z-index:9999'
      d.textContent = '❌ Invalid code'
      document.body.appendChild(d)
      setTimeout(() => d.remove(), 2000)
    }
  }

  const GameComponent = activeGame?.component

  return (
    <div style={{ minHeight:'calc(100vh - 64px)', display:'flex' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        width:'250px', minWidth:'250px',
        background:'var(--bg-deep)', borderRight:'1px solid var(--border-dim)',
        display:'flex', flexDirection:'column', overflowY:'auto',
      }}>
        <div style={{ padding:'16px 14px 8px', fontSize:'10px', fontWeight:700,
          letterSpacing:'0.12em', color:'var(--text-muted)', textTransform:'uppercase' }}>
          SELECT GAME
        </div>

        {/* Level-ordered game list */}
        <div style={{ flex:1, padding:'0 8px', display:'flex', flexDirection:'column', gap:'2px' }}>
          {games.map(g => (
            <SidebarBtn key={g.id} game={g} active={activeGame?.id===g.id}
              onClick={() => setActiveGame(g)} />
          ))}
        </div>

        {/* Footer — level + unlock code */}
        <div style={{ borderTop:'1px solid var(--border-dim)', padding:'12px 14px' }}>
          {user && (
            <div style={{ marginBottom:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'var(--text-muted)', marginBottom:'5px' }}>
                <span>Your Level</span>
                <span style={{ color:'var(--neon-cyan)', fontWeight:700 }}>{user.level}</span>
              </div>
              <div style={{ height:'4px', background:'var(--bg-elevated)', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{
                  height:'100%',
                  width:`${Math.min(((user.xp % 200)/200)*100, 100)}%`,
                  background:'linear-gradient(to right, var(--neon-cyan), var(--neon-purple))',
                  borderRadius:'99px',
                }} />
              </div>
              {unlocked
                ? <div style={{ fontSize:'10px', color:'#00ff88', marginTop:'4px' }}>🔓 All games unlocked!</div>
                : userLevel < 10
                  ? <div style={{ fontSize:'10px', color:'var(--text-muted)', marginTop:'4px' }}>
                      Next: Level {userLevel+1} → {games.find(g=>g.level===userLevel+1)?.name}
                    </div>
                  : <div style={{ fontSize:'10px', color:'#00ff88', marginTop:'4px' }}>✅ All games unlocked!</div>
              }
            </div>
          )}
          {/* Unlock code button */}
          {!unlocked && (
            <div>
              {unlockOpen ? (
                <div style={{ display:'flex', gap:'4px' }}>
                  <input
                    value={unlockInput}
                    onChange={e => setUnlockInput(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && handleUnlockCode()}
                    placeholder="Enter code…"
                    style={{ flex:1, padding:'5px 8px', borderRadius:'6px', border:'1px solid var(--border-dim)',
                      background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:'12px' }}
                    autoFocus
                  />
                  <button onClick={handleUnlockCode} style={{ padding:'5px 10px', borderRadius:'6px', background:'var(--neon-cyan)', color:'#000', border:'none', cursor:'pointer', fontWeight:700, fontSize:'12px' }}>
                    ✓
                  </button>
                  <button onClick={()=>setUnlockOpen(false)} style={{ padding:'5px 8px', borderRadius:'6px', background:'var(--bg-elevated)', color:'var(--text-muted)', border:'1px solid var(--border-dim)', cursor:'pointer', fontSize:'12px' }}>
                    ✕
                  </button>
                </div>
              ) : (
                <button onClick={()=>setUnlockOpen(true)} style={{ width:'100%', padding:'6px', borderRadius:'6px', background:'var(--bg-elevated)', border:'1px solid var(--border-dim)', color:'var(--text-muted)', cursor:'pointer', fontSize:'11px', letterSpacing:'0.05em' }}>
                  🔑 Enter Unlock Code
                </button>
              )}
            </div>
          )}
          {unlocked && (
            <button onClick={()=>{ localStorage.removeItem('arena_unlocked'); setUnlocked(false) }}
              style={{ width:'100%', padding:'5px', borderRadius:'6px', background:'none', border:'1px solid rgba(255,0,102,0.2)', color:'rgba(255,0,102,0.5)', cursor:'pointer', fontSize:'10px' }}>
              Reset unlock
            </button>
          )}
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflow:'auto', background:'var(--bg-void)' }}>
        {activeGame ? (
          <div style={{ padding:'24px', animation:'fadeIn 0.3s ease' }}>
            {/* Game header */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px',
              marginBottom:'24px', paddingBottom:'16px', borderBottom:'1px solid var(--border-dim)' }}>
              <div style={{ width:'44px', height:'44px', borderRadius:'10px', flexShrink:0,
                background:activeGame.bg, border:`1px solid ${activeGame.color}30`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px' }}>
                {activeGame.icon}
              </div>
              <div>
                <h1 style={{ fontSize:'20px', fontWeight:900 }}>{activeGame.name}</h1>
                <p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>{activeGame.desc}</p>
              </div>
              <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' }}>
                <span className="badge" style={{ background:`${activeGame.color}15`, color:activeGame.color, border:`1px solid ${activeGame.color}40` }}>
                  {activeGame.tag}
                </span>
                <span className="badge" style={{ background:'rgba(255,215,0,0.08)', color:'var(--neon-gold)', border:'1px solid rgba(255,215,0,0.2)', fontSize:'10px' }}>
                  ⭐ Level {activeGame.level} Game
                </span>
              </div>
            </div>
            {activeGame.locked
              ? <LockedOverlay game={activeGame} userLevel={userLevel} />
              : <GameComponent />
            }
          </div>
        ) : (
          /* ── Welcome splash ──────────────────────────────────────────── */
          <div style={{ padding:'32px 28px' }}>
            <div style={{ textAlign:'center', marginBottom:'32px' }}>
              <div style={{ fontSize:'56px', marginBottom:'8px', animation:'float 3s ease-in-out infinite' }}>🎮</div>
              <h2 style={{ fontSize:'28px', fontWeight:900, marginBottom:'6px' }}>
                {unlocked ? '🔓 All 10 Games Unlocked!' : `You're at Level ${userLevel}`}
              </h2>
              <p style={{ color:'var(--text-secondary)', fontSize:'14px', maxWidth:'420px', margin:'0 auto' }}>
                {unlocked
                  ? 'Every game is available. Play any of the 10 games below!'
                  : `${userLevel} of 10 games unlocked. Each level unlocks the next game!`}
              </p>
            </div>

            {/* 10 game cards in a grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px', maxWidth:'900px', margin:'0 auto' }}>
              {games.map(g => (
                <button key={g.id} onClick={()=>setActiveGame(g)} style={{
                  padding:'18px 16px', borderRadius:'14px', cursor:'pointer', textAlign:'left',
                  background: g.locked ? 'rgba(255,255,255,0.02)' : g.bg,
                  border:`2px solid ${g.locked ? 'rgba(255,255,255,0.06)' : g.color+'35'}`,
                  transition:'all 0.2s', opacity: g.locked ? 0.55 : 1, position:'relative',
                }}
                onMouseEnter={e=>{ if(!g.locked){e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.borderColor=g.color+'80'} }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='none';e.currentTarget.style.borderColor=g.locked?'rgba(255,255,255,0.06)':g.color+'35' }}
                >
                  {/* Level badge */}
                  <div style={{ position:'absolute', top:'10px', right:'10px', fontSize:'10px', fontWeight:700,
                    color: g.locked ? 'var(--text-muted)' : g.color,
                    background: g.locked ? 'rgba(255,255,255,0.05)' : `${g.color}15`,
                    padding:'2px 7px', borderRadius:'99px', border:`1px solid ${g.locked?'rgba(255,255,255,0.1)':g.color+'30'}` }}>
                    LVL {g.level}
                  </div>
                  <div style={{ fontSize:'28px', marginBottom:'8px', filter: g.locked ? 'grayscale(1)' : 'none' }}>
                    {g.locked ? '🔒' : g.icon}
                  </div>
                  <div style={{ fontWeight:800, fontSize:'14px', color: g.locked ? 'var(--text-muted)' : 'var(--text-primary)', marginBottom:'3px' }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize:'10px', color: g.locked ? 'var(--text-muted)' : g.color, letterSpacing:'0.04em' }}>
                    {g.locked ? `Reach Level ${g.level} to unlock` : g.tag}
                  </div>
                </button>
              ))}
            </div>

            {!unlocked && userLevel < 10 && (
              <div style={{ textAlign:'center', marginTop:'24px' }}>
                <div style={{ display:'inline-block', padding:'10px 20px', borderRadius:'10px',
                  background:'rgba(0,245,255,0.05)', border:'1px solid rgba(0,245,255,0.15)',
                  fontSize:'12px', color:'var(--text-muted)' }}>
                  💡 Win games to earn XP → Level up → Unlock next game!
                  &nbsp;<strong style={{color:'var(--neon-cyan)'}}>
                    Next unlock: {games.find(g=>g.level===userLevel+1)?.name} at Level {userLevel+1}
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sidebar button ───────────────────────────────────────────────────────────
function SidebarBtn({ game, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:'10px',
      padding:'9px 10px', borderRadius:'9px',
      border: active ? `1px solid ${game.color}50` : '1px solid transparent',
      background: active ? game.bg : 'transparent',
      cursor:'pointer', textAlign:'left', transition:'all 0.15s',
      width:'100%', opacity: game.locked ? 0.5 : 1,
    }}
    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='var(--bg-elevated)' }}
    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent' }}>
      {/* Level number */}
      <div style={{ minWidth:'22px', height:'22px', borderRadius:'6px', flexShrink:0,
        background: game.locked ? 'rgba(255,255,255,0.05)' : `${game.color}20`,
        border:`1px solid ${game.locked?'rgba(255,255,255,0.08)':game.color+'40'}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'10px', fontWeight:800,
        color: game.locked ? 'var(--text-muted)' : game.color }}>
        {game.level}
      </div>
      {/* Icon + name */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:'13px', marginBottom:'1px',
          color: active ? game.color : game.locked ? 'var(--text-muted)' : 'var(--text-primary)',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {game.locked ? '🔒 ' : ''}{game.name}
        </div>
        <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'0.04em' }}>
          {game.locked ? `Level ${game.level} required` : game.tag}
        </div>
      </div>
    </button>
  )
}