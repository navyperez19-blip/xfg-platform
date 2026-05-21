'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
]

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    age: '',
    state: '',
    password: '',
    confirm_password: '',
  })

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    if (parseInt(form.age) < 18) {
      setError('You must be at least 18 years old to apply.')
      setLoading(false)
      return
    }

    const full_name = form.first_name.trim() + ' ' + form.last_name.trim()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      setError('Account creation failed. Please try again.')
      setLoading(false)
      return
    }

    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      email: form.email,
      full_name,
      role: 'agent'
    })

    if (userError) {
      setError('Profile creation failed: ' + userError.message)
      setLoading(false)
      return
    }

    const { data: counterData } = await supabase
      .from('agents')
      .select('xfg_id')
      .order('created_at', { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (counterData && counterData.length > 0) {
      const lastId = counterData[0].xfg_id
      const lastNumber = parseInt(lastId.replace('XFG-', ''))
      nextNumber = lastNumber + 1
    }
    const xfg_id = 'XFG-' + String(nextNumber).padStart(6, '0')

    const { error: agentError } = await supabase.from('agents').insert({
      user_id: userId,
      xfg_id,
      full_name,
      email: form.email,
      phone: form.phone,
      state: form.state,
      current_stage: 'new_lead',
      is_locked: false,
    })

    if (agentError) {
      setError('Agent profile creation failed: ' + agentError.message)
      setLoading(false)
      return
    }

    await fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name,
        email: form.email,
        xfg_id,
        state: form.state,
      })
    })

    router.push('/agent-portal')
    setLoading(false)
  }

  const fieldInput: React.CSSProperties = {
    width: '100%',
    background: '#EDEAE4',
    color: '#1A1814',
    border: '1px solid #DDD9D2',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.95rem',
    fontFamily: 'Georgia, serif',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const fieldLabel: React.CSSProperties = {
    color: '#6B6966',
    fontSize: '0.75rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '0.5rem',
    fontFamily: 'Georgia, serif',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', color: '#1A1814', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>XFG · X Financial Group</p>
          <h1 style={{ color: '#1A1814', fontSize: '1.8rem', fontWeight: '400', marginBottom: '0.25rem' }}>Join XFG</h1>
          <p style={{ color: '#6B6966', fontSize: '0.85rem', fontStyle: 'italic' }}>Create your agent account</p>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={fieldLabel}>First Name</label>
                <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required placeholder="John" style={fieldInput} />
              </div>
              <div>
                <label style={fieldLabel}>Last Name</label>
                <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required placeholder="Smith" style={fieldInput} />
              </div>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={fieldLabel}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="john@example.com" style={fieldInput} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={fieldLabel}>Phone Number</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="555-555-5555" style={fieldInput} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={fieldLabel}>Age</label>
                <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required min="18" max="100" placeholder="25" style={fieldInput} />
              </div>
              <div>
                <label style={fieldLabel}>State</label>
                <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required style={fieldInput}>
                  <option value="">State...</option>
                  {US_STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={fieldLabel}>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Min. 8 characters" style={fieldInput} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={fieldLabel}>Confirm Password</label>
              <input type="password" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} required placeholder="Re-enter password" style={fieldInput} />
            </div>
            {error && <p style={{ color: '#E07070', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: '100%', background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '0.875rem', fontSize: '0.95rem', fontFamily: 'Georgia, serif', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.03em', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', color: '#6B6966', fontSize: '0.8rem', marginTop: '1.5rem' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#C9A96E', textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
