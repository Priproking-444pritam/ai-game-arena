import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth, API } from '../context/AuthContext'
import toast from 'react-hot-toast'

// ─── AI Logic ─────────────────────────────────────────────────────────────────
const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

function checkWinner(b) {
  for (const [a,c,d] of WIN_LINES) if (b[a] && b[a]===b[c] && b[a]===b[d]) return { winner:b[a], line:[a,c,d] }
  if (b.every(v=>v!=='')) return { winner:'draw', line:[] }
  return null
}

function minimax(board, isMax, depth, alpha, beta, maxDepth) {
  const res = checkWinner(board)
  if (res) { if(res.winner==='O') return 10-depth; if(res.winner==='X') return depth-10; return 0 }
  if (depth>=maxDepth) return 0
  if (isMax) {
    let best=-Infinity
    for(let i=0;i<9;i++) if(!board[i]){ board[i]='O'; best=Math.max(best,minimax(board,false,depth+1,alpha,beta,maxDepth)); board[i]=null; alpha=Math.max(alpha,best); if(beta<=alpha)break }
    return best
  } else {
    let best=Infinity
    for(let i=0;i<9;i++) if(!board[i]){ board[i]='X'; best=Math.min(best,minimax(board,true,depth+1,alpha,beta,maxDepth)); board[i]=null; beta=Math.min(beta,best); if(beta<=alpha)break }
    return best
  }
}
function getBestMove(board, diff) {
  const empty=board.map((v,i)=>v?null:i).filter(i=>i!==null); if(!empty.length)return -1
  const rand=Math.random()
  if(diff==='easy'&&rand<0.6) return empty[Math.floor(Math.random()*empty.length)]
  if(diff==='medium'&&rand<0.3) return empty[Math.floor(Math.random()*empty.length)]
  const maxD=diff==='easy'?2:diff==='medium'?4:9
  let best=-Infinity,move=empty[0]
  for(const i of empty){ board[i]='O'; const s=minimax(board,false,0,-Infinity,Infinity,maxD); board[i]=null; if(s>best){best=s;move=i} }
  return move
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CLR = { X:'#00f5ff', O:'#ff0066', draw:'#ffd700' }
const DIFF_INFO = {
  easy:   { label:'Easy',   color:'#00ff88' },
  medium: { label:'Medium', color:'#ffd700' },
  hard:   { label:'Hard',   color:'#ff4466' },
}

// ─── Colourful Logo ───────────────────────────────────────────────────────────
function TicTacToeLogo({ size=52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Grid lines */}
      <line x1="33" y1="5"  x2="33" y2="95" stroke="#444" strokeWidth="4" strokeLinecap="round"/>
      <line x1="67" y1="5"  x2="67" y2="95" stroke="#444" strokeWidth="4" strokeLinecap="round"/>
      <line x1="5"  y1="33" x2="95" y2="33" stroke="#444" strokeWidth="4" strokeLinecap="round"/>
      <line x1="5"  y1="67" x2="95" y2="67" stroke="#444" strokeWidth="4" strokeLinecap="round"/>
      {/* X - top-left */}
      <line x1="10" y1="10" x2="26" y2="26" stroke="#00f5ff" strokeWidth="5" strokeLinecap="round"/>
      <line x1="26" y1="10" x2="10" y2="26" stroke="#00f5ff" strokeWidth="5" strokeLinecap="round"/>
      {/* O - top-center */}
      <circle cx="50" cy="17" r="9" stroke="#ff0066" strokeWidth="5" fill="none"/>
      {/* X - top-right */}
      <line x1="74" y1="10" x2="90" y2="26" stroke="#00f5ff" strokeWidth="5" strokeLinecap="round"/>
      <line x1="90" y1="10" x2="74" y2="26" stroke="#00f5ff" strokeWidth="5" strokeLinecap="round"/>
      {/* O - mid-left */}
      <circle cx="17" cy="50" r="9" stroke="#ff0066" strokeWidth="5" fill="none"/>
      {/* X - center (winning) */}
      <line x1="41" y1="41" x2="59" y2="59" stroke="#ffd700" strokeWidth="6" strokeLinecap="round"/>
      <line x1="59" y1="41" x2="41" y2="59" stroke="#ffd700" strokeWidth="6" strokeLinecap="round"/>
      {/* O - mid-right */}
      <circle cx="83" cy="50" r="9" stroke="#ff0066" strokeWidth="5" fill="none"/>
      {/* bottom row empty */}
      <circle cx="17" cy="83" r="9" stroke="#ff0066" strokeWidth="5" fill="none"/>
      <line x1="41" y1="74" x2="59" y2="92" stroke="#00f5ff" strokeWidth="5" strokeLinecap="round"/>
      <line x1="59" y1="74" x2="41" y2="92" stroke="#00f5ff" strokeWidth="5" strokeLinecap="round"/>
      {/* winning diagonal */}
      <line x1="7" y1="7" x2="93" y2="93" stroke="#ffd700" strokeWidth="3" strokeOpacity="0.3" strokeLinecap="round" strokeDasharray="4 6"/>
    </svg>
  )
}

