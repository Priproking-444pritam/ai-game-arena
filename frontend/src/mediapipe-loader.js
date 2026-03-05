const VERSION = '0.4.1675469240'
const BASE    = `https://unpkg.com/@mediapipe/hands@${VERSION}`

let _loaded = false
let _loadPromise = null

export function getLocateFile() {
  return f => `${BASE}/${f}`
}

export function loadMediaPipe() {
  // Already fully loaded — return immediately
  if (_loaded && typeof window.Hands !== 'undefined') {
    return Promise.resolve()
  }

  // Deduplicate concurrent calls
  if (_loadPromise) return _loadPromise

  _loadPromise = new Promise((resolve, reject) => {
    // Remove any stale script tags
    document.querySelectorAll('script[data-mediapipe]').forEach(s => s.remove())

    const script = document.createElement('script')
    script.src = `${BASE}/hands.js`
    script.setAttribute('data-mediapipe', 'hands')
    // No crossOrigin header — unpkg doesn't need it and it causes preflight issues

    script.onload = () => {
      // Poll every 100ms — window.Hands appears ~100ms after script load (WASM compile)
      let elapsed = 0
      const poll = setInterval(() => {
        elapsed += 100
        if (typeof window.Hands !== 'undefined') {
          clearInterval(poll)
          _loaded = true
          console.log(`[MediaPipe] ✅ Ready after ${elapsed}ms`)
          resolve()
        } else if (elapsed >= 10000) {
          clearInterval(poll)
          _loadPromise = null
          reject(new Error('mp_timeout: window.Hands never appeared'))
        }
      }, 100)
    }

    script.onerror = (e) => {
      _loadPromise = null
      reject(new Error('mp_script_load_failed'))
    }

    document.head.appendChild(script)
  })

  return _loadPromise
}