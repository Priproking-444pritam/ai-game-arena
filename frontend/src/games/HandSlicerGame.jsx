import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { loadMediaPipe, getLocateFile } from '../mediapipe-loader'

// ─── Audio ────────────────────────────────────────────────────────────────────
let _ac = null
const getAC = () => { if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)(); return _ac }
function beep(freq, dur, type = 'sine', vol = 0.13) {
  try {
    const c = getAC(), o = c.createOscillator(), g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.type = type; o.frequency.value = freq
    g.gain.setValueAtTime(vol, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
    o.start(); o.stop(c.currentTime + dur)
  } catch (_) {}
}
const SFX = {
  correct: () => { beep(900,0.07); setTimeout(()=>beep(1200,0.09),60) },
  wrong:   () => beep(200, 0.25, 'sawtooth', 0.12),
  levelup: () => [600,800,1000,1300].forEach((f,i)=>setTimeout(()=>beep(f,0.12),i*80)),
  tick:    () => beep(660, 0.05, 'triangle', 0.07),
  click:   () => beep(500, 0.06),
  end:     () => [700,900,1100].forEach((f,i)=>setTimeout(()=>beep(f,0.15),i*120)),
}

// ─── Shapes ───────────────────────────────────────────────────────────────────
const SHAPES = ['circle', 'square', 'rectangle', 'triangle']

function shapeColor(shape, level) {
  const vivid = { circle:'#00f5ff', square:'#bf00ff', rectangle:'#ffd700', triangle:'#00ff88' }
  const muted  = { circle:'#1a4a55', square:'#2a1a40', rectangle:'#443800', triangle:'#0d2e1e' }
  const t = Math.min((level - 1) / 19, 1)
  const lx = (a, b) => Math.round(parseInt(a,16)*(1-t)+parseInt(b,16)*t).toString(16).padStart(2,'0')
  const v = vivid[shape].slice(1), m = muted[shape].slice(1)
  return '#'+lx(v.slice(0,2),m.slice(0,2))+lx(v.slice(2,4),m.slice(2,4))+lx(v.slice(4,6),m.slice(4,6))
}

const LEVEL_TARGET = [
  'circle','circle','triangle','triangle','square',
  'square','rectangle','rectangle','circle','triangle',
  'square','rectangle','triangle','circle','square',
  'rectangle','circle','triangle','square','rectangle',
]
const PASS_COUNT   = 8
const TOTAL_LEVELS = 20
const W = 640, H = 480
const levelSpeed = lvl => 1.4 + (lvl - 1) * 0.18

function drawShape(ctx, shape, x, y, size, color, alpha = 1) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle   = color
  ctx.shadowColor = color
  ctx.shadowBlur  = 16
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth   = 2
  switch (shape) {
    case 'circle':
      ctx.beginPath(); ctx.arc(x, y, size/2, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      break
    case 'square': {
      const s = size * 0.82
      ctx.beginPath(); ctx.roundRect(x-s/2, y-s/2, s, s, 5); ctx.fill(); ctx.stroke()
      break
    }
    case 'rectangle': {
      const rw = size * 1.45, rh = size * 0.58
      ctx.beginPath(); ctx.roundRect(x-rw/2, y-rh/2, rw, rh, 5); ctx.fill(); ctx.stroke()
      break
    }
    case 'triangle': {
      const r = size / 2
      ctx.beginPath()
      ctx.moveTo(x, y-r); ctx.lineTo(x+r*0.87, y+r*0.5); ctx.lineTo(x-r*0.87, y+r*0.5)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      break
    }
  }
  ctx.restore()
}

function drawCursor(ctx, x, y, color = '#00f5ff') {
  ctx.save()
  ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI*2)
  ctx.strokeStyle = color + 'aa'; ctx.lineWidth = 2.5
  ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.stroke()
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2)
  ctx.fillStyle = color; ctx.shadowBlur = 10; ctx.fill()
  ctx.restore()
}



