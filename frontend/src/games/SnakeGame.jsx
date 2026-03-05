import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Sounds } from '../utils/sounds'

const GRID = 16
const CELL = 28

function heuristic(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])
}

function astar(start, goal, obstacles) {
  const key = (p) => `${p[0]},${p[1]}`
  const open = new Map()
  const g = new Map()
  const came = new Map()

  g.set(key(start), 0)
  open.set(key(start), { pos: start, f: heuristic(start, goal) })

  while (open.size > 0) {
    let best = null
    let bestF = Infinity
    for (const [k, v] of open) {
      if (v.f < bestF) { bestF = v.f; best = k }
    }

    const current = open.get(best).pos
    open.delete(best)

    if (current[0] === goal[0] && current[1] === goal[1]) {
      const path = []
      let curKey = key(goal)

      while (came.has(curKey)) {
        const { from, to } = came.get(curKey)
        path.unshift(to)
        curKey = from
      }

      return path
    }

    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nr = (current[0]+dx+GRID) % GRID
      const nc = (current[1]+dy+GRID) % GRID
      const nk = `${nr},${nc}`
      if (obstacles.has(nk)) continue

      const ng = (g.get(key(current)) || 0) + 1
      if (!g.has(nk) || ng < g.get(nk)) {
        g.set(nk, ng)
        came.set(nk, { from: key(current), to: [nr, nc] })
        open.set(nk, { pos: [nr, nc], f: ng + heuristic([nr, nc], goal) })
      }
    }
  }
  return []
}