// ─── Online invite system ─────────────────────────────────────────────────────
function OnlineLobby({ user, onRoomJoined }) {
  const [tab,         setTab]         = useState('send')   // 'send'|'inbox'
  const [username,    setUsername]    = useState('')
  const [sending,     setSending]     = useState(false)
  const [invites,     setInvites]     = useState([])
  const [loadingInv,  setLoadingInv]  = useState(false)
  const [myRooms,     setMyRooms]     = useState([])
  const [countdown,   setCountdown]   = useState({})   // roomId -> secondsLeft
  const pollRef = useRef(null)

  const fetchInvites = useCallback(async () => {
    setLoadingInv(true)
    try {
      const r = await API.get('/ttt/invites')
      setInvites(r.data.invites || [])
    } catch {}
    setLoadingInv(false)
  }, [])

  const fetchMyRooms = useCallback(async () => {
    try {
      const r = await API.get('/ttt/myrooms')
      setMyRooms(r.data.rooms || [])
    } catch {}
  }, [])

  // Poll every 3s
  useEffect(() => {
    fetchInvites(); fetchMyRooms()
    pollRef.current = setInterval(() => { fetchInvites(); fetchMyRooms() }, 3000)
    return () => clearInterval(pollRef.current)
  }, [])

  // Countdown timers
  useEffect(() => {
    const tid = setInterval(() => {
      const now = Date.now()
      const c = {}
      ;[...invites, ...myRooms].forEach(r => {
        const left = Math.max(0, Math.floor((new Date(r.expiresAt) - now) / 1000))
        c[r.roomId] = left
      })
      setCountdown(c)
    }, 1000)
    return () => clearInterval(tid)
  }, [invites, myRooms])

  // Auto-join if a room we created/accepted becomes 'playing'
  useEffect(() => {
    const playing = myRooms.find(r => r.status === 'playing')
    if (playing) onRoomJoined(playing)
  }, [myRooms])

  const sendInvite = async () => {
    if (!username.trim()) return
    setSending(true)
    try {
      const r = await API.post('/ttt/invite', { opponentUsername: username.trim() })
      toast.success(`✅ Invite sent to ${username.trim()}! Waiting…`)
      setUsername('')
      fetchMyRooms()
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed to send invite')
    }
    setSending(false)
  }

  const acceptInvite = async (roomId) => {
    try {
      const r = await API.post('/ttt/accept', { roomId })
      toast.success('✅ Accepted! Game starting…')
      onRoomJoined(r.data.room)
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed to accept')
      fetchInvites()
    }
  }

  const declineInvite = async (roomId) => {
    try {
      await API.post('/ttt/decline', { roomId })
      toast('Declined')
      fetchInvites()
    } catch {}
  }

  const fmtTime = (secs) => {
    if (!secs) return '0:00'
    const m = Math.floor(secs/60), s = secs%60
    return `${m}:${s.toString().padStart(2,'0')}`
  }

  return (
    <div style={{ maxWidth:'480px', margin:'0 auto', padding:'20px' }}>
      <div style={{ textAlign:'center', marginBottom:'20px' }}>
        <TicTacToeLogo size={44}/>
        <h3 style={{ margin:'8px 0 4px', fontSize:'18px', fontWeight:900 }}>Online 2-Player</h3>
        <p style={{ color:'var(--text-muted)', fontSize:'13px' }}>
          Send an invite to a friend. They accept within 10 minutes — game starts!
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'18px' }}>
        {[{k:'send',l:'📤 Send Invite'},{k:'inbox',l:`📥 Inbox ${invites.length?`(${invites.length})`:''}`}].map(({k,l})=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            flex:1, padding:'8px', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'13px',
            background:tab===k?'rgba(0,245,255,0.12)':'var(--bg-elevated)',
            color:tab===k?'var(--neon-cyan)':'var(--text-muted)',
            border:`1px solid ${tab===k?'rgba(0,245,255,0.4)':'var(--border-dim)'}`,
          }}>{l}</button>
        ))}
      </div>

      {tab === 'send' && (
        <div>
          <div style={{ marginBottom:'14px' }}>
            <label style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'6px', display:'block' }}>
              Enter opponent's username:
            </label>
            <div style={{ display:'flex', gap:'8px' }}>
              <input value={username} onChange={e=>setUsername(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&sendInvite()}
                placeholder="Username…"
                style={{ flex:1, padding:'10px 14px', borderRadius:'10px', border:'1px solid var(--border-dim)',
                  background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:'14px' }}/>
              <button onClick={sendInvite} disabled={sending||!username.trim()} className="btn btn-primary"
                style={{ padding:'10px 18px', opacity:sending||!username.trim()?0.5:1 }}>
                {sending?'…':'Send →'}
              </button>
            </div>
          </div>

          {/* Pending outgoing rooms */}
          {myRooms.filter(r=>r.challenger.username===user.username&&r.status==='waiting').map(r=>(
            <div key={r.roomId} style={{ padding:'12px 14px', borderRadius:'10px', marginBottom:'8px',
              background:'rgba(255,215,0,0.06)', border:'1px solid rgba(255,215,0,0.2)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'var(--neon-gold)' }}>
                    ⏳ Waiting for {r.opponent.username}…
                  </div>
                  <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>
                    Room: <span style={{ fontFamily:'var(--font-mono)', color:'var(--neon-cyan)' }}>{r.roomId}</span>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'18px', fontWeight:900, color: (countdown[r.roomId]||0)<60?'#ff4466':'#ffd700',
                    fontFamily:'var(--font-mono)' }}>
                    {fmtTime(countdown[r.roomId])}
                  </div>
                  <div style={{ fontSize:'10px', color:'var(--text-muted)' }}>to accept</div>
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop:'18px', padding:'12px', borderRadius:'10px',
            background:'rgba(0,245,255,0.04)', border:'1px solid rgba(0,245,255,0.1)',
            fontSize:'12px', color:'var(--text-muted)', lineHeight:1.7 }}>
            💡 The other player must be logged in and check their <strong style={{color:'var(--neon-cyan)'}}>Inbox tab</strong>.<br/>
            Invite expires in <strong style={{color:'#ffd700'}}>10 minutes</strong>. Win → +150 XP · Draw → +50 XP.
          </div>
        </div>
      )}

      {tab === 'inbox' && (
        <div>
          {loadingInv && invites.length===0 && (
            <div style={{ textAlign:'center', padding:'20px', color:'var(--text-muted)' }}>Checking…</div>
          )}
          {!loadingInv && invites.length===0 && (
            <div style={{ textAlign:'center', padding:'30px', color:'var(--text-muted)' }}>
              <div style={{ fontSize:'36px', marginBottom:'8px' }}>📭</div>
              No pending game invites.<br/>
              <span style={{ fontSize:'12px' }}>Ask a friend to send you one!</span>
            </div>
          )}
          {invites.map(inv => (
            <div key={inv.roomId} style={{ padding:'14px 16px', borderRadius:'12px', marginBottom:'10px',
              background:'rgba(255,0,102,0.06)', border:'1px solid rgba(255,0,102,0.25)',
              display:'flex', alignItems:'center', gap:'12px' }}>
              {/* Avatar */}
              <div style={{ width:'40px', height:'40px', borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg,#ff0066,#bf00ff)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'16px', fontWeight:900, color:'#fff' }}>
                {inv.challenger.username[0].toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:'14px' }}>
                  <span style={{ color:'#ff0066' }}>{inv.challenger.username}</span> challenged you!
                </div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>
                  Expires in <span style={{ color:(countdown[inv.roomId]||0)<60?'#ff4466':'#ffd700', fontWeight:700 }}>
                    {fmtTime(countdown[inv.roomId])}
                  </span>
                </div>
              </div>
              <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                <button onClick={()=>acceptInvite(inv.roomId)} className="btn btn-primary"
                  style={{ padding:'7px 14px', fontSize:'12px', background:'#00ff88', color:'#000', border:'none' }}>
                  ✓ Accept
                </button>
                <button onClick={()=>declineInvite(inv.roomId)}
                  style={{ padding:'7px 10px', fontSize:'12px', borderRadius:'8px', cursor:'pointer',
                    background:'none', border:'1px solid rgba(255,68,102,0.4)', color:'#ff4466' }}>
                  ✗
                </button>
              </div>
            </div>
          ))}
          {invites.length>0&&<div style={{ fontSize:'11px', color:'var(--text-muted)', textAlign:'center', marginTop:'8px' }}>
            Auto-refreshes every 3 seconds
          </div>}
        </div>
      )}
    </div>
  )
}

