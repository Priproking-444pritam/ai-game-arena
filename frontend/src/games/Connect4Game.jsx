import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Sounds } from '../utils/sounds'

const ROWS = 6, COLS = 7, PLAYER = 1, AI = 2

function minimax(board, depth, alpha, beta, maximizing) {
  const valid = []
  for (let c = 0; c < COLS; c++) if (board[0][c] === 0) valid.push(c)

  const checkWin = (piece) => {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS-3; c++)
      if ([0,1,2,3].every(i => board[r][c+i] === piece)) return true
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS-3; r++)
      if ([0,1,2,3].every(i => board[r+i][c] === piece)) return true
    for (let r = 0; r < ROWS-3; r++) for (let c = 0; c < COLS-3; c++)
      if ([0,1,2,3].every(i => board[r+i][c+i] === piece)) return true
    for (let r = 3; r < ROWS; r++) for (let c = 0; c < COLS-3; c++)
      if ([0,1,2,3].every(i => board[r-i][c+i] === piece)) return true
    return false
  }

  if (checkWin(AI)) return [null, 100000 + depth]
  if (checkWin(PLAYER)) return [null, -100000 - depth]
  if (depth === 0 || valid.length === 0) return [null, 0]

  if (maximizing) {
    let value = -Infinity, bestCol = valid[Math.floor(Math.random()*valid.length)]
    for (const col of valid) {
      let row = ROWS-1
      while (row >= 0 && board[row][col] !== 0) row--
      if (row < 0) continue
      const nb = board.map(r => [...r])
      nb[row][col] = AI
      const [, score] = minimax(nb, depth-1, alpha, beta, false)
      if (score > value) { value = score; bestCol = col }
      alpha = Math.max(alpha, value)
      if (alpha >= beta) break
    }
    return [bestCol, value]
  } else {
    let value = Infinity, bestCol = valid[Math.floor(Math.random()*valid.length)]
    for (const col of valid) {
      let row = ROWS-1
      while (row >= 0 && board[row][col] !== 0) row--
      if (row < 0) continue
      const nb = board.map(r => [...r])
      nb[row][col] = PLAYER
      const [, score] = minimax(nb, depth-1, alpha, beta, true)
      if (score < value) { value = score; bestCol = col }
      beta = Math.min(beta, value)
      if (alpha >= beta) break
    }
    return [bestCol, value]
  }
}

function checkWin(board, piece) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS-3; c++)
    if ([0,1,2,3].every(i => board[r][c+i] === piece)) return true
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS-3; r++)
    if ([0,1,2,3].every(i => board[r+i][c] === piece)) return true
  for (let r = 0; r < ROWS-3; r++) for (let c = 0; c < COLS-3; c++)
    if ([0,1,2,3].every(i => board[r+i][c+i] === piece)) return true
  for (let r = 3; r < ROWS; r++) for (let c = 0; c < COLS-3; c++)
    if ([0,1,2,3].every(i => board[r-i][c+i] === piece)) return true
  return false
}

