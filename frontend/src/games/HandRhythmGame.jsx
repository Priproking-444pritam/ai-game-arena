import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { loadMediaPipe } from '../mediapipe-loader'

// ─── Config — simplified for accessibility ────────────────────────────────────
const W = 640, H = 480
const CIRCLE_R  = 60    // bigger targets
const CURSOR_R  = 30    // bigger hand cursor
const APPROACH  = 2500  // approach ring shrink time (ms)
const GAP_MS    = 800   // min gap between circles (less crowded)

// Difficulty only changes timing window — everything else stays the same
const DIFF = {
  easy:   { window: 600, label: 'Easy',   color: '#00ff88', desc: 'Large timing window' },
  medium: { window: 380, label: 'Medium', color: '#ffd700', desc: 'Standard' },
  hard:   { window: 220, label: 'Hard',   color: '#ff4466', desc: 'Tight timing' },
}

// ─── 5 Built-in Songs ─────────────────────────────────────────────────────────
const SONGS = [
  { id:'cyberpunk', name:'Cyber Punk',  bpm:100, color:'#00f5ff', icon:'⚡', desc:'100 BPM · Electronic',
    drum:[1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    scale:[261,294,330,392,440,523,587,659] },
  { id:'neonpop',  name:'Neon Pop',    bpm:110, color:'#bf00ff', icon:'🌈', desc:'110 BPM · Synth Pop',
    drum:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], hihat:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],
    scale:[294,330,370,440,494,587,659,740] },
  { id:'acidbass', name:'Acid Bass',   bpm: 85, color:'#ffd700', icon:'🎸', desc:'85 BPM · Bass Heavy',
    drum:[1,0,0,1,0,0,1,0,1,1,0,0,0,0,1,0], hihat:[1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1], snare:[0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0],
    scale:[131,147,165,196,220,262,294,330] },
  { id:'spacerave',name:'Space Rave',  bpm:120, color:'#ff0066', icon:'🚀', desc:'120 BPM · Rave',
    drum:[1,0,1,0,1,0,1,0,1,0,1,1,0,1,1,0], hihat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0],
    scale:[349,392,440,523,587,698,784,880] },
  { id:'dreamwave',name:'Dream Wave',  bpm: 75, color:'#00ff88', icon:'🌊', desc:'75 BPM · Chill',
    drum:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0], hihat:[1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0], snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    scale:[220,247,262,294,330,370,392,440] },
]

// ─── Audio engine ─────────────────────────────────────────────────────────────
let _ac = null
const ac = () => {
  if (!_ac || _ac.state==='closed') _ac = new (window.AudioContext||window.webkitAudioContext)()
  if (_ac.state==='suspended') _ac.resume()
  return _ac
}
const kick  = t => { try { const a=ac(),o=a.createOscillator(),g=a.createGain(); o.connect(g);g.connect(a.destination); o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(0.01,t+0.5); g.gain.setValueAtTime(1,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.5); o.start(t);o.stop(t+0.5) }catch(_){} }
const snare = t => { try { const a=ac(),b=a.createBuffer(1,a.sampleRate*0.15,a.sampleRate),d=b.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; const s=a.createBufferSource(),g=a.createGain(); s.buffer=b;s.connect(g);g.connect(a.destination); g.gain.setValueAtTime(0.35,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.15); s.start(t);s.stop(t+0.15) }catch(_){} }
const hihat = t => { try { const a=ac(),b=a.createBuffer(1,a.sampleRate*0.04,a.sampleRate),d=b.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain(); f.type='highpass';f.frequency.value=8000; s.connect(f);f.connect(g);g.connect(a.destination); g.gain.setValueAtTime(0.15,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.04); s.start(t);s.stop(t+0.04) }catch(_){} }
const note  = (freq,t,dur=0.15) => { try { const a=ac(),o=a.createOscillator(),g=a.createGain(); o.connect(g);g.connect(a.destination); o.type='triangle';o.frequency.value=freq; g.gain.setValueAtTime(0.1,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur); o.start(t);o.stop(t+dur) }catch(_){} }
const beep  = (freq,dur,type='sine',vol=0.12) => { try { const a=ac(),o=a.createOscillator(),g=a.createGain(); o.connect(g);g.connect(a.destination); o.type=type;o.frequency.value=freq; g.gain.setValueAtTime(vol,a.currentTime);g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+dur); o.start();o.stop(a.currentTime+dur) }catch(_){} }
const SFX = {
  hit:     () => { beep(880,0.08,'sine',0.15) },
  perfect: () => { beep(1100,0.07); setTimeout(()=>beep(1400,0.09),60) },
  miss:    () => beep(220,0.15,'sawtooth',0.08),
  win:     () => [660,880,1100,1320].forEach((f,i)=>setTimeout(()=>beep(f,0.12),i*90)),
  click:   () => beep(500,0.05),
}

