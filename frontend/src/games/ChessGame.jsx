import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

// ─── Chess engine ─────────────────────────────────────────────────────────────
const PIECES = {
  wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',
  bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟',
}
const VALS = { K:20000, Q:900, R:500, B:330, N:320, P:100 }

// Piece-square tables for positional evaluation
const PST = {
  P: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
  N: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  B: [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  R: [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
  Q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  K: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20],
}

function initBoard() {
  const b = Array(64).fill(null)
  const back = ['R','N','B','Q','K','B','N','R']
  back.forEach((p,i)=>{ b[i]=`b${p}`; b[56+i]=`w${p}` })
  for(let i=0;i<8;i++){ b[8+i]='bP'; b[48+i]='wP' }
  return b
}

const col  = i => i%8
const row  = i => Math.floor(i/8)
const sq   = (r,c) => r*8+c
const opp  = color => color==='w'?'b':'w'

function pColor(p) { return p?p[0]:null }
function pType(p)  { return p?p[1]:null }

function inBounds(r,c) { return r>=0&&r<8&&c>=0&&c<8 }

function getRawMoves(board, idx) {
  const piece = board[idx]; if (!piece) return []
  const color = pColor(piece), type = pType(piece)
  const r = row(idx), c = col(idx), moves = []
  const push = (nr,nc) => { if(inBounds(nr,nc)){const t=board[sq(nr,nc)]; if(!t||pColor(t)!==color) moves.push(sq(nr,nc))} }
  const slide = (dr,dc) => { let nr=r+dr,nc=c+dc; while(inBounds(nr,nc)){const t=board[sq(nr,nc)]; if(t){if(pColor(t)!==color)moves.push(sq(nr,nc));break} moves.push(sq(nr,nc));nr+=dr;nc+=dc } }

  if (type==='P') {
    const dir = color==='w'?-1:1, startRow = color==='w'?6:1
    if (inBounds(r+dir,c)&&!board[sq(r+dir,c)]) { moves.push(sq(r+dir,c)); if(r===startRow&&!board[sq(r+2*dir,c)]) moves.push(sq(r+2*dir,c)) }
    [-1,1].forEach(dc=>{ if(inBounds(r+dir,c+dc)){const t=board[sq(r+dir,c+dc)]; if(t&&pColor(t)!==color) moves.push(sq(r+dir,c+dc))} })
  }
  if (type==='N') [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>push(r+dr,c+dc))
  if (type==='B'||type==='Q') [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc))
  if (type==='R'||type==='Q') [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc))
  if (type==='K') [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>push(r+dr,c+dc))
  return moves
}

function isInCheck(board, color) {
  const kingIdx = board.findIndex(p=>p===`${color}K`)
  if (kingIdx<0) return true
  for(let i=0;i<64;i++) if(pColor(board[i])===opp(color)&&getRawMoves(board,i).includes(kingIdx)) return true
  return false
}

function getLegalMoves(board, idx) {
  return getRawMoves(board, idx).filter(to => {
    const next=[...board]; next[to]=next[idx]; next[idx]=null
    return !isInCheck(next, pColor(board[idx]))
  })
}

function getAllLegalMoves(board, color) {
  const moves=[]
  for(let i=0;i<64;i++) if(pColor(board[i])===color) getLegalMoves(board,i).forEach(to=>moves.push([i,to]))
  return moves
}

function evalBoard(board) {
  let score = 0
  for(let i=0;i<64;i++){
    const p=board[i]; if(!p) continue
    const color=pColor(p), type=pType(p)
    const pstIdx = color==='w'?i:63-i
    const val = (VALS[type]||0) + (PST[type]?.[pstIdx]||0)
    score += color==='w' ? val : -val
  }
  return score
}

function applyMove(board, from, to) {
  const next=[...board]; next[to]=next[from]; next[from]=null
  // Pawn promotion
  if(pType(next[to])==='P'&&(row(to)===0||row(to)===7)) next[to]=`${pColor(next[to])}Q`
  return next
}