// ─── Online game board ────────────────────────────────────────────────────────
function OnlineGame({ user, room: initialRoom, onBack }) {
  const [room,    setRoom]    = useState(initialRoom)
  const [moving,  setMoving]  = useState(false)
  const [animCells, setAnimCells] = useState([])
  const pollRef = useRef(null)

  const isChallenger = room.challenger.username === user.username
  const myMark  = isChallenger ? 'X' : 'O'
  const oppName = isChallenger ? room.opponent.username : room.challenger.username

  const fetchRoom = useCallback(async () => {
    try {
      const r = await API.get(`/ttt/room/${room.roomId}`)
      const newRoom = r.data.room
      // detect new move for animation
      if (newRoom.moveCount > room.moveCount) {
        const diff = newRoom.board.findIndex((v,i)=>v&&!room.board[i])
        if (diff>=0) setAnimCells(c=>[...c,diff])
        setRoom(newRoom)
      } else {
        setRoom(newRoom)
      }
    } catch {}
  }, [room.roomId, room.moveCount, room.board])

  useEffect(() => {
    pollRef.current = setInterval(fetchRoom, 1500)
    return () => clearInterval(pollRef.current)
  }, [fetchRoom])

  useEffect(() => {
    if (room.status === 'finished') clearInterval(pollRef.current)
  }, [room.status])

  const makeMove = async (i) => {
    if (room.turn !== myMark || room.board[i] || room.status !== 'playing' || moving) return
    setMoving(true)
    try {
      const r = await API.post('/ttt/move', { roomId: room.roomId, cellIndex: i })
      setAnimCells(c=>[...c,i])
      setRoom(r.data.room)
    } catch(e) {
      toast.error(e.response?.data?.message || 'Move failed')
    }
    setMoving(false)
  }

  const isMyTurn  = room.turn === myMark && room.status === 'playing'
  const isDone    = room.status === 'finished'
  const iWon      = isDone && room.winner === myMark
  const oppWon    = isDone && room.winner && room.winner !== 'draw' && room.winner !== myMark
  const isDraw    = isDone && room.winner === 'draw'

  useEffect(() => {
    if (!isDone) return
    if (iWon)    toast.success('🎉 You won! +150 XP')
    else if(oppWon) toast.error(`${oppName} wins!`)
    else if(isDraw) toast('🤝 Draw! +50 XP')
  }, [isDone])

  return (
    <div style={{ maxWidth:'480px', margin:'0 auto', padding:'20px', textAlign:'center' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
        <button onClick={onBack} style={{ background:'none', border:'1px solid var(--border-dim)',
          borderRadius:'8px', color:'var(--text-muted)', padding:'6px 12px', cursor:'pointer', fontSize:'12px' }}>
          ← Back
        </button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>Online · Room</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'14px', fontWeight:700, color:'var(--neon-cyan)' }}>
            {room.roomId}
          </div>
        </div>
        <div style={{ width:'70px' }}/>
      </div>

      {/* Players */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', justifyContent:'center', marginBottom:'16px' }}>
        <PlayerChip name={user.username} mark="X" color={CLR.X} active={room.turn==='X'&&!isDone} isMe />
        <div style={{ fontSize:'16px', fontWeight:900, color:'var(--text-muted)' }}>VS</div>
        <PlayerChip name={oppName} mark="O" color={CLR.O} active={room.turn==='O'&&!isDone} />
      </div>

      {/* Status */}
      <div style={{ minHeight:'28px', display:'flex', alignItems:'center', justifyContent:'center',
        marginBottom:'14px', fontSize:'14px', fontWeight:700 }}>
        {isDone
          ? <span style={{ color: iWon?CLR.X:oppWon?CLR.O:CLR.draw }}>
              {iWon?'🎉 You win! +150 XP':oppWon?`${oppName} wins!`:'🤝 Draw! +50 XP'}
            </span>
          : isMyTurn
            ? <span style={{ color:CLR.X }}>Your turn — you are <strong>{myMark}</strong></span>
            : <span style={{ color:'var(--text-muted)' }}>Waiting for {oppName}…</span>
        }
      </div>

      {/* Board */}
      <Board board={room.board} winLine={room.winLine||[]} onCell={makeMove}
        myMark={myMark} isMyTurn={isMyTurn} animCells={animCells} disabled={isDone||moving} />

      {isDone && (
        <button onClick={onBack} className="btn btn-primary" style={{ marginTop:'16px' }}>
          Back to Lobby
        </button>
      )}

      <div style={{ marginTop:'12px', fontSize:'11px', color:'var(--text-muted)' }}>
        {isMyTurn?'🟢 Your turn':'⏳ Waiting…'} · Auto-sync every 1.5s
      </div>
    </div>
  )
}

function PlayerChip({ name, mark, color, active, isMe }) {
  return (
    <div style={{ padding:'8px 14px', borderRadius:'10px', minWidth:'120px',
      background:active?`${color}15`:'var(--bg-elevated)',
      border:`2px solid ${active?color:color+'30'}`,
      transition:'all 0.3s' }}>
      <div style={{ fontSize:'20px', fontWeight:900, color, lineHeight:1 }}>{mark==='X'?'✕':'◯'}</div>
      <div style={{ fontSize:'12px', fontWeight:700, marginTop:'3px',
        color:active?color:'var(--text-muted)',
        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'110px' }}>
        {name}{isMe?' (You)':''}
      </div>
    </div>
  )
}

// ─── Shared board component ───────────────────────────────────────────────────
function Board({ board, winLine, onCell, myMark, isMyTurn, animCells, disabled, turnForLocal, localTurn }) {
  const normalizedBoard = board.map(v => v === '' ? null : v)
  const activeTurn = localTurn || myMark
  return (
    <div style={{ display:'inline-grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px',
      padding:'14px', borderRadius:'18px', background:'var(--bg-elevated)',
      border:'1px solid var(--border-dim)' }}>
      {normalizedBoard.map((cell,i) => {
        const isWin = winLine.includes(i)
        const color = cell==='X'?CLR.X:CLR.O
        const canClick = !disabled && !cell && (isMyTurn !== undefined ? isMyTurn : turnForLocal===cell||!cell)
        return (
          <button key={i} onClick={()=>onCell(i)} style={{
            width:'100px', height:'100px', borderRadius:'12px',
            background: isWin?`${color}20`:cell?`${color}08`:'var(--bg-card)',
            border:`2px solid ${isWin?color:cell?color+'50':'var(--border-dim)'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'44px', fontWeight:900, color,
            boxShadow: isWin?`0 0 20px ${color}60`:'none',
            cursor: canClick?'pointer':'default',
            transition:'all 0.15s',
          }}
          onMouseEnter={e=>{ if(canClick){ e.currentTarget.style.borderColor=color; e.currentTarget.style.background=`${color}12` }}}
          onMouseLeave={e=>{ if(canClick){ e.currentTarget.style.borderColor='var(--border-dim)'; e.currentTarget.style.background='var(--bg-card)' }}}>
            {cell && (
              <span style={{ animation:animCells?.includes(i)?'tttPop 0.28s ease-out':'none', display:'inline-block' }}>
                {cell==='X'?'✕':'◯'}
              </span>
            )}
          </button>
        )
      })}
      <style>{`@keyframes tttPop{0%{transform:scale(0.2);opacity:0}65%{transform:scale(1.25)}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}

// ─── Local vs AI game ─────────────────────────────────────────────────────────
function AIGame({ user, difficulty, onBack }) {
  const { submitScore } = useAuth()
  // Keep submitScore ref stable so handleResult useCallback never captures stale version
  const submitScoreRef = useRef(submitScore)
  useEffect(() => { submitScoreRef.current = submitScore }, [submitScore])
  const [board,    setBoard]    = useState(Array(9).fill(null))
  const [turn,     setTurn]     = useState('X')
  const [result,   setResult]   = useState(null)
  const [thinking, setThinking] = useState(false)
  const [scores,   setScores]   = useState({X:0,O:0,draw:0})
  const [winLine,  setWinLine]  = useState([])
  const [lastMove, setLastMove] = useState(null)
  const [animCells,setAnimCells]=useState([])

  const handleResult = useCallback((res) => {
    setScores(s=>({...s,[res.winner]:(s[res.winner]||0)+1}))
    if(res.winner==='X'){toast.success('🎉 You won!');submitScoreRef.current('tictactoe',100,difficulty,'win').catch(e=>console.error('Score submit:',e))}
    else if(res.winner==='O'){toast.error('🤖 AI wins!');submitScoreRef.current('tictactoe',10,difficulty,'loss').catch(e=>console.error('Score submit:',e))}
    else{toast('🤝 Draw!');submitScoreRef.current('tictactoe',40,difficulty,'draw').catch(e=>console.error('Score submit:',e))}
  },[difficulty])

  useEffect(() => {
    if(turn!=='O'||result)return
    setThinking(true)
    const t=setTimeout(()=>{
      setBoard(prev=>{
        const next=[...prev]
        const move=getBestMove([...next],difficulty)
        if(move===-1){setThinking(false);return prev}
        next[move]='O'; setLastMove(move); setAnimCells(c=>[...c,move])
        const res=checkWinner(next.map(v=>v||''))
        if(res){setWinLine(res.line);setResult(res);handleResult(res)}else setTurn('X')
        setThinking(false); return next
      })
    }, difficulty==='hard'?600:400)
    return()=>clearTimeout(t)
  },[turn,result,difficulty,handleResult])

  const handleClick=(i)=>{
    if(board[i]||result||thinking||turn!=='X')return
    const next=[...board]; next[i]='X'; setLastMove(i); setAnimCells(c=>[...c,i])
    const res=checkWinner(next.map(v=>v||''))
    setBoard(next)
    if(res){setWinLine(res.line);setResult(res);handleResult(res)}else setTurn('O')
  }

  const reset=()=>{setBoard(Array(9).fill(null));setTurn('X');setResult(null);setWinLine([]);setLastMove(null);setAnimCells([])}

  const xn=user?.username||'You', on='AI'
  return (
    <div style={{maxWidth:'480px',margin:'0 auto',padding:'20px',textAlign:'center'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
        <button onClick={onBack} style={{background:'none',border:'1px solid var(--border-dim)',borderRadius:'8px',color:'var(--text-muted)',padding:'6px 12px',cursor:'pointer',fontSize:'12px'}}>← Menu</button>
        <div style={{fontSize:'13px',fontWeight:700,color:'var(--text-secondary)'}}>vs AI · {DIFF_INFO[difficulty].label}</div>
        <button onClick={reset} style={{background:'none',border:'1px solid var(--border-dim)',borderRadius:'8px',color:'var(--text-muted)',padding:'6px 12px',cursor:'pointer',fontSize:'12px'}}>↺ New</button>
      </div>
      {/* Scores */}
      <div style={{display:'flex',gap:'8px',justifyContent:'center',marginBottom:'14px'}}>
        {[{sym:'X',l:xn,c:CLR.X},{sym:'draw',l:'Draw',c:CLR.draw},{sym:'O',l:on,c:CLR.O}].map(({sym,l,c})=>(
          <div key={sym} style={{flex:1,padding:'8px 4px',borderRadius:'10px',
            background:turn===sym&&!result?`${c}15`:'var(--bg-card)',
            border:`1px solid ${turn===sym&&!result?c:c+'30'}`,transition:'all 0.3s'}}>
            <div style={{fontSize:'20px',fontWeight:900,color:c}}>{scores[sym]||0}</div>
            <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l}</div>
          </div>
        ))}
      </div>
      {/* Status */}
      <div style={{minHeight:'26px',marginBottom:'12px',fontSize:'13px',fontWeight:700}}>
        {result?<span style={{color:result.winner==='draw'?CLR.draw:result.winner==='X'?CLR.X:CLR.O}}>
          {result.winner==='draw'?'🤝 Draw!':result.winner==='X'?`🎉 ${xn} wins!`:'🤖 AI wins!'}
        </span>:thinking?<span style={{color:'var(--text-muted)'}}>🤖 Thinking…</span>
        :<span style={{color:turn==='X'?CLR.X:CLR.O}}>
          {turn==='X'?`${xn}'s turn`:`${on}'s turn`} — <strong style={{color:turn==='X'?CLR.X:CLR.O}}>{turn}</strong>
        </span>}
      </div>
      <Board board={board.map(v=>v||'')} winLine={winLine} onCell={handleClick}
        myMark="X" isMyTurn={turn==='X'&&!result&&!thinking} animCells={animCells} disabled={!!result||thinking} />
      {result&&(
        <div style={{display:'flex',gap:'10px',justifyContent:'center',marginTop:'16px'}}>
          <button className="btn btn-primary" onClick={reset}>Play Again</button>
        </div>
      )}
    </div>
  )
}

// ─── Local PvP ────────────────────────────────────────────────────────────────
function PvPGame({ onBack }) {
  const [board,    setBoard]    = useState(Array(9).fill(null))
  const [turn,     setTurn]     = useState('X')
  const [result,   setResult]   = useState(null)
  const [scores,   setScores]   = useState({X:0,O:0,draw:0})
  const [winLine,  setWinLine]  = useState([])
  const [animCells,setAnimCells]=useState([])
  const [p1,setP1]=useState('Player 1')
  const [p2,setP2]=useState('Player 2')

  const handleClick=(i)=>{
    if(board[i]||result)return
    const next=[...board]; next[i]=turn; setAnimCells(c=>[...c,i])
    const res=checkWinner(next.map(v=>v||''))
    setBoard(next)
    if(res){
      setWinLine(res.line);setResult(res)
      setScores(s=>({...s,[res.winner]:(s[res.winner]||0)+1}))
      if(res.winner==='draw') toast('🤝 Draw!')
      else toast.success(`🎉 ${res.winner==='X'?p1:p2} wins!`)
    } else setTurn(t=>t==='X'?'O':'X')
  }
  const reset=()=>{setBoard(Array(9).fill(null));setTurn('X');setResult(null);setWinLine([]);setAnimCells([])}

  return (
    <div style={{maxWidth:'480px',margin:'0 auto',padding:'20px',textAlign:'center'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
        <button onClick={onBack} style={{background:'none',border:'1px solid var(--border-dim)',borderRadius:'8px',color:'var(--text-muted)',padding:'6px 12px',cursor:'pointer',fontSize:'12px'}}>← Menu</button>
        <div style={{fontSize:'13px',fontWeight:700,color:'var(--text-secondary)'}}>Local 2-Player</div>
        <button onClick={reset} style={{background:'none',border:'1px solid var(--border-dim)',borderRadius:'8px',color:'var(--text-muted)',padding:'6px 12px',cursor:'pointer',fontSize:'12px'}}>↺ New</button>
      </div>
      {/* Name inputs */}
      <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
        <input value={p1} onChange={e=>setP1(e.target.value)} maxLength={12}
          style={{flex:1,padding:'6px 10px',borderRadius:'8px',background:'var(--bg-elevated)',border:`1px solid ${CLR.X}40`,color:CLR.X,fontSize:'12px',fontWeight:700,textAlign:'center'}}/>
        <input value={p2} onChange={e=>setP2(e.target.value)} maxLength={12}
          style={{flex:1,padding:'6px 10px',borderRadius:'8px',background:'var(--bg-elevated)',border:`1px solid ${CLR.O}40`,color:CLR.O,fontSize:'12px',fontWeight:700,textAlign:'center'}}/>
      </div>
      <div style={{display:'flex',gap:'8px',justifyContent:'center',marginBottom:'14px'}}>
        {[{sym:'X',l:p1,c:CLR.X},{sym:'draw',l:'Draw',c:CLR.draw},{sym:'O',l:p2,c:CLR.O}].map(({sym,l,c})=>(
          <div key={sym} style={{flex:1,padding:'8px 4px',borderRadius:'10px',
            background:turn===sym&&!result?`${c}15`:'var(--bg-card)',
            border:`1px solid ${turn===sym&&!result?c:c+'30'}`,transition:'all 0.3s'}}>
            <div style={{fontSize:'20px',fontWeight:900,color:c}}>{scores[sym]||0}</div>
            <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{minHeight:'26px',marginBottom:'12px',fontSize:'13px',fontWeight:700}}>
        {result?<span style={{color:result.winner==='draw'?CLR.draw:result.winner==='X'?CLR.X:CLR.O}}>
          {result.winner==='draw'?'🤝 Draw!':result.winner==='X'?`🎉 ${p1} wins!`:`🎉 ${p2} wins!`}
        </span>:<span style={{color:turn==='X'?CLR.X:CLR.O}}>{turn==='X'?p1:p2}'s turn</span>}
      </div>
      <Board board={board.map(v=>v||'')} winLine={winLine} onCell={handleClick}
        myMark={turn} isMyTurn={!result} animCells={animCells} disabled={!!result} />
      {result&&<button className="btn btn-primary" onClick={reset} style={{marginTop:'16px'}}>Play Again</button>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TicTacToeGame() {
  const { user } = useAuth()
  const [mode,       setMode]       = useState(null)  // null|'ai'|'pvp'|'online'
  const [difficulty, setDifficulty] = useState('medium')
  const [onlineRoom, setOnlineRoom] = useState(null)

  // Menu
  if (!mode) return (
    <div style={{maxWidth:'520px',margin:'0 auto',padding:'28px 20px',textAlign:'center'}}>
      {/* Colourful logo */}
      <div style={{display:'flex',justifyContent:'center',marginBottom:'12px'}}>
        <TicTacToeLogo size={68}/>
      </div>
      <h2 style={{fontSize:'26px',fontWeight:900,fontFamily:'var(--font-display)',marginBottom:'4px',letterSpacing:'-0.02em'}}>
        Tic Tac Toe
      </h2>
      <p style={{color:'var(--text-secondary)',fontSize:'13px',marginBottom:'28px'}}>
        3 modes · AI · Local · Online real-time
      </p>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'24px'}}>
        {/* vs AI */}
        <button onClick={()=>setMode('ai')} style={{
          padding:'20px 10px',borderRadius:'14px',cursor:'pointer',textAlign:'center',
          background:'rgba(0,245,255,0.08)',border:'2px solid rgba(0,245,255,0.3)',transition:'all 0.2s',
        }}
        onMouseEnter={e=>e.currentTarget.style.borderColor='#00f5ff'}
        onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(0,245,255,0.3)'}>
          <div style={{fontSize:'32px',marginBottom:'6px'}}>🤖</div>
          <div style={{fontWeight:800,fontSize:'14px',color:'var(--neon-cyan)',marginBottom:'3px'}}>vs AI</div>
          <div style={{fontSize:'11px',color:'var(--text-muted)'}}>Minimax engine</div>
        </button>
        {/* Local 2P */}
        <button onClick={()=>setMode('pvp')} style={{
          padding:'20px 10px',borderRadius:'14px',cursor:'pointer',textAlign:'center',
          background:'rgba(255,0,102,0.08)',border:'2px solid rgba(255,0,102,0.3)',transition:'all 0.2s',
        }}
        onMouseEnter={e=>e.currentTarget.style.borderColor='#ff0066'}
        onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,0,102,0.3)'}>
          <div style={{fontSize:'32px',marginBottom:'6px'}}>🎮</div>
          <div style={{fontWeight:800,fontSize:'14px',color:'#ff0066',marginBottom:'3px'}}>Local 2P</div>
          <div style={{fontSize:'11px',color:'var(--text-muted)'}}>Same device</div>
        </button>
        {/* Online */}
        <button onClick={()=>user?setMode('online'):toast.error('Login to play online!')} style={{
          padding:'20px 10px',borderRadius:'14px',cursor:'pointer',textAlign:'center',
          background:'rgba(255,215,0,0.08)',border:'2px solid rgba(255,215,0,0.3)',transition:'all 0.2s',
          position:'relative',
        }}
        onMouseEnter={e=>e.currentTarget.style.borderColor='#ffd700'}
        onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,215,0,0.3)'}>
          <div style={{position:'absolute',top:'-8px',left:'50%',transform:'translateX(-50%)',
            background:'linear-gradient(135deg,#ffd700,#ff6b00)',color:'#000',
            fontSize:'9px',fontWeight:800,padding:'2px 8px',borderRadius:'99px',letterSpacing:'0.08em',whiteSpace:'nowrap'}}>
            🌐 ONLINE
          </div>
          <div style={{fontSize:'32px',marginBottom:'6px',marginTop:'6px'}}>🌍</div>
          <div style={{fontWeight:800,fontSize:'14px',color:'#ffd700',marginBottom:'3px'}}>Online PvP</div>
          <div style={{fontSize:'11px',color:'var(--text-muted)'}}>2 accounts</div>
        </button>
      </div>

      {/* Difficulty for AI mode */}
      <div style={{marginBottom:'6px',fontSize:'11px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.1em'}}>AI Difficulty</div>
      <div style={{display:'flex',gap:'8px',justifyContent:'center',marginBottom:'20px'}}>
        {Object.entries(DIFF_INFO).map(([k,d])=>(
          <button key={k} onClick={()=>setDifficulty(k)} style={{
            padding:'7px 16px',borderRadius:'99px',cursor:'pointer',fontWeight:700,fontSize:'13px',
            background:difficulty===k?d.color+'22':'var(--bg-elevated)',
            color:difficulty===k?d.color:'var(--text-muted)',
            border:`1px solid ${difficulty===k?d.color:d.color+'20'}`,transition:'all 0.2s',
          }}>{d.label}</button>
        ))}
      </div>
      <div style={{fontSize:'11px',color:'var(--text-muted)'}}>
        🏆 Win vs AI → +100 XP &nbsp;·&nbsp; Online win → +150 XP &nbsp;·&nbsp; Draw → +50 XP
      </div>
    </div>
  )

  if (mode==='ai')  return <AIGame user={user} difficulty={difficulty} onBack={()=>setMode(null)}/>
  if (mode==='pvp') return <PvPGame onBack={()=>setMode(null)}/>
  if (mode==='online') {
    if (onlineRoom) return <OnlineGame user={user} room={onlineRoom} onBack={()=>{setOnlineRoom(null);setMode('online')}}/>
    return <OnlineLobby user={user} onRoomJoined={r=>{setOnlineRoom(r)}}/>
  }

  // back button from online lobby
  return (
    <div style={{textAlign:'center',padding:'40px'}}>
      <button onClick={()=>setMode(null)} className="btn btn-ghost">← Back to Mode Select</button>
    </div>
  )
}