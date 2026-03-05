import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Sounds } from '../utils/sounds'

const GRID = 12, CELL = 36

function manhattan(a, b) { return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) }
function euclidean(a, b) { return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2) }

function astar(maze, start, goal, hFn) {
  const key = p => `${p[0]},${p[1]}`
  const openSet = []
  const gScore = {}
  const cameFrom = {}
  const startKey = key(start)
  const goalKey = key(goal)

  gScore[startKey] = 0
  openSet.push({ pos: start, f: hFn(start, goal) })

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f)
    const { pos: cur } = openSet.shift()
    const curKey = key(cur)

    if (curKey === goalKey) {
      const path = []
      let c = goalKey
      while (c !== startKey) {
        const node = cameFrom[c]
        path.unshift(node.pos)
        c = node.from
      }
      path.push(goal)
      return path.slice(1) // exclude start, include goal
    }

    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nr = cur[0]+dr, nc = cur[1]+dc
      if (nr<0||nr>=GRID||nc<0||nc>=GRID||maze[nr][nc]===1){
        
        continue}
      const nb = [nr, nc]
      const nbKey = key(nb)
      const tentative = (gScore[curKey] || 0) + 1
      if (gScore[nbKey] === undefined || tentative < gScore[nbKey]) {
        gScore[nbKey] = tentative
        cameFrom[nbKey] = { pos: cur, from: curKey }
        openSet.push({ pos: nb, f: tentative + hFn(nb, goal) })
      }
    }
  }
  return null
}

function generateMaze(density) {
  while (true) {
    const maze = Array.from({length:GRID}, () => Array(GRID).fill(0))
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (Math.random() < density) maze[r][c] = 1
    }
    maze[0][0] = maze[GRID-1][GRID-1] = 0
    if (astar(maze, [0,0], [GRID-1,GRID-1], manhattan)) return maze
  }
}