export default function HandSlicerGame() {
  const { user, submitScore } = useAuth()

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const gRef = useRef({
    objects: [], trail: [],
    handX: null, handY: null,
    running: false, frameId: null, spawnTimer: null,
    caught: 0, wrong: 0, missed: 0,
    totalCaught: 0, totalWrong: 0, totalMissed: 0,
    level: 1, target: 'circle',
    // Pending render job set by launchLevel, consumed by useEffect
    pendingRender: null,
  })

  const [phase,        setPhase]       = useState('menu')
  const [level,        setLevel]       = useState(1)
  const [caught,       setCaught]      = useState(0)
  const [target,       setTarget]      = useState('circle')
  const [introStep,    setIntroStep]   = useState(0)
  const [levelResults, setLevelResults] = useState([])
  const [finalScore,   setFinalScore]  = useState(0)
  const [loading,      setLoading]     = useState(false)
  const [loadingMsg,   setLoadingMsg]  = useState('')
  const [camErr,       setCamErr]      = useState('')

  if (!user) return (
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:'48px',marginBottom:'12px'}}>🔒</div>
      <h2 style={{marginBottom:'8px'}}>Login Required</h2>
      <p style={{color:'var(--text-secondary)',marginBottom:'20px',fontSize:'14px'}}>
        Log in to play Hand Slicer.
      </p>
      <Link to="/login" className="btn btn-primary">Login</Link>
    </div>
  )

  // ─── THE FIX: when canvas mounts (phase switches to 'playing'),
  //     consume the pending render job and start the loop ────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    const g = gRef.current
    if (!g.pendingRender) return
    const job = g.pendingRender
    g.pendingRender = null

    // Small delay to ensure canvas is fully in DOM
    const t = setTimeout(() => {
      if (canvasRef.current) job(canvasRef.current)
    }, 16)
    return () => clearTimeout(t)
  }, [phase])

  // ── Mouse tracking ──────────────────────────────────────────────────────────
  const attachMouse = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return () => {}
    const g = gRef.current
    const onMove = e => {
      const r = canvas.getBoundingClientRect()
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      g.handX = (cx - r.left) * (W / r.width)
      g.handY = (cy - r.top)  * (H / r.height)
    }
    const onLeave = () => { g.handX = null; g.handY = null }
    canvas.addEventListener('mousemove',  onMove)
    canvas.addEventListener('touchmove',  onMove, {passive:true})
    canvas.addEventListener('mouseleave', onLeave)
    return () => {
      canvas.removeEventListener('mousemove',  onMove)
      canvas.removeEventListener('touchmove',  onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  // ── Camera start ────────────────────────────────────────────────────────────
  const startCamera = async () => {
    SFX.click(); setLoading(true); setCamErr(''); setLoadingMsg('Loading hand tracking...')
    try {
      // Step 1 — load MediaPipe FIRST (so locateFile is set before camera starts)
      await loadMediaPipe()
      if (typeof window.Hands === 'undefined') throw new Error('mp:missing')

      // Step 2 — get camera
      setLoadingMsg('Requesting camera...')
      const stream = await navigator.mediaDevices
        .getUserMedia({video:{width:W,height:H},audio:false})
        .catch(err => { throw new Error('cam:'+err.name) })
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      setLoading(false); setLoadingMsg('')
      beginLevel(1, [], true)
    } catch (e) {
      setLoading(false); setLoadingMsg('')
      console.error('[HandSlicer] startCamera failed:', e.message)
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t=>t.stop())
        videoRef.current.srcObject = null
      }
      const m = e.message
      if (m.includes('cam:NotAllowed'))   { setCamErr('blocked');   toast.error('❌ Camera blocked — click the padlock and allow camera') }
      else if (m.includes('cam:NotFound')){ setCamErr('nocam');     toast.error('❌ No camera found on this device') }
      else if (m.startsWith('mp:'))       { setCamErr('mediapipe'); toast.error('❌ Hand tracking failed to load — try refreshing') }
      else                                { setCamErr('other');     toast.error('❌ ' + m) }
    }
  }

  // ── Mouse start ─────────────────────────────────────────────────────────────
  const startMouse = () => {
    SFX.click(); setCamErr('')
    beginLevel(1, [], false)
  }

  // ── Intro: "Catch the Xs" × 4 ───────────────────────────────────────────────
  const beginLevel = useCallback((lvl, prevResults, cam) => {
    const tgt = LEVEL_TARGET[lvl - 1]
    setLevel(lvl); setTarget(tgt); setCaught(0); setIntroStep(0); setPhase('intro')
    let step = 0
    const flash = () => {
      setIntroStep(step); step++
      if (step < 4) { SFX.tick(); setTimeout(flash, 700) }
      else setTimeout(() => launchLevel(lvl, tgt, prevResults, cam), 600)
    }
    flash()
  }, []) // eslint-disable-line

  // ── Game loop ────────────────────────────────────────────────────────────────
  const launchLevel = useCallback((lvl, tgt, prevResults, cam) => {
    const g = gRef.current
    g.objects=[]; g.trail=[]; g.caught=0; g.wrong=0; g.missed=0
    g.level=lvl; g.target=tgt; g.running=true

    const speed = levelSpeed(lvl)

    // Spawn shapes
    const spawn = () => {
      if (!g.running) return
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
      g.objects.push({
        shape, color: shapeColor(shape, lvl),
        x: 45 + Math.random() * (W - 90),
        y: -50,
        size: 38 + Math.random() * 14,
        vy: speed + Math.random() * 0.7,
        caught: false,
      })
      g.spawnTimer = setTimeout(spawn, 680 - lvl * 20)
    }
    spawn()

    // Render function — receives canvas directly so it never has to read the ref
    const startRender = (canvas) => {
      const cleanupMouse = attachMouse()
      const ctx = canvas.getContext('2d')

      const render = () => {
        if (!g.running) return

        // Background
        ctx.fillStyle = '#030308'; ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = 'rgba(0,245,255,0.025)'
        for (let row = 0; row < H; row += 40)
          for (let col = 0; col < W; col += 40) {
            ctx.beginPath(); ctx.arc(col, row, 1, 0, Math.PI*2); ctx.fill()
          }

        const hx = g.handX, hy = g.handY

        // Trail
        if (hx !== null && hy !== null) {
          g.trail.push({x:hx, y:hy})
          if (g.trail.length > 16) g.trail.shift()
        } else if (g.trail.length > 0) {
          g.trail.shift()
        }
        for (let i = 1; i < g.trail.length; i++) {
          const a = i / g.trail.length * 0.75
          ctx.beginPath()
          ctx.moveTo(g.trail[i-1].x, g.trail[i-1].y)
          ctx.lineTo(g.trail[i].x,   g.trail[i].y)
          ctx.strokeStyle = `rgba(0,245,255,${a})`
          ctx.lineWidth = a * 6; ctx.lineCap = 'round'; ctx.stroke()
        }

        // Objects
        const dead = []
        for (let i = g.objects.length - 1; i >= 0; i--) {
          const o = g.objects[i]

          if (o.shape === 'particle') {
            o.life--; if (o.life <= 0) { dead.push(i); continue }
            o.x += o.vx; o.y += o.vy
            ctx.save(); ctx.globalAlpha = o.life / 18
            ctx.beginPath(); ctx.arc(o.x, o.y, o.size, 0, Math.PI*2)
            ctx.fillStyle = o.color; ctx.shadowColor = o.color; ctx.shadowBlur = 8
            ctx.fill(); ctx.restore(); continue
          }

          o.y += o.vy
          if (o.y > H + 60) {
            if (!o.caught && o.shape === g.target) { g.missed++ }
            dead.push(i); continue
          }

          // Hit detection
          if (hx !== null && hy !== null && !o.caught) {
            const dx = hx - o.x, dy = hy - o.y
            if (Math.sqrt(dx*dx + dy*dy) < o.size * 0.6 + 22) {
              o.caught = true
              if (o.shape === g.target) {
                g.caught++; g.totalCaught++
                SFX.correct(); setCaught(g.caught)
                for (let p = 0; p < 8; p++) {
                  const a = (p/8)*Math.PI*2
                  g.objects.push({shape:'particle', color:o.color,
                    x:o.x, y:o.y, vx:Math.cos(a)*4.5, vy:Math.sin(a)*4-1,
                    size:5, life:18, caught:true})
                }
              } else {
                g.wrong++; g.totalWrong++; SFX.wrong()
                canvas.style.transform = 'translateX(5px)'
                setTimeout(() => canvas.style.transform = 'translateX(-4px)', 60)
                setTimeout(() => canvas.style.transform = 'none', 120)
              }
              dead.push(i); continue
            }
          }
          drawShape(ctx, o.shape, o.x, o.y, o.size, o.color)
        }
        for (const i of dead.sort((a,b)=>b-a)) g.objects.splice(i, 1)

        // Cursor
        if (hx !== null && hy !== null) {
          drawCursor(ctx, hx, hy, cam ? '#00f5ff' : '#ffd700')
        }

        // HUD
        ctx.save()
        ctx.font = 'bold 18px "Exo 2",monospace'
        ctx.fillStyle = '#00f5ff'; ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 8
        ctx.textAlign = 'left'
        ctx.fillText(`LVL ${lvl}/${TOTAL_LEVELS}`, 14, 30)
        ctx.fillStyle = shapeColor(tgt, lvl); ctx.shadowColor = ctx.fillStyle
        ctx.fillText(`${g.caught}/${PASS_COUNT} ${tgt}s`, 14, 54)
        ctx.textAlign = 'right'; ctx.fillStyle = '#ff4466'; ctx.shadowColor = '#ff4466'
        ctx.fillText(`✗ ${g.wrong}`, W - 14, 30)
        if (!cam) {
          ctx.fillStyle = 'rgba(255,215,0,0.5)'; ctx.shadowBlur = 0
          ctx.font = '11px monospace'; ctx.textAlign = 'center'
          ctx.fillText('🖱 Mouse mode', W/2, H - 10)
        }
        ctx.restore()

        if (g.caught >= PASS_COUNT) {
          endLevel(lvl, prevResults, tgt, cam, cleanupMouse)
          return
        }
        g.frameId = requestAnimationFrame(render)
      }
      render()

      // Camera tracking
      if (cam && typeof window.Hands !== "undefined") {
        try {
          const hands = new window.Hands({ locateFile: f => `https://unpkg.com/@mediapipe/hands@0.4.1675469240/${f}` })
          hands.setOptions({maxNumHands:1, modelComplexity:0, minDetectionConfidence:0.65, minTrackingConfidence:0.5})
          g.hands = hands
          hands.onResults(results => {
            if (!g.running) return
            if (results.multiHandLandmarks?.length > 0) {
              const tip = results.multiHandLandmarks[0][8]
              g.handX = (1 - tip.x) * W
              g.handY = tip.y * H
            }
          })
          const camLoop = async () => {
            if (!g.running) return
            if (videoRef.current?.readyState >= 2)
              await hands.send({image: videoRef.current}).catch(() => {})
            setTimeout(camLoop, 33)
          }
          camLoop()
        } catch(e) { console.warn('MediaPipe failed, using mouse', e) }
      }
    }

    // KEY FIX: store the render starter as a pending job.
    // useEffect above will call it once the canvas is mounted.
    g.pendingRender = startRender

    // Switch phase — this triggers re-render which mounts the canvas
    setPhase('playing')
    setCaught(0)
  }, [attachMouse]) // eslint-disable-line

  const endLevel = useCallback((lvl, prevResults, tgt, cam, cleanupMouse) => {
    const g = gRef.current
    if (!g.running) return
    g.running = false
    clearTimeout(g.spawnTimer)
    cancelAnimationFrame(g.frameId)
    if (cleanupMouse) cleanupMouse()
    SFX.levelup()

    const result = {level:lvl, target:tgt, caught:g.caught, wrong:g.wrong, missed:g.missed}
    const allResults = [...prevResults, result]
    setLevelResults(allResults)

    if (lvl >= TOTAL_LEVELS) finishGame(allResults)
    else {
      setPhase('levelup')
      setTimeout(() => beginLevel(lvl + 1, allResults, cam), 2200)
    }
  }, [beginLevel]) // eslint-disable-line

  const finishGame = useCallback((allResults) => {
    const g = gRef.current
    g.running = false
    clearTimeout(g.spawnTimer)
    cancelAnimationFrame(g.frameId)
    if (videoRef.current?.srcObject)
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
    SFX.end()
    const total  = allResults.reduce((s,r) => s + r.caught, 0)
    const wrongs = allResults.reduce((s,r) => s + r.wrong,  0)
    const score  = Math.max(0, total * 10 - wrongs * 3)
    setFinalScore(score)
    setPhase('result')
    submitScore('handslicer', score, 'hard', 'completed',
      {levels:TOTAL_LEVELS, totalCaught:total, totalWrong:wrongs}).catch(() => {})
    toast.success(`✋ All ${TOTAL_LEVELS} levels complete! Score: ${score}`)
  }, [submitScore])

  useEffect(() => () => {
    const g = gRef.current
    g.running = false
    clearTimeout(g.spawnTimer)
    cancelAnimationFrame(g.frameId)
    if (videoRef.current?.srcObject)
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
  }, [])

  // ─── RENDER ────────────────────────────────────────────────────────────────

  const renderPhase = () => {
  if (phase === 'menu') return (
    <div style={{textAlign:'center',padding:'28px 20px',maxWidth:'580px',margin:'0 auto'}}>
      <div style={{fontSize:'58px',marginBottom:'10px',animation:'float 3s ease-in-out infinite'}}>✋</div>
      <h2 style={{fontSize:'26px',fontWeight:900,marginBottom:'6px',fontFamily:'var(--font-display)'}}>
        Hand Slicer
      </h2>
      <p style={{color:'var(--text-secondary)',fontSize:'13px',maxWidth:'420px',margin:'0 auto 22px',lineHeight:1.7}}>
        Catch falling shapes. Each level shows which shape to catch 4 times before starting.
        Catch <strong style={{color:'var(--neon-cyan)'}}>{PASS_COUNT}</strong> to pass.
        <strong style={{color:'var(--neon-gold)'}}> 20 levels</strong> — shapes fade as speed increases!
      </p>

      {camErr === 'blocked' && (
        <div style={{marginBottom:'18px',padding:'14px 16px',background:'rgba(255,0,102,0.08)',
          border:'1px solid rgba(255,0,102,0.3)',borderRadius:'10px',
          fontSize:'13px',textAlign:'left',color:'var(--text-secondary)',lineHeight:1.8}}>
          <strong style={{color:'#ff4466',display:'block',marginBottom:'4px'}}>⚠ Camera blocked</strong>
          Click the 🔒 icon → Camera → Allow, then reload.
          Or use <strong style={{color:'var(--neon-gold)'}}>Mouse Mode</strong>.
        </div>
      )}
      {camErr === 'mediapipe' && (
        <div style={{marginBottom:'18px',padding:'14px 16px',background:'rgba(255,107,0,0.08)',
          border:'1px solid rgba(255,107,0,0.3)',borderRadius:'10px',
          fontSize:'13px',textAlign:'left',color:'var(--text-secondary)',lineHeight:1.8}}>
          <strong style={{color:'var(--neon-orange)',display:'block',marginBottom:'6px'}}>⚠ MediaPipe not installed</strong>
          <code style={{display:'block',padding:'8px 12px',background:'rgba(0,0,0,0.5)',
            borderRadius:'6px',color:'var(--neon-cyan)',fontSize:'12px'}}>
            npm install @mediapipe/hands vite-plugin-static-copy
          </code>
          Or use <strong style={{color:'var(--neon-gold)'}}>Mouse Mode</strong> — no install needed!
        </div>
      )}
      {camErr === 'nocam' && (
        <div style={{marginBottom:'18px',padding:'12px 16px',background:'rgba(255,107,0,0.07)',
          border:'1px solid rgba(255,107,0,0.25)',borderRadius:'10px',
          fontSize:'13px',color:'var(--text-secondary)'}}>
          <strong style={{color:'var(--neon-orange)'}}>⚠ No camera detected.</strong> Use Mouse Mode.
        </div>
      )}

      <div style={{display:'flex',gap:'16px',justifyContent:'center',marginBottom:'24px',flexWrap:'wrap'}}>
        {SHAPES.map(s => (
          <div key={s} style={{textAlign:'center'}}>
            <canvas width={56} height={56} ref={el => {
              if (!el) return
              const ctx = el.getContext('2d'); ctx.clearRect(0,0,56,56)
              drawShape(ctx, s, 28, 28, 30, shapeColor(s, 1))
            }} />
            <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'3px',textTransform:'capitalize'}}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap',marginBottom:'14px'}}>
        <button className="btn btn-primary" onClick={startCamera} disabled={loading} style={{minWidth:'190px'}}>
          {loading ? (loadingMsg || '⏳ Starting…') : '📷 Camera Mode'}
        </button>
        <button className="btn btn-secondary" onClick={startMouse} style={{minWidth:'190px'}}>
          🖱 Mouse Mode
        </button>
      </div>
      <div style={{fontSize:'11px',color:'var(--text-muted)'}}>
        Camera uses MediaPipe hand tracking · Mouse works instantly
      </div>
    </div>
  )

  if (phase === 'intro') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',minHeight:'400px',gap:'18px'}}>
      <div style={{fontSize:'18px',color:'var(--text-muted)',fontFamily:'var(--font-mono)',letterSpacing:'0.12em'}}>
        LEVEL {level} / {TOTAL_LEVELS}
      </div>
      <div key={introStep} style={{
        fontSize:'44px',fontWeight:900,fontFamily:'var(--font-display)',
        color: shapeColor(target, level),
        textShadow:`0 0 24px ${shapeColor(target,level)}, 0 0 48px ${shapeColor(target,level)}80`,
        animation:'fadeIn 0.15s ease',
      }}>
        Catch the {target}s
      </div>
      <canvas width={80} height={80} ref={el => {
        if (!el) return
        const ctx = el.getContext('2d'); ctx.clearRect(0,0,80,80)
        drawShape(ctx, target, 40, 40, 46, shapeColor(target, level))
      }} />
      <div style={{color:'var(--text-muted)',fontSize:'13px'}}>
        Catch <strong style={{color:'var(--neon-cyan)'}}>{PASS_COUNT}</strong> {target}s to advance
      </div>
      <div style={{display:'flex',gap:'10px'}}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width:11, height:11, borderRadius:'50%', transition:'all 0.25s',
            background: i <= introStep ? shapeColor(target,level) : 'var(--bg-elevated)',
            boxShadow: i <= introStep ? `0 0 10px ${shapeColor(target,level)}` : 'none',
          }} />
        ))}
      </div>
    </div>
  )

  if (phase === 'levelup') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',minHeight:'400px',gap:'14px',animation:'fadeIn 0.3s ease'}}>
      <div style={{fontSize:'54px'}}>⚡</div>
      <h2 style={{fontSize:'34px',fontFamily:'var(--font-display)',color:'var(--neon-gold)',
        textShadow:'0 0 20px rgba(255,215,0,0.8)'}}>
        Level {level} Clear!
      </h2>
      <p style={{color:'var(--text-secondary)',fontSize:'13px'}}>
        ✓ {levelResults[levelResults.length-1]?.caught} caught
        {' · '}✗ {levelResults[levelResults.length-1]?.wrong} wrong
      </p>
      <div style={{color:'var(--text-muted)',fontSize:'12px'}}>Next level starting…</div>
    </div>
  )

  if (phase === 'playing') return (
    <div style={{position:'relative', display:'inline-block'}}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          display:'block', maxWidth:'100%', borderRadius:'12px', cursor:'none',
          border:'1px solid rgba(0,245,255,0.18)',
          boxShadow:'0 0 32px rgba(0,245,255,0.07)',
          background:'#030308',
        }}
      />
      <div style={{
        position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)',
        background:'rgba(3,3,8,0.88)', border:`1px solid ${shapeColor(target,level)}35`,
        borderRadius:'99px', padding:'4px 18px',
        fontSize:'13px', fontWeight:700, color:shapeColor(target,level), pointerEvents:'none',
      }}>
        Catch the {target}s · {caught}/{PASS_COUNT}
      </div>
    </div>
  )

  if (phase === 'result') {
    const total    = levelResults.reduce((s,r) => s+r.caught, 0)
    const wrongs   = levelResults.reduce((s,r) => s+r.wrong, 0)
    const missed   = levelResults.reduce((s,r) => s+r.missed, 0)
    const accuracy = Math.round((total / (total+wrongs+missed||1)) * 100)
    return (
      <div style={{padding:'24px 20px',maxWidth:'700px',margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:'26px'}}>
          <div style={{fontSize:'54px',marginBottom:'8px'}}>🏆</div>
          <h2 style={{fontSize:'30px',fontFamily:'var(--font-display)',fontWeight:900}}>
            All {TOTAL_LEVELS} Levels Complete!
          </h2>
          <div style={{display:'flex',gap:'14px',justifyContent:'center',flexWrap:'wrap',marginTop:'16px'}}>
            {[
              {label:'Score',    value:finalScore,   color:'var(--neon-cyan)'},
              {label:'Caught',   value:total,        color:'var(--neon-green)'},
              {label:'Wrong',    value:wrongs,       color:'#ff4466'},
              {label:'Accuracy', value:accuracy+'%', color:'var(--neon-gold)'},
            ].map(({label,value,color}) => (
              <div key={label} style={{background:'var(--bg-card)',border:'1px solid var(--border-dim)',
                borderRadius:'12px',padding:'14px 20px',textAlign:'center',minWidth:'105px'}}>
                <div style={{fontSize:'26px',fontWeight:900,color,fontFamily:'var(--font-display)'}}>{value}</div>
                <div style={{fontSize:'10px',color:'var(--text-muted)',textTransform:'uppercase',
                  letterSpacing:'0.1em',marginTop:'3px'}}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:'var(--bg-card)',border:'1px solid var(--border-dim)',
          borderRadius:'12px',overflow:'hidden',marginBottom:'20px'}}>
          <div style={{padding:'11px 16px',borderBottom:'1px solid var(--border-dim)',
            fontSize:'11px',fontWeight:700,letterSpacing:'0.12em',
            color:'var(--text-muted)',textTransform:'uppercase'}}>
            Level Performance
          </div>
          <div style={{maxHeight:'250px',overflowY:'auto'}}>
            {levelResults.map((r,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',
                padding:'9px 16px',borderBottom:'1px solid rgba(255,255,255,0.03)',fontSize:'13px'}}>
                <span style={{color:'var(--text-muted)',fontFamily:'var(--font-mono)',minWidth:'50px'}}>
                  Lvl {r.level}
                </span>
                <span style={{flex:1,color:shapeColor(r.target,r.level),fontWeight:700,textTransform:'capitalize'}}>
                  {r.target}s
                </span>
                <span style={{color:'var(--neon-green)',fontFamily:'var(--font-mono)'}}>✓{r.caught}</span>
                <span style={{color:'#ff4466',fontFamily:'var(--font-mono)',marginLeft:'4px'}}>✗{r.wrong}</span>
                <div style={{width:'55px',height:'5px',background:'var(--bg-elevated)',borderRadius:'99px',overflow:'hidden',marginLeft:'4px'}}>
                  <div style={{height:'100%',
                    width:`${Math.min((r.caught/PASS_COUNT)*100,100)}%`,
                    background:`linear-gradient(to right,${shapeColor(r.target,r.level)},${shapeColor(r.target,r.level)}70)`,
                    borderRadius:'99px'}} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{textAlign:'center'}}>
          <button className="btn btn-primary" onClick={() => {
            setPhase('menu'); setLevelResults([]); setFinalScore(0)
            const g = gRef.current; g.totalCaught=0; g.totalWrong=0; g.totalMissed=0
          }}>Play Again</button>
          <div style={{marginTop:'10px',fontSize:'12px',color:'var(--text-muted)'}}>
            +{Math.floor(finalScore/5)} XP awarded
          </div>
        </div>
      </div>
    )
  }

  return null
  } // end renderPhase

  return (
    <>
      <video
        ref={videoRef}
        style={{display:'none', position:'fixed', top:0, left:0, pointerEvents:'none'}}
        width={W} height={H}
        playsInline muted
      />
      {renderPhase()}
    </>
  )
}