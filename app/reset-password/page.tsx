'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); setLoading(false); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); setLoading(false); return }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setLoading(false); setTimeout(() => router.push('/login'), 2500) }
  }

  const inp = { width: '100%', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '14px 16px', fontSize: '16px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1814', boxSizing: 'border-box' as const }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>XFG · X Financial Group</p>
          <h1 style={{ color: '#1A1814', fontSize: '28px', fontWeight: '700', marginBottom: '6px' }}>Reset Password</h1>
          <p style={{ color: '#6B6966', fontSize: '15px' }}>Enter your new password below</p>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#2D6A4F', fontWeight: '700', fontSize: '16px', marginBottom: '8px' }}>Password updated!</p>
              <p style={{ color: '#6B6966', fontSize: '15px' }}>Redirecting you to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#6B6966', fontSize: '13px', fontWeight: '600' as const, display: 'block', marginBottom: '6px' }}>New Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 8 characters" style={inp} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#6B6966', fontSize: '13px', fontWeight: '600' as const, display: 'block', marginBottom: '6px' }}>Confirm New Password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Re-enter password" style={inp} />
              </div>
              {error && <p style={{ color: '#8B2635', fontSize: '14px', marginBottom: '16px', background: '#FFF5F5', padding: '10px 14px', borderRadius: '8px' }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ width: '100%', background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Inter, sans-serif' }}>
                {loading ? 'Updating...' : 'Set New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
