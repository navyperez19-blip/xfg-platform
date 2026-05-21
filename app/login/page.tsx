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
        router.push('/dashboard')
      }
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem', fontFamily: 'Georgia, serif' }}>XFG · X Financial Group</p>
          <h1 style={{ color: '#1A1814', fontSize: '1.8rem', fontFamily: 'Georgia, serif', fontWeight: '400' }}>Welcome Back</h1>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '2rem' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: '#6B6966', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', fontFamily: 'Georgia, serif' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" style={{ width: '100%', background: '#EDEAE4', color: '#1A1814', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.95rem', fontFamily: 'Georgia, serif', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ color: '#6B6966', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', fontFamily: 'Georgia, serif' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', background: '#EDEAE4', color: '#1A1814', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.95rem', fontFamily: 'Georgia, serif', outline: 'none' }} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
              <Link href="/forgot-password" style={{ color: '#C9A96E', fontSize: '0.8rem', fontFamily: 'Georgia, serif', textDecoration: 'none' }}>Forgot password?</Link>
            </div>
            {error && <p style={{ color: '#E07070', fontSize: '0.85rem', marginBottom: '1rem', fontFamily: 'Georgia, serif' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: '100%', background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '0.875rem', fontSize: '0.95rem', fontFamily: 'Georgia, serif', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.03em', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign: 'center', color: '#6B6966', fontSize: '0.8rem', marginTop: '1.5rem', fontFamily: 'Georgia, serif' }}>
            New to XFG?{' '}
            <Link href="/signup" style={{ color: '#C9A96E', textDecoration: 'none' }}>Apply Now</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
