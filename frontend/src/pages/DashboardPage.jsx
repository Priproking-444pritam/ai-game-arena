import { useState, useEffect } from 'react'
import { useAuth, API } from '../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'

const ALL_GAMES = [
  { id:'snake',      name:'Snake',      icon:'🐍', color:'#00ff88', level:1  },
  { id:'sudoku',     name:'Sudoku',     icon:'🔢', color:'#00f5ff', level:2  },
  { id:'connect4',   name:'Connect-4',  icon:'🔴', color:'#bf00ff', level:3  },
  { id:'maze',       name:'Maze',       icon:'🧩', color:'#ffd700', level:4  },
  { id:'nqueens',    name:'N-Queens',   icon:'👑', color:'#ff6b00', level:5  },
  { id:'tictactoe',  name:'Tic Tac Toe',icon:'🎯',  color:'#00f5ff', level:6  },
  { id:'trivia',     name:'AI Trivia',  icon:'🧠', color:'#ffd700', level:7  },
  { id:'chess',      name:'Chess',      icon:'♟️', color:'#ff6b00', level:8  },
  { id:'handslicer', name:'Hand Slicer',icon:'✋', color:'#ff0066', level:9  },
  { id:'handrhythm', name:'Hand Rhythm',icon:'🎵', color:'#bf00ff', level:10 },
]

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background:'var(--bg-card)', border:`1px solid ${color}25`, borderRadius:'16px',
      padding:'22px', textAlign:'center', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute',top:0,right:0,bottom:0,left:0,
        background:`radial-gradient(circle at top right, ${color}08, transparent 60%)`, pointerEvents:'none' }}/>
      <div style={{ fontSize:'26px', marginBottom:'6px' }}>{icon}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'38px', fontWeight:900,
        color, textShadow:`0 0 20px ${color}60`, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'6px',
        letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}</div>
    </div>
  )
}

