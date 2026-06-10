'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('users').select('role').eq('id', user?.id || '').single()
      if (profile?.role === 'agent') {
        router.push('/agent-portal')
      } else {
        const redirectTo = new URLSearchParams(window.location.search).get('redirectTo')
        router.push(redirectTo || '/dashboard')
      }
    }
  }

  const inp = { width: '100%', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '14px 16px', fontSize: '16px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1814', boxSizing: 'border-box' as const }
  const lbl = { color: '#6B6966', fontSize: '13px', fontWeight: '600' as const, display: 'block', marginBottom: '6px' }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>XFG · X Financial Group</p>
          <h1 style={{ color: '#1A1814', fontSize: '28px', fontWeight: '700', marginBottom: '6px' }}>Welcome Back</h1>
          <p style={{ color: '#6B6966', fontSize: '15px' }}>Sign in to your account</p>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={lbl}>Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" style={inp} />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={lbl}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={inp} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <Link href="/forgot-password" style={{ color: '#C9A96E', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>Forgot password?</Link>
            </div>
            {error && <p style={{ color: '#8B2635', fontSize: '14px', marginBottom: '16px', background: '#FFF5F5', padding: '10px 14px', borderRadius: '8px' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: '100%', background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Inter, sans-serif' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign: 'center', color: '#6B6966', fontSize: '14px', marginTop: '20px' }}>
            New to XFG?{' '}
            <Link href="/signup" style={{ color: '#C9A96E', fontWeight: '600', textDecoration: 'none' }}>Create Account</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
