'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://app.xfg.software/reset-password',
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSent(true); setLoading(false) }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>XFG · X Financial Group</p>
          <h1 style={{ color: '#1A1814', fontSize: '28px', fontWeight: '700', marginBottom: '6px' }}>Forgot Password</h1>
          <p style={{ color: '#6B6966', fontSize: '15px' }}>Enter your email to reset your password</p>
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#2D6A4F', fontWeight: '700', fontSize: '16px', marginBottom: '8px' }}>Email sent!</p>
              <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '24px' }}>Check your inbox for a password reset link.</p>
              <Link href="/login" style={{ color: '#C9A96E', fontWeight: '600', textDecoration: 'none', fontSize: '15px' }}>Back to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#6B6966', fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" style={{ width: '100%', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '14px 16px', fontSize: '16px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1814', boxSizing: 'border-box' as const }} />
              </div>
              {error && <p style={{ color: '#8B2635', fontSize: '14px', marginBottom: '16px', background: '#FFF5F5', padding: '10px 14px', borderRadius: '8px' }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ width: '100%', background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Inter, sans-serif', marginBottom: '16px' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <p style={{ textAlign: 'center' }}>
                <Link href="/login" style={{ color: '#C9A96E', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>Back to Sign In</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