export default function Connect4Game() {
  const { submitScore } = useAuth()
  const [phase, setPhase] = useState('select')
  const [board, setBoard] = useState(Array.from({length:ROWS},()=>Array(COLS).fill(0)))
  const [gameOver, setGameOver] = useState(false)
  const [status, setStatus] = useState('Your turn!')
  const [difficulty, setDifficulty] = useState(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [hoverCol, setHoverCol] = useState(null)

  const DEPTHS = { easy: 2, medium: 4, hard: 6 }
  const DIFF_COLORS = { easy: '#00ff88', medium: '#ffd700', hard: '#ff6b00' }

  const startGame = (diff) => {
    setDifficulty(diff)
    setBoard(Array.from({length:ROWS},()=>Array(COLS).fill(0)))
    setGameOver(false)
    setStatus('Your turn — click a column!')
    setPhase('playing')
  }

  const dropPiece = useCallback((col, piece, currentBoard) => {
    for (let r = ROWS-1; r >= 0; r--) {
      if (currentBoard[r][col] === 0) {
        const nb = currentBoard.map(row => [...row])
        nb[r][col] = piece
        return { board: nb, row: r }
      }
    }
    return null
  }, [])

  const handleClick = (col) => {
    if (gameOver || aiThinking || phase !== 'playing') return
    if (board[0][col] !== 0) { toast.error('Column full!'); return }

    const result = dropPiece(col, PLAYER, board)
    if (!result) return

    setBoard(result.board)
    Sounds.drop()

    if (checkWin(result.board, PLAYER)) {
      setGameOver(true)
      setStatus('🎉 You Win!')
      Sounds.win()
      toast.success('You beat the AI! 🏆')
      submitScore('connect4', 100, difficulty, 'win').catch(() => {})
      return
    }

    const validCols = result.board[0].filter(c => c === 0)
    if (validCols.length === 0) {
      setGameOver(true)
      setStatus("🤝 It's a draw!")
      return
    }

    setAiThinking(true)
    setStatus('🤖 AI is thinking...')

    setTimeout(() => {
      const [aiCol] = minimax(result.board, DEPTHS[difficulty], -Infinity, Infinity, true)
      if (aiCol === null || result.board[0][aiCol] !== 0) {
        setAiThinking(false)
        setStatus('Your turn!')
        return
      }

      const aiResult = dropPiece(aiCol, AI, result.board)
      if (!aiResult) { setAiThinking(false); return }

      setBoard(aiResult.board)
      Sounds.aiMove()
      setAiThinking(false)

      if (checkWin(aiResult.board, AI)) {
        setGameOver(true)
        setStatus('🤖 AI Wins!')
        Sounds.lose()
        toast.error('AI wins this round!')
        submitScore('connect4', 0, difficulty, 'loss').catch(() => {})
      } else {
        setStatus('Your turn!')
      }
    }, 300)
  }

  const getCellColor = (val) => {
    if (val === PLAYER) return '#E63946'
    if (val === AI) return '#ffd700'
    return null
  }

  return (
    <div>
      {phase === 'select' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Choose Difficulty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '14px' }}>
            You are 🔴. AI is 🟡. Connect 4 in a row horizontally, vertically, or diagonally.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['easy', 'medium', 'hard'].map(d => (
              <button key={d} className="btn" onClick={() => startGame(d)} style={{
                background: `${DIFF_COLORS[d]}15`, border: `1px solid ${DIFF_COLORS[d]}40`,
                color: DIFF_COLORS[d], padding: '16px 36px', fontSize: '16px',
                fontWeight: 700, textTransform: 'capitalize'
              }}>
                {d}<br/>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>Depth {DEPTHS[d]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            {/* Column hover buttons */}
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              {Array.from({length:COLS}).map((_,c) => (
                <div key={c} style={{
                  width: '60px', height: '28px', marginLeft: c===0?0:2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: board[0][c] === 0 && !gameOver ? 'pointer' : 'default'
                }}
                onClick={() => handleClick(c)}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(null)}
                >
                  {hoverCol === c && !gameOver && (
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: '#E63946', opacity: 0.8
                    }} />
                  )}
                </div>
              ))}
            </div>

            {/* Board */}
            <div style={{
              background: '#1a0a2e',
              borderRadius: '12px',
              padding: '10px',
              border: '2px solid rgba(191,0,255,0.3)',
              boxShadow: '0 0 30px rgba(191,0,255,0.1)'
            }}>
              {board.map((row, r) => (
                <div key={r} style={{ display: 'flex', gap: '4px', marginBottom: r < ROWS-1 ? '4px' : 0 }}>
                  {row.map((cell, c) => (
                    <div key={c}
                      onClick={() => handleClick(c)}
                      onMouseEnter={() => setHoverCol(c)}
                      onMouseLeave={() => setHoverCol(null)}
                      style={{
                        width: '58px', height: '58px',
                        borderRadius: '50%',
                        background: getCellColor(cell) || (hoverCol === c && !gameOver ? 'rgba(230,57,70,0.1)' : '#0d0026'),
                        border: `2px solid ${cell ? 'transparent' : 'rgba(255,255,255,0.06)'}`,
                        cursor: board[0][c] === 0 && !gameOver ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                        boxShadow: cell === PLAYER ? '0 0 12px rgba(230,57,70,0.6)' : cell === AI ? '0 0 12px rgba(255,215,0,0.6)' : 'none'
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '16px', fontWeight: 700,
                color: status.includes('Win') ? '#00ff88' : status.includes('AI') && !status.includes('thinking') ? '#ff4466' : 'var(--text-primary)'
              }}>
                {status}
              </div>
              <span className="badge" style={{
                marginTop: '8px',
                display: 'inline-block',
                background: `${DIFF_COLORS[difficulty]}15`,
                color: DIFF_COLORS[difficulty],
                border: `1px solid ${DIFF_COLORS[difficulty]}40`
              }}>
                {difficulty}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ flex:1, background:'rgba(230,57,70,0.1)', border:'1px solid rgba(230,57,70,0.3)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                <div style={{ fontSize: '18px' }}>🔴</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop:'4px' }}>YOU</div>
              </div>
              <div style={{ flex:1, background:'rgba(255,215,0,0.1)', border:'1px solid rgba(255,215,0,0.3)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                <div style={{ fontSize: '18px' }}>🟡</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop:'4px' }}>AI</div>
              </div>
            </div>

            {gameOver && (
              <button className="btn btn-primary" onClick={() => startGame(difficulty)} style={{ fontSize: '14px' }}>
                Play Again
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setPhase('select')} style={{ fontSize: '13px' }}>
              ← Back
            </button>

            <div style={{
              background: 'rgba(191,0,255,0.05)',
              border: '1px solid rgba(191,0,255,0.1)',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: 1.7
            }}>
              <strong style={{ color: 'var(--neon-purple)', display: 'block', marginBottom: '4px' }}>🧠 Minimax + α-β</strong>
              Evaluates all possible futures up to depth {DEPTHS[difficulty]}. Alpha-beta pruning cuts unnecessary branches.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
