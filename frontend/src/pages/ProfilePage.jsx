import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { API } from '../context/AuthContext'

const GAME_ICONS = { snake: '🐍', sudoku: '🔢', connect4: '🔴', maze: '🧩', nqueens: '♛' }

export default function ProfilePage() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get(`/users/profile/${username}`)
      .then(r => setProfile(r.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <div className="spinner" />
    </div>
  )

  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>😶</div>
      <p>Player not found</p>
    </div>
  )

  const { user, recentScores } = profile
  const xpInCurrentLevel = user.xp - ((user.level - 1) * 200)
  const xpProgress = Math.min((xpInCurrentLevel / 200) * 100, 100)

  return (
    <div className="container" style={{ padding: '40px 24px', maxWidth: '800px' }}>
      <div className="animate-fade-in-up">
        {/* Profile card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(0,245,255,0.1)',
          borderRadius: '20px',
          padding: '36px',
          marginBottom: '28px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{
              width: '90px', height: '90px', minWidth: '90px',
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '38px', fontWeight: 900, color: '#000',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 0 30px rgba(0,245,255,0.3)'
            }}>
              {user.username[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '30px', fontWeight: 900, marginBottom: '6px' }}>{user.username}</h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span className="badge badge-cyan">Level {user.level}</span>
                <span className="badge badge-gold">⚡ {user.xp} XP</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${xpProgress}%`,
                  background: 'linear-gradient(to right, var(--neon-cyan), var(--neon-purple))',
                  borderRadius: '99px'
                }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px'
        }}>
          {[
            { label: 'Games Played', value: user.totalGamesPlayed, color: 'var(--neon-cyan)' },
            { label: 'Total Wins', value: user.totalWins, color: 'var(--neon-gold)' },
            { label: 'Win Rate', value: `${user.winRate ?? Math.round((user.totalWins / Math.max(1, user.totalGamesPlayed)) * 100)}%`, color: 'var(--neon-green)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: '14px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: s.color, fontFamily: 'var(--font-display)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Recent scores */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-dim)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>📋 Recent Scores</h2>
          {recentScores.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
              No scores yet!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentScores.map(score => (
                <div key={score._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-elevated)',
                  borderRadius: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{GAME_ICONS[score.game] || '🎮'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'capitalize' }}>{score.game}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {score.difficulty} · {new Date(score.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)', fontWeight: 700 }}>
                      {score.score}
                    </span>
                    <span className={`badge ${score.result === 'win' ? 'badge-green' : score.result === 'loss' ? 'badge-orange' : 'badge-cyan'}`}>
                      {score.result}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