// Unlock code mini-widget for dashboard
function UnlockWidget({ unlocked, onUnlock }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  if (unlocked) return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'6px',
      padding:'6px 14px', borderRadius:'99px',
      background:'rgba(0,255,136,0.08)', border:'1px solid rgba(0,255,136,0.2)',
      fontSize:'12px', color:'#00ff88' }}>
      🔓 All levels unlocked
    </div>
  )
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'6px' }}>
      {open ? (
        <>
          <input value={code} onChange={e=>setCode(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&onUnlock(code)}
            placeholder="Enter unlock code…"
            style={{ padding:'5px 10px', borderRadius:'8px', border:'1px solid var(--border-dim)',
              background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:'12px', width:'160px' }}
            autoFocus />
          <button onClick={()=>onUnlock(code)} style={{ padding:'5px 10px', borderRadius:'8px',
            background:'var(--neon-cyan)', color:'#000', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:700 }}>
            Unlock
          </button>
          <button onClick={()=>setOpen(false)} style={{ padding:'5px 8px', borderRadius:'8px',
            background:'none', color:'var(--text-muted)', border:'1px solid var(--border-dim)', cursor:'pointer', fontSize:'12px' }}>
            ✕
          </button>
        </>
      ) : (
        <button onClick={()=>setOpen(true)} style={{ padding:'6px 14px', borderRadius:'99px', cursor:'pointer',
          background:'rgba(255,215,0,0.08)', border:'1px solid rgba(255,215,0,0.2)',
          color:'var(--neon-gold)', fontSize:'12px', fontWeight:600 }}>
          🔑 Have an unlock code?
        </button>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [recentScores, setRecentScores] = useState([])
  const [loadingScores, setLoadingScores] = useState(true)
  const [unlocked, setUnlocked] = useState(()=>localStorage.getItem('arena_unlocked')==='true')

  const userLevel = unlocked ? 10 : (user?.level ?? 1)

  useEffect(() => {
    API.get('/scores/recent')
      .then(r => setRecentScores(r.data.scores || []))
      .catch(() => setRecentScores([]))
      .finally(() => setLoadingScores(false))
  }, [])

  const handleUnlockCode = (code) => {
    if (code.trim().toUpperCase() === 'LEVEL0') {
      localStorage.setItem('arena_unlocked', 'true')
      setUnlocked(true)
      const d = document.createElement('div')
      d.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#00ff88;color:#000;padding:12px 24px;border-radius:10px;font-weight:700;z-index:9999'
      d.textContent = '🎉 All 10 games unlocked!'
      document.body.appendChild(d)
      setTimeout(()=>d.remove(), 3000)
    } else {
      const d = document.createElement('div')
      d.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#ff4466;color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;z-index:9999'
      d.textContent = '❌ Invalid code'
      document.body.appendChild(d)
      setTimeout(()=>d.remove(), 2000)
    }
  }

  if (!user) return null

  const xpInLevel  = user.xp - ((user.level - 1) * 200)
  const xpProgress = Math.min((xpInLevel / 200) * 100, 100)

  return (
    <div className="container" style={{ padding:'36px 24px', maxWidth:'960px' }}>

      {/* ── Profile Header ─────────────────────────────────────────────── */}
      <div className="animate-fade-in-up" style={{ background:'var(--bg-card)',
        border:'1px solid rgba(0,245,255,0.12)', borderRadius:'20px',
        padding:'28px 32px', marginBottom:'28px',
        display:'flex', alignItems:'center', gap:'24px', flexWrap:'wrap' }}>

        {/* Avatar */}
        <div style={{ width:'76px', height:'76px',
          background:'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
          borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'30px', fontWeight:900, color:'#000', fontFamily:'var(--font-display)',
          boxShadow:'0 0 28px rgba(0,245,255,0.35)', flexShrink:0 }}>
          {user.username[0].toUpperCase()}
        </div>

        <div style={{ flex:1, minWidth:'200px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap', marginBottom:'4px' }}>
            <h1 style={{ fontSize:'26px', fontWeight:900, margin:0 }}>{user.username}</h1>
            <UnlockWidget unlocked={unlocked} onUnlock={handleUnlockCode} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
            <span className="badge badge-cyan">Level {user.level}</span>
            <span className="badge badge-gold">⚡ {user.xp} XP</span>
            <span className="badge badge-green">
              {Math.round((user.totalWins/Math.max(1,user.totalGamesPlayed))*100)}% Win Rate
            </span>
            {user.joinedAt && (
              <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>
                Joined {new Date(user.joinedAt||user.createdAt).toLocaleDateString('en-US',{month:'long',year:'numeric'})}
              </span>
            )}
          </div>
          {/* XP bar */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'11px' }}>
              <span style={{ color:'var(--text-muted)', letterSpacing:'0.05em' }}>XP TO LEVEL {user.level+1}</span>
              <span style={{ color:'var(--neon-cyan)', fontFamily:'var(--font-mono)' }}>{xpInLevel} / 200</span>
            </div>
            <div style={{ height:'6px', background:'var(--bg-elevated)', borderRadius:'99px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${xpProgress}%`,
                background:'linear-gradient(to right, var(--neon-cyan), var(--neon-purple))',
                borderRadius:'99px', transition:'width 0.5s ease', boxShadow:'0 0 8px rgba(0,245,255,0.5)' }}/>
            </div>
          </div>
        </div>

        <Link to="/games" className="btn btn-primary" style={{ padding:'12px 28px', flexShrink:0 }}>
          🕹 Play Now
        </Link>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:'14px', marginBottom:'28px' }}>
        <StatCard label="Games Played" value={user.totalGamesPlayed} icon="🎮" color="var(--neon-cyan)" />
        <StatCard label="Total Wins"   value={user.totalWins}        icon="🏆" color="var(--neon-gold)" />
        <StatCard label="Current Level" value={user.level}           icon="⚡" color="var(--neon-purple)" />
        <StatCard label="Total XP"     value={user.xp}               icon="✨" color="var(--neon-green)" />
      </div>

      {/* ── Quick Play — all 10 games ──────────────────────────────────── */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-dim)',
        borderRadius:'20px', padding:'24px', marginBottom:'28px' }}>
        <h2 style={{ fontSize:'18px', marginBottom:'18px', display:'flex', alignItems:'center', gap:'8px' }}>
          🕹 Quick Play — All 10 Games
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:'10px' }}>
          {ALL_GAMES.map(g => {
            const locked = g.level > userLevel
            return (
              <Link key={g.id} to="/games" style={{ textDecoration:'none' }}>
                <div style={{ background:'var(--bg-elevated)', border:`1px solid ${locked?'var(--border-dim)':g.color+'25'}`,
                  borderRadius:'12px', padding:'14px 10px', textAlign:'center', cursor:'pointer',
                  transition:'all 0.2s', opacity:locked?0.45:1, position:'relative' }}
                  onMouseEnter={e=>{ if(!locked){ e.currentTarget.style.borderColor=g.color+'60'; e.currentTarget.style.transform='translateY(-2px)' }}}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=locked?'var(--border-dim)':g.color+'25'; e.currentTarget.style.transform='none' }}>
                  <div style={{ position:'absolute',top:'6px',left:'6px',fontSize:'9px',fontWeight:700,
                    color:locked?'var(--text-muted)':g.color,
                    background:locked?'rgba(255,255,255,0.05)':`${g.color}15`,
                    padding:'1px 5px',borderRadius:'4px' }}>
                    Lv{g.level}
                  </div>
                  <div style={{ fontSize:'24px', marginBottom:'6px', filter:locked?'grayscale(1)':'none' }}>
                    {locked ? '🔒' : g.icon}
                  </div>
                  <div style={{ fontSize:'11px', fontWeight:700, color:locked?'var(--text-muted)':g.color,
                    letterSpacing:'0.04em' }}>
                    {g.name}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Recent Scores ──────────────────────────────────────────────── */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-dim)',
        borderRadius:'20px', padding:'24px' }}>
        <h2 style={{ fontSize:'18px', marginBottom:'18px', display:'flex', alignItems:'center', gap:'8px' }}>
          📋 Recent Scores
        </h2>

        {loadingScores ? (
          <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)' }}>
            <div className="spinner" style={{ margin:'0 auto 8px' }}/>Loading scores…
          </div>
        ) : recentScores.length === 0 ? (
          <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)', fontSize:'14px' }}>
            No scores yet. <Link to="/games" style={{ color:'var(--neon-cyan)' }}>Play a game!</Link>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {/* Header */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 100px 80px 80px 90px',
              padding:'6px 14px', fontSize:'10px', color:'var(--text-muted)',
              textTransform:'uppercase', letterSpacing:'0.08em' }}>
              <span>Game</span><span>Score</span><span>Result</span><span>Difficulty</span><span>Date</span>
            </div>
            {recentScores.map((s,i) => {
              const game = ALL_GAMES.find(g=>g.id===s.game) || { icon:'🎮', color:'#888', name:s.game }
              const isWin = s.result==='win'
              const isDraw = s.result==='draw'
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 100px 80px 80px 90px',
                  padding:'10px 14px', borderRadius:'10px', background:'var(--bg-elevated)',
                  border:'1px solid var(--border-dim)', alignItems:'center',
                  transition:'border-color 0.2s' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=game.color+'40'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-dim)'}>
                  {/* Game name */}
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'18px' }}>{game.icon}</span>
                    <div>
                      <div style={{ fontWeight:600, fontSize:'13px', color:game.color }}>{game.name}</div>
                      {s.metadata?.accuracy && (
                        <div style={{ fontSize:'10px', color:'var(--text-muted)' }}>
                          {s.metadata.accuracy}% accuracy
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Score */}
                  <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--text-primary)', fontSize:'14px' }}>
                    {(s.score||0).toLocaleString()}
                  </div>
                  {/* Result badge */}
                  <div>
                    <span style={{ fontSize:'11px', fontWeight:700, padding:'3px 8px', borderRadius:'6px',
                      background:isWin?'rgba(0,255,136,0.15)':isDraw?'rgba(255,215,0,0.15)':'rgba(255,68,102,0.15)',
                      color:isWin?'#00ff88':isDraw?'#ffd700':'#ff4466',
                      border:`1px solid ${isWin?'rgba(0,255,136,0.3)':isDraw?'rgba(255,215,0,0.3)':'rgba(255,68,102,0.3)'}` }}>
                      {isWin?'WIN':isDraw?'DRAW':'LOSS'}
                    </span>
                  </div>
                  {/* Difficulty */}
                  <div style={{ fontSize:'12px', color:'var(--text-muted)', textTransform:'capitalize' }}>
                    {s.difficulty||'—'}
                  </div>
                  {/* Date */}
                  <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>
                    {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}