function minimax(board, depth, alpha, beta, isMax) {
  const color = isMax?'w':'b'
  const moves = getAllLegalMoves(board, color)
  if (!moves.length) return isInCheck(board,color)?(isMax?-15000:15000):0
  if (depth===0) return evalBoard(board)
  if (isMax) {
    let best=-Infinity
    for(const [f,t] of moves){ best=Math.max(best,minimax(applyMove(board,f,t),depth-1,alpha,beta,false)); alpha=Math.max(alpha,best); if(beta<=alpha)break }
    return best
  } else {
    let best=Infinity
    for(const [f,t] of moves){ best=Math.min(best,minimax(applyMove(board,f,t),depth-1,alpha,beta,true)); beta=Math.min(beta,best); if(beta<=alpha)break }
    return best
  }
}

function getAIMove(board, difficulty) {
  const depth = difficulty==='easy'?1:difficulty==='medium'?2:3
  const moves = getAllLegalMoves(board,'b')
  if (!moves.length) return null
  // Easy: mostly random
  if (difficulty==='easy' && Math.random()<0.6) return moves[Math.floor(Math.random()*moves.length)]
  let best=Infinity, bestMoves=[]
  for(const [f,t] of moves){
    const score=minimax(applyMove(board,f,t),depth-1,-Infinity,Infinity,true)
    if(score<best){best=score;bestMoves=[[f,t]]}
    else if(score===best) bestMoves.push([f,t])
  }
  return bestMoves[Math.floor(Math.random()*bestMoves.length)]
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFF_INFO = {
  easy:   { label:'Easy',   color:'#00ff88', desc:'Random-ish, forgiving' },
  medium: { label:'Medium', color:'#ffd700', desc:'Minimax depth 2' },
  hard:   { label:'Hard',   color:'#ff4466', desc:'Minimax depth 3 + PST' },
}

export default function ChessGame() {
  const { user, submitScore } = useAuth()
  const [board,      setBoard]      = useState(initBoard())
  const [selected,   setSelected]   = useState(null)
  const [legalMoves, setLegalMoves] = useState([])
  const [turn,       setTurn]       = useState('w')
  const [status,     setStatus]     = useState('playing')
  const [diff,       setDiff]       = useState('medium')
  const [thinking,   setThinking]   = useState(false)
  const [history,    setHistory]    = useState([])
  const [capturedW,  setCapturedW]  = useState([])
  const [capturedB,  setCapturedB]  = useState([])
  const [phase,      setPhase]      = useState('menu')
  const [lastMove,   setLastMove]   = useState(null)
  const [check,      setCheck]      = useState(false)

  // Refs to avoid stale closures in async effects
  const submitScoreRef = useRef(submitScore)
  useEffect(() => { submitScoreRef.current = submitScore }, [submitScore])
  const historyRef = useRef(history)
  useEffect(() => { historyRef.current = history }, [history])

  const checkStatus = useCallback((b, color) => {
    const moves = getAllLegalMoves(b, color)
    if (!moves.length) {
      if (isInCheck(b,color)) return 'checkmate'
      return 'stalemate'
    }
    if (isInCheck(b,color)) return 'check'
    return 'playing'
  },[])

  // AI move
  useEffect(() => {
    if (phase!=='game'||turn!=='b'||status!=='playing'&&status!=='check') return
    setThinking(true)
    const tid = setTimeout(() => {
      const move = getAIMove(board, diff)
      if (!move) { setStatus('stalemate'); setThinking(false); return }
      const [from,to] = move
      const captured = board[to]
      const next = applyMove(board,from,to)
      if (captured) setCapturedW(c=>[...c, captured])
      setBoard(next); setLastMove([from,to])
      setHistory(h=>[...h,{from,to,piece:board[from]}])
      const st = checkStatus(next,'w')
      setStatus(st); setCheck(st==='check')
      if (st==='checkmate') { toast.error('Checkmate! AI wins 🤖'); submitScoreRef.current('chess',0,diff,'loss',{moves:historyRef.current.length}).catch(e=>console.error('Score submit:',e)) }
      else if (st==='stalemate') { toast('🤝 Stalemate!') }
      setTurn('w'); setThinking(false)
    }, diff==='hard'?800:500)
    return ()=>clearTimeout(tid)
  },[turn, phase, status, diff])

  const handleSquare = (idx) => {
    if (phase!=='game'||turn!=='w'||status==='checkmate'||status==='stalemate'||thinking) return
    const piece = board[idx]
    if (selected === null) {
      if (!piece || pColor(piece)!=='w') return
      setSelected(idx); setLegalMoves(getLegalMoves(board,idx))
    } else {
      if (legalMoves.includes(idx)) {
        const captured = board[idx]
        const next = applyMove(board,selected,idx)
        if (captured) setCapturedB(c=>[...c,captured])
        setBoard(next); setLastMove([selected,idx])
        setHistory(h=>[...h,{from:selected,to:idx,piece:board[selected]}])
        const st = checkStatus(next,'b')
        setStatus(st); setCheck(false)
        if (st==='checkmate') { toast.success('Checkmate! You win! 🎉'); submitScoreRef.current('chess',500,diff,'win',{moves:historyRef.current.length+1}).catch(e=>console.error('Score submit:',e)) }
        else if (st==='stalemate') toast('🤝 Stalemate!')
        setTurn('b')
      }
      setSelected(null); setLegalMoves([])
    }
  }

  const restart = () => {
    setBoard(initBoard()); setSelected(null); setLegalMoves([]); setTurn('w')
    setStatus('playing'); setThinking(false); setHistory([]); setCapturedW([]); setCapturedB([])
    setLastMove(null); setCheck(false)
  }

  // ── Menu ──────────────────────────────────────────────────────────────────
  if (phase==='menu') return (
    <div style={{maxWidth:'420px',margin:'0 auto',padding:'28px 20px',textAlign:'center'}}>
      <div style={{fontSize:'52px',marginBottom:'8px'}}>♟️</div>
      <h2 style={{fontSize:'26px',fontWeight:900,fontFamily:'var(--font-display)',marginBottom:'4px'}}>Chess vs AI</h2>
      <p style={{color:'var(--text-secondary)',fontSize:'13px',marginBottom:'28px'}}>
        You play White · Minimax AI plays Black
      </p>
      <div style={{marginBottom:'8px',fontSize:'11px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.1em'}}>Difficulty</div>
      <div style={{display:'flex',gap:'8px',justifyContent:'center',marginBottom:'8px'}}>
        {Object.entries(DIFF_INFO).map(([k,v])=>(
          <button key={k} onClick={()=>setDiff(k)} style={{
            padding:'8px 18px',borderRadius:'99px',cursor:'pointer',fontWeight:700,fontSize:'13px',
            background:diff===k?v.color+'22':'var(--bg-elevated)',
            color:diff===k?v.color:'var(--text-muted)',
            border:`1px solid ${diff===k?v.color:v.color+'20'}`,transition:'all 0.2s',
          }}>{v.label}</button>
        ))}
      </div>
      <div style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'24px'}}>{DIFF_INFO[diff].desc}</div>
      <button className="btn btn-primary" style={{minWidth:'200px'}} onClick={()=>{restart();setPhase('game')}}>
        Start Game →
      </button>
      <div style={{marginTop:'12px',fontSize:'11px',color:'var(--text-muted)'}}>
        Win → +500 XP · Draw → +50 XP
      </div>
    </div>
  )

  // ── Board ─────────────────────────────────────────────────────────────────
  const files = ['a','b','c','d','e','f','g','h']
  const isDone = status==='checkmate'||status==='stalemate'

  return (
    <div style={{maxWidth:'600px',margin:'0 auto',padding:'16px 20px'}}>
      {/* Top info */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
        <button onClick={()=>{setPhase('menu');restart()}} style={{background:'none',border:'1px solid var(--border-dim)',borderRadius:'8px',color:'var(--text-muted)',padding:'5px 10px',cursor:'pointer',fontSize:'12px'}}>← Menu</button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'13px',fontWeight:700,color:thinking?'var(--neon-purple)':turn==='w'?'#f0f0f0':'#888'}}>
            {isDone?(status==='checkmate'?'♚ Checkmate!':'🤝 Stalemate')
              :thinking?'🤖 AI thinking…'
              :check?`${turn==='w'?'⚠️ You are':'⚠️ AI is'} in check!`
              :turn==='w'?'Your turn (White)':'AI thinking…'}
          </div>
          <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>{DIFF_INFO[diff].label} · {history.length} moves</div>
        </div>
        <button onClick={restart} style={{background:'none',border:'1px solid var(--border-dim)',borderRadius:'8px',color:'var(--text-muted)',padding:'5px 10px',cursor:'pointer',fontSize:'12px'}}>New ↺</button>
      </div>

      {/* Black captures (shown above board) */}
      <div style={{minHeight:'24px',marginBottom:'4px',fontSize:'14px',textAlign:'center',opacity:0.7}}>
        {capturedB.map((p,i)=><span key={i}>{PIECES[p]||p}</span>)}
      </div>

      {/* Board */}
      <div style={{display:'inline-block',border:'2px solid var(--border-dim)',borderRadius:'8px',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
        {Array.from({length:8},(_,r)=>(
          <div key={r} style={{display:'flex'}}>
            {/* Rank label */}
            <div style={{width:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'var(--text-muted)',background:'var(--bg-elevated)'}}>
              {8-r}
            </div>
            {Array.from({length:8},(_,c)=>{
              const idx=sq(r,c)
              const piece=board[idx]
              const isLight=(r+c)%2===0
              const isSel=selected===idx
              const isLegal=legalMoves.includes(idx)
              const isLastFrom=lastMove&&lastMove[0]===idx
              const isLastTo=lastMove&&lastMove[1]===idx
              const isKingCheck=check&&piece&&pType(piece)==='K'&&pColor(piece)===turn

              let bg = isLight?'#f0d9b5':'#b58863'
              if (isSel) bg='#7fc97f'
              else if (isLastFrom||isLastTo) bg=isLight?'#cdd16f':'#aaa23a'
              else if (isKingCheck) bg='#ff6b6b'

              return (
                <div key={c} onClick={()=>handleSquare(idx)} style={{
                  width:'60px',height:'60px',background:bg,cursor:piece&&pColor(piece)==='w'&&!isDone&&!thinking?'pointer':'default',
                  display:'flex',alignItems:'center',justifyContent:'center',position:'relative',
                  transition:'background 0.15s',
                }}>
                  {isLegal && (
                    <div style={{position:'absolute',borderRadius:'50%',
                      width:piece?'90%':'36%',height:piece?'90%':'36%',
                      background:piece?'transparent':'rgba(0,0,0,0.18)',
                      border:piece?'4px solid rgba(0,0,0,0.25)':'none',
                    }}/>
                  )}
                  {piece && (
                    <span style={{fontSize:'36px',lineHeight:1,
                      filter:pColor(piece)==='w'?'drop-shadow(0 1px 2px rgba(0,0,0,0.5))':'drop-shadow(0 1px 2px rgba(255,255,255,0.3))',
                      zIndex:1,
                    }}>
                      {PIECES[piece]}
                    </span>
                  )}
                  {r===7&&<span style={{position:'absolute',bottom:'2px',right:'3px',fontSize:'9px',opacity:0.6,color:isLight?'#b58863':'#f0d9b5'}}>{files[c]}</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* White captures */}
      <div style={{minHeight:'24px',marginTop:'4px',fontSize:'14px',textAlign:'center',opacity:0.7}}>
        {capturedW.map((p,i)=><span key={i}>{PIECES[p]||p}</span>)}
      </div>

      {isDone && (
        <div style={{textAlign:'center',marginTop:'14px',display:'flex',gap:'10px',justifyContent:'center'}}>
          <button className="btn btn-primary" onClick={restart}>Play Again</button>
          <button className="btn btn-ghost" onClick={()=>{setPhase('menu');restart()}}>Change Difficulty</button>
        </div>
      )}
      <div style={{textAlign:'center',marginTop:'10px',fontSize:'11px',color:'var(--text-muted)'}}>
        🧠 AI uses Minimax + Alpha-Beta pruning + Piece-Square Tables
      </div>
    </div>
  )
}