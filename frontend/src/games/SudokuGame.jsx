import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Sounds } from '../utils/sounds'

function generateFullBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0))
  const ok = (b, r, c, v) => {
    for (let k = 0; k < 9; k++) if (b[r][k] === v || b[k][c] === v) return false
    const sr = 3*Math.floor(r/3), sc = 3*Math.floor(c/3)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (b[sr+i][sc+j] === v) return false
    return true
  }
  const solve = (b) => {
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (b[i][j] === 0) {
        const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random()-0.5)
        for (const v of nums) {
          if (ok(b, i, j, v)) { b[i][j] = v; if (solve(b)) return true; b[i][j] = 0 }
        }
        return false
      }
    }
    return true
  }
  solve(board)
  return board
}

function generatePuzzle(level) {
  const full = generateFullBoard()
  const puzzle = full.map(r => [...r])
  const remove = level === 'easy' ? 35 : level === 'medium' ? 45 : 55
  let removed = 0
  while (removed < remove) {
    const r = Math.floor(Math.random() * 9)
    const c = Math.floor(Math.random() * 9)
    if (puzzle[r][c] !== 0) { puzzle[r][c] = 0; removed++ }
  }
  return { puzzle, solution: full }
}

export default function SudokuGame() {
  const { submitScore } = useAuth()
  const [phase, setPhase] = useState('select')
  const [difficulty, setDifficulty] = useState(null)
  const [board, setBoard] = useState(null)
  const [solution, setSolution] = useState(null)
  const [fixed, setFixed] = useState(null)
  const [userVals, setUserVals] = useState(null)
  const [selected, setSelected] = useState(null)
  const [solving, setSolving] = useState(false)
  const [solvedCells, setSolvedCells] = useState(new Set())

  const DIFF_COLORS = { easy: '#00ff88', medium: '#ffd700', hard: '#ff6b00' }

  const startGame = (diff) => {
    setDifficulty(diff)
    const { puzzle, solution: sol } = generatePuzzle(diff)
    setBoard(puzzle)
    setSolution(sol)
    const fix = puzzle.map(r => r.map(v => v !== 0))
    setFixed(fix)
    const vals = puzzle.map(r => r.map(v => v === 0 ? '' : String(v)))
    setUserVals(vals)
    setPhase('playing')
    setSolvedCells(new Set())
    setSelected(null)
  }

  const handleCellInput = (r, c, val) => {
    if (fixed[r][c]) return
    const v = val.replace(/\D/g, '')
    if (v && (parseInt(v) < 1 || parseInt(v) > 9)) return
    const newVals = userVals.map(row => [...row])
    newVals[r][c] = v.slice(-1)
    setUserVals(newVals)
    if (v) Sounds.place() 
  }

  const handleKeyPress = (e, r, c) => {
    if (fixed[r][c]) return
    if (e.key >= '1' && e.key <= '9') {
      handleCellInput(r, c, e.key)
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      const newVals = userVals.map(row => [...row])
      newVals[r][c] = ''
      setUserVals(newVals)
      Sounds.move()
    }
  }

  const getCellColor = (r, c) => {
    if (fixed[r][c]) return 'var(--text-primary)'
    const v = userVals[r][c]
    if (!v) return 'var(--text-secondary)'
    if (parseInt(v) === solution[r][c]) return '#00ff88'
    return '#ff4466'
  }

  const isComplete = () => {
    if (!userVals || !solution) return false
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (parseInt(userVals[r][c]) !== solution[r][c]) return false
    }
    return true
  }

  const solveAI = async () => {
    Sounds.click()
    setSolving(true)
    const emptyCells = []
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (!fixed[r][c]) emptyCells.push([r, c])
    }

    const fill = (idx) => {
      if (idx >= emptyCells.length) {
        setSolving(false)
        Sounds.complete()
        toast.success('AI solved the puzzle! 🤖')
        submitScore('sudoku', 100, difficulty, 'completed').catch(() => {})
        return
      }
      const [r, c] = emptyCells[idx]
      setUserVals(prev => {
        const n = prev.map(row => [...row])
        n[r][c] = String(solution[r][c])
        return n
      })
      setSolvedCells(prev => new Set([...prev, `${r},${c}`]))
      Sounds.aiMove()
      setTimeout(() => fill(idx + 1), 40)
    }
    fill(0)
  }

  const checkSolution = () => {
    if (isComplete()) {
      Sounds.win()
      toast.success('🎉 Perfect! You solved it!')
      submitScore('sudoku', 200, difficulty, 'win').catch(() => {})
    } else {
      Sounds.wrong()
      toast.error('Not quite right yet...')
    }
  }

  const getCellBg = (r, c) => {
    if (!selected) return fixed[r][c] ? 'var(--bg-elevated)' : 'var(--bg-deep)'
    const [sr, sc] = selected
    if (r === sr && c === sc) return 'rgba(0,245,255,0.2)'
    const boxR = Math.floor(r/3) === Math.floor(sr/3)
    const boxC = Math.floor(c/3) === Math.floor(sc/3)
    if (r === sr || c === sc || (boxR && boxC)) return 'rgba(0,245,255,0.05)'
    return fixed[r][c] ? 'var(--bg-elevated)' : 'var(--bg-deep)'
  }

  return (
    <div>
      {phase === 'select' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Choose Difficulty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '14px' }}>
            Fill the 9×9 grid. Numbers 1–9, once per row, column, and 3×3 box.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['easy', 'medium', 'hard'].map(d => (
              <button key={d} className="btn" onClick={() => startGame(d)} style={{
                background: `${DIFF_COLORS[d]}15`,
                border: `1px solid ${DIFF_COLORS[d]}40`,
                color: DIFF_COLORS[d],
                padding: '16px 36px', fontSize: '16px', fontWeight: 700,
                textTransform: 'capitalize'
              }}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'playing' && board && (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Grid */}
          <div style={{
            background: 'var(--bg-deep)',
            borderRadius: '12px',
            border: '2px solid rgba(0,245,255,0.2)',
            overflow: 'hidden',
            display: 'inline-block'
          }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {board.map((row, r) => (
                  <tr key={r}>
                    {row.map((_, c) => {
                      const isSolved = solvedCells.has(`${r},${c}`)
                      return (
                        <td key={c} onClick={() => setSelected([r, c])} style={{
                          width: '44px', height: '44px',
                          textAlign: 'center',
                          cursor: fixed[r][c] ? 'default' : 'pointer',
                          background: getCellBg(r, c),
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRight: (c+1) % 3 === 0 && c !== 8 ? '2px solid rgba(0,245,255,0.3)' : undefined,
                          borderBottom: (r+1) % 3 === 0 && r !== 8 ? '2px solid rgba(0,245,255,0.3)' : undefined,
                          transition: 'background 0.15s',
                          position: 'relative'
                        }}>
                          {selected && selected[0]===r && selected[1]===c && !fixed[r][c] ? (
                            <input
                              autoFocus
                              value={userVals[r][c]}
                              onChange={e => handleCellInput(r, c, e.target.value)}
                              onKeyDown={e => handleKeyPress(e, r, c)}
                              style={{
                                width: '100%', height: '100%',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                textAlign: 'center',
                                fontSize: '18px',
                                fontWeight: 700,
                                fontFamily: 'var(--font-display)',
                                color: getCellColor(r, c),
                                cursor: 'text'
                              }}
                            />
                          ) : (
                            <span style={{
                              fontSize: '18px',
                              fontWeight: fixed[r][c] ? 700 : 600,
                              fontFamily: 'var(--font-display)',
                              color: isSolved ? '#00f5ff' : getCellColor(r, c)
                            }}>
                              {userVals[r][c]}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '180px' }}>
            <span className="badge" style={{
              background: `${DIFF_COLORS[difficulty]}15`,
              color: DIFF_COLORS[difficulty],
              border: `1px solid ${DIFF_COLORS[difficulty]}40`,
              display: 'inline-block', textAlign: 'center'
            }}>{difficulty}</span>

            <button className="btn btn-primary" onClick={checkSolution} style={{ fontSize: '14px' }}>
              ✓ Check Answer
            </button>

            <button className="btn btn-secondary" onClick={solveAI} disabled={solving} style={{ fontSize: '14px' }}>
              {solving ? '🤖 Solving...' : '🤖 AI Solve'}
            </button>

            <button className="btn btn-ghost" onClick={() => startGame(difficulty)} style={{ fontSize: '13px' }}>
              New Puzzle
            </button>
            <button className="btn btn-ghost" onClick={() => setPhase('select')} style={{ fontSize: '13px' }}>
              ← Back
            </button>

            <div style={{
              background: 'rgba(0,245,255,0.05)',
              border: '1px solid rgba(0,245,255,0.1)',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: 1.7
            }}>
              <strong style={{ color: 'var(--neon-cyan)', display: 'block', marginBottom: '4px' }}>🧠 Backtracking</strong>
              Tries each digit 1–9. Backtracks when a conflict is found, exploring all possibilities until solved.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
