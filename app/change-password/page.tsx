'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (newPass !== confirm) {
      setError('New passwords do not match.')
      setLoading(false)
      return
    }

    if (newPass.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPass })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => router.back(), 2000)
    }
  }

  const fieldInput = {
    width: '100%',
    background: '#EDEAE4',
    color: '#1A1814',
    border: '1px solid #DDD9D2',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.95rem',
    fontFamily: 'Georgia, serif',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const fieldLabel = {
    color: '#6B6966',
    fontSize: '0.75rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    display: 'block',
    marginBottom: '0.5rem',
    fontFamily: 'Georgia, serif',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', color: '#1A1814', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: '#6B6966', fontSize: '0.85rem', fontFamily: 'Georgia, serif', cursor: 'pointer', marginBottom: '1.5rem', padding: '0' }}>
          ← Back
        </button>

        <p style={{ color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>XFG · X Financial Group</p>
        <h1 style={{ color: '#1A1814', fontSize: '1.6rem', fontWeight: '400', marginBottom: '2rem' }}>Change Password</h1>

        <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '2rem' }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#2D6A4F', fontWeight: '600', marginBottom: '0.5rem' }}>Password updated!</p>
              <p style={{ color: '#6B6966', fontSize: '0.85rem' }}>Redirecting you back...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={fieldLabel}>New Password</label>
                <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required placeholder="Min. 8 characters" style={fieldInput} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={fieldLabel}>Confirm New Password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Re-enter new password" style={fieldInput} />
              </div>
              {error && <p style={{ color: '#E07070', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ width: '100%', background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '0.875rem', fontSize: '0.95rem', fontFamily: 'Georgia, serif', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