export default function MazeGame() {
  const { submitScore } = useAuth()
  const canvasRef = useRef(null)
  const [phase, setPhase] = useState('select')
  const [difficulty, setDifficulty] = useState(null)
  const [maze, setMaze] = useState(null)
  const [player, setPlayer] = useState([0, 0])
  const [userPath, setUserPath] = useState([[0, 0]])
  const [userDone, setUserDone] = useState(false)
  const [showPath, setShowPath] = useState({ type: null, path: null })
  const [stats, setStats] = useState({ user: 0, manhattan: 0, euclidean: 0 })
  const animRef = useRef(null)

  const GOAL = [GRID-1, GRID-1]
  const DENSITIES = { easy: 0.15, medium: 0.25, hard: 0.35 }
  const DIFF_COLORS = { easy: '#00ff88', medium: '#ffd700', hard: '#ff6b00' }

  const draw = useCallback((mazeData, playerPos, pathData) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#030308'
    ctx.fillRect(0, 0, GRID*CELL, GRID*CELL)

    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      const x = c*CELL, y = r*CELL
      if (mazeData[r][c] === 1) {
        ctx.fillStyle = '#1a1a3e'
        ctx.fillRect(x+1, y+1, CELL-2, CELL-2)
        ctx.strokeStyle = 'rgba(0,245,255,0.1)'
        ctx.strokeRect(x+1, y+1, CELL-2, CELL-2)
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.02)'
        ctx.fillRect(x, y, CELL, CELL)
      }
    }

    // Path
    if (pathData?.path) {
      const color = pathData.type === 'manhattan' ? '#bf00ff' : pathData.type === 'euclidean' ? '#ffd700' : '#ff69b4'
      for (const [r, c] of pathData.path) {
        ctx.fillStyle = color + '40'
        ctx.fillRect(c*CELL+3, r*CELL+3, CELL-6, CELL-6)
        ctx.strokeStyle = color + '80'
        ctx.lineWidth = 1
        ctx.strokeRect(c*CELL+3, r*CELL+3, CELL-6, CELL-6)
      }
    }

    // Goal
    ctx.fillStyle = '#ff4466'
    ctx.shadowColor = '#ff4466'
    ctx.shadowBlur = 15
    ctx.beginPath()
    ctx.roundRect(GOAL[1]*CELL+4, GOAL[0]*CELL+4, CELL-8, CELL-8, 4)
    ctx.fill()
    ctx.shadowBlur = 0

    // Start
    ctx.fillStyle = '#00f5ff'
    ctx.shadowColor = '#00f5ff'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.roundRect(4, 4, CELL-8, CELL-8, 4)
    ctx.fill()
    ctx.shadowBlur = 0

    // Player
    ctx.fillStyle = '#00ff88'
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.roundRect(playerPos[1]*CELL+6, playerPos[0]*CELL+6, CELL-12, CELL-12, 4)
    ctx.fill()
    ctx.shadowBlur = 0
  }, [])

  const startGame = (diff) => {
    setDifficulty(diff)
    const m = generateMaze(DENSITIES[diff])
    setMaze(m)
    setPlayer([0, 0])
    setUserPath([[0, 0]])
    setUserDone(false)
    setShowPath({ type: null, path: null })
    setStats({ user: 0, manhattan: 0, euclidean: 0 })
    setPhase('playing')
    setTimeout(() => draw(m, [0, 0], null), 50)
  }

  useEffect(() => {
    if (maze) draw(maze, player, showPath)
  }, [maze, player, showPath, draw])

  useEffect(() => {
    if (phase !== 'playing') return

    const handleKey = (e) => {
      if (userDone) return
      const map = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] }
      const d = map[e.key]
      if (!d) return
      e.preventDefault()

      const nr = player[0]+d[0], nc = player[1]+d[1]
      if (nr<0||nr>=GRID||nc<0||nc>=GRID||maze[nr][nc]===1) {
        Sounds.wall()
        return
      }
      const newPlayer = [nr, nc]
      const newPath = [...userPath, newPlayer]
      setPlayer(newPlayer)
      Sounds.move()
      setUserPath(newPath)

      if (nr === GOAL[0] && nc === GOAL[1]) {
        setUserDone(true)
        Sounds.win()
        setStats(s => ({ ...s, user: newPath.length - 1 }))
        toast.success(`Reached the goal in ${newPath.length - 1} steps! 🎉`)
        submitScore('maze', newPath.length - 1, difficulty, 'completed', { steps: newPath.length - 1 }).catch(() => {})
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, player, maze, userPath, userDone, difficulty, submitScore])

  const solveAI = (hType) => {
    Sounds.click() 
    if (!maze) return
    const path = astar(maze, [0, 0], GOAL, hType === 'manhattan' ? manhattan : euclidean)
    if (!path) { toast.error('No path found!'); return }

    setStats(s => ({
      ...s,
      [hType]: path.length
    }))

    let i = 0
    setShowPath({ type: hType, path: [] })

    const animate = () => {
      if (i >= path.length) return
      setShowPath({ type: hType, path: path.slice(0, i + 1) })
      Sounds.aiMove()
      i++
      animRef.current = setTimeout(animate, 50)
    }
    animate()
  }

  useEffect(() => () => { if (animRef.current) clearTimeout(animRef.current) }, [])

  return (
    <div>
      {phase === 'select' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Choose Difficulty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '14px' }}>
            Navigate 🟢 to 🔴 using arrow keys, then compare your path against AI heuristics.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['easy', 'medium', 'hard'].map(d => (
              <button key={d} className="btn" onClick={() => startGame(d)} style={{
                background: `${DIFF_COLORS[d]}15`, border: `1px solid ${DIFF_COLORS[d]}40`,
                color: DIFF_COLORS[d], padding: '16px 36px', fontSize: '16px',
                fontWeight: 700, textTransform: 'capitalize'
              }}>
                {d}<br/>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>{Math.round(DENSITIES[d]*100)}% walls</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'playing' && maze && (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <canvas
              ref={canvasRef}
              width={GRID*CELL}
              height={GRID*CELL}
              style={{ display: 'block', borderRadius: '10px', border: '1px solid rgba(0,245,255,0.15)' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                {userDone ? '✅ Goal reached!' : '🟢 → 🔴 Use arrow keys'}
              </div>
              {stats.user > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--neon-cyan)' }}>Your steps: {stats.user}</div>
              )}
            </div>

            <button className="btn" onClick={() => solveAI('manhattan')} style={{
              background: 'rgba(191,0,255,0.1)', border: '1px solid rgba(191,0,255,0.3)',
              color: '#bf00ff', fontSize: '13px', padding: '10px'
            }}>
              🟣 AI: Manhattan
            </button>
            <button className="btn" onClick={() => solveAI('euclidean')} style={{
              background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
              color: '#ffd700', fontSize: '13px', padding: '10px'
            }}>
              🟡 AI: Euclidean
            </button>

            {(stats.manhattan > 0 || stats.euclidean > 0) && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '10px', padding: '14px' }}>
                {stats.user > 0 && <div style={{ fontSize: '12px', color: '#00ff88', marginBottom: '4px' }}>👤 You: {stats.user} steps</div>}
                {stats.manhattan > 0 && <div style={{ fontSize: '12px', color: '#bf00ff', marginBottom: '4px' }}>🟣 Manhattan: {stats.manhattan} steps</div>}
                {stats.euclidean > 0 && <div style={{ fontSize: '12px', color: '#ffd700' }}>🟡 Euclidean: {stats.euclidean} steps</div>}
              </div>
            )}

            <button className="btn btn-ghost" onClick={() => startGame(difficulty)} style={{ fontSize: '13px' }}>
              New Maze
            </button>
            <button className="btn btn-ghost" onClick={() => setPhase('select')} style={{ fontSize: '13px' }}>
              ← Back
            </button>

            <div style={{
              background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.1)',
              borderRadius: '10px', padding: '14px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7
            }}>
              <strong style={{ color: 'var(--neon-gold)', display: 'block', marginBottom: '4px' }}>🧠 Heuristic A*</strong>
              Manhattan = |Δrow| + |Δcol|. Euclidean = √(Δrow² + Δcol²). Both guide A* toward the goal.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