export default function SnakeGame() {
  const { submitScore } = useAuth()
  const canvasRef = useRef(null)
  const stateRef = useRef({
    snake: [[8,8]], dir: [0,1], fruits: [], gameRunning: false,
    userDist: 0, aiDist: 0, phase: 'select'
  })
  const animRef = useRef(null)
  const [phase, setPhase] = useState('select') // select | playing | finished | ai
  const [difficulty, setDifficulty] = useState(null)
  const [info, setInfo] = useState('')
  const [results, setResults] = useState(null)

  const DIFFICULTIES = {
    easy: { fruits: 5, speed: 300, label: 'Easy', color: '#00ff88' },
    medium: { fruits: 7, speed: 220, label: 'Medium', color: '#ffd700' },
    hard: { fruits: 10, speed: 160, label: 'Hard', color: '#ff0066' }
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s = stateRef.current

    ctx.fillStyle = '#030308'
    ctx.fillRect(0, 0, GRID*CELL, GRID*CELL)

    // Grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      ctx.beginPath()
      ctx.arc(c*CELL+CELL/2, r*CELL+CELL/2, 1, 0, Math.PI*2)
      ctx.fill()
    }

    // Fruits
    for (const [r, c] of s.fruits) {
      const x = c*CELL, y = r*CELL
      ctx.fillStyle = '#ff4466'
      ctx.shadowColor = '#ff4466'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.roundRect(x+4, y+4, CELL-8, CELL-8, 4)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Snake
    const color = s.phase === 'ai' ? '#ffd700' : '#00ff88'
    for (let i = 0; i < s.snake.length; i++) {
      const [r, c] = s.snake[i]
      const x = c*CELL, y = r*CELL
      const alpha = i === 0 ? 1 : 0.7 - (i / s.snake.length) * 0.4
      ctx.fillStyle = color
      ctx.globalAlpha = alpha
      ctx.shadowColor = color
      ctx.shadowBlur = i === 0 ? 12 : 4
      ctx.beginPath()
      ctx.roundRect(x+2, y+2, CELL-4, CELL-4, i === 0 ? 6 : 4)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }, [])

  const startGame = (diff) => {
    setDifficulty(diff)
    const cfg = DIFFICULTIES[diff]
    const s = stateRef.current

    s.snake = [[8, 8]]
    s.dir = [0, 1]
    s.fruits = []
    s.userDist = 0
    s.aiDist = 0
    s.phase = 'playing'
    s.gameRunning = true

    while (s.fruits.length < cfg.fruits) {
      const r = Math.floor(Math.random() * GRID)
      const c = Math.floor(Math.random() * GRID)
      const key = `${r},${c}`
      if (!s.fruits.some(f => f[0]===r&&f[1]===c) && !(r===8&&c===8)) {
        s.fruits.push([r, c])
      }
    }
    s.originalFruits = [...s.fruits.map(f => [...f])]

    setPhase('playing')
    setInfo('Navigate with arrow keys. Eat all fruits!')

    // Game loop
    const loop = () => {
      if (!s.gameRunning) return
      const head = [(s.snake[0][0]+s.dir[0]+GRID)%GRID, (s.snake[0][1]+s.dir[1]+GRID)%GRID]
      s.snake.unshift(head)
      s.snake.pop()
      s.userDist++

      const fi = s.fruits.findIndex(f => f[0]===head[0]&&f[1]===head[1])
      if (fi !== -1) {
        Sounds.eat()
        s.snake.push([...s.snake[s.snake.length-1]])
        s.fruits.splice(fi, 1)
      }

      draw()

      if (s.fruits.length === 0) {
        Sounds.win() 
        s.gameRunning = false
        setPhase('finished')
        setInfo(`✅ Done! Your distance: ${s.userDist} steps`)
        return
      }
      animRef.current = setTimeout(loop, cfg.speed)
    }
    loop()
  }

  const solveAI = () => {
    Sounds.click()
    if (animRef.current) clearTimeout(animRef.current)
    const s = stateRef.current
    s.phase = 'ai'
    s.snake = [[8, 8]]
    s.fruits = s.originalFruits.map(f => [...f])
    s.aiDist = 0

    setPhase('ai')
    setInfo('🤖 AI solving with A* pathfinding...')

    // Build full sequence of moves across all fruits upfront
    const allMoves = []
    const tempSnake = [[8, 8]]
    const tempFruits = s.originalFruits.map(f => [...f])

    for (let fi = 0; fi < tempFruits.length; fi++) {
      const goal = tempFruits[fi]
      const obstacles = new Set(tempSnake.slice(1).map(p => `${p[0]},${p[1]}`))
      const path = astar(tempSnake[0], goal, obstacles)
      if (!path || path.length === 0) continue

      for (const step of path) {
        allMoves.push({ pos: step, isFruit: step[0] === goal[0] && step[1] === goal[1], fruitPos: goal })
        tempSnake.unshift(step)
        if (step[0] === goal[0] && step[1] === goal[1]) {
          tempSnake.push([...tempSnake[tempSnake.length - 1]])
        } else {
          tempSnake.pop()
        }
      }
    }

    // Animate moves one by one
    let moveIdx = 0
    const animate = () => {
      if (moveIdx >= allMoves.length) {
        setPhase('result')
        setResults({ user: s.userDist, ai: s.aiDist })
        const won = s.userDist <= s.aiDist
        if (won) {
           Sounds.win()
          toast.success('You beat the AI! 🏆')
          submitScore('snake', s.userDist, difficulty, 'win', { aiDist: s.aiDist }).catch(() => {})
        } else {
          Sounds.lose()
          submitScore('snake', s.userDist, difficulty, 'loss', { aiDist: s.aiDist }).catch(() => {})
        }
        return
      }

      const { pos, isFruit, fruitPos } = allMoves[moveIdx]
      s.snake.unshift(pos)
      Sounds.aiMove()
      if (isFruit) {
        s.snake.push([...s.snake[s.snake.length - 1]])
        const fi = s.fruits.findIndex(f => f[0] === fruitPos[0] && f[1] === fruitPos[1])
        if (fi !== -1) s.fruits.splice(fi, 1)
      } else {
        s.snake.pop()
      }
      s.aiDist++
      draw()
      setInfo(`🤖 AI: ${s.aiDist} steps`)
      moveIdx++
      animRef.current = setTimeout(animate, 80)
    }

    animate()
  }

  useEffect(() => {
    const handleKey = (e) => {
      const s = stateRef.current
      if (!s.gameRunning) return
      const map = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] }
      if (map[e.key]) {
        e.preventDefault()
        s.dir = map[e.key]
        Sounds.move()   
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    return () => { if (animRef.current) clearTimeout(animRef.current) }
  }, [])

  return (
    <div>
      {phase === 'select' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Choose Difficulty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '14px' }}>
            Navigate the snake to eat fruits. AI will then solve the same puzzle with A* to compare paths.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {Object.entries(DIFFICULTIES).map(([key, cfg]) => (
              <button key={key} className="btn" onClick={() => startGame(key)} style={{
                background: `${cfg.color}15`,
                border: `1px solid ${cfg.color}40`,
                color: cfg.color,
                padding: '16px 32px', fontSize: '16px', fontWeight: 700
              }}>
                {cfg.label}<br/>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{cfg.fruits} fruits</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase !== 'select' && (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <canvas
              ref={canvasRef}
              width={GRID*CELL}
              height={GRID*CELL}
              style={{
                display: 'block',
                borderRadius: '12px',
                border: '1px solid rgba(0,245,255,0.15)',
                boxShadow: '0 0 30px rgba(0,245,255,0.05)'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{info}</div>

              {phase === 'playing' && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                  Use ↑↓←→ arrow keys to move
                </div>
              )}

              {phase === 'finished' && (
                <button className="btn btn-primary" style={{ marginTop: '12px', width: '100%' }} onClick={solveAI}>
                  🤖 Watch AI Solve
                </button>
              )}

              {phase === 'result' && results && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <div style={{
                      flex: 1, background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
                      borderRadius: '8px', padding: '12px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>YOU</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#00ff88', fontFamily: 'var(--font-display)' }}>
                        {results.user}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>steps</div>
                    </div>
                    <div style={{
                      flex: 1, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
                      borderRadius: '8px', padding: '12px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>AI</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffd700', fontFamily: 'var(--font-display)' }}>
                        {results.ai}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>steps</div>
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    padding: '10px',
                    borderRadius: '8px',
                    background: results.user <= results.ai ? 'rgba(0,255,136,0.1)' : 'rgba(255,107,0,0.1)',
                    border: `1px solid ${results.user <= results.ai ? 'rgba(0,255,136,0.3)' : 'rgba(255,107,0,0.3)'}`,
                    fontWeight: 700,
                    color: results.user <= results.ai ? '#00ff88' : '#ff6b00'
                  }}>
                    {results.user <= results.ai ? '🏆 You beat the AI!' : '🤖 AI wins this round'}
                  </div>
                  <button className="btn btn-ghost" style={{ width: '100%', marginTop: '10px', fontSize: '13px' }}
                    onClick={() => { setPhase('select'); stateRef.current.gameRunning = false; setResults(null) }}>
                    Play Again
                  </button>
                </div>
              )}
            </div>

            <div style={{
              background: 'rgba(0,245,255,0.05)',
              border: '1px solid rgba(0,245,255,0.1)',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: 1.7
            }}>
              <strong style={{ color: 'var(--neon-cyan)', display: 'block', marginBottom: '4px' }}>🧠 A* Algorithm</strong>
              Uses Manhattan distance as heuristic. Finds optimal path by always expanding the lowest f(n) = g(n) + h(n) node.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
