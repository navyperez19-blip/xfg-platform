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

export default function JoinPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', age: '', state: '', password: '', confirm_password: '',
  })

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); setLoading(false); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); setLoading(false); return }
    if (parseInt(form.age) < 18) { setError('You must be at least 18 years old to apply.'); setLoading(false); return }

    const full_name = form.first_name.trim() + ' ' + form.last_name.trim()

    const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (authError) { setError(authError.message); setLoading(false); return }

    const userId = authData.user?.id
    if (!userId) { setError('Account creation failed. Please try again.'); setLoading(false); return }

    const { error: userError } = await supabase.from('users').insert({ id: userId, email: form.email, full_name, role: 'agent' })
    if (userError) { setError('Profile creation failed: ' + userError.message); setLoading(false); return }

    const { data: counterData } = await supabase.from('agents').select('xfg_id').order('created_at', { ascending: false }).limit(1)
    let nextNumber = 1
    if (counterData && counterData.length > 0) {
      const lastNumber = parseInt(counterData[0].xfg_id.replace('XFG-', ''))
      nextNumber = lastNumber + 1
    }
    const xfg_id = 'XFG-' + String(nextNumber).padStart(6, '0')

    const { error: agentError } = await supabase.from('agents').insert({ user_id: userId, xfg_id, full_name, email: form.email, phone: form.phone, state: form.state, current_stage: 'contacted', is_locked: false })
    if (agentError) { setError('Agent profile creation failed: ' + agentError.message); setLoading(false); return }

    await fetch('/api/send-welcome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name, email: form.email, xfg_id, state: form.state }) })

    router.push('/agent-portal')
    setLoading(false)
  }

  const inp = { width: '100%', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '14px 16px', fontSize: '16px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1814', boxSizing: 'border-box' as const }
  const lbl = { color: '#6B6966', fontSize: '13px', fontWeight: '600' as const, display: 'block', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', padding: '24px 16px 40px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', paddingTop: '16px', marginBottom: '40px' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>XFG · X Financial Group</p>
          <h1 style={{ color: '#1A1814', fontSize: '36px', fontWeight: '700', lineHeight: '1.2', marginBottom: '12px' }}>Welcome to XFG</h1>
          <p style={{ color: '#6B6966', fontSize: '16px', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>Build a successful business with everything provided for you. Join hundreds of agents building financial freedom.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>

          <div>
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
              <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px' }}>What You Get</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { title: 'Fully Remote', desc: 'Work from anywhere in the country' },
                  { title: 'Daily Training', desc: 'Learn and grow with the team every day' },
                  { title: 'Free Leads', desc: 'We provide the leads — you focus on closing' },
                  { title: 'Free Dialer', desc: 'No out of pocket costs for your dialer' },
                  { title: '$2,000 Worth of Software', desc: 'Industry leading tools included at no cost' },
                  { title: 'Live Support', desc: 'Never left on your own — we are with you every step' },
                  { title: 'Unmatched Training', desc: 'A proven system designed to help you reach your goals' },
                ].map(item => (
                  <div key={item.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C9A96E', flexShrink: 0, marginTop: '6px' }} />
                    <div>
                      <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>{item.title}</p>
                      <p style={{ color: '#9A9890', fontSize: '13px' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Create Your Account</h2>
              <p style={{ color: '#6B6966', fontSize: '14px', marginBottom: '24px' }}>Join XFG and start building your business today.</p>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={lbl}>First Name</label>
                    <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required placeholder="John" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Last Name</label>
                    <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required placeholder="Smith" style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={lbl}>Email Address</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="john@example.com" style={inp} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={lbl}>Phone Number</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="555-555-5555" style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={lbl}>Age</label>
                    <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required min="18" max="100" placeholder="25" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>State</label>
                    <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required style={inp}>
                      <option value="">Select...</option>
                      {US_STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={lbl}>Password</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Min. 8 characters" style={inp} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={lbl}>Confirm Password</label>
                  <input type="password" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} required placeholder="Re-enter password" style={inp} />
                </div>
                {error && <p style={{ color: '#8B2635', fontSize: '14px', marginBottom: '16px', background: '#FFF5F5', padding: '10px 14px', borderRadius: '8px' }}>{error}</p>}
                <button type="submit" disabled={loading} style={{ width: '100%', background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'Inter, sans-serif' }}>
                  {loading ? 'Creating Account...' : 'Join XFG — Get Started'}
                </button>
              </form>
              <p style={{ textAlign: 'center', color: '#6B6966', fontSize: '14px', marginTop: '16px' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: '#C9A96E', fontWeight: '600', textDecoration: 'none' }}>Sign In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
