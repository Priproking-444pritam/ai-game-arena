import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth, API } from '../context/AuthContext'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────
const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
const POLL_MS   = 1800   // poll every 1.8s

// ─── AI helpers ───────────────────────────────────────────────────────────────
function checkWinner(b) {
  for (const [a,c,d] of WIN_LINES)
    if (b[a] && b[a]===b[c] && b[a]===b[d]) return { winner:b[a], line:[a,c,d] }
  if (b.every(Boolean)) return { winner:'draw', line:[] }
  return null
}
function minimax(board, isMax, depth, alpha, beta, maxDepth) {
  const res = checkWinner(board)
  if (res) { if(res.winner==='O') return 10-depth; if(res.winner==='X') return depth-10; return 0 }
  if (depth>=maxDepth) return 0
  if (isMax) {
    let best=-Infinity
    for(let i=0;i<9;i++) if(!board[i]){board[i]='O';best=Math.max(best,minimax(board,false,depth+1,alpha,beta,maxDepth));board[i]=null;alpha=Math.max(alpha,best);if(beta<=alpha)break}
    return best
  } else {
    let best=Infinity
    for(let i=0;i<9;i++) if(!board[i]){board[i]='X';best=Math.min(best,minimax(board,true,depth+1,alpha,beta,maxDepth));board[i]=null;beta=Math.min(beta,best);if(beta<=alpha)break}
    return best
  }
}
function getBestMove(board, difficulty) {
  const empty = board.map((v,i)=>v?null:i).filter(i=>i!==null)
  if (!empty.length) return -1
  if (difficulty==='easy' && Math.random()<0.6) return empty[Math.floor(Math.random()*empty.length)]
  if (difficulty==='medium' && Math.random()<0.3) return empty[Math.floor(Math.random()*empty.length)]
  const maxD = difficulty==='easy'?2:difficulty==='medium'?4:9
  let best=-Infinity, move=empty[0]
  for (const i of empty) {
    board[i]='O'
    const s=minimax(board,false,0,-Infinity,Infinity,maxD)
    board[i]=null
    if(s>best){best=s;move=i}
  }
  return move
}

