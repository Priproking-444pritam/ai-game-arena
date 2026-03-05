// Web Audio API sound utility — no external library needed
let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

function beep(freq, duration, type = 'sine', volume = 0.15) {
  try {
    const c = getCtx()
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g)
    g.connect(c.destination)
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(volume, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    o.start(c.currentTime)
    o.stop(c.currentTime + duration)
  } catch (e) {}
}

export const Sounds = {
  click:    () => beep(440, 0.08, 'sine', 0.1),
  move:     () => beep(660, 0.06, 'sine', 0.08),
  eat:      () => { beep(880, 0.08); setTimeout(() => beep(1100, 0.1), 60) },
  correct:  () => beep(1000, 0.1, 'sine', 0.12),
  wrong:    () => beep(200, 0.2, 'sawtooth', 0.1),
  wall:     () => beep(150, 0.15, 'square', 0.1),
  win:      () => { beep(660,0.12); setTimeout(()=>beep(880,0.12),120); setTimeout(()=>beep(1100,0.2),240) },
  lose:     () => { beep(400,0.15,'sawtooth'); setTimeout(()=>beep(250,0.25,'sawtooth'),150) },
  drop:     () => beep(300, 0.1, 'sine', 0.1),
  aiMove:   () => beep(550, 0.06, 'triangle', 0.07),
  place:    () => beep(750, 0.08, 'sine', 0.1),
  tab:      () => beep(520, 0.07, 'sine', 0.08),
  complete: () => { [500,700,900,1100].forEach((f,i) => setTimeout(()=>beep(f,0.15),i*100)) }
}