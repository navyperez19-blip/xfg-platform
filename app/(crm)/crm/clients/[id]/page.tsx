'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { POLICY_STATUSES, CARRIERS, PRODUCT_TYPES, HEALTH_STATUSES, US_STATES } from '@/app/crm-constants'

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [client, setClient] = useState<any>(null)
  const [policies, setPolicies] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [editingClient, setEditingClient] = useState(false)
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null)
  const [showAddPolicy, setShowAddPolicy] = useState(false)
  const [showPreFill, setShowPreFill] = useState(false)
  const [preFillForm, setPreFillForm] = useState<any>({})
  const [savingPreFill, setSavingPreFill] = useState(false)
  const [preFillSuccess, setPreFillSuccess] = useState('')
  const [notes, setNotes] = useState<any[]>([])
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteForm, setNoteForm] = useState({ note_type: 'call', content: '', follow_up_date: '' })
  const [savingNote, setSavingNote] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [clientForm, setClientForm] = useState<any>({})
  const [policyForm, setPolicyForm] = useState<any>({
    carrier: '', product_type: '', policy_number: '',
    face_amount: '', monthly_premium: '', annual_premium: '',
    date_written: new Date().toISOString().split('T')[0],
    effective_date: '', status: 'pending', notes: ''
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase
        .from('users').select('id, role').eq('id', user.id).single()

      const adminRoles = ['superadmin', 'executive']
      const admin = adminRoles.includes(userRecord?.role ?? '')
      setIsAdmin(admin)

      const { data: agentRecord } = await supabase
        .from('agents').select('id').eq('user_id', user.id).single()
      setAgentId(agentRecord?.id ?? null)

      const { data: clientData } = await supabase
        .from('crm_clients')
        .select(`*, agents!crm_clients_agent_id_fkey(full_name)`)
        .eq('id', clientId)
        .single()

      if (!clientData) { router.push('/crm/clients'); return }

      setClient(clientData)
      setClientForm(clientData)
      setPreFillForm(clientData)

      const { data: policyData } = await supabase
        .from('crm_policies')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      setPolicies(policyData ?? [])

      const { data: notesData } = await supabase
        .from('crm_notes')
        .select('*, agents!crm_notes_agent_id_fkey(full_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      setNotes(notesData ?? [])
      setLoading(false)
    }
    load()
  }, [clientId, router])

  async function saveClient() {
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('crm_clients')
      .update({
        first_name: clientForm.first_name,
        last_name: clientForm.last_name,
        date_of_birth: clientForm.date_of_birth || null,
        email: clientForm.email || null,
        phone: clientForm.phone || null,
        city: clientForm.city || null,
        state: clientForm.state || null,
        zip: clientForm.zip || null,
        health_status: clientForm.health_status || null,
        tobacco_user: clientForm.tobacco_user ?? false,
        health_notes: clientForm.health_notes || null,
        notes: clientForm.notes || null,
      })
      .eq('id', clientId)

    if (error) { setError(error.message); setSaving(false); return }
    setClient({ ...client, ...clientForm })
    setEditingClient(false)
    setSuccess('Client updated successfully.')
    setTimeout(() => setSuccess(''), 3000)
    setSaving(false)
  }

  async function savePolicy(policyId: string) {
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('crm_policies')
      .update({
        carrier: policyForm.carrier,
        product_type: policyForm.product_type,
        policy_number: policyForm.policy_number || null,
        face_amount: policyForm.face_amount ? Number(policyForm.face_amount) : null,
        monthly_premium: policyForm.monthly_premium ? Number(policyForm.monthly_premium) : null,
        annual_premium: policyForm.annual_premium ? Number(policyForm.annual_premium) : null,
        date_written: policyForm.date_written,
        effective_date: policyForm.effective_date || null,
        status: policyForm.status,
        notes: policyForm.notes || null,
      })
      .eq('id', policyId)

    if (error) { setError(error.message); setSaving(false); return }
    setPolicies(policies.map(p => p.id === policyId ? { ...p, ...policyForm } : p))
    setEditingPolicyId(null)
    setSuccess('Policy updated successfully.')
    setTimeout(() => setSuccess(''), 3000)
    setSaving(false)
  }

  async function addPolicy() {
    if (!policyForm.carrier || !policyForm.product_type) {
      setError('Carrier and product type are required.')
      return
    }
    setSaving(true)
    setError('')
    const { data, error } = await supabase
      .from('crm_policies')
      .insert({
        client_id: clientId,
        agent_id: agentId,
        carrier: policyForm.carrier,
        product_type: policyForm.product_type,
        policy_number: policyForm.policy_number || null,
        face_amount: policyForm.face_amount ? Number(policyForm.face_amount) : null,
        monthly_premium: policyForm.monthly_premium ? Number(policyForm.monthly_premium) : null,
        annual_premium: policyForm.annual_premium ? Number(policyForm.annual_premium) : null,
        date_written: policyForm.date_written,
        effective_date: policyForm.effective_date || null,
        status: policyForm.status,
        notes: policyForm.notes || null,
      })
      .select()
      .single()

    if (error) { setError(error.message); setSaving(false); return }
    setPolicies([data, ...policies])
    setShowAddPolicy(false)
    setPolicyForm({ carrier: '', product_type: '', policy_number: '', face_amount: '', monthly_premium: '', annual_premium: '', date_written: new Date().toISOString().split('T')[0], effective_date: '', status: 'pending', notes: '' })
    setSuccess('Policy added successfully.')
    setTimeout(() => setSuccess(''), 3000)
    setSaving(false)
  }

  async function deletePolicy(policyId: string) {
    if (!confirm('Delete this policy? This cannot be undone.')) return
    const { error } = await supabase.from('crm_policies').delete().eq('id', policyId)
    if (error) { setError(error.message); return }
    setPolicies(policies.filter(p => p.id !== policyId))
    setSuccess('Policy deleted.')
    setTimeout(() => setSuccess(''), 3000)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', fontSize: '13px', color: '#1A1A1A', backgroundColor: '#FAFAF8', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Back link */}
      <Link href="/crm/clients" style={{ fontSize: '13px', color: '#C9A96E', textDecoration: 'none', fontWeight: '600', display: 'inline-block', marginBottom: '20px' }}>
        ← Back to Clients
      </Link>

      {/* Success / Error */}
      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#F0FAF4', border: '1px solid #C8E6C9', borderRadius: '8px', color: '#2E7D32', fontSize: '13px', marginBottom: '16px' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', color: '#C0392B', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Client Header */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: editingClient ? '20px' : '0' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>
              {client.first_name} {client.last_name}
            </h1>
            <p style={{ fontSize: '13px', color: '#7A7A7A' }}>
              {[client.city, client.state].filter(Boolean).join(', ')}
              {client.date_of_birth && ` · DOB: ${new Date(client.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </p>
            {isAdmin && client.agents && (
              <p style={{ fontSize: '12px', color: '#AAA', marginTop: '4px' }}>Agent: {client.agents.full_name}</p>
            )}
          </div>
          <button
            onClick={() => { setEditingClient(!editingClient); setClientForm(client) }}
            style={{ padding: '8px 18px', backgroundColor: editingClient ? '#FFFFFF' : '#C9A96E', color: editingClient ? '#4A4A4A' : '#1A1A1A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
          >
            {editingClient ? 'Cancel' : 'Edit Client'}
          </button>
        </div>

        {editingClient && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={grid2}>
              <div><label style={lbl}>First Name</label><input style={inp} value={clientForm.first_name ?? ''} onChange={e => setClientForm({ ...clientForm, first_name: e.target.value })} /></div>
              <div><label style={lbl}>Last Name</label><input style={inp} value={clientForm.last_name ?? ''} onChange={e => setClientForm({ ...clientForm, last_name: e.target.value })} /></div>
            </div>
            <div style={grid2}>
              <div><label style={lbl}>Date of Birth</label><input type="date" style={inp} value={clientForm.date_of_birth ?? ''} onChange={e => setClientForm({ ...clientForm, date_of_birth: e.target.value })} /></div>
              <div><label style={lbl}>Phone</label><input style={inp} value={clientForm.phone ?? ''} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} /></div>
            </div>
            <div><label style={lbl}>Email</label><input type="email" style={inp} value={clientForm.email ?? ''} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} /></div>
            <div style={grid3}>
              <div><label style={lbl}>City</label><input style={inp} value={clientForm.city ?? ''} onChange={e => setClientForm({ ...clientForm, city: e.target.value })} /></div>
              <div>
                <label style={lbl}>State</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={clientForm.state ?? ''} onChange={e => setClientForm({ ...clientForm, state: e.target.value })}>
                  <option value="">Select</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={lbl}>ZIP</label><input style={inp} value={clientForm.zip ?? ''} onChange={e => setClientForm({ ...clientForm, zip: e.target.value })} /></div>
            </div>
            <div style={grid2}>
              <div>
                <label style={lbl}>Health Status</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={clientForm.health_status ?? ''} onChange={e => setClientForm({ ...clientForm, health_status: e.target.value })}>
                  <option value="">Select</option>
                  {HEALTH_STATUSES.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Tobacco User</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={clientForm.tobacco_user ? 'yes' : 'no'} onChange={e => setClientForm({ ...clientForm, tobacco_user: e.target.value === 'yes' })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
            <div><label style={lbl}>Health Notes</label><textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={clientForm.health_notes ?? ''} onChange={e => setClientForm({ ...clientForm, health_notes: e.target.value })} /></div>
            <div><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={clientForm.notes ?? ''} onChange={e => setClientForm({ ...clientForm, notes: e.target.value })} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={saveClient} disabled={saving} style={{ padding: '10px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {!editingClient && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '20px' }}>
            {[
              { label: 'Phone', value: client.phone || '—' },
              { label: 'Email', value: client.email || '—' },
              { label: 'Health', value: client.health_status ? `${client.health_status}${client.tobacco_user ? ' · 🚬' : ''}` : '—' },
              { label: 'ZIP', value: client.zip || '—' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: '11px', fontWeight: '600', color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{item.label}</p>
                <p style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '500', textTransform: 'capitalize' }}>{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Policies Section */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E1DA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>
            Policies ({policies.length})
          </h2>
          <button
            onClick={() => setShowAddPolicy(!showAddPolicy)}
            style={{ padding: '8px 18px', backgroundColor: showAddPolicy ? '#FFFFFF' : '#C9A96E', color: showAddPolicy ? '#4A4A4A' : '#1A1A1A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
          >
            {showAddPolicy ? 'Cancel' : '+ Add Policy'}
          </button>
        </div>

        {/* Add Policy Form */}
        {showAddPolicy && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E1DA', backgroundColor: '#FAFAF8' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>New Policy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={grid2}>
                <div>
                  <label style={lbl}>Carrier *</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={policyForm.carrier} onChange={e => setPolicyForm({ ...policyForm, carrier: e.target.value })}>
                    <option value="">Select carrier</option>
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Product Type *</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={policyForm.product_type} onChange={e => setPolicyForm({ ...policyForm, product_type: e.target.value })}>
                    <option value="">Select product</option>
                    {PRODUCT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={grid2}>
                <div><label style={lbl}>Policy Number</label><input style={inp} value={policyForm.policy_number} onChange={e => setPolicyForm({ ...policyForm, policy_number: e.target.value })} placeholder="e.g. MO-12345678" /></div>
                <div>
                  <label style={lbl}>Status</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={policyForm.status} onChange={e => setPolicyForm({ ...policyForm, status: e.target.value })}>
                    {POLICY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={grid3}>
                <div><label style={lbl}>Face Amount</label><input type="number" style={inp} value={policyForm.face_amount} onChange={e => setPolicyForm({ ...policyForm, face_amount: e.target.value })} placeholder="250000" /></div>
                <div>
                  <label style={lbl}>Monthly Premium</label>
                  <input
                    type="number"
                    style={inp}
                    value={policyForm.monthly_premium}
                    onChange={e => {
                      const monthly = e.target.value
                      const annual = monthly ? (parseFloat(monthly) * 12).toFixed(2) : ''
                      setPolicyForm((prev: any) => ({ ...prev, monthly_premium: monthly, annual_premium: annual }))
                    }}
                    placeholder="0.00"
                  />
                  {policyForm.monthly_premium && parseFloat(policyForm.monthly_premium) > 0 && (
                    <p style={{ fontSize: '11px', color: '#7A7A7A', marginTop: '4px' }}>
                      Annual: ${(parseFloat(policyForm.monthly_premium) * 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div>
                  <label style={lbl}>Annual Premium</label>
                  <input
                    type="number"
                    style={inp}
                    value={policyForm.annual_premium}
                    onChange={e => {
                      const annual = e.target.value
                      const monthly = annual ? (parseFloat(annual) / 12).toFixed(2) : ''
                      setPolicyForm((prev: any) => ({ ...prev, annual_premium: annual, monthly_premium: monthly }))
                    }}
                    placeholder="0.00"
                  />
                  {policyForm.annual_premium && parseFloat(policyForm.annual_premium) > 0 && (
                    <p style={{ fontSize: '11px', color: '#7A7A7A', marginTop: '4px' }}>
                      Monthly: ${(parseFloat(policyForm.annual_premium) / 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
              <div style={grid2}>
                <div><label style={lbl}>Date Written</label><input type="date" style={inp} value={policyForm.date_written} onChange={e => setPolicyForm({ ...policyForm, date_written: e.target.value })} /></div>
                <div><label style={lbl}>Effective Date</label><input type="date" style={inp} value={policyForm.effective_date} onChange={e => setPolicyForm({ ...policyForm, effective_date: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={policyForm.notes} onChange={e => setPolicyForm({ ...policyForm, notes: e.target.value })} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={addPolicy} disabled={saving} style={{ padding: '10px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : 'Add Policy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Policy List */}
        {policies.length > 0 ? (
          <div>
            {policies.map((policy, i) => {
              const statusInfo = POLICY_STATUSES.find(s => s.value === policy.status)
              const isEditing = editingPolicyId === policy.id
              return (
                <div key={policy.id} style={{ padding: '20px 24px', borderBottom: i < policies.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                  {!isEditing ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>{policy.carrier}</span>
                            <span style={{ fontSize: '13px', color: '#7A7A7A' }}>·</span>
                            <span style={{ fontSize: '13px', color: '#4A4A4A' }}>{policy.product_type}</span>
                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: `${statusInfo?.color}18`, color: statusInfo?.color ?? '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {statusInfo?.label ?? policy.status}
                            </span>
                          </div>
                          {policy.policy_number && (
                            <p style={{ fontSize: '12px', color: '#AAA' }}>Policy #{policy.policy_number}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => { setEditingPolicyId(policy.id); setPolicyForm({ ...policy, face_amount: policy.face_amount ?? '', monthly_premium: policy.monthly_premium ?? '', annual_premium: policy.annual_premium ?? '', effective_date: policy.effective_date ?? '', notes: policy.notes ?? '' }) }}
                            style={{ padding: '6px 14px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deletePolicy(policy.id)}
                            style={{ padding: '6px 14px', backgroundColor: '#FFF5F5', color: '#C0392B', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {[
                          { label: 'Face Amount', value: policy.face_amount ? `$${Number(policy.face_amount).toLocaleString()}` : '—' },
                          { label: 'Monthly Premium', value: policy.monthly_premium ? `$${Number(policy.monthly_premium).toLocaleString()}` : '—' },
                          { label: 'Annual Premium', value: policy.annual_premium ? `$${Number(policy.annual_premium).toLocaleString()}` : '—' },
                          { label: 'Date Written', value: policy.date_written ? new Date(policy.date_written).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                        ].map(item => (
                          <div key={item.label}>
                            <p style={{ fontSize: '11px', fontWeight: '600', color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>{item.label}</p>
                            <p style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '600' }}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {policy.notes && (
                        <p style={{ fontSize: '12px', color: '#7A7A7A', marginTop: '10px', fontStyle: 'italic' }}>{policy.notes}</p>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={grid2}>
                        <div>
                          <label style={lbl}>Carrier</label>
                          <select style={{ ...inp, cursor: 'pointer' }} value={policyForm.carrier} onChange={e => setPolicyForm({ ...policyForm, carrier: e.target.value })}>
                            {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={lbl}>Product Type</label>
                          <select style={{ ...inp, cursor: 'pointer' }} value={policyForm.product_type} onChange={e => setPolicyForm({ ...policyForm, product_type: e.target.value })}>
                            {PRODUCT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={grid2}>
                        <div><label style={lbl}>Policy Number</label><input style={inp} value={policyForm.policy_number ?? ''} onChange={e => setPolicyForm({ ...policyForm, policy_number: e.target.value })} /></div>
                        <div>
                          <label style={lbl}>Status</label>
                          <select style={{ ...inp, cursor: 'pointer' }} value={policyForm.status} onChange={e => setPolicyForm({ ...policyForm, status: e.target.value })}>
                            {POLICY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={grid3}>
                        <div><label style={lbl}>Face Amount</label><input type="number" style={inp} value={policyForm.face_amount ?? ''} onChange={e => setPolicyForm({ ...policyForm, face_amount: e.target.value })} /></div>
                        <div>
                          <label style={lbl}>Monthly Premium</label>
                          <input
                            type="number"
                            style={inp}
                            value={policyForm.monthly_premium ?? ''}
                            onChange={e => {
                              const monthly = e.target.value
                              const annual = monthly ? (parseFloat(monthly) * 12).toFixed(2) : ''
                              setPolicyForm((prev: any) => ({ ...prev, monthly_premium: monthly, annual_premium: annual }))
                            }}
                          />
                          {policyForm.monthly_premium && parseFloat(policyForm.monthly_premium) > 0 && (
                            <p style={{ fontSize: '11px', color: '#7A7A7A', marginTop: '4px' }}>
                              Annual: ${(parseFloat(policyForm.monthly_premium) * 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                        <div>
                          <label style={lbl}>Annual Premium</label>
                          <input
                            type="number"
                            style={inp}
                            value={policyForm.annual_premium ?? ''}
                            onChange={e => {
                              const annual = e.target.value
                              const monthly = annual ? (parseFloat(annual) / 12).toFixed(2) : ''
                              setPolicyForm((prev: any) => ({ ...prev, annual_premium: annual, monthly_premium: monthly }))
                            }}
                          />
                          {policyForm.annual_premium && parseFloat(policyForm.annual_premium) > 0 && (
                            <p style={{ fontSize: '11px', color: '#7A7A7A', marginTop: '4px' }}>
                              Monthly: ${(parseFloat(policyForm.annual_premium) / 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={grid2}>
                        <div><label style={lbl}>Date Written</label><input type="date" style={inp} value={policyForm.date_written ?? ''} onChange={e => setPolicyForm({ ...policyForm, date_written: e.target.value })} /></div>
                        <div><label style={lbl}>Effective Date</label><input type="date" style={inp} value={policyForm.effective_date ?? ''} onChange={e => setPolicyForm({ ...policyForm, effective_date: e.target.value })} /></div>
                      </div>
                      <div><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={policyForm.notes ?? ''} onChange={e => setPolicyForm({ ...policyForm, notes: e.target.value })} /></div>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingPolicyId(null)} style={{ padding: '9px 18px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                        <button onClick={() => savePolicy(policy.id)} disabled={saving} style={{ padding: '9px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                          {saving ? 'Saving...' : 'Save Policy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#7A7A7A', marginBottom: '4px' }}>No policies yet</p>
            <p style={{ fontSize: '12px', color: '#AAA' }}>Click "Add Policy" to log a policy for this client</p>
          </div>
        )}
      </div>

      {/* Pre-Fill Worksheet Section */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden', marginTop: '20px' }}>
        <div style={{ padding: '18px 24px', borderBottom: showPreFill ? '1px solid #E5E1DA' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>Pre-Fill Worksheet</h2>
            <p style={{ fontSize: '12px', color: '#7A7A7A', marginTop: '2px' }}>Gather all client info needed for applications</p>
          </div>
          <button
            onClick={() => setShowPreFill(!showPreFill)}
            style={{ padding: '8px 18px', backgroundColor: showPreFill ? '#FFFFFF' : '#C9A96E', color: showPreFill ? '#4A4A4A' : '#1A1A1A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
          >
            {showPreFill ? 'Collapse' : 'Open Worksheet'}
          </button>
        </div>

        {showPreFill && (
          <div style={{ padding: '24px' }}>
            {preFillSuccess && (
              <div style={{ padding: '12px 16px', backgroundColor: '#F0FAF4', border: '1px solid #C8E6C9', borderRadius: '8px', color: '#2E7D32', fontSize: '13px', marginBottom: '20px' }}>
                {preFillSuccess}
              </div>
            )}

            {/* Section 1: Personal Info */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #F0EDE8' }}>
                1. Personal Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={grid2}>
                  <div><label style={lbl}>First Name</label><input style={inp} value={preFillForm.first_name ?? ''} onChange={e => setPreFillForm({ ...preFillForm, first_name: e.target.value })} /></div>
                  <div><label style={lbl}>Last Name</label><input style={inp} value={preFillForm.last_name ?? ''} onChange={e => setPreFillForm({ ...preFillForm, last_name: e.target.value })} /></div>
                </div>
                <div style={grid3}>
                  <div><label style={lbl}>Date of Birth</label><input type="date" style={inp} value={preFillForm.date_of_birth ?? ''} onChange={e => setPreFillForm({ ...preFillForm, date_of_birth: e.target.value })} /></div>
                  <div>
                    <label style={lbl}>Gender</label>
                    <select style={{ ...inp, cursor: 'pointer' }} value={preFillForm.gender ?? ''} onChange={e => setPreFillForm({ ...preFillForm, gender: e.target.value })}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Marital Status</label>
                    <select style={{ ...inp, cursor: 'pointer' }} value={preFillForm.marital_status ?? ''} onChange={e => setPreFillForm({ ...preFillForm, marital_status: e.target.value })}>
                      <option value="">Select</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                  </div>
                </div>
                <div style={grid2}>
                  <div><label style={lbl}>SSN (last 4)</label><input style={inp} value={preFillForm.ssn_last4 ?? ''} onChange={e => setPreFillForm({ ...preFillForm, ssn_last4: e.target.value })} placeholder="XXXX" maxLength={4} /></div>
                  <div><label style={lbl}># of Dependents</label><input type="number" style={inp} value={preFillForm.num_dependents ?? ''} onChange={e => setPreFillForm({ ...preFillForm, num_dependents: e.target.value })} placeholder="0" /></div>
                </div>
                <div style={grid2}>
                  <div><label style={lbl}>Phone</label><input style={inp} value={preFillForm.phone ?? ''} onChange={e => setPreFillForm({ ...preFillForm, phone: e.target.value })} /></div>
                  <div><label style={lbl}>Email</label><input type="email" style={inp} value={preFillForm.email ?? ''} onChange={e => setPreFillForm({ ...preFillForm, email: e.target.value })} /></div>
                </div>
                <div><label style={lbl}>Street Address</label><input style={inp} value={preFillForm.address ?? ''} onChange={e => setPreFillForm({ ...preFillForm, address: e.target.value })} /></div>
                <div style={grid3}>
                  <div><label style={lbl}>City</label><input style={inp} value={preFillForm.city ?? ''} onChange={e => setPreFillForm({ ...preFillForm, city: e.target.value })} /></div>
                  <div>
                    <label style={lbl}>State</label>
                    <select style={{ ...inp, cursor: 'pointer' }} value={preFillForm.state ?? ''} onChange={e => setPreFillForm({ ...preFillForm, state: e.target.value })}>
                      <option value="">Select</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>ZIP</label><input style={inp} value={preFillForm.zip ?? ''} onChange={e => setPreFillForm({ ...preFillForm, zip: e.target.value })} /></div>
                </div>
              </div>
            </div>

            {/* Section 2: Employment/Financial */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #F0EDE8' }}>
                2. Employment &amp; Financial
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={grid2}>
                  <div><label style={lbl}>Employer / Occupation</label><input style={inp} value={preFillForm.employer ?? ''} onChange={e => setPreFillForm({ ...preFillForm, employer: e.target.value })} /></div>
                  <div>
                    <label style={lbl}>Employment Status</label>
                    <select style={{ ...inp, cursor: 'pointer' }} value={preFillForm.employment_status ?? ''} onChange={e => setPreFillForm({ ...preFillForm, employment_status: e.target.value })}>
                      <option value="">Select</option>
                      <option value="employed">Employed</option>
                      <option value="self_employed">Self-Employed</option>
                      <option value="retired">Retired</option>
                      <option value="unemployed">Unemployed</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
                <div style={grid2}>
                  <div><label style={lbl}>Annual Income</label><input type="number" style={inp} value={preFillForm.annual_income ?? ''} onChange={e => setPreFillForm({ ...preFillForm, annual_income: e.target.value })} placeholder="0" /></div>
                  <div><label style={lbl}>Years at Job</label><input type="number" style={inp} value={preFillForm.years_at_job ?? ''} onChange={e => setPreFillForm({ ...preFillForm, years_at_job: e.target.value })} placeholder="0" /></div>
                </div>
              </div>
            </div>

            {/* Section 3: Health/Lifestyle */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #F0EDE8' }}>
                3. Health &amp; Lifestyle
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { key: 'h_tobacco', label: 'Tobacco / nicotine use in the past 12 months?' },
                  { key: 'h_heart', label: 'Heart disease, heart attack, or chest pain?' },
                  { key: 'h_diabetes', label: 'Diabetes or blood sugar issues?' },
                  { key: 'h_cancer', label: 'Cancer (history or current)?' },
                  { key: 'h_blood_pressure', label: 'High blood pressure?' },
                  { key: 'h_stroke', label: 'Stroke or TIA (mini-stroke)?' },
                  { key: 'h_kidney', label: 'Kidney disease or dialysis?' },
                  { key: 'h_hiv', label: 'HIV / AIDS?' },
                  { key: 'h_mental', label: 'Mental health treatment or hospitalization in the past 2 years?' },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#FAFAF8', borderRadius: '8px', border: '1px solid #F0EDE8' }}>
                    <span style={{ fontSize: '13px', color: '#1A1A1A', flex: 1, marginRight: '12px' }}>{item.label}</span>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {(['yes', 'no'] as const).map(opt => (
                        <button
                          key={opt}
                          onClick={() => setPreFillForm({ ...preFillForm, [item.key]: opt })}
                          style={{
                            padding: '5px 16px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid',
                            backgroundColor: preFillForm[item.key] === opt ? (opt === 'yes' ? '#FEE2E2' : '#F0FAF4') : '#FFFFFF',
                            color: preFillForm[item.key] === opt ? (opt === 'yes' ? '#C0392B' : '#2E7D32') : '#7A7A7A',
                            borderColor: preFillForm[item.key] === opt ? (opt === 'yes' ? '#FECACA' : '#C8E6C9') : '#E5E1DA',
                          }}
                        >
                          {opt === 'yes' ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={lbl}>Height / Weight / Additional Health Notes</label>
                <textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={preFillForm.health_notes ?? ''} onChange={e => setPreFillForm({ ...preFillForm, health_notes: e.target.value })} placeholder="e.g. 5'10'' / 180 lbs. On Lisinopril for BP." />
              </div>
            </div>

            {/* Section 4: Beneficiaries */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #F0EDE8' }}>
                4. Beneficiaries
              </h3>
              <p style={{ fontSize: '12px', color: '#7A7A7A', marginBottom: '12px', fontWeight: '600' }}>Primary Beneficiary</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={grid2}>
                  <div><label style={lbl}>Full Name</label><input style={inp} value={preFillForm.primary_bene_name ?? ''} onChange={e => setPreFillForm({ ...preFillForm, primary_bene_name: e.target.value })} /></div>
                  <div><label style={lbl}>Relationship</label><input style={inp} value={preFillForm.primary_bene_rel ?? ''} onChange={e => setPreFillForm({ ...preFillForm, primary_bene_rel: e.target.value })} placeholder="e.g. Spouse" /></div>
                </div>
                <div style={grid2}>
                  <div><label style={lbl}>Date of Birth</label><input type="date" style={inp} value={preFillForm.primary_bene_dob ?? ''} onChange={e => setPreFillForm({ ...preFillForm, primary_bene_dob: e.target.value })} /></div>
                  <div><label style={lbl}>SSN (last 4)</label><input style={inp} value={preFillForm.primary_bene_ssn ?? ''} onChange={e => setPreFillForm({ ...preFillForm, primary_bene_ssn: e.target.value })} placeholder="XXXX" maxLength={4} /></div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#7A7A7A', marginBottom: '12px', fontWeight: '600' }}>Contingent Beneficiary</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={grid2}>
                  <div><label style={lbl}>Full Name</label><input style={inp} value={preFillForm.contingent_bene_name ?? ''} onChange={e => setPreFillForm({ ...preFillForm, contingent_bene_name: e.target.value })} /></div>
                  <div><label style={lbl}>Relationship</label><input style={inp} value={preFillForm.contingent_bene_rel ?? ''} onChange={e => setPreFillForm({ ...preFillForm, contingent_bene_rel: e.target.value })} placeholder="e.g. Child" /></div>
                </div>
                <div style={grid2}>
                  <div><label style={lbl}>Date of Birth</label><input type="date" style={inp} value={preFillForm.contingent_bene_dob ?? ''} onChange={e => setPreFillForm({ ...preFillForm, contingent_bene_dob: e.target.value })} /></div>
                </div>
              </div>
            </div>

            {/* Section 5: Medications */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #F0EDE8' }}>
                5. Medications
              </h3>
              <div>
                <label style={lbl}>List all current medications, dosages, and conditions treated</label>
                <textarea style={{ ...inp, minHeight: '100px', resize: 'vertical' }} value={preFillForm.medications ?? ''} onChange={e => setPreFillForm({ ...preFillForm, medications: e.target.value })} placeholder={'e.g. Lisinopril 10mg – high blood pressure\nMetformin 500mg – Type 2 diabetes'} />
              </div>
            </div>

            {/* Section 6: Existing Insurance */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #F0EDE8' }}>
                6. Existing Insurance
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#FAFAF8', borderRadius: '8px', border: '1px solid #F0EDE8' }}>
                  <span style={{ fontSize: '13px', color: '#1A1A1A' }}>Does client have any existing life insurance?</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['yes', 'no'] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={() => setPreFillForm({ ...preFillForm, has_existing_insurance: opt })}
                        style={{
                          padding: '5px 16px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid',
                          backgroundColor: preFillForm.has_existing_insurance === opt ? (opt === 'yes' ? '#EDE9FE' : '#F0FAF4') : '#FFFFFF',
                          color: preFillForm.has_existing_insurance === opt ? (opt === 'yes' ? '#5B21B6' : '#2E7D32') : '#7A7A7A',
                          borderColor: preFillForm.has_existing_insurance === opt ? (opt === 'yes' ? '#DDD6FE' : '#C8E6C9') : '#E5E1DA',
                        }}
                      >
                        {opt === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
                {preFillForm.has_existing_insurance === 'yes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={grid3}>
                      <div><label style={lbl}>Carrier</label><input style={inp} value={preFillForm.existing_ins_carrier ?? ''} onChange={e => setPreFillForm({ ...preFillForm, existing_ins_carrier: e.target.value })} /></div>
                      <div><label style={lbl}>Policy Type</label><input style={inp} value={preFillForm.existing_ins_type ?? ''} onChange={e => setPreFillForm({ ...preFillForm, existing_ins_type: e.target.value })} placeholder="e.g. Term, Whole Life" /></div>
                      <div><label style={lbl}>Face Amount</label><input type="number" style={inp} value={preFillForm.existing_ins_face ?? ''} onChange={e => setPreFillForm({ ...preFillForm, existing_ins_face: e.target.value })} placeholder="250000" /></div>
                    </div>
                    <div style={grid2}>
                      <div><label style={lbl}>Monthly Premium</label><input type="number" style={inp} value={preFillForm.existing_ins_premium ?? ''} onChange={e => setPreFillForm({ ...preFillForm, existing_ins_premium: e.target.value })} placeholder="0.00" /></div>
                      <div>
                        <label style={lbl}>Replacing this policy?</label>
                        <select style={{ ...inp, cursor: 'pointer' }} value={preFillForm.existing_ins_replacing ?? ''} onChange={e => setPreFillForm({ ...preFillForm, existing_ins_replacing: e.target.value })}>
                          <option value="">Select</option>
                          <option value="yes">Yes – replacing</option>
                          <option value="no">No – keeping</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 7: Bank Info */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #F0EDE8' }}>
                7. Bank Information
              </h3>
              <div style={{ padding: '10px 14px', backgroundColor: '#FFF8E1', border: '1px solid #FFE082', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ fontSize: '12px', color: '#F57F17' }}>Handle with care — for pre-filling applications only.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={grid2}>
                  <div><label style={lbl}>Bank Name</label><input style={inp} value={preFillForm.bank_name ?? ''} onChange={e => setPreFillForm({ ...preFillForm, bank_name: e.target.value })} /></div>
                  <div>
                    <label style={lbl}>Account Type</label>
                    <select style={{ ...inp, cursor: 'pointer' }} value={preFillForm.bank_account_type ?? ''} onChange={e => setPreFillForm({ ...preFillForm, bank_account_type: e.target.value })}>
                      <option value="">Select</option>
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                </div>
                <div style={grid2}>
                  <div><label style={lbl}>Routing Number</label><input style={inp} value={preFillForm.bank_routing ?? ''} onChange={e => setPreFillForm({ ...preFillForm, bank_routing: e.target.value })} placeholder="9 digits" maxLength={9} /></div>
                  <div><label style={lbl}>Account Number</label><input style={inp} value={preFillForm.bank_account ?? ''} onChange={e => setPreFillForm({ ...preFillForm, bank_account: e.target.value })} /></div>
                </div>
                <div>
                  <label style={lbl}>Draft Date (day of month)</label>
                  <input type="number" style={{ ...inp, maxWidth: '120px' }} value={preFillForm.bank_draft_date ?? ''} onChange={e => setPreFillForm({ ...preFillForm, bank_draft_date: e.target.value })} placeholder="1–28" min={1} max={28} />
                </div>
              </div>
            </div>

            {/* Section 8: Agent Notes */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #F0EDE8' }}>
                8. Agent Notes
              </h3>
              <div>
                <label style={lbl}>Internal notes (not shared with client)</label>
                <textarea style={{ ...inp, minHeight: '90px', resize: 'vertical' }} value={preFillForm.agent_notes ?? ''} onChange={e => setPreFillForm({ ...preFillForm, agent_notes: e.target.value })} placeholder="Coverage needs, objections, follow-up notes, referral source, etc." />
              </div>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #E5E1DA' }}>
              <button onClick={() => setShowPreFill(false)} style={{ padding: '10px 20px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                Collapse
              </button>
              <button
                onClick={async () => {
                  setSavingPreFill(true)
                  const worksheetData = {
                    gender: preFillForm.gender,
                    marital_status: preFillForm.marital_status,
                    ssn_last4: preFillForm.ssn_last4,
                    num_dependents: preFillForm.num_dependents,
                    address: preFillForm.address,
                    employer: preFillForm.employer,
                    employment_status: preFillForm.employment_status,
                    annual_income: preFillForm.annual_income,
                    years_at_job: preFillForm.years_at_job,
                    h_tobacco: preFillForm.h_tobacco,
                    h_heart: preFillForm.h_heart,
                    h_diabetes: preFillForm.h_diabetes,
                    h_cancer: preFillForm.h_cancer,
                    h_blood_pressure: preFillForm.h_blood_pressure,
                    h_stroke: preFillForm.h_stroke,
                    h_kidney: preFillForm.h_kidney,
                    h_hiv: preFillForm.h_hiv,
                    h_mental: preFillForm.h_mental,
                    medications: preFillForm.medications,
                    primary_bene_name: preFillForm.primary_bene_name,
                    primary_bene_rel: preFillForm.primary_bene_rel,
                    primary_bene_dob: preFillForm.primary_bene_dob,
                    primary_bene_ssn: preFillForm.primary_bene_ssn,
                    contingent_bene_name: preFillForm.contingent_bene_name,
                    contingent_bene_rel: preFillForm.contingent_bene_rel,
                    contingent_bene_dob: preFillForm.contingent_bene_dob,
                    has_existing_insurance: preFillForm.has_existing_insurance,
                    existing_ins_carrier: preFillForm.existing_ins_carrier,
                    existing_ins_type: preFillForm.existing_ins_type,
                    existing_ins_face: preFillForm.existing_ins_face,
                    existing_ins_premium: preFillForm.existing_ins_premium,
                    existing_ins_replacing: preFillForm.existing_ins_replacing,
                    bank_name: preFillForm.bank_name,
                    bank_account_type: preFillForm.bank_account_type,
                    bank_routing: preFillForm.bank_routing,
                    bank_account: preFillForm.bank_account,
                    bank_draft_date: preFillForm.bank_draft_date,
                    agent_notes: preFillForm.agent_notes,
                  }
                  const { error } = await supabase
                    .from('crm_clients')
                    .update({
                      first_name: preFillForm.first_name,
                      last_name: preFillForm.last_name,
                      date_of_birth: preFillForm.date_of_birth || null,
                      phone: preFillForm.phone || null,
                      email: preFillForm.email || null,
                      city: preFillForm.city || null,
                      state: preFillForm.state || null,
                      zip: preFillForm.zip || null,
                      health_notes: preFillForm.health_notes || null,
                      tobacco_user: preFillForm.h_tobacco === 'yes',
                      worksheet_data: worksheetData,
                    } as any)
                    .eq('id', clientId)
                  if (!error) {
                    setClient({ ...client, ...preFillForm })
                    setPreFillSuccess('Worksheet saved successfully.')
                    setTimeout(() => setPreFillSuccess(''), 3000)
                  }
                  setSavingPreFill(false)
                }}
                disabled={savingPreFill}
                style={{ padding: '10px 28px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', opacity: savingPreFill ? 0.6 : 1 }}
              >
                {savingPreFill ? 'Saving...' : 'Save Worksheet'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notes & Activity Section */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden', marginTop: '20px' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E1DA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>
            Activity Log ({notes.length})
          </h2>
          <button
            onClick={() => setShowAddNote(!showAddNote)}
            style={{ padding: '8px 18px', backgroundColor: showAddNote ? '#FFFFFF' : '#C9A96E', color: showAddNote ? '#4A4A4A' : '#1A1A1A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
          >
            {showAddNote ? 'Cancel' : '+ Log Activity'}
          </button>
        </div>

        {/* Add Note Form */}
        {showAddNote && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E1DA', backgroundColor: '#FAFAF8' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }}>Activity Type</label>
                  <select
                    value={noteForm.note_type}
                    onChange={e => setNoteForm({ ...noteForm, note_type: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
                  >
                    <option value="call">📞 Phone Call</option>
                    <option value="text">💬 Text Message</option>
                    <option value="email">✉️ Email</option>
                    <option value="meeting">🤝 Meeting</option>
                    <option value="follow_up">🔔 Follow Up</option>
                    <option value="note">📝 Note</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }}>Follow-up Date (optional)</label>
                  <input
                    type="date"
                    value={noteForm.follow_up_date}
                    onChange={e => setNoteForm({ ...noteForm, follow_up_date: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }}>Notes *</label>
                <textarea
                  value={noteForm.content}
                  onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                  placeholder="What happened? What was discussed? Any next steps?"
                  rows={3}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={async () => {
                    if (!noteForm.content.trim()) return
                    setSavingNote(true)
                    const { data: agentRec } = await supabase.from('agents').select('id').eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '').single()
                    const { data: newNote, error } = await supabase
                      .from('crm_notes')
                      .insert({
                        client_id: clientId,
                        agent_id: agentRec?.id,
                        note_type: noteForm.note_type,
                        content: noteForm.content,
                        follow_up_date: noteForm.follow_up_date || null,
                      })
                      .select('*, agents!crm_notes_agent_id_fkey(full_name)')
                      .single()
                    if (!error && newNote) {
                      setNotes([newNote, ...notes])
                      setNoteForm({ note_type: 'call', content: '', follow_up_date: '' })
                      setShowAddNote(false)
                    }
                    setSavingNote(false)
                  }}
                  disabled={savingNote || !noteForm.content.trim()}
                  style={{ padding: '10px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', opacity: savingNote || !noteForm.content.trim() ? 0.6 : 1 }}
                >
                  {savingNote ? 'Saving...' : 'Save Activity'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes List */}
        {notes.length > 0 ? (
          <div>
            {notes.map((note, i) => {
              const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
                call:      { icon: '📞', color: '#2196F3', label: 'Phone Call' },
                text:      { icon: '💬', color: '#27AE60', label: 'Text' },
                email:     { icon: '✉️', color: '#C9A96E', label: 'Email' },
                meeting:   { icon: '🤝', color: '#9C27B0', label: 'Meeting' },
                follow_up: { icon: '🔔', color: '#FF9800', label: 'Follow Up' },
                note:      { icon: '📝', color: '#7A7A7A', label: 'Note' },
              }
              const config = typeConfig[note.note_type] ?? typeConfig.note
              return (
                <div key={note.id} style={{ padding: '16px 24px', borderBottom: i < notes.length - 1 ? '1px solid #F0EDE8' : 'none', display: 'flex', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: `${config.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    {config.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: config.color }}>{config.label}</span>
                        {note.agents?.full_name && (
                          <span style={{ fontSize: '11px', color: '#AAA' }}>by {note.agents.full_name}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', color: '#AAA' }}>
                          {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this activity?')) return
                            await supabase.from('crm_notes').delete().eq('id', note.id)
                            setNotes(notes.filter(n => n.id !== note.id))
                          }}
                          style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: '14px', padding: '0', lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4A4A4A', lineHeight: 1.5, margin: 0 }}>{note.content}</p>
                    {note.follow_up_date && (
                      <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', backgroundColor: '#FFF8E1', border: '1px solid #FFE082', borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: '#F57F17' }}>
                        🔔 Follow up: {new Date(note.follow_up_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#7A7A7A', marginBottom: '4px' }}>No activity logged yet</p>
            <p style={{ fontSize: '12px', color: '#AAA' }}>Log calls, texts, emails, and follow-ups to track your client interactions</p>
          </div>
        )}
      </div>
    </div>
  )
}