// ─── Symbols with neon colours ────────────────────────────────────────────────
function XSymbol({ size=36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36">
      <line x1="6" y1="6" x2="30" y2="30" stroke="#00f5ff" strokeWidth="4" strokeLinecap="round"/>
      <line x1="30" y1="6" x2="6" y2="30" stroke="#00f5ff" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  )
}
function OSymbol({ size=36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="11" stroke="#ff6b35" strokeWidth="4" fill="none"/>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function TicTacToeGame() {
  const { user, submitScore } = useAuth()
  const [screen, setScreen] = useState('menu')   // 'menu'|'ai'|'pvp-lobby'|'pvp-game'

  return (
    <div>
      {screen === 'menu'      && <MenuScreen      setScreen={setScreen} />}
      {screen === 'ai'        && <AIGame           setScreen={setScreen} user={user} submitScore={submitScore} />}
      {screen === 'pvp-lobby' && <PvPLobby         setScreen={setScreen} user={user} />}
      {screen === 'pvp-game'  && <PvPLobby         setScreen={setScreen} user={user} autoJoin />}
    </div>
  )
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function MenuScreen({ setScreen }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'20px', padding:'40px 20px' }}>
      {/* Big colourful logo */}
      <div style={{ position:'relative', marginBottom:'8px' }}>
        <svg width="110" height="110" viewBox="0 0 110 110">
          {/* Grid lines */}
          <line x1="37" y1="8"  x2="37" y2="102" stroke="#ffffff18" strokeWidth="3" strokeLinecap="round"/>
          <line x1="73" y1="8"  x2="73" y2="102" stroke="#ffffff18" strokeWidth="3" strokeLinecap="round"/>
          <line x1="8"  y1="37" x2="102" y2="37" stroke="#ffffff18" strokeWidth="3" strokeLinecap="round"/>
          <line x1="8"  y1="73" x2="102" y2="73" stroke="#ffffff18" strokeWidth="3" strokeLinecap="round"/>
          {/* X  top-left */}
          <line x1="14" y1="14" x2="30" y2="30" stroke="#00f5ff" strokeWidth="4.5" strokeLinecap="round"/>
          <line x1="30" y1="14" x2="14" y2="30" stroke="#00f5ff" strokeWidth="4.5" strokeLinecap="round"/>
          {/* O  top-right */}
          <circle cx="88" cy="22" r="10" stroke="#ff6b35" strokeWidth="4" fill="none"/>
          {/* O  center */}
          <circle cx="55" cy="55" r="10" stroke="#bf00ff" strokeWidth="4" fill="none"/>
          {/* X  bottom-right */}
          <line x1="79" y1="79" x2="95" y2="95" stroke="#ffd700" strokeWidth="4.5" strokeLinecap="round"/>
          <line x1="95" y1="79" x2="79" y2="95" stroke="#ffd700" strokeWidth="4.5" strokeLinecap="round"/>
          {/* Win diagonal line */}
          <line x1="14" y1="95" x2="95" y2="14" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" opacity="0.6"/>
        </svg>
      </div>

      <div style={{ textAlign:'center' }}>
        <h1 style={{ fontSize:'32px', fontWeight:900, fontFamily:'var(--font-display)',
          background:'linear-gradient(135deg,#00f5ff,#bf00ff,#ff6b35)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'6px' }}>
          TIC TAC TOE
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'13px' }}>
          Play vs Minimax AI — or challenge a friend live!
        </p>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'12px', width:'100%', maxWidth:'340px' }}>
        <ModeCard
          icon={<svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="#00f5ff" strokeWidth="2"/><text x="18" y="23" textAnchor="middle" fill="#00f5ff" fontSize="14" fontWeight="bold">AI</text></svg>}
          title="vs Minimax AI"
          sub="Easy · Medium · Hard — play solo"
          color="#00f5ff"
          onClick={() => setScreen('ai')}
        />
        <ModeCard
          icon={<svg width="36" height="36" viewBox="0 0 36 36"><circle cx="12" cy="13" r="6" fill="none" stroke="#bf00ff" strokeWidth="2.5"/><circle cx="24" cy="13" r="6" fill="none" stroke="#ff6b35" strokeWidth="2.5"/><path d="M4 30 Q12 22 20 26 Q28 22 32 30" stroke="#ffd700" strokeWidth="2" fill="none"/></svg>}
          title="Live PvP"
          sub="Invite a friend — real-time match!"
          color="#bf00ff"
          onClick={() => setScreen('pvp-lobby')}
          badge="🔴 LIVE"
        />
      </div>
    </div>
  )
}

function ModeCard({ icon, title, sub, color, onClick, badge }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'flex', alignItems:'center', gap:'16px', padding:'18px 22px',
        borderRadius:'16px', background:hov?`${color}15`:`${color}08`,
        border:`2px solid ${hov?color:color+'40'}`,
        cursor:'pointer', textAlign:'left', transition:'all 0.2s',
        transform:hov?'translateY(-2px)':'none' }}>
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
        width:'52px', height:'52px', borderRadius:'12px', background:`${color}15`,
        border:`1px solid ${color}30` }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'17px', fontWeight:800, color:'var(--text-primary)' }}>{title}</span>
          {badge && <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 7px',
            borderRadius:'99px', background:'rgba(255,0,0,0.15)', color:'#ff4466',
            border:'1px solid rgba(255,0,0,0.3)', animation:'pulse-glow 1.5s infinite' }}>{badge}</span>}
        </div>
        <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>{sub}</div>
      </div>
      <span style={{ color, fontSize:'20px', opacity:hov?1:0.5 }}>›</span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AI GAME
