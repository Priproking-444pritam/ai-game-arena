import { useState, useEffect } from 'react'
import { useAuth, API } from '../context/AuthContext'

const ALL_GAMES = [
  { id:'snake',      name:'Snake AI',    icon:'🐍', color:'#00ff88', level:1  },
  { id:'sudoku',     name:'Sudoku',      icon:'🔢', color:'#00f5ff', level:2  },
  { id:'connect4',   name:'Connect-4',   icon:'🔴', color:'#bf00ff', level:3  },
  { id:'maze',       name:'Maze AI',     icon:'🧩', color:'#ffd700', level:4  },
  { id:'nqueens',    name:'N-Queens',    icon:'👑', color:'#ff6b00', level:5  },
  { id:'tictactoe',  name:'Tic Tac Toe', icon:'🎯',  color:'#00f5ff', level:6  },
  { id:'trivia',     name:'AI Trivia',   icon:'🧠', color:'#ffd700', level:7  },
  { id:'chess',      name:'Chess vs AI', icon:'♟️', color:'#ff6b00', level:8  },
  { id:'handslicer', name:'Hand Slicer', icon:'✋', color:'#ff0066', level:9  },
  { id:'handrhythm', name:'Hand Rhythm', icon:'🎵', color:'#bf00ff', level:10 },
]