function scheduleSong(song, durationSec) {
  const a = ac()
  const stepSec = 60 / song.bpm / 4
  const steps = Math.ceil(durationSec / stepSec)
  const t0 = a.currentTime + 0.05
  const beats = []
  for (let i = 0; i < steps; i++) {
    const t = t0 + i * stepSec
    const p = i % 16
    if (song.drum[p])  kick(t)
    if (song.snare[p]) snare(t)
    if (song.hihat[p]) hihat(t)
    if (p % 4 === 0 && song.drum[p]) {
      const f = song.scale[Math.floor(i/4) % song.scale.length]
      note(f, t + stepSec*0.1, stepSec*1.4)
    }
    if (song.drum[p] || song.snare[p]) {
      beats.push({ ms: APPROACH + i*stepSec*1000, big: !!song.drum[p] })
    }
  }
  return { beats, startOffset: t0 - a.currentTime }
}

// ─── Beat detection for uploaded audio ───────────────────────────────────────
async function analyzeAudio(file, onProg) {
  onProg?.(10)
  const ctx2 = new AudioContext()
  const buf = await ctx2.decodeAudioData(await file.arrayBuffer())
  onProg?.(40)
  const data = buf.getChannelData(0), sr = buf.sampleRate
  const chunk = Math.floor(sr*0.1), energies = []
  for(let i=0;i<data.length;i+=chunk){ let e=0,end=Math.min(i+chunk,data.length); for(let j=i;j<end;j++) e+=data[j]*data[j]; energies.push(e/(end-i)) }
  const maxE=Math.max(...energies), peaks=[]
  for(let i=1;i<energies.length-1;i++) if(energies[i]>energies[i-1]&&energies[i]>energies[i+1]&&energies[i]>maxE*0.3) peaks.push(i)
  const bpm = peaks.length<2 ? 120 : (() => { const iv=peaks.slice(1).map((p,i)=>p-peaks[i]); const m=new Map(); iv.forEach(x=>m.set(x,(m.get(x)||0)+1)); let b=iv[0],bc=0; m.forEach((c,k)=>{if(c>bc){bc=c;b=k}}); return Math.max(60,Math.min(200,(1/b)*(1000/(chunk/sr))*60)) })()
  onProg?.(70)
  const hop=512,frame=2048,nf=Math.floor((data.length-frame)/hop),prev=new Array(frame/2).fill(0),onset=[]
  for(let i=0;i<nf;i++){ const fr=data.slice(i*hop,i*hop+frame),spec=new Array(frame/2); for(let b=0;b<frame/2;b++){const s=Math.floor(b/(frame/2)*frame),e2=Math.floor((b+1)/(frame/2)*frame);let en=0;for(let j=s;j<e2&&j<fr.length;j++)en+=fr[j]*fr[j];spec[b]=Math.sqrt(en)} let flux=0;for(let b=0;b<frame/2;b++)flux+=Math.max(0,spec[b]-prev[b]);onset.push(flux);prev.splice(0,prev.length,...spec) }
  const avg=onset.reduce((a,b)=>a+b,0)/onset.length, thresh=avg*1.8, rawBeats=[]
  for(let i=1;i<onset.length-1;i++) if(onset[i]>onset[i-1]&&onset[i]>onset[i+1]&&onset[i]>thresh) rawBeats.push({ms:(i*hop*1000)/sr,intensity:Math.min(1,onset[i]/(thresh*2))})
  const beats = rawBeats.length>10 ? rawBeats : (() => { const r=[],iv=(60/bpm)*1000,dur=(data.length/sr)*1000; for(let i=0;i<Math.floor(dur/iv);i++) r.push({ms:i*iv,intensity:1}); return r })()
  onProg?.(100); await ctx2.close()
  return { bpm: Math.round(bpm), beats, duration: buf.duration }
}

// ─── Circle helpers ───────────────────────────────────────────────────────────
function makeCircles(beats, isBuiltin) {
  const margin = CIRCLE_R + 20
  const src = isBuiltin
    ? beats.map(b => ({ ms: b.ms, big: b.big }))
    : beats.filter(b => b.intensity >= 0.5).map(b => ({ ms: b.ms + APPROACH, big: b.intensity > 0.8 }))
  const filtered = [], lastMs = [-Infinity]
  for (const b of src) if (b.ms - lastMs[0] >= GAP_MS) { filtered.push(b); lastMs[0] = b.ms }
  return filtered.map((b, i) => ({
    id: i,
    x: margin + Math.random() * (W - margin*2),
    y: margin + Math.random() * (H - margin*2),
    r: b.big ? CIRCLE_R : CIRCLE_R * 0.85,
    beatMs: b.ms,
    spawnMs: b.ms - APPROACH,
    visible: false, hit: false, hitType: null,
  }))
}

