'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [agentRecord, setAgentRecord] = useState<any>(null)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    state: '',
    xfg_email: '',
    npn: '',
    states_licensed: '',
    notes: '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: agent } = await supabase
        .from('agents')
        .select('id, full_name, email, phone, state, xfg_email, npn, xfg_id, current_stage, agent_model, states_licensed, notes')
        .eq('user_id', user.id)
        .single()

      if (!agent) { router.push('/crm'); return }
      setAgentRecord(agent)
      setForm({
        full_name: agent.full_name ?? '',
        email: agent.email ?? '',
        phone: agent.phone ?? '',
        state: agent.state ?? '',
        xfg_email: agent.xfg_email ?? '',
        npn: agent.npn ?? '',
        states_licensed: agent.states_licensed ?? '',
        notes: agent.notes ?? '',
      })
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')

    const { error: saveError } = await supabase
      .from('agents')
      .update({
        full_name: form.full_name || null,
        email: form.email || null,
        phone: form.phone || null,
        state: form.state || null,
        xfg_email: form.xfg_email || null,
        npn: form.npn || null,
        states_licensed: form.states_licensed || null,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentRecord.id)

    setSaving(false)
    if (saveError) {
      setError('Failed to save. Please try again.')
    } else {
      setSuccess('Profile updated successfully.')
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#1A1A1A',
    backgroundColor: '#FAFAF8',
    border: '1px solid #E5E1DA',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '600',
    color: '#4A4A4A',
    letterSpacing: '0.02em',
    display: 'block',
    marginBottom: '4px',
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          My Profile
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>Update your personal information</p>
      </div>

      {/* Agent ID Card */}
      <div style={{ backgroundColor: '#1A1A1A', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Your XFG ID</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF', fontFamily: 'monospace' }}>{agentRecord.xfg_id}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'capitalize', backgroundColor: agentRecord.current_stage === 'active' ? '#E8F5E9' : '#FEF3C7', color: agentRecord.current_stage === 'active' ? '#1B5E20' : '#92400E' }}>
            {agentRecord.current_stage?.replace('_', ' ')}
          </div>
          <p style={{ fontSize: '12px', color: '#7A7A7A', marginTop: '4px', textTransform: 'capitalize' }}>{agentRecord.agent_model} agent</p>
        </div>
      </div>

      {/* Success / Error */}
      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#F0FAF4', border: '1px solid #C8E6C9', borderRadius: '8px', color: '#2E7D32', fontSize: '13px', marginBottom: '16px' }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', color: '#C0392B', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Form */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={lbl}>Full Name</label>
            <input style={inp} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Your full name" />
          </div>
          <div>
            <label style={lbl}>State</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
              <option value="">Select state</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={lbl}>States Licensed In</label>
          <input
            type="text"
            style={inp}
            value={form.states_licensed || ''}
            onChange={e => setForm({ ...form, states_licensed: e.target.value })}
            placeholder="e.g. LA, TX, FL, GA"
          />
          <p style={{ fontSize: '11px', color: '#7A7A7A', marginTop: '4px' }}>Enter all states you are licensed in, separated by commas</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={lbl}>Phone Number</label>
            <input style={inp} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" />
          </div>
          <div>
            <label style={lbl}>Personal Email</label>
            <input type="email" style={inp} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={lbl}>XFG Email</label>
            <input type="email" style={inp} value={form.xfg_email} onChange={e => setForm({ ...form, xfg_email: e.target.value })} placeholder="firstnamelastname.xfg@gmail.com" />
          </div>
          <div>
            <label style={lbl}>NPN (National Producer Number)</label>
            <input style={inp} value={form.npn} onChange={e => setForm({ ...form, npn: e.target.value })} placeholder="Your NPN" />
          </div>
        </div>

        <div>
          <label style={lbl}>Personal Notes</label>
          <textarea
            style={{ ...inp, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
            value={form.notes || ''}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Any personal notes, goals, or reminders for yourself..."
          />
        </div>

        <div style={{ paddingTop: '8px', borderTop: '1px solid #F0EDE8', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '11px 28px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
