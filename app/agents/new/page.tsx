'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
]

export default function NewAgentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    state: '',
  })

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

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

    const { error: insertError } = await supabase
      .from('agents')
      .insert({
        ...form,
        xfg_id,
        current_stage: 'new_lead',
        is_locked: false,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.push('/pipeline')
    }
  }

  const fieldInput = {
    width: '100%',
    background: '#242220',
    color: '#F5F2ED',
    border: '1px solid #2E2C29',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.95rem',
    fontFamily: 'Georgia, serif',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const fieldLabel = {
    color: '#9A9890',
    fontSize: '0.75rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    display: 'block',
    marginBottom: '0.5rem',
    fontFamily: 'Georgia, serif',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0F0F0E', color: '#F5F2ED', fontFamily: 'Georgia, serif', padding: '2rem 1rem', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <button
          onClick={() => router.push('/pipeline')}
          style={{ background: 'transparent', border: 'none', color: '#9A9890', fontSize: '0.85rem', fontFamily: 'Georgia, serif', cursor: 'pointer', marginBottom: '1.5rem', padding: '0' }}
        >
          ← Back to Pipeline
        </button>

        <p style={{ color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>XFG · X Financial Group</p>
        <h1 style={{ color: '#F5F2ED', fontSize: '1.6rem', fontWeight: '400', marginBottom: '0.25rem' }}>Add New Agent</h1>
        <p style={{ color: '#9A9890', fontSize: '0.85rem', marginBottom: '2rem' }}>A permanent XFG ID will be assigned automatically.</p>

        <div style={{ background: '#1A1917', border: '1px solid #2E2C29', borderRadius: '12px', padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={fieldLabel}>Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                placeholder="John Smith"
                style={fieldInput}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={fieldLabel}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="john@example.com"
                style={fieldInput}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={fieldLabel}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="555-555-5555"
                style={fieldInput}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={fieldLabel}>State</label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                required
                style={fieldInput}
              >
                <option value="">Select a state...</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {error && <p style={{ color: '#E07070', fontSize: '0.85rem', marginBottom: '1rem', fontFamily: 'Georgia, serif' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: '#C9A96E', color: '#0F0F0E', border: 'none', borderRadius: '8px', padding: '0.875rem', fontSize: '0.95rem', fontFamily: 'Georgia, serif', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.03em', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Creating Agent...' : 'Create Agent'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
