import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { register, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  if (user) { navigate('/dashboard'); return null }

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.email || !form.password) return toast.error('Fill in all fields')
    if (form.password !== form.confirm) return toast.error('Passwords do not match')
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')

    setLoading(true)
    try {
      const data = await register(form.username, form.email, form.password)
      toast.success(data.message || 'Welcome to the Arena!')
      navigate('/games')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const strength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2
    : 3

  const strengthColors = ['transparent', '#ff0066', '#ffd700', '#00ff88']
  const strengthLabels = ['', 'Weak', 'Medium', 'Strong']

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative'
    }}>
      <div style={{
        position: 'fixed', top: '40%', right: '20%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(191,0,255,0.06) 0%, transparent 60%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚡</div>
          <h1 style={{
            fontSize: '36px',
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            JOIN THE ARENA
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Create your account and start competing
          </p>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(191,0,255,0.15)',
          borderRadius: '20px',
          padding: '36px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(191,0,255,0.05)'
        }}>
          <form onSubmit={handleSubmit}>
            {[
              { name: 'username', label: 'USERNAME', type: 'text', placeholder: 'CoolGamer99', hint: '3-20 chars, letters/numbers/underscores' },
              { name: 'email', label: 'EMAIL', type: 'email', placeholder: 'you@example.com' },
              { name: 'password', label: 'PASSWORD', type: 'password', placeholder: '••••••••' },
              { name: 'confirm', label: 'CONFIRM PASSWORD', type: 'password', placeholder: '••••••••' },
            ].map(field => (
              <div key={field.name} style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)'
                }}>{field.label}</label>
                <input
                  className="input"
                  type={field.type}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  style={{
                    borderColor: field.name === 'confirm' && form.confirm && form.password !== form.confirm
                      ? 'var(--neon-pink)' : undefined
                  }}
                />
                {field.hint && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{field.hint}</div>
                )}
                {field.name === 'password' && form.password && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1,2,3].map(i => (
                        <div key={i} style={{
                          flex: 1, height: '3px', borderRadius: '99px',
                          background: i <= strength ? strengthColors[strength] : 'var(--bg-elevated)',
                          transition: 'all 0.3s'
                        }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '11px', color: strengthColors[strength] }}>
                      {strengthLabels[strength]}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', fontSize: '15px', padding: '14px', marginTop: '8px' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Creating Account...
                </span>
              ) : '🚀 Create Account'}
            </button>
          </form>

          <div className="divider" />

          <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--neon-purple)', textDecoration: 'none', fontWeight: 700 }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