function drawCircle(ctx, c, elapsed, color) {
  if (!c.visible || c.hit) return
  const prog = Math.min((elapsed - c.spawnMs) / APPROACH, 1)
  const approachR = c.r * (2.8 - 1.8*prog)  // shrinks from big to circle size

  ctx.save()
  // Outer approach ring
  ctx.beginPath(); ctx.arc(c.x, c.y, approachR, 0, Math.PI*2)
  ctx.strokeStyle = color + '99'; ctx.lineWidth = 3
  ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.stroke()

  // Inner hit circle — pulses when approach ring is close
  const pulse = prog > 0.85 ? 1 + 0.12*Math.sin(elapsed/60) : 1
  ctx.beginPath(); ctx.arc(c.x, c.y, c.r * pulse, 0, Math.PI*2)
  ctx.fillStyle = color + 'aa'
  ctx.shadowColor = color; ctx.shadowBlur = prog > 0.85 ? 25 : 12; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.shadowBlur = 0; ctx.stroke()

  // Number label
  ctx.fillStyle = '#fff'; ctx.font = `bold 16px monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(c.id + 1, c.x, c.y)
  ctx.restore()
}

function drawCursor(ctx, cur, cam) {
  if (!cur.active) return
  ctx.save()
  // Outer glow ring
  ctx.beginPath(); ctx.arc(cur.x, cur.y, CURSOR_R, 0, Math.PI*2)
  ctx.fillStyle = cam ? 'rgba(34,211,238,0.20)' : 'rgba(255,215,0,0.18)'
  ctx.shadowColor = cam ? 'cyan' : '#ffd700'; ctx.shadowBlur = 28; ctx.fill()
  // Inner dot
  ctx.beginPath(); ctx.arc(cur.x, cur.y, CURSOR_R*0.35, 0, Math.PI*2)
  ctx.fillStyle = cam ? 'rgba(34,211,238,0.9)' : 'rgba(255,215,0,0.9)'
  ctx.shadowBlur = 0; ctx.fill()
  ctx.restore()
}

function drawProximityArc(ctx, c, cur, color) {
  // Show a proximity arc around circles when hand is close — guides the player
  if (!c.visible || c.hit) return
  const dx = cur.x - c.x, dy = cur.y - c.y
  const dist = Math.sqrt(dx*dx + dy*dy)
  const threshold = c.r + CURSOR_R + 80
  if (dist > threshold) return
  const proximity = 1 - dist/threshold  // 0..1
  ctx.save()
  ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 8, 0, Math.PI*2)
  ctx.strokeStyle = color
  ctx.globalAlpha = proximity * 0.7
  ctx.lineWidth = 4; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.stroke()
  ctx.restore()
}

function burst(x, y, color) {
  return Array.from({length:12}, (_,i) => {
    const a = (Math.PI*2*i)/12, sp = 2.5 + Math.random()*3
    return { x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:1, color }
  })
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HandRhythmGame() {
  const { user, submitScore } = useAuth()
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const audioRef  = useRef(null)
  const gRef = useRef({
    circles:[], particles:[], cursor:{x:0,y:0,active:false},
    running:false, frameId:null,
    score:0, combo:0, maxCombo:0,
    perfect:0, good:0, miss:0,
    feedback:null, feedbackAlpha:0,
    t0:0, pendingRender:null,
  })

  const [tab,           setTab]         = useState('builtin')
  const [song,          setSong]        = useState(SONGS[0])
  const [diff,          setDiff]        = useState('easy')   // default easy
  const [phase,         setPhase]       = useState('menu')
  const [analysisRes,   setAnalysisRes] = useState(null)
  const [analyzeProgress, setAP]       = useState(0)
  const [audioFile,     setAudioFile]   = useState(null)
  const [audioUrl,      setAudioUrl]    = useState(null)
  const [score,         setScore]       = useState(0)
  const [combo,         setCombo]       = useState(0)
  const [camErr,        setCamErr]      = useState('')
  const [loading,       setLoading]     = useState(false)
  const [useCam,        setUseCam]      = useState(false)
  const meta = useRef({ name:'', color:'#00f5ff', isBuiltin:false })

  if (!user) return (
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:'48px',marginBottom:'12px'}}>🔒</div>
      <h2>Login Required</h2>
      <Link to="/login" className="btn btn-primary" style={{marginTop:'12px'}}>Login</Link>
    </div>
  )

  // Start render once canvas mounts
  useEffect(() => {
    if (phase !== 'playing') return
    const g = gRef.current; if (!g.pendingRender) return
    const job = g.pendingRender; g.pendingRender = null
    const tid = setTimeout(() => { if (canvasRef.current) job(canvasRef.current) }, 16)
    return () => clearTimeout(tid)
  }, [phase])

  // Mouse / touch tracking
  const attachMouse = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return () => {}
    const g = gRef.current
    const move = e => {
      const r = canvas.getBoundingClientRect()
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      g.cursor.x = (cx - r.left) * (W / r.width)
      g.cursor.y = (cy - r.top)  * (H / r.height)
      g.cursor.active = true
    }
    canvas.addEventListener('mousemove', move)
    canvas.addEventListener('touchmove', move, {passive:true})
    canvas.addEventListener('mouseleave', () => { g.cursor.active = false })
    return () => {
      canvas.removeEventListener('mousemove', move)
      canvas.removeEventListener('touchmove', move)
    }
  }, [])

  // Camera setup — MediaPipe first, then stream
  const setupCamera = async () => {
    await loadMediaPipe().catch(() => { throw new Error('mp:load') })
    if (typeof window.Hands === 'undefined') throw new Error('mp:missing')
    const stream = await navigator.mediaDevices
      .getUserMedia({video:{width:W,height:H},audio:false})
      .catch(e => { throw new Error('cam:'+e.name) })
    videoRef.current.srcObject = stream
    await videoRef.current.play()
  }

  const handleCamErr = (e, fallback) => {
    const m = e.message
    if (m.includes('cam:NotAllowed'))  setCamErr('blocked')
    else if (m.includes('cam:NotFound')) setCamErr('nocam')
    else if (m.startsWith('mp:'))      setCamErr('mediapipe')
    else                               setCamErr('other')
    return fallback
  }

  // Start built-in song
  const startBuiltin = async (withCam) => {
    SFX.click(); setLoading(true); setCamErr('')
    let cam = withCam
    try { if (withCam) await setupCamera() }
    catch(e) { cam = handleCamErr(e, false); if (videoRef.current?.srcObject) { videoRef.current.srcObject.getTracks().forEach(t=>t.stop()); videoRef.current.srcObject=null } }
    setLoading(false); setUseCam(cam)
    const sched = scheduleSong(song, 60)
    meta.current = { name: song.name, color: song.color, isBuiltin: true }
    launch(makeCircles(sched.beats, true), cam, song.color, null, sched.startOffset, diff)
  }

  // Upload file
  const handleUpload = async e => {
    const file = e.target.files?.[0]; if (!file) return
    setAudioFile(file); setAudioUrl(URL.createObjectURL(file))
    setPhase('analyzing'); setAP(0)
    try {
      const res = await analyzeAudio(file, p => setAP(p))
      setAnalysisRes(res); gRef.current.analysisResult = res
      setPhase('upload_ready')
      toast.success(`✅ ${res.beats.length} beats · ${res.bpm} BPM`)
    } catch { toast.error('Analysis failed. Try MP3/WAV.'); setPhase('menu') }
  }

  // Start uploaded song
  const startUpload = async (withCam) => {
    SFX.click()
    const res = analysisRes || gRef.current.analysisResult; if (!res) return
    setLoading(true); setCamErr('')
    let cam = withCam
    try { if (withCam) await setupCamera() }
    catch(e) { cam = handleCamErr(e, false); if (videoRef.current?.srcObject) { videoRef.current.srcObject.getTracks().forEach(t=>t.stop()); videoRef.current.srcObject=null } }
    setLoading(false); setUseCam(cam)
    meta.current = { name: audioFile?.name || 'Uploaded Song', color: '#00f5ff', isBuiltin: false }
    launch(makeCircles(res.beats, false), cam, '#00f5ff', audioRef.current, 0, diff)
  }

  // Core game launcher
  const launch = useCallback((circles, cam, color, audioEl, startOffset, diffKey) => {
    const g = gRef.current
    const d = DIFF[diffKey] || DIFF.easy
    const hitWin = d.window

    g.circles = circles; g.particles = []
    g.score = 0; g.combo = 0; g.maxCombo = 0
    g.perfect = 0; g.good = 0; g.miss = 0
    g.feedback = null; g.feedbackAlpha = 0; g.running = true

    const startRender = canvas => {
      const cleanMouse = attachMouse()
      const ctx = canvas.getContext('2d')

      if (audioEl) { audioEl.currentTime = 0; audioEl.play().catch(()=>{}) }
      g.t0 = performance.now() + startOffset*1000

      const render = () => {
        if (!g.running) return
        const now = performance.now() - g.t0

        // Background
        ctx.fillStyle = '#030308'; ctx.fillRect(0,0,W,H)
        // Subtle dot grid
        ctx.fillStyle = color + '07'
        for (let row=0; row<H; row+=44) for (let col=0; col<W; col+=44) {
          ctx.beginPath(); ctx.arc(col,row,1.5,0,Math.PI*2); ctx.fill()
        }

        // Spawn circles
        g.circles.forEach(c => { if (!c.hit && !c.visible && now >= c.spawnMs) c.visible = true })

        // Draw proximity arcs first (behind circles)
        if (g.cursor.active)
          g.circles.forEach(c => drawProximityArc(ctx, c, g.cursor, color))

        // Draw circles
        g.circles.forEach(c => drawCircle(ctx, c, now, color))

        // ── Hit detection ──────────────────────────────────────────────────
        // Simplified: just needs to overlap the circle — no strict timing gate
        // Timing only determines PERFECT vs GOOD, not whether it registers
        if (g.cursor.active) {
          for (const c of g.circles) {
            if (c.hit || !c.visible) continue
            const dx = g.cursor.x - c.x, dy = g.cursor.y - c.y
            const dist = Math.sqrt(dx*dx + dy*dy)
            // Generous hit zone: cursor + circle radius + small buffer
            if (dist > c.r + CURSOR_R + 10) continue
            // Only count if within timing window
            const timeDiff = Math.abs(now - c.beatMs)
            if (timeDiff > hitWin) continue

            c.hit = true; c.hitType = timeDiff < hitWin*0.3 ? 'perfect' : 'good'
            const pts = c.hitType === 'perfect' ? 300 : 150
            g.combo++; if (g.combo > g.maxCombo) g.maxCombo = g.combo
            g[c.hitType]++
            // Combo multiplier: simple 1x/1.5x/2x
            const mult = g.combo >= 20 ? 2 : g.combo >= 10 ? 1.5 : 1
            g.score += Math.floor(pts * mult)
            setScore(g.score); setCombo(g.combo)
            if (c.hitType === 'perfect') SFX.perfect(); else SFX.hit()
            g.feedback = { text: c.hitType === 'perfect' ? 'PERFECT!' : 'GOOD!', color: c.hitType === 'perfect' ? '#FFD700' : '#06B6D4' }
            g.feedbackAlpha = 1
            g.particles.push(...burst(c.x, c.y, c.hitType === 'perfect' ? '#FFD700' : '#06B6D4'))
            break
          }
        }

        // Miss detection — generous: only miss after hitWin*1.5 past beat
        for (const c of g.circles) {
          if (!c.hit && c.visible && now > c.beatMs + hitWin * 1.5) {
            c.hit = true; g.miss++; g.combo = 0; setCombo(0)
            g.feedback = { text: 'MISS', color: '#EF4444' }; g.feedbackAlpha = 1; SFX.miss()
          }
        }

        // Particles
        for (let i = g.particles.length-1; i >= 0; i--) {
          const p = g.particles[i]
          p.x += p.vx; p.y += p.vy; p.life -= 0.03
          if (p.life <= 0) { g.particles.splice(i,1); continue }
          ctx.save(); ctx.globalAlpha = p.life
          ctx.beginPath(); ctx.arc(p.x,p.y,5,0,Math.PI*2)
          ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10; ctx.fill()
          ctx.restore()
        }

        drawCursor(ctx, g.cursor, cam)

        // Feedback text
        if (g.feedbackAlpha > 0) {
          ctx.save(); ctx.globalAlpha = g.feedbackAlpha
          ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillStyle = g.feedback.color; ctx.shadowColor = g.feedback.color; ctx.shadowBlur = 16
          ctx.fillText(g.feedback.text, W/2, H*0.35)
          ctx.restore()
          g.feedbackAlpha = Math.max(0, g.feedbackAlpha - 0.025)
        }

        // HUD
        ctx.save()
        // Score
        ctx.font = 'bold 20px monospace'; ctx.fillStyle = color
        ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.textAlign = 'left'
        ctx.fillText(`⚡ ${g.score}`, 14, 32)
        // Combo
        if (g.combo > 1) {
          ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'
          ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'
          ctx.fillText(`${g.combo}× COMBO`, W/2, 32)
        }
        // Progress
        const done = g.circles.filter(c=>c.hit).length
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.shadowBlur = 0
        ctx.font = '12px monospace'; ctx.textAlign = 'right'
        ctx.fillText(`${done}/${g.circles.length}`, W-14, 30)
        // Diff
        ctx.fillStyle = d.color+'cc'; ctx.font = 'bold 11px monospace'
        ctx.fillText(d.label, W-14, 46)
        // Hint
        if (!cam) { ctx.fillStyle='rgba(255,215,0,0.4)'; ctx.textAlign='center'; ctx.font='11px monospace'; ctx.fillText('🖱 Move mouse to circle as ring closes',W/2,H-10) }
        else       { ctx.fillStyle='rgba(34,211,238,0.4)'; ctx.textAlign='center'; ctx.font='11px monospace'; ctx.fillText('✋ Move hand to circle as ring closes',W/2,H-10) }
        ctx.restore()

        // End check
        const allDone = g.circles.every(c=>c.hit)
        const last = g.circles[g.circles.length-1]
        if (last && now > last.beatMs + 3000 && allDone) { end(g,cleanMouse,cam); return }
        if (!audioEl && now > 65000) { end(g,cleanMouse,cam); return }
        g.frameId = requestAnimationFrame(render)
      }
      render()

      // Camera hand tracking
      if (cam && typeof window.Hands !== 'undefined') {
        try {
          const hands = new window.Hands({ locateFile: f => `https://unpkg.com/@mediapipe/hands@0.4.1675469240/${f}` })
          hands.setOptions({ maxNumHands:1, modelComplexity:0, minDetectionConfidence:0.6, minTrackingConfidence:0.5 })
          hands.onResults(res => {
            if (!g.running) return
            if (res.multiHandLandmarks?.length > 0) {
              const tip = res.multiHandLandmarks[0][8]  // index fingertip
              g.cursor.x = (1 - tip.x) * W
              g.cursor.y = tip.y * H
              g.cursor.active = true
            } else {
              g.cursor.active = false
            }
          })
          const loop = async () => {
            if (!g.running) return
            if (videoRef.current?.readyState >= 2)
              await hands.send({ image: videoRef.current }).catch(()=>{})
            setTimeout(loop, 33)
          }
          loop()
        } catch(e) { console.warn('[MediaPipe]', e) }
      }
    }

    g.pendingRender = startRender
    setPhase('playing'); setScore(0); setCombo(0)
  }, [attachMouse])

  const end = useCallback((g, cleanMouse, cam) => {
    if (!g.running) return
    g.running = false; cancelAnimationFrame(g.frameId)
    if (cleanMouse) cleanMouse()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    if (cam && videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t=>t.stop())
    const total = g.perfect + g.good + g.miss
    const acc = total ? Math.round((g.perfect*300+g.good*150)/(total*300)*100) : 100
    const grade = acc>=95?'S':acc>=85?'A':acc>=70?'B':acc>=55?'C':'D'
    SFX.win()
    toast.success(`🎵 ${grade} — ${acc}% accuracy!`)
    submitScore('handrhythm', g.score, 'medium', acc>=50?'win':'loss',
      {accuracy:acc, grade, maxCombo:g.maxCombo}).catch(()=>{})
    setPhase('result')
  }, [submitScore])

  useEffect(() => () => {
    const g = gRef.current; g.running = false; cancelAnimationFrame(g.frameId)
    if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t=>t.stop())
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  // ─── Render ───────────────────────────────────────────────────────────────
  const renderContent = () => {
    if (phase === 'playing') return (
      <div style={{position:'relative',display:'inline-block'}}>
        {audioUrl && <audio ref={audioRef} src={audioUrl} style={{display:'none'}}/>}
        <canvas ref={canvasRef} width={W} height={H} style={{
          display:'block', maxWidth:'100%', borderRadius:'12px', cursor:'none',
          border:`1px solid ${meta.current.color}25`,
          boxShadow:`0 0 30px ${meta.current.color}0a`, background:'#030308',
        }}/>
      </div>
    )

    if (phase === 'result') {
      const g = gRef.current
      const total = g.perfect + g.good + g.miss
      const acc = total ? Math.round((g.perfect*300+g.good*150)/(total*300)*100) : 100
      const grade = acc>=95?'S':acc>=85?'A':acc>=70?'B':acc>=55?'C':'D'
      const m = meta.current
      return (
        <div style={{textAlign:'center',padding:'36px 20px',maxWidth:'520px',margin:'0 auto'}}>
          <div style={{fontSize:'52px',marginBottom:'6px'}}>{grade==='S'?'🌟':grade==='A'?'🏅':grade==='B'?'🎵':grade==='C'?'👍':'💪'}</div>
          <div style={{fontSize:'58px',fontWeight:900,fontFamily:'var(--font-display)',color:m.color,textShadow:`0 0 20px ${m.color}80`,lineHeight:1,marginBottom:'4px'}}>{grade}</div>
          <div style={{fontSize:'14px',color:'var(--text-muted)',marginBottom:'16px'}}>{m.name}</div>
          <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap',marginBottom:'20px'}}>
            {[{l:'Score',v:g.score,c:m.color},{l:'Accuracy',v:acc+'%',c:'var(--neon-gold)'},{l:'Max Combo',v:g.maxCombo+'×',c:'var(--neon-purple)'}].map(({l,v,c})=>(
              <div key={l} style={{background:'var(--bg-card)',border:'1px solid var(--border-dim)',borderRadius:'12px',padding:'12px 16px',minWidth:'90px'}}>
                <div style={{fontSize:'22px',fontWeight:900,color:c,fontFamily:'var(--font-display)'}}>{v}</div>
                <div style={{fontSize:'10px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:'2px'}}>{l}</div>
              </div>
            ))}
          </div>
          {/* Hit bars */}
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border-dim)',borderRadius:'12px',padding:'14px',marginBottom:'18px',textAlign:'left'}}>
            {[{l:'PERFECT',v:g.perfect,c:'#FFD700'},{l:'GOOD',v:g.good,c:'#06B6D4'},{l:'MISS',v:g.miss,c:'#EF4444'}].map(({l,v,c})=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                <span style={{width:'62px',fontSize:'11px',fontWeight:700,color:c}}>{l}</span>
                <div style={{flex:1,height:'6px',background:'var(--bg-elevated)',borderRadius:'99px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${total?Math.round((v/total)*100):0}%`,background:c,borderRadius:'99px',transition:'width 0.8s'}}/>
                </div>
                <span style={{fontSize:'12px',fontFamily:'var(--font-mono)',color:c,minWidth:'24px',textAlign:'right'}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
            {m.isBuiltin
              ? <button className="btn btn-primary" onClick={()=>startBuiltin(useCam)}>Play Again</button>
              : <button className="btn btn-primary" onClick={()=>startUpload(useCam)}>Play Again</button>
            }
            <button className="btn btn-ghost" onClick={()=>setPhase('menu')}>← Song Select</button>
          </div>
          <div style={{marginTop:'10px',fontSize:'12px',color:'var(--text-muted)'}}>+{Math.floor(g.score/10)} XP awarded</div>
        </div>
      )
    }

    if (phase === 'analyzing') return (
      <div style={{textAlign:'center',padding:'60px 20px'}}>
        <div className="spinner" style={{margin:'0 auto 20px'}}/>
        <h3 style={{marginBottom:'12px'}}>Analyzing beats…</h3>
        <div style={{maxWidth:'280px',margin:'0 auto',height:'8px',background:'var(--bg-elevated)',borderRadius:'99px',overflow:'hidden'}}>
          <div style={{height:'100%',width:`${analyzeProgress}%`,background:'linear-gradient(to right,var(--neon-cyan),var(--neon-purple))',borderRadius:'99px',transition:'width 0.3s'}}/>
        </div>
        <div style={{color:'var(--text-muted)',marginTop:'8px',fontSize:'13px'}}>{analyzeProgress}%</div>
      </div>
    )

    if (phase === 'upload_ready') {
      const res = analysisRes
      const count = res ? makeCircles(res.beats, false).length : 0
      return (
        <div style={{textAlign:'center',padding:'28px 20px',maxWidth:'500px',margin:'0 auto'}}>
          <div style={{fontSize:'44px',marginBottom:'8px'}}>✅</div>
          <h2 style={{fontSize:'20px',marginBottom:'4px'}}>Ready to Play!</h2>
          {audioFile && <div style={{color:'var(--text-muted)',fontSize:'13px',marginBottom:'14px'}}>{audioFile.name}</div>}
          {audioUrl && <audio ref={audioRef} src={audioUrl} style={{display:'none'}}/>}
          <div style={{display:'flex',gap:'10px',justifyContent:'center',marginBottom:'16px',flexWrap:'wrap'}}>
            {[{l:'BPM',v:res?.bpm,c:'var(--neon-cyan)'},{l:'Circles',v:count,c:'var(--neon-gold)'},{l:'Duration',v:res?.duration?`${Math.floor(res.duration/60)}:${String(Math.floor(res.duration%60)).padStart(2,'0')}`:'—',c:'var(--neon-green)'}].map(({l,v,c})=>(
              <div key={l} style={{background:'var(--bg-card)',border:'1px solid var(--border-dim)',borderRadius:'12px',padding:'10px 16px'}}>
                <div style={{fontSize:'20px',fontWeight:900,color:c}}>{v}</div>
                <div style={{fontSize:'10px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:'2px'}}>{l}</div>
              </div>
            ))}
          </div>
          <DiffPicker value={diff} onChange={setDiff}/>
          {camErr && <CamBanner err={camErr}/>}
          <div style={{display:'flex',gap:'10px',justifyContent:'center',marginTop:'16px',flexWrap:'wrap'}}>
            <button className="btn btn-primary" onClick={()=>startUpload(true)} disabled={loading} style={{minWidth:'150px'}}>{loading?'⏳…':'📷 Camera'}</button>
            <button className="btn btn-secondary" onClick={()=>startUpload(false)} style={{minWidth:'150px'}}>🖱 Mouse</button>
          </div>
          <button className="btn btn-ghost" style={{fontSize:'13px',marginTop:'10px'}} onClick={()=>{setPhase('menu');setAnalysisRes(null)}}>← Change Song</button>
        </div>
      )
    }

    // ── Menu ──────────────────────────────────────────────────────────────────
    return (
      <div style={{padding:'24px 20px',maxWidth:'680px',margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:'20px'}}>
          <div style={{fontSize:'48px',marginBottom:'6px'}}>🎵</div>
          <h2 style={{fontSize:'24px',fontWeight:900,fontFamily:'var(--font-display)',marginBottom:'4px'}}>Hand Rhythm</h2>
          <p style={{color:'var(--text-secondary)',fontSize:'13px'}}>Move your hand / mouse into the circles as the ring closes</p>
        </div>

        {/* How to play tip */}
        <div style={{background:'rgba(0,245,255,0.05)',border:'1px solid rgba(0,245,255,0.15)',borderRadius:'10px',padding:'10px 14px',marginBottom:'20px',fontSize:'12px',color:'var(--text-secondary)',lineHeight:1.8}}>
          💡 <strong style={{color:'var(--neon-cyan)'}}>How to play:</strong> Circles appear with a shrinking ring. Move your hand/cursor <em>into the circle</em> when the ring reaches it. The closer to the beat, the better your score!
        </div>

        {/* Tabs */}
        <div style={{display:'flex',background:'var(--bg-elevated)',borderRadius:'12px',padding:'4px',marginBottom:'20px'}}>
          {[{k:'builtin',l:'🎹 Built-in Songs'},{k:'upload',l:'🎶 Upload Song'}].map(t=>(
            <button key={t.k} onClick={()=>{setTab(t.k);SFX.click()}} style={{
              flex:1,padding:'10px 8px',borderRadius:'9px',border:'none',cursor:'pointer',
              background:tab===t.k?'var(--bg-card)':'transparent',
              color:tab===t.k?'var(--neon-cyan)':'var(--text-muted)',
              fontFamily:'var(--font-ui)',fontWeight:700,fontSize:'13px',
              boxShadow:tab===t.k?'0 2px 8px rgba(0,0,0,0.4)':'none',transition:'all 0.2s',
            }}>{t.l}</button>
          ))}
        </div>

        {tab === 'builtin' && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'8px',marginBottom:'18px'}}>
              {SONGS.map(s=>(
                <button key={s.id} onClick={()=>{setSong(s);SFX.click()}} style={{
                  padding:'12px',borderRadius:'12px',textAlign:'left',cursor:'pointer',
                  border:`2px solid ${song.id===s.id?s.color:s.color+'30'}`,
                  background:song.id===s.id?s.color+'12':'var(--bg-card)',
                  boxShadow:song.id===s.id?`0 0 14px ${s.color}22`:'none',transition:'all 0.18s',
                }}>
                  <div style={{fontSize:'22px',marginBottom:'4px'}}>{s.icon}</div>
                  <div style={{fontWeight:700,fontSize:'13px',color:song.id===s.id?s.color:'inherit',marginBottom:'2px'}}>{s.name}</div>
                  <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{s.desc}</div>
                </button>
              ))}
            </div>
            <DiffPicker value={diff} onChange={setDiff}/>
            {camErr && <CamBanner err={camErr}/>}
            <div style={{display:'flex',gap:'10px',justifyContent:'center',marginTop:'18px',flexWrap:'wrap'}}>
              <button className="btn btn-primary" onClick={()=>startBuiltin(true)} disabled={loading} style={{minWidth:'160px'}}>{loading?'⏳ Starting…':'📷 Camera Mode'}</button>
              <button className="btn btn-secondary" onClick={()=>startBuiltin(false)} style={{minWidth:'160px'}}>🖱 Mouse Mode</button>
            </div>
          </div>
        )}

        {tab === 'upload' && (
          <div>
            <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px',padding:'36px',borderRadius:'14px',cursor:'pointer',border:'2px dashed rgba(0,245,255,0.3)',background:'rgba(0,245,255,0.03)',minHeight:'150px',transition:'all 0.2s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,245,255,0.6)';e.currentTarget.style.background='rgba(0,245,255,0.07)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,245,255,0.3)';e.currentTarget.style.background='rgba(0,245,255,0.03)'}}>
              <div style={{fontSize:'38px'}}>🎶</div>
              <div style={{color:'var(--neon-cyan)',fontWeight:700}}>Click to choose audio file</div>
              <div style={{color:'var(--text-muted)',fontSize:'12px'}}>MP3, WAV, OGG, M4A, AAC</div>
              <input type="file" accept="audio/*" onChange={handleUpload} style={{display:'none'}}/>
            </label>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <video ref={videoRef} style={{display:'none',position:'fixed',top:-9999,left:-9999,pointerEvents:'none'}} width={W} height={H} playsInline muted/>
      {renderContent()}
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DiffPicker({value, onChange}) {
  return (
    <div style={{marginBottom:'4px'}}>
      <div style={{fontSize:'11px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'8px',textAlign:'center'}}>Difficulty</div>
      <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
        {Object.entries(DIFF).map(([k,d])=>(
          <button key={k} onClick={()=>onChange(k)} style={{
            padding:'8px 18px',borderRadius:'99px',cursor:'pointer',
            background:value===k?d.color+'22':'var(--bg-elevated)',
            color:value===k?d.color:'var(--text-muted)',
            border:`1px solid ${value===k?d.color:d.color+'20'}`,
            fontWeight:700,fontSize:'13px',transition:'all 0.2s',
          }}>{d.label}</button>
        ))}
      </div>
      <div style={{textAlign:'center',marginTop:'6px',fontSize:'11px',color:'var(--text-muted)'}}>
        {DIFF[value]?.desc}
      </div>
    </div>
  )
}

function CamBanner({err}) {
  if (!err) return null
  const M = {
    blocked:   {t:'Camera blocked',  b:'Click 🔒 in address bar → Camera → Allow, then retry.',c:'#ff4466'},
    nocam:     {t:'No camera found', b:'No webcam detected. Use Mouse Mode instead.',c:'var(--neon-orange)'},
    mediapipe: {t:'Hand tracking unavailable', b:'Using Mouse Mode as fallback. Try refreshing.',c:'var(--neon-orange)'},
    other:     {t:'Camera error',    b:'Falling back to Mouse Mode.',c:'#ff4466'},
  }
  const m = M[err]||M.other
  return (
    <div style={{marginTop:'12px',padding:'10px 14px',borderRadius:'10px',background:`${m.c}10`,border:`1px solid ${m.c}30`,fontSize:'12px',color:'var(--text-secondary)',lineHeight:1.7}}>
      <strong style={{color:m.c}}>{m.t}</strong> — {m.b}
    </div>
  )
}