// ═══════════════════════════════════════════════════════════════════════════════
function AIGame({ setScreen, user, submitScore }) {
  const [difficulty, setDiff] = useState('medium')
  const [board,  setBoard]  = useState(Array(9).fill(null))
  const [xIsNext,setX]      = useState(true)
  const [result, setResult] = useState(null)   // {winner, line}
  const [busy,   setBusy]   = useState(false)
  const [scores, setScores] = useState({ X:0, O:0, D:0 })
  const [lastCell,setLast]  = useState(null)
  const aiThink = useRef(false)

  // XP & toast on result
  useEffect(() => {
    if (!result) return
    const xp = result.winner==='X'?100:result.winner==='draw'?40:10
    const msg = result.winner==='X'?`🎉 You win! +${xp} XP`
              : result.winner==='draw'?`🤝 Draw! +${xp} XP`
              : `🤖 AI wins! +${xp} XP`
    toast(msg, { icon: result.winner==='X'?'🏆':result.winner==='draw'?'🤝':'💀',
      style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border-dim)' }})
    submitScore?.('tictactoe', xp, difficulty, result.winner==='X'?'win':result.winner==='draw'?'draw':'loss', {})
    setScores(s => result.winner==='X'?{...s,X:s.X+1}:result.winner==='draw'?{...s,D:s.D+1}:{...s,O:s.O+1})
  }, [result])

  // AI move
  useEffect(() => {
    if (xIsNext || result || aiThink.current) return
    aiThink.current = true
    const t = setTimeout(() => {
      setBoard(b => {
        const nb = [...b]
        const idx = getBestMove([...nb], difficulty)
        if (idx === -1) { aiThink.current=false; return nb }
        nb[idx] = 'O'
        setLast(idx)
        const res = checkWinner(nb)
        if (res) setResult(res)
        else     setX(true)
        aiThink.current = false
        return nb
      })
    }, 420)
    return () => clearTimeout(t)
  }, [xIsNext, result, difficulty])

  const handleClick = i => {
    if (!xIsNext || board[i] || result || busy) return
    const nb = [...board]; nb[i]='X'; setBoard(nb); setLast(i)
    const res = checkWinner(nb)
    if (res) setResult(res)
    else     setX(false)
  }

  const reset = () => { setBoard(Array(9).fill(null)); setX(true); setResult(null); setLast(null); aiThink.current=false }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', padding:'8px 16px' }}>
      {/* Back + title */}
      <div style={{ width:'100%', maxWidth:'400px', display:'flex', alignItems:'center', gap:'10px' }}>
        <button onClick={()=>setScreen('menu')} style={{ background:'none', border:'1px solid var(--border-dim)', borderRadius:'8px', padding:'6px 12px', color:'var(--text-muted)', cursor:'pointer', fontSize:'12px' }}>
          ← Back
        </button>
        <span style={{ fontWeight:800, fontSize:'16px', color:'var(--text-primary)' }}>vs Minimax AI</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:'6px' }}>
          {['easy','medium','hard'].map(d=>(
            <button key={d} onClick={()=>{setDiff(d);reset()}} style={{ padding:'4px 10px', borderRadius:'99px', fontSize:'11px', fontWeight:700, cursor:'pointer', border:'1px solid', textTransform:'capitalize',
              borderColor: difficulty===d?'#00f5ff':'var(--border-dim)',
              background:  difficulty===d?'rgba(0,245,255,0.15)':'transparent',
              color:       difficulty===d?'#00f5ff':'var(--text-muted)' }}>{d}</button>
          ))}
        </div>
      </div>

      {/* Score row */}
      <div style={{ display:'flex', gap:'12px', width:'100%', maxWidth:'400px' }}>
        <ScorePill label="You (X)" val={scores.X} color="#00f5ff"/>
        <ScorePill label="Draw"    val={scores.D} color="#888"/>
        <ScorePill label="AI (O)"  val={scores.O} color="#ff6b35"/>
      </div>

      {/* Turn indicator */}
      <div style={{ fontSize:'13px', color:'var(--text-muted)', height:'20px' }}>
        {result
          ? result.winner==='draw' ? '🤝 It\'s a Draw!'
            : result.winner==='X'  ? '🏆 You win!'
            : '🤖 AI wins!'
          : xIsNext ? '👆 Your turn (X)' : '🤖 AI is thinking…'}
      </div>

      {/* Board */}
      <Board board={board} winLine={result?.line??[]} lastCell={lastCell}
        onCell={handleClick} disabled={!xIsNext||!!result} symbolX={<XSymbol/>} symbolO={<OSymbol/>}/>

      {/* Actions */}
      <button onClick={reset} style={{ padding:'10px 28px', borderRadius:'10px', fontWeight:700, fontSize:'14px', cursor:'pointer', background:'rgba(0,245,255,0.1)', border:'1px solid rgba(0,245,255,0.3)', color:'#00f5ff' }}>
        🔄 New Game
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PvP LOBBY  (invite system + live game via polling)
// ═══════════════════════════════════════════════════════════════════════════════
function PvPLobby({ setScreen, user }) {
  const [view,       setView]    = useState('home')   // 'home'|'invite'|'waiting'|'incoming'|'game'
  const [inviteUser, setInviteU] = useState('')
  const [sending,    setSending] = useState(false)
  const [roomId,     setRoomId]  = useState(null)
  const [room,       setRoom]    = useState(null)
  const [mySymbol,   setMySym]   = useState('X')
  const [incoming,   setIncoming]= useState([])
  const [active,     setActive]  = useState([])
  const pollRef = useRef(null)
  const timerRef= useRef(null)
  const [inviteSeconds, setInvSec] = useState(600)   // 10 min countdown

  // ── Poll for pending invites / game state ─────────────────────────────────
  const pollPending = useCallback(async () => {
    try {
      const r = await API.get('/ttt/pending')
      setIncoming(r.data.incoming || [])
      setActive(r.data.active   || [])
    } catch {}
  }, [])

  const pollRoom = useCallback(async (id) => {
    try {
      const r = await API.get(`/ttt/${id}`)
      setRoom(r.data.room)
      setMySym(r.data.mySymbol)
      if (r.data.room.status === 'active' && view !== 'game') setView('game')
      if (r.data.room.status === 'declined') {
        toast.error('Invite declined!', {style:{background:'var(--bg-card)',color:'var(--text-primary)'}})
        setView('home'); setRoomId(null)
      }
    } catch {}
  }, [view])

  // Auto-poll
  useEffect(() => {
    pollPending()
    pollRef.current = setInterval(() => {
      pollPending()
      if (roomId) pollRoom(roomId)
    }, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [pollPending, pollRoom, roomId])

  // Invite countdown timer
  useEffect(() => {
    if (view === 'waiting') {
      setInvSec(600)
      timerRef.current = setInterval(() => {
        setInvSec(s => {
          if (s <= 1) {
            clearInterval(timerRef.current)
            setView('home'); setRoomId(null)
            toast('⏰ Invite expired', {style:{background:'var(--bg-card)',color:'var(--text-primary)'}})
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [view])

  // ── Send invite ───────────────────────────────────────────────────────────
  const sendInvite = async () => {
    if (!inviteUser.trim()) return
    setSending(true)
    try {
      const r = await API.post('/ttt/invite', { toUsername: inviteUser.trim() })
      setRoomId(r.data.roomId)
      setView('waiting')
      toast.success(`Invite sent to ${inviteUser}!`, {style:{background:'var(--bg-card)',color:'var(--text-primary)'}})
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send invite', {style:{background:'var(--bg-card)',color:'var(--text-primary)'}})
    } finally {
      setSending(false)
    }
  }

  // ── Accept / Decline ──────────────────────────────────────────────────────
  const acceptInvite = async (id) => {
    try {
      await API.post(`/ttt/${id}/accept`)
      setRoomId(id)
      await pollRoom(id)
      setView('game')
    } catch (e) {
      toast.error('Failed to accept')
    }
  }
  const declineInvite = async (id) => {
    try {
      await API.post(`/ttt/${id}/decline`)
      setIncoming(inc => inc.filter(i=>i._id!==id))
    } catch {}
  }

  // ── Resume active game ────────────────────────────────────────────────────
  const resumeGame = async (id) => {
    setRoomId(id)
    await pollRoom(id)
    setView('game')
  }

  // ── Leave game ────────────────────────────────────────────────────────────
  const leaveGame = async () => {
    if (roomId) {
      try { await API.post(`/ttt/${roomId}/leave`) } catch {}
    }
    setView('home'); setRoomId(null); setRoom(null)
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'game' && room) {
    return <PvPGame room={room} mySymbol={mySymbol}
      onMove={async i => {
        try {
          const r = await API.post(`/ttt/${roomId}/move`, { index: i })
          setRoom(r.data.room)
        } catch (e) {
          toast.error(e.response?.data?.message || 'Invalid move',{style:{background:'var(--bg-card)',color:'var(--text-primary)'}})
        }
      }}
      onRematch={async () => {
        try {
          const r = await API.post(`/ttt/${roomId}/rematch`)
          setRoom(r.data.room)
        } catch {}
      }}
      onLeave={leaveGame}
      pollRoom={() => pollRoom(roomId)}
    />
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'20px', padding:'16px 20px' }}>
      {/* Back */}
      <div style={{ width:'100%', maxWidth:'500px', display:'flex', alignItems:'center', gap:'10px' }}>
        <button onClick={()=>setScreen('menu')} style={{ background:'none', border:'1px solid var(--border-dim)', borderRadius:'8px', padding:'6px 12px', color:'var(--text-muted)', cursor:'pointer', fontSize:'12px' }}>
          ← Back
        </button>
        <span style={{ fontWeight:800, fontSize:'16px' }}>🔴 Live PvP</span>
      </div>

      {/* Incoming invites banner */}
      {incoming.length > 0 && (
        <div style={{ width:'100%', maxWidth:'500px' }}>
          <div style={{ fontSize:'12px', fontWeight:700, color:'#ffd700', marginBottom:'8px', letterSpacing:'0.05em' }}>
            📬 INCOMING INVITES
          </div>
          {incoming.map(inv => {
            const secsLeft = Math.max(0, 600 - Math.round((Date.now()-new Date(inv.createdAt))/1000))
            const mins = Math.floor(secsLeft/60), secs=(secsLeft%60).toString().padStart(2,'0')
            return (
              <div key={inv._id} style={{ display:'flex', alignItems:'center', gap:'12px',
                padding:'14px 16px', borderRadius:'12px', marginBottom:'8px',
                background:'rgba(191,0,255,0.08)', border:'2px solid rgba(191,0,255,0.4)',
                animation:'pulse-glow 2s ease-in-out infinite' }}>
                <div style={{ fontSize:'24px' }}>🎯</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'14px' }}>
                    <span style={{ color:'#bf00ff' }}>{inv.playerX.username}</span> challenged you!
                  </div>
                  <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>
                    Expires in <span style={{ color: secsLeft<60?'#ff4466':'#ffd700', fontWeight:700 }}>{mins}:{secs}</span>
                  </div>
                </div>
                <button onClick={()=>acceptInvite(inv._id)} style={{ padding:'8px 16px', borderRadius:'8px', background:'rgba(0,255,136,0.15)', border:'1px solid rgba(0,255,136,0.4)', color:'#00ff88', cursor:'pointer', fontWeight:700, fontSize:'13px' }}>
                  Accept ✓
                </button>
                <button onClick={()=>declineInvite(inv._id)} style={{ padding:'8px 12px', borderRadius:'8px', background:'rgba(255,0,0,0.1)', border:'1px solid rgba(255,0,0,0.3)', color:'#ff4466', cursor:'pointer', fontSize:'13px' }}>
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Active games */}
      {active.length > 0 && (
        <div style={{ width:'100%', maxWidth:'500px' }}>
          <div style={{ fontSize:'12px', fontWeight:700, color:'#00f5ff', marginBottom:'8px', letterSpacing:'0.05em' }}>
            ⚔️ ACTIVE GAMES
          </div>
          {active.map(r => (
            <button key={r._id} onClick={()=>resumeGame(r._id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:'12px',
              padding:'12px 16px', borderRadius:'12px', marginBottom:'8px',
              background:'rgba(0,245,255,0.06)', border:'1px solid rgba(0,245,255,0.25)',
              cursor:'pointer', textAlign:'left' }}>
              <div style={{ fontSize:'22px' }}>🎯</div>
              <div>
                <div style={{ fontWeight:700, color:'#00f5ff', fontSize:'13px' }}>
                  {r.playerX.username} vs {r.playerO.username}
                </div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>Turn: {r.turn} · Tap to resume</div>
              </div>
              <span style={{ marginLeft:'auto', color:'#00f5ff', fontSize:'18px' }}>›</span>
            </button>
          ))}
        </div>
      )}

      {/* Waiting state */}
      {view === 'waiting' ? (
        <div style={{ width:'100%', maxWidth:'500px', padding:'32px', textAlign:'center',
          background:'rgba(191,0,255,0.06)', border:'2px solid rgba(191,0,255,0.3)', borderRadius:'16px' }}>
          <div style={{ fontSize:'48px', marginBottom:'12px', animation:'float 2s ease-in-out infinite' }}>⏳</div>
          <div style={{ fontWeight:800, fontSize:'18px', marginBottom:'6px' }}>Waiting for {inviteUser}…</div>
          <div style={{ fontSize:'13px', color:'var(--text-muted)', marginBottom:'16px' }}>
            They have <span style={{ color:'#ffd700', fontWeight:700 }}>
              {Math.floor(inviteSeconds/60)}:{(inviteSeconds%60).toString().padStart(2,'0')}
            </span> to accept
          </div>
          <div style={{ display:'flex', gap:'8px', justifyContent:'center' }}>
            {[0,1,2].map(i=>(
              <div key={i} style={{ width:'8px',height:'8px',borderRadius:'50%',background:'#bf00ff',
                animation:`pulse-glow 1.2s ease-in-out ${i*0.4}s infinite` }}/>
            ))}
          </div>
          <button onClick={()=>{setView('home');setRoomId(null)}} style={{ marginTop:'20px', padding:'8px 20px', borderRadius:'8px', background:'rgba(255,0,0,0.1)', border:'1px solid rgba(255,0,0,0.25)', color:'#ff4466', cursor:'pointer', fontSize:'12px' }}>
            Cancel invite
          </button>
        </div>
      ) : (
        /* Send invite panel */
        <div style={{ width:'100%', maxWidth:'500px', padding:'28px',
          background:'var(--bg-card)', border:'1px solid var(--border-dim)', borderRadius:'16px' }}>
          <div style={{ fontWeight:800, fontSize:'16px', marginBottom:'6px' }}>Challenge a Friend</div>
          <div style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'18px' }}>
            Enter their exact username. They'll receive an invite — they have <strong style={{color:'#ffd700'}}>10 minutes</strong> to accept!
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <input
              value={inviteUser}
              onChange={e=>setInviteU(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&sendInvite()}
              placeholder="Enter username…"
              style={{ flex:1, padding:'10px 14px', borderRadius:'10px',
                border:'1px solid var(--border-dim)', background:'var(--bg-elevated)',
                color:'var(--text-primary)', fontSize:'14px', outline:'none' }}
            />
            <button onClick={sendInvite} disabled={sending||!inviteUser.trim()} style={{ padding:'10px 20px', borderRadius:'10px', fontWeight:700, fontSize:'14px', cursor:'pointer',
              background: inviteUser.trim()?'rgba(191,0,255,0.2)':'var(--bg-elevated)',
              border:`1px solid ${inviteUser.trim()?'#bf00ff':'var(--border-dim)'}`,
              color: inviteUser.trim()?'#bf00ff':'var(--text-muted)', transition:'all 0.2s' }}>
              {sending ? '…' : 'Send 📨'}
            </button>
          </div>

          <div style={{ marginTop:'20px', padding:'14px', borderRadius:'10px',
            background:'rgba(0,245,255,0.04)', border:'1px solid rgba(0,245,255,0.1)',
            fontSize:'12px', color:'var(--text-muted)', lineHeight:1.8 }}>
            <strong style={{color:'var(--neon-cyan)'}}>How it works:</strong>
            <br/>① You enter their username → invite is sent
            <br/>② They see a notification in their PvP tab
            <br/>③ Both of you play live — board updates every 2 seconds!
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PvP LIVE GAME
// ═══════════════════════════════════════════════════════════════════════════════
function PvPGame({ room: initialRoom, mySymbol, onMove, onRematch, onLeave, pollRoom }) {
  const [room, setRoom]       = useState(initialRoom)
  const [lastCell, setLastC]  = useState(null)
  const pollRef = useRef(null)

  // Keep polling so both screens stay in sync
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const r = await pollRoom()  // parent already updates room for us
      } catch {}
    }, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [pollRoom])

  // Sync room from parent
  useEffect(() => { setRoom(initialRoom) }, [initialRoom])

  const isMyTurn  = room.turn === mySymbol && room.status === 'active'
  const opponent  = mySymbol==='X' ? room.playerO.username : room.playerX.username
  const myWins    = mySymbol==='X' ? room.scoreX : room.scoreO
  const oppWins   = mySymbol==='X' ? room.scoreO : room.scoreX
  const iFinished = room.status === 'finished'
  const iWon      = iFinished && room.winner === mySymbol
  const isDraw    = iFinished && room.winner === 'draw'
  const myRematch = mySymbol==='X' ? room.rematchRequestX : room.rematchRequestO
  const oppRematch= mySymbol==='X' ? room.rematchRequestO : room.rematchRequestX

  const handleCell = async i => {
    if (!isMyTurn || room.board[i] || iFinished) return
    setLastC(i)
    await onMove(i)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', padding:'8px 16px' }}>
      {/* Header */}
      <div style={{ width:'100%', maxWidth:'420px', display:'flex', alignItems:'center', gap:'8px' }}>
        <button onClick={onLeave} style={{ background:'none', border:'1px solid var(--border-dim)', borderRadius:'8px', padding:'5px 10px', color:'var(--text-muted)', cursor:'pointer', fontSize:'12px' }}>
          ← Leave
        </button>
        <div style={{ flex:1, textAlign:'center' }}>
          <span style={{ fontWeight:800, fontSize:'14px', color:'#00f5ff' }}>You ({mySymbol})</span>
          <span style={{ color:'var(--text-muted)', fontSize:'12px', margin:'0 8px' }}>vs</span>
          <span style={{ fontWeight:800, fontSize:'14px', color:'#ff6b35' }}>{opponent} ({mySymbol==='X'?'O':'X'})</span>
        </div>
        <div style={{ width:'8px',height:'8px',borderRadius:'50%',
          background: room.status==='active'?'#00ff88':'#ff4466',
          boxShadow: room.status==='active'?'0 0 8px #00ff88':'none' }}/>
      </div>

      {/* Scores */}
      <div style={{ display:'flex', gap:'12px', width:'100%', maxWidth:'420px' }}>
        <ScorePill label={`You (${mySymbol})`} val={myWins}    color={mySymbol==='X'?'#00f5ff':'#ff6b35'}/>
        <ScorePill label="Draw"                val={room.draws} color="#888"/>
        <ScorePill label={`${opponent}`}       val={oppWins}   color={mySymbol==='X'?'#ff6b35':'#00f5ff'}/>
      </div>

      {/* Turn indicator */}
      <div style={{ fontSize:'13px', height:'20px',
        color: iFinished?(iWon?'#00ff88':isDraw?'#ffd700':'#ff4466'):(isMyTurn?'#00ff88':'var(--text-muted)') }}>
        {iFinished
          ? iWon ? '🏆 You win this round!' : isDraw ? '🤝 Draw!' : `💀 ${opponent} wins this round!`
          : isMyTurn ? '👆 Your turn!' : `⏳ Waiting for ${opponent}…`}
      </div>

      {/* Board */}
      <Board board={room.board} winLine={room.winLine??[]} lastCell={lastCell}
        onCell={handleCell}
        disabled={!isMyTurn || iFinished}
        symbolX={<XSymbol/>} symbolO={<OSymbol/>}/>

      {/* Rematch / Leave */}
      {iFinished && (
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onRematch} style={{ padding:'10px 22px', borderRadius:'10px', fontWeight:700, fontSize:'13px', cursor:'pointer',
            background: myRematch?'rgba(0,255,136,0.2)':'rgba(0,245,255,0.1)',
            border:`1px solid ${myRematch?'#00ff88':'rgba(0,245,255,0.3)'}`,
            color: myRematch?'#00ff88':'#00f5ff' }}>
            {myRematch
              ? oppRematch ? '🔄 Starting…' : `✓ Waiting for ${opponent}…`
              : '🔄 Rematch'}
          </button>
          <button onClick={onLeave} style={{ padding:'10px 22px', borderRadius:'10px', fontWeight:700, fontSize:'13px', cursor:'pointer', background:'rgba(255,0,0,0.1)', border:'1px solid rgba(255,0,0,0.25)', color:'#ff4466' }}>
            Leave
          </button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARED BOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Board({ board, winLine, lastCell, onCell, disabled, symbolX, symbolO }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px',
      width:'min(360px, 90vw)', padding:'12px',
      background:'rgba(255,255,255,0.03)', borderRadius:'16px',
      border:'1px solid rgba(255,255,255,0.07)' }}>
      {board.map((val, i) => {
        const isWin   = winLine.includes(i)
        const isLast  = lastCell === i
        return (
          <button key={i} onClick={()=>onCell(i)} disabled={disabled||!!val}
            style={{ aspectRatio:'1', borderRadius:'12px', cursor:(!disabled&&!val)?'pointer':'default',
              display:'flex', alignItems:'center', justifyContent:'center',
              background: isWin  ? 'rgba(0,255,136,0.15)'
                        : isLast ? 'rgba(255,255,255,0.07)'
                        : 'rgba(255,255,255,0.04)',
              border: `2px solid ${isWin?'rgba(0,255,136,0.5)':isLast?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.07)'}`,
              transition:'all 0.15s',
              transform: isLast?'scale(1.04)':'none',
              boxShadow: isWin?'0 0 16px rgba(0,255,136,0.3)':'none',
            }}
            onMouseEnter={e=>{ if(!disabled&&!val) e.currentTarget.style.background='rgba(255,255,255,0.08)' }}
            onMouseLeave={e=>{ if(!isWin&&!isLast) e.currentTarget.style.background=isWin?'rgba(0,255,136,0.15)':'rgba(255,255,255,0.04)' }}>
            {val==='X' && symbolX}
            {val==='O' && symbolO}
          </button>
        )
      })}
    </div>
  )
}

function ScorePill({ label, val, color }) {
  return (
    <div style={{ flex:1, textAlign:'center', padding:'8px 6px', borderRadius:'10px',
      background:`${color}10`, border:`1px solid ${color}30` }}>
      <div style={{ fontSize:'20px', fontWeight:900, color, fontFamily:'var(--font-display)' }}>{val}</div>
      <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'0.05em', marginTop:'1px' }}>{label}</div>
    </div>
  )
}