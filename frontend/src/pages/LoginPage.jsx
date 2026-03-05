import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  if (user) { navigate('/dashboard'); return null }

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Fill in all fields')
    setLoading(true)
    try {
      const data = await login(form.email, form.password)
      toast.success(data.message || 'Welcome back!')
      navigate('/games')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative'
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(0,245,255,0.05) 0%, transparent 60%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '440px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px', animation: 'float 3s ease-in-out infinite' }}>🎮</div>
          <h1 style={{
            fontSize: '36px',
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            WELCOME BACK
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Enter the arena where you left off
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(0,245,255,0.12)',
          borderRadius: '20px',
          padding: '36px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,245,255,0.05)'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)'
              }}>EMAIL</label>
              <input
                className="input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)'
              }}>PASSWORD</label>
              <input
                className="input"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', fontSize: '15px', padding: '14px' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Entering...
                </span>
              ) : 'Enter Arena'}
            </button>
          </form>

          <div className="divider" />

          <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
            New here?{' '}
            <Link to="/register" style={{ color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 700 }}>
              Create Account
            </Link>
          </div>
        </div>

        {/* Demo hint */}
        <div style={{
          marginTop: '16px',
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(255,215,0,0.05)',
          border: '1px solid rgba(255,215,0,0.15)',
          borderRadius: '10px',
          fontSize: '12px',
          color: 'var(--neon-gold)',
          fontFamily: 'var(--font-mono)'
        }}>
          🔒 Secured with bcrypt + JWT tokens
        </div>
      </div>
    </div>
  )
}
