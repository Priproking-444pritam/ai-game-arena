import { useState } from 'react'
import { Link } from 'react-router-dom'
import SudokuGame  from '../games/SudokuGame'
import MazeGame    from '../games/MazeGame'
import NQueensGame from '../games/NQueensGame'

// ─── Guest games — no login required ─────────────────────────────────────────
export const GUEST_GAMES = [
  { id:'sudoku',  name:'Sudoku',   icon:'🔢', color:'#00f5ff', bg:'rgba(0,245,255,0.08)', tag:'Backtracking',    desc:'Fill the 9×9 grid. Watch backtracking AI animate the solution.',          component:SudokuGame  },
  { id:'nqueens', name:'N-Queens', icon:'👑', color:'#ff6b00', bg:'rgba(255,107,0,0.08)', tag:'CSP + Backtrack', desc:'Place N queens with no conflicts. Watch backtracking solve step by step.', component:NQueensGame },
  { id:'maze',    name:'Maze AI',  icon:'🧩', color:'#ffd700', bg:'rgba(255,215,0,0.08)', tag:'Heuristic A*',    desc:'Escape the maze, compare steps with Manhattan & Euclidean A*.',           component:MazeGame    },
]

export default function GuestPage() {
  const [activeGame, setActiveGame] = useState(null)
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
          GUEST MODE
        </div>

        <div style={{ flex:1, padding:'0 8px', display:'flex', flexDirection:'column', gap:'2px' }}>
          {GUEST_GAMES.map(g => (
            <SidebarBtn key={g.id} game={g} active={activeGame?.id===g.id}
              onClick={() => setActiveGame(g)} />
          ))}
        </div>

        <div style={{ borderTop:'1px solid var(--border-dim)', padding:'12px 14px' }}>
          <div style={{ fontSize:'11px', color:'var(--text-muted)', lineHeight:1.6, marginBottom:'10px' }}>
            👤 Playing as guest.<br/>Progress &amp; scores aren't saved.
          </div>
          <Link to="/register" className="btn btn-primary" style={{ width:'100%', textAlign:'center', display:'block', padding:'8px', fontSize:'12px' }}>
            Sign Up to Save Progress
          </Link>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflow:'auto', background:'var(--bg-void)' }}>
        {activeGame ? (
          <div style={{ padding:'24px', animation:'fadeIn 0.3s ease' }}>
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
              <div style={{ marginLeft:'auto' }}>
                <span className="badge" style={{ background:`${activeGame.color}15`, color:activeGame.color, border:`1px solid ${activeGame.color}40` }}>
                  {activeGame.tag}
                </span>
              </div>
            </div>
            <GameComponent />
          </div>
        ) : (
          /* ── Welcome splash ──────────────────────────────────────────── */
          <div style={{ padding:'32px 28px' }}>
            <div style={{ textAlign:'center', marginBottom:'32px' }}>
              <div style={{ fontSize:'56px', marginBottom:'8px', animation:'float 3s ease-in-out infinite' }}>🕹️</div>
              <h2 style={{ fontSize:'28px', fontWeight:900, marginBottom:'6px' }}>
                Play as Guest
              </h2>
              <p style={{ color:'var(--text-secondary)', fontSize:'14px', maxWidth:'460px', margin:'0 auto' }}>
                No account needed — jump straight into Sudoku, N-Queens and the Maze AI game.
                Sign up any time to save your scores and unlock the full 10-game arena.
              </p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'16px', maxWidth:'760px', margin:'0 auto' }}>
              {GUEST_GAMES.map(g => (
                <button key={g.id} onClick={()=>setActiveGame(g)} style={{
                  padding:'20px 18px', borderRadius:'14px', cursor:'pointer', textAlign:'left',
                  background:g.bg, border:`2px solid ${g.color}35`, transition:'all 0.2s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.borderColor=g.color+'80'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.borderColor=g.color+'35'}}
                >
                  <div style={{ fontSize:'30px', marginBottom:'8px' }}>{g.icon}</div>
                  <div style={{ fontWeight:800, fontSize:'15px', color:'var(--text-primary)', marginBottom:'3px' }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize:'11px', color:g.color, letterSpacing:'0.04em' }}>
                    {g.tag}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ textAlign:'center', marginTop:'28px' }}>
              <div style={{ display:'inline-block', padding:'10px 20px', borderRadius:'10px',
                background:'rgba(0,245,255,0.05)', border:'1px solid rgba(0,245,255,0.15)',
                fontSize:'12px', color:'var(--text-muted)' }}>
                💡 Want the other 7 games, XP and the leaderboard?&nbsp;
                <Link to="/register" style={{ color:'var(--neon-cyan)', fontWeight:700 }}>Create a free account</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SidebarBtn({ game, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:'10px',
      padding:'9px 10px', borderRadius:'9px',
      border: active ? `1px solid ${game.color}50` : '1px solid transparent',
      background: active ? game.bg : 'transparent',
      cursor:'pointer', textAlign:'left', transition:'all 0.15s',
      width:'100%',
    }}
    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='var(--bg-elevated)' }}
    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent' }}>
      <div style={{ minWidth:'22px', height:'22px', borderRadius:'6px', flexShrink:0,
        background:`${game.color}20`, border:`1px solid ${game.color}40`,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>
        {game.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:'13px', marginBottom:'1px',
          color: active ? game.color : 'var(--text-primary)',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {game.name}
        </div>
        <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'0.04em' }}>
          {game.tag}
        </div>
      </div>
    </button>
  )
}
