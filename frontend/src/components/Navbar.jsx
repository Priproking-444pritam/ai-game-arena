import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(()=>localStorage.getItem('arena_unlocked')==='true')
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const tryUnlock = () => {
    if (code.trim().toUpperCase() === 'LEVEL0') {
      localStorage.setItem('arena_unlocked', 'true')
      setUnlocked(true); setCodeOpen(false); setCode(''); setOpen(false)
      const d = document.createElement('div')
      d.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#00ff88;color:#000;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;z-index:9999'
      d.textContent = '🎉 All 10 games unlocked!'
      document.body.appendChild(d); setTimeout(()=>d.remove(), 3000)
    } else {
      const d = document.createElement('div')
      d.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#ff4466;color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;z-index:9999'
      d.textContent = '❌ Invalid code'
      document.body.appendChild(d); setTimeout(()=>d.remove(), 2000)
    }
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        display:'flex', alignItems:'center', gap:'8px', padding:'6px 12px',
        background:'var(--bg-elevated)', border:`1px solid ${open?'rgba(0,245,255,0.4)':'var(--border-dim)'}`,
        borderRadius:'99px', cursor:'pointer', transition:'all 0.2s',
      }}>
        <div style={{ width:'28px', height:'28px', background:'linear-gradient(135deg,#00f5ff,#bf00ff)',
          borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'13px', fontWeight:700, color:'#000', fontFamily:'var(--font-display)' }}>
          {user.username[0].toUpperCase()}
        </div>
        <div style={{ textAlign:'left' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text-primary)', lineHeight:1.2 }}>{user.username}</div>
          <div style={{ fontSize:'10px', color:'var(--neon-cyan)', letterSpacing:'0.08em' }}>LVL {user.level}</div>
        </div>
        <span style={{ fontSize:'10px', color:'var(--text-muted)', marginLeft:'2px' }}>{open?'▲':'▼'}</span>
      </button>

      {open && (
        <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:'220px',
          background:'var(--bg-card)', border:'1px solid var(--border-dim)', borderRadius:'12px',
          boxShadow:'0 8px 32px rgba(0,0,0,0.5)', zIndex:1001, overflow:'hidden' }}>
          {/* User info */}
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border-dim)',
            background:'var(--bg-elevated)' }}>
            <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'2px' }}>{user.username}</div>
            <div style={{ display:'flex', gap:'6px' }}>
              <span style={{ fontSize:'11px', background:'rgba(0,245,255,0.12)', color:'var(--neon-cyan)',
                padding:'2px 7px', borderRadius:'4px', fontWeight:600 }}>Level {user.level}</span>
              <span style={{ fontSize:'11px', background:'rgba(255,215,0,0.12)', color:'var(--neon-gold)',
                padding:'2px 7px', borderRadius:'4px', fontWeight:600 }}>⚡ {user.xp} XP</span>
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding:'6px' }}>
            <MenuItem icon="⚡" label="Dashboard" onClick={()=>{navigate('/dashboard');setOpen(false)}} />
            <MenuItem icon="🎮" label="Play Games" onClick={()=>{navigate('/games');setOpen(false)}} />
            <MenuItem icon="🏆" label="Leaderboard" onClick={()=>{navigate('/leaderboard');setOpen(false)}} />

            {/* Unlock code */}
            <div style={{ borderTop:'1px solid var(--border-dim)', margin:'4px 0', paddingTop:'4px' }}>
              {unlocked ? (
                <div style={{ padding:'8px 10px', fontSize:'12px', color:'#00ff88',
                  display:'flex', alignItems:'center', gap:'6px' }}>
                  🔓 All games unlocked!
                </div>
              ) : codeOpen ? (
                <div style={{ padding:'6px 10px' }}>
                  <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:'5px' }}>Enter unlock code:</div>
                  <div style={{ display:'flex', gap:'4px' }}>
                    <input value={code} onChange={e=>setCode(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&tryUnlock()}
                      placeholder="Code…" autoFocus
                      style={{ flex:1, padding:'5px 8px', borderRadius:'6px', border:'1px solid var(--border-dim)',
                        background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:'12px' }} />
                    <button onClick={tryUnlock} style={{ padding:'5px 8px', borderRadius:'6px',
                      background:'var(--neon-cyan)', color:'#000', border:'none', cursor:'pointer', fontWeight:700, fontSize:'12px' }}>✓</button>
                  </div>
                  <button onClick={()=>setCodeOpen(false)} style={{ marginTop:'4px', fontSize:'10px',
                    color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>Cancel</button>
                </div>
              ) : (
                <MenuItem icon="🔑" label="Enter Unlock Code" onClick={()=>setCodeOpen(true)} />
              )}
            </div>

            <div style={{ borderTop:'1px solid var(--border-dim)', margin:'4px 0', paddingTop:'4px' }}>
              <MenuItem icon="🚪" label="Logout" color="#ff4466" onClick={()=>{onLogout();setOpen(false)}} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick, color }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%',
      padding:'8px 10px', borderRadius:'8px', border:'none', background:'none',
      color:color||'var(--text-secondary)', cursor:'pointer', fontSize:'13px', fontWeight:500,
      textAlign:'left', transition:'all 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'}
      onMouseLeave={e=>e.currentTarget.style.background='none'}>
      <span style={{ fontSize:'16px', minWidth:'20px' }}>{icon}</span>
      {label}
    </button>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out!')
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      background: 'rgba(7,7,15,0.9)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(0,245,255,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #00f5ff, #bf00ff)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px'
          }}>🎮</div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '20px',
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}>AI GAME ARENA</span>
        </Link>

        {/* Desktop Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[
            { path: '/', label: 'Home' },
            { path: '/games', label: '🕹 Games', protected: true },
            ...(!user ? [{ path: '/guest', label: '🎲 Play as Guest' }] : []),
            { path: '/leaderboard', label: '🏆 Ranks' },
            ...(user ? [{ path: '/dashboard', label: '⚡ Dashboard' }] : [])
          ].map(({ path, label, protected: prot }) => (
            (!prot || user) && (
              <Link key={path} to={path} style={{
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: 'var(--font-ui)',
                fontWeight: '600',
                fontSize: '14px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: isActive(path) ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                background: isActive(path) ? 'rgba(0,245,255,0.1)' : 'transparent',
                border: isActive(path) ? '1px solid rgba(0,245,255,0.2)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}>
                {label}
              </Link>
            )
          ))}
        </div>

        {/* Auth Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <UserMenu user={user} onLogout={handleLogout} />
          ) : (
            <>
              <Link to="/guest" className="btn btn-ghost" style={{ padding: '8px 18px', fontSize: '13px' }}>
                Play as Guest
              </Link>
              <Link to="/login" className="btn btn-ghost" style={{ padding: '8px 18px', fontSize: '13px' }}>
                Login
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}