const RANK_COLORS = ['#FFD700','#C0C0C0','#CD7F32']
const RANK_ICONS  = ['🔥','🥈','🥉']

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [selectedGame, setSelectedGame] = useState('snake')
  const [leaderboard,  setLeaderboard]  = useState([])
  const [topPlayers,   setTopPlayers]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [sortBy,       setSortBy]       = useState('score')
  const [sortDir,      setSortDir]      = useState('desc')

  const unlocked = localStorage.getItem('arena_unlocked') === 'true'
  const userLevel = unlocked ? 10 : (user?.level ?? 1)

  useEffect(() => {
    setLoading(true)
    API.get(`/scores/leaderboard/${selectedGame}`)
      .then(r => setLeaderboard(r.data.leaderboard || []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false))
  }, [selectedGame])

  useEffect(() => {
    API.get('/users/top')
      .then(r => setTopPlayers(r.data.users || []))
      .catch(() => {})
  }, [])

  const sorted = [...leaderboard].sort((a,b) => {
    const k = sortBy==='score'?'bestScore':'level'
    return sortDir==='desc'?(b[k]||0)-(a[k]||0):(a[k]||0)-(b[k]||0)
  })

  const activeGame = ALL_GAMES.find(g=>g.id===selectedGame)
  const isLocked = activeGame && activeGame.level > userLevel

  return (
    <div className="container" style={{ padding:'40px 24px', maxWidth:'980px' }}>

      {/* Header */}
      <div className="animate-fade-in-up" style={{ textAlign:'center', marginBottom:'40px' }}>
        <h1 style={{ fontSize:'48px', fontFamily:'var(--font-display)', fontWeight:900,
          background:'linear-gradient(135deg, var(--neon-gold), var(--neon-orange))',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'8px' }}>
          🏆 LEADERBOARD
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'14px', fontFamily:'var(--font-mono)' }}>
          TOP PLAYERS ACROSS ALL 10 GAMES
        </p>
      </div>

      {/* Overall XP Rankings */}
      {topPlayers.length > 0 && (
        <div style={{ marginBottom:'40px' }}>
          <h2 style={{ fontSize:'13px', color:'var(--text-secondary)', letterSpacing:'0.1em',
            textTransform:'uppercase', marginBottom:'14px' }}>⚡ Overall XP Rankings</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:'10px' }}>
            {topPlayers.slice(0,6).map((p,i)=>(
              <div key={p._id} style={{
                background:'var(--bg-card)', borderRadius:'12px', padding:'14px',
                border:`1px solid ${i<3?RANK_COLORS[i]+'40':'var(--border-dim)'}`,
                display:'flex', alignItems:'center', gap:'12px',
                boxShadow: p.username===user?.username?`0 0 0 2px rgba(0,245,255,0.4)`:'none',
              }}>
                <div style={{ width:'34px',height:'34px',minWidth:'34px',borderRadius:'50%',
                  background:i<3?`${RANK_COLORS[i]}20`:'var(--bg-elevated)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:i<3?'16px':'13px',fontWeight:700,
                  color:i<3?RANK_COLORS[i]:'var(--text-muted)' }}>
                  {i<3?RANK_ICONS[i]:`#${i+1}`}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                    color:p.username===user?.username?'var(--neon-cyan)':'inherit' }}>
                    {p.username}{p.username===user?.username&&' (You)'}
                  </div>
                  <div style={{ fontSize:'11px',color:'var(--text-muted)' }}>
                    Lv.{p.level} · {p.xp} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game tabs — all 10 */}
      <div style={{ marginBottom:'28px' }}>
        <h2 style={{ fontSize:'13px', color:'var(--text-secondary)', letterSpacing:'0.1em',
          textTransform:'uppercase', marginBottom:'14px' }}>🎮 Game Rankings</h2>

        {/* Row 1: levels 1-5 */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'8px' }}>
          {ALL_GAMES.slice(0,5).map(g => (
            <GameTab key={g.id} game={g} active={selectedGame===g.id}
              locked={g.level>userLevel} onClick={()=>setSelectedGame(g.id)} />
          ))}
        </div>
        {/* Row 2: levels 6-10 */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {ALL_GAMES.slice(5).map(g => (
            <GameTab key={g.id} game={g} active={selectedGame===g.id}
              locked={g.level>userLevel} onClick={()=>setSelectedGame(g.id)} />
          ))}
        </div>
      </div>

      {/* Sort controls */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px', flexWrap:'wrap' }}>
        <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>Sort by:</span>
        {[{k:'score',l:'🏅 Score'},{k:'level',l:'⚡ Level'}].map(({k,l})=>(
          <button key={k} onClick={()=>setSortBy(k)} style={{
            padding:'6px 14px',borderRadius:'99px',cursor:'pointer',fontSize:'12px',fontWeight:600,
            background:sortBy===k?'var(--neon-purple)':'var(--bg-elevated)',
            color:sortBy===k?'#fff':'var(--text-muted)',
            border:`1px solid ${sortBy===k?'var(--neon-purple)':'var(--border-dim)'}`,transition:'all 0.2s',
          }}>{l}</button>
        ))}
        <button onClick={()=>setSortDir(d=>d==='desc'?'asc':'desc')} style={{
          padding:'6px 14px',borderRadius:'99px',cursor:'pointer',fontSize:'12px',fontWeight:600,
          background:'var(--bg-elevated)',color:'var(--neon-cyan)',
          border:'1px solid var(--neon-cyan)30',transition:'all 0.2s',
        }}>
          {sortDir==='desc'?'↓ High → Low':'↑ Low → High'}
        </button>
      </div>

      {/* Leaderboard table */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-dim)', borderRadius:'16px', overflow:'hidden' }}>
        {/* Table header */}
        <div style={{ display:'grid', gridTemplateColumns:'60px 1fr 120px 80px 80px',
          padding:'12px 20px', borderBottom:'1px solid var(--border-dim)',
          fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          <span>Rank</span><span>Player</span><span>Best Score</span><span>Level</span><span>W/L</span>
        </div>

        {isLocked ? (
          <div style={{ padding:'40px', textAlign:'center' }}>
            <div style={{ fontSize:'36px', marginBottom:'8px' }}>🔒</div>
            <div style={{ fontWeight:700, marginBottom:'4px' }}>Reach Level {activeGame.level} to view this leaderboard</div>
            <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>Keep playing to level up!</div>
          </div>
        ) : loading ? (
          <div style={{ padding:'40px', textAlign:'center', color:'var(--text-muted)' }}>
            <div className="spinner" style={{ margin:'0 auto 12px' }}/>Loading…
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center', color:'var(--text-muted)' }}>
            No scores yet for {activeGame?.name}. Be the first! 🎯
          </div>
        ) : (
          sorted.map((entry, i) => {
            const isMe = entry.username === user?.username
            const rankColor = i<3?RANK_COLORS[i]:'var(--text-muted)'
            return (
              <div key={entry.username || i} style={{
                display:'grid', gridTemplateColumns:'60px 1fr 120px 80px 80px',
                padding:'13px 20px', borderBottom:'1px solid var(--border-dim)',
                background: isMe?'rgba(0,245,255,0.05)':'transparent',
                boxShadow: isMe?'inset 3px 0 0 var(--neon-cyan)':'none',
                transition:'background 0.2s',
              }}
              onMouseEnter={e=>{ if(!isMe) e.currentTarget.style.background='var(--bg-elevated)' }}
              onMouseLeave={e=>{ if(!isMe) e.currentTarget.style.background='transparent' }}>
                <div style={{ display:'flex',alignItems:'center',fontWeight:800,fontSize:i<3?'18px':'14px',color:rankColor }}>
                  {i<3?RANK_ICONS[i]:`#${i+1}`}
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
                  <div style={{ width:'30px',height:'30px',borderRadius:'50%',flexShrink:0,
                    background:`linear-gradient(135deg,${activeGame?.color||'#00f5ff'},rgba(191,0,255,0.5))`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'12px',fontWeight:700,color:'#000' }}>
                    {(entry.username||'?')[0].toUpperCase()}
                  </div>
                  <span style={{ fontWeight:isMe?700:500, color:isMe?'var(--neon-cyan)':'var(--text-primary)', fontSize:'14px' }}>
                    {entry.username}{isMe&&' (You)'}
                  </span>
                </div>
                <div style={{ display:'flex',alignItems:'center',fontFamily:'var(--font-mono)',fontWeight:700,color:activeGame?.color }}>
                  {(entry.bestScore||0).toLocaleString()}
                </div>
                <div style={{ display:'flex',alignItems:'center',color:'var(--text-secondary)',fontSize:'13px' }}>
                  {entry.level||1}
                </div>
                <div style={{ display:'flex',alignItems:'center',fontSize:'12px',color:'var(--text-muted)' }}>
                  <span style={{ color:'#00ff88' }}>{entry.wins||0}</span>
                  <span style={{ margin:'0 3px',opacity:0.4 }}>/</span>
                  <span style={{ color:'#ff4466' }}>{entry.losses||0}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}

function GameTab({ game, active, locked, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex',alignItems:'center',gap:'6px',
      padding:'7px 14px',borderRadius:'99px',cursor:'pointer',
      background:active?game.color+'22':'var(--bg-elevated)',
      color:active?game.color:locked?'var(--text-muted)':'var(--text-secondary)',
      border:`1px solid ${active?game.color:locked?'rgba(255,255,255,0.06)':game.color+'25'}`,
      fontSize:'12px',fontWeight:600,transition:'all 0.2s',opacity:locked?0.5:1,
    }}>
      <span>{locked?'🔒':game.icon}</span>
      <span>{game.name}</span>
      {locked&&<span style={{ fontSize:'9px',color:'var(--text-muted)',background:'rgba(255,215,0,0.1)',padding:'1px 5px',borderRadius:'4px',border:'1px solid rgba(255,215,0,0.2)' }}>Lv{game.level}</span>}
    </button>
  )
}