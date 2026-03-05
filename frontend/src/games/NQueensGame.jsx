import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

// ─── Sounds ───────────────────────────────────────────────────────────────────
let audioCtx = null
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}
function beep(freq, dur, type = 'sine', vol = 0.12) {
  try {
    const c = getCtx()
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(vol, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
    o.start(c.currentTime); o.stop(c.currentTime + dur)
  } catch (_) {}
}
const Sounds = {
  click:    () => beep(520, 0.07, 'sine', 0.08),
  place:    () => beep(750, 0.09, 'sine', 0.11),
  conflict: () => beep(200, 0.20, 'sawtooth', 0.10),
  remove:   () => beep(380, 0.08, 'sine', 0.07),
  aiPlace:  () => beep(900, 0.07, 'triangle', 0.08),
  win:      () => { [660,880,1100,1320].forEach((f,i) => setTimeout(() => beep(f, 0.14), i*110)) },
  complete: () => { [500,700,900,1100,1300].forEach((f,i) => setTimeout(() => beep(f, 0.13), i*90)) },
}

// ─── Solver ───────────────────────────────────────────────────────────────────
function isSafe(queens, row, col) {
  for (let r = 0; r < row; r++) {
    const c = queens[r]
    if (c === col || Math.abs(c - col) === Math.abs(r - row)) return false
  }
  return true
}

function solveNQueens(n) {
  const queens = Array(n).fill(-1)
  function solve(row) {
    if (row === n) return true
    for (let col = 0; col < n; col++) {
      if (isSafe(queens, row, col)) {
        queens[row] = col
        if (solve(row + 1)) return true
        queens[row] = -1
      }
    }
    return false
  }
  solve(0)
  return queens
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NQueensGame() {
  const { submitScore } = useAuth()

  const [phase,    setPhase]    = useState('select')
  const [n,        setN]        = useState(8)
  const [queens,   setQueens]   = useState([])
  const [aiQueens, setAiQueens] = useState([])   // array of {row, col}
  const [solving,  setSolving]  = useState(false)
  const [errors,   setErrors]   = useState(new Set())
  const [aiDone,   setAiDone]   = useState(false)
  const animRef = useRef(null)

  const SIZES = [
    { n: 4, label: 'Easy 4x4',   color: '#00ff88' },
    { n: 6, label: 'Medium 6x6', color: '#ffd700' },
    { n: 8, label: 'Hard 8x8',   color: '#ff6b00' },
  ]

  const SOLUTION_COUNTS = { 4: 2, 6: 4, 8: 92 }

  // ── Start ─────────────────────────────────────────────────────────────────
  const startGame = (size) => {
    Sounds.click()
    if (animRef.current) clearTimeout(animRef.current)
    setN(size)
    setQueens(Array(size).fill(-1))
    setAiQueens([])
    setSolving(false)
    setErrors(new Set())
    setAiDone(false)
    setPhase('playing')
  }

  const reset = () => {
    Sounds.click()
    if (animRef.current) clearTimeout(animRef.current)
    setQueens(Array(n).fill(-1))
    setAiQueens([])
    setSolving(false)
    setErrors(new Set())
    setAiDone(false)
  }

  // ── User places queen ──────────────────────────────────────────────────────
  const placeQueen = (row, col) => {
    if (solving) return
    const nq = [...queens]
    if (nq[row] === col) {
      nq[row] = -1
      Sounds.remove()
    } else {
      nq[row] = col
    }
    setQueens(nq)

    const errs = new Set()
    for (let r = 0; r < n; r++) {
      if (nq[r] === -1) continue
      for (let r2 = r + 1; r2 < n; r2++) {
        if (nq[r2] === -1) continue
        const c1 = nq[r], c2 = nq[r2]
        if (c1 === c2 || Math.abs(c1 - c2) === Math.abs(r - r2)) {
          errs.add(r + ',' + c1).add(r2 + ',' + c2)
        }
      }
    }
    setErrors(errs)

    if (errs.size > 0) {
      Sounds.conflict()
    } else if (nq[row] !== -1) {
      Sounds.place()
    }

    const placed = nq.filter(c => c !== -1).length
    if (placed === n && errs.size === 0) {
      Sounds.win()
      toast.success('Brilliant! All queens placed safely!')
      submitScore('nqueens', n * 100, n === 4 ? 'easy' : n === 6 ? 'medium' : 'hard', 'win').catch(() => {})
    }
  }

  // ── AI solve: places row 0 first, then 1, 2 ... n-1 ──────────────────────
  const solveAI = () => {
    Sounds.click()
    if (animRef.current) clearTimeout(animRef.current)

    // Clear board first
    setQueens(Array(n).fill(-1))
    setAiQueens([])
    setErrors(new Set())
    setSolving(true)
    setAiDone(false)

    // Compute the full solution ahead of time
    const solution = solveNQueens(n)

    // Animate row 0 → row n-1
    let row = 0

    const placeNext = () => {
      if (row >= n) {
        setSolving(false)
        setAiDone(true)
        Sounds.complete()
        toast.success(
          'AI solved ' + n + '-Queens! One of ' + (SOLUTION_COUNTS[n] || '?') + ' solutions.',
          { duration: 5000 }
        )
        submitScore(
          'nqueens',
          n * 50,
          n === 4 ? 'easy' : n === 6 ? 'medium' : 'hard',
          'completed'
        ).catch(() => {})
        return
      }

      const currentRow = row
      const col = solution[currentRow]

      Sounds.aiPlace()

      setAiQueens(prev => [...prev, { row: currentRow, col }])

      row = row + 1
      animRef.current = setTimeout(placeNext, 420)
    }

    // Small delay so board clear renders before animation
    animRef.current = setTimeout(placeNext, 300)
  }

  // ── Cell helpers ──────────────────────────────────────────────────────────
  const cellBg     = (r, c) => (r + c) % 2 === 0 ? '#1a1a2e' : '#0d0d1f'
  const hasUser    = (r, c) => !solving && queens[r] === c
  const hasAI      = (r, c) => aiQueens.some(q => q.row === r && q.col === c)
  const isErr      = (r, c) => errors.has(r + ',' + c)

  const CELL_SIZE  = Math.min(60, Math.floor(420 / n))
  const placedCount = queens.filter(c => c !== -1).length
  const conflictCnt = errors.size / 2

  return (
    <div>

      {/* ── Select difficulty ── */}
      {phase === 'select' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Choose Board Size</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '14px' }}>
            Place N queens so no two share a row, column, or diagonal.
            Watch the AI reveal one valid solution row-by-row.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {SIZES.map(({ n: size, label, color }) => (
              <button key={size} className="btn" onClick={() => startGame(size)} style={{
                background: color + '15', border: '1px solid ' + color + '40',
                color, padding: '16px 32px', fontSize: '16px', fontWeight: 700,
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Game ── */}
      {phase === 'playing' && (
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Board */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {Array.from({ length: n }).map((_, r) => (
              <div key={r} style={{ display: 'flex' }}>
                {Array.from({ length: n }).map((_, c) => {
                  const uq  = hasUser(r, c)
                  const aq  = hasAI(r, c)
                  const err = uq && isErr(r, c)

                  let bg = cellBg(r, c)
                  if (err)      bg = 'rgba(255,0,102,0.30)'
                  else if (aq)  bg = 'rgba(0,245,255,0.14)'

                  return (
                    <div key={c}
                      onClick={() => !solving && placeQueen(r, c)}
                      style={{
                        width: CELL_SIZE, height: CELL_SIZE,
                        background: bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: solving ? 'default' : 'pointer',
                        transition: 'background 0.15s',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                      onMouseEnter={e => {
                        if (!solving && !uq && !aq)
                          e.currentTarget.style.background = 'rgba(0,245,255,0.08)'
                      }}
                      onMouseLeave={e => { e.currentTarget.style.background = bg }}
                    >
                      {uq && (
                        <span style={{
                          fontSize: CELL_SIZE * 0.54,
                          color: err ? '#ff0066' : '#00ff88',
                          filter: 'drop-shadow(0 0 7px ' + (err ? '#ff0066' : '#00ff88') + ')',
                          transition: 'color 0.2s, filter 0.2s',
                          userSelect: 'none',
                        }}>♛</span>
                      )}
                      {aq && (
                        <span style={{
                          fontSize: CELL_SIZE * 0.54,
                          color: '#00f5ff',
                          filter: 'drop-shadow(0 0 9px #00f5ff)',
                          animation: 'fadeIn 0.35s ease',
                          userSelect: 'none',
                        }}>♛</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Status */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                {n}×{n} Board
              </div>

              {!solving && !aiDone && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Placed: <strong style={{ color: 'var(--text-primary)' }}>{placedCount}</strong> / {n}
                </div>
              )}

              {conflictCnt > 0 && !solving && (
                <div style={{
                  fontSize: '12px', color: '#ff4466', marginTop: '6px',
                  padding: '4px 8px', background: 'rgba(255,0,102,0.08)',
                  borderRadius: '6px', display: 'inline-block',
                }}>
                  ⚠ {conflictCnt} conflict{conflictCnt > 1 ? 's' : ''}
                </div>
              )}

              {solving && (
                <div style={{ fontSize: '13px', color: 'var(--neon-cyan)', marginTop: '4px' }}>
                  🤖 Placing row {aiQueens.length} of {n}…
                </div>
              )}

              {/* One-of-many message after AI finishes */}
              {aiDone && (
                <div style={{
                  marginTop: '10px', padding: '12px',
                  background: 'rgba(0,245,255,0.06)',
                  border: '1px solid rgba(0,245,255,0.2)',
                  borderRadius: '8px', fontSize: '12px',
                  color: 'var(--text-secondary)', lineHeight: 1.7,
                }}>
                  <strong style={{ color: 'var(--neon-cyan)', display: 'block', marginBottom: '4px' }}>
                    One of {SOLUTION_COUNTS[n] || '?'} valid solutions
                  </strong>
                  The AI's backtracking always tries column 0 first per row,
                  so it finds the <em>same</em> first solution every time.
                  An {n}×{n} board has{' '}
                  <strong style={{ color: 'var(--neon-gold)' }}>
                    {SOLUTION_COUNTS[n] || '?'} distinct</strong> solutions — try placing queens
                  yourself to find a different arrangement!
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={solveAI} disabled={solving} style={{ fontSize: '14px' }}>
              {solving ? '🤖 Solving…' : aiDone ? '🔄 Solve Again' : '🤖 AI Solve'}
            </button>

            <button className="btn btn-ghost" onClick={reset} style={{ fontSize: '13px' }}>
              Reset Board
            </button>

            <button className="btn btn-ghost" onClick={() => { Sounds.click(); setPhase('select') }} style={{ fontSize: '13px' }}>
              ← Back
            </button>

            {/* Algorithm explanation */}
            <div style={{
              background: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.12)',
              borderRadius: '10px', padding: '14px', fontSize: '12px',
              color: 'var(--text-muted)', lineHeight: 1.7,
            }}>
              <strong style={{ color: 'var(--neon-orange)', display: 'block', marginBottom: '4px' }}>
                🧠 CSP Backtracking
              </strong>
              Tries column 0 → {n-1} for each row. Places a queen only when safe.
              Backtracks to the previous row when no column works.
              Guaranteed to find a solution if one exists.
            </div>

            {/* Legend */}
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 2, paddingLeft: '4px' }}>
              <div>♛ <span style={{ color: '#00ff88' }}>Green</span> = your queen, safe</div>
              <div>♛ <span style={{ color: '#ff0066' }}>Red</span>   = your queen, conflict</div>
              <div>♛ <span style={{ color: '#00f5ff' }}>Cyan</span>  = AI solution</div>
              <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.7 }}>
                Click same cell again to remove a queen.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}