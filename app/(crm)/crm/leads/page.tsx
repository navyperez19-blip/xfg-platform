'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

const LEAD_STATUSES = [
  { value: 'new',          label: 'New',           color: '#7A7A7A' },
  { value: 'attempted',    label: 'Attempted',     color: '#2196F3' },
  { value: 'contacted',    label: 'Contacted',     color: '#C9A96E' },
  { value: 'interested',   label: 'Interested',    color: '#9C27B0' },
  { value: 'quoted',       label: 'Quoted',        color: '#FF9800' },
  { value: 'applied',      label: 'Applied',       color: '#27AE60' },
  { value: 'converted',    label: 'Converted',     color: '#43A047' },
  { value: 'not_interested', label: 'Not Interested', color: '#E53935' },
  { value: 'lost',         label: 'Lost',          color: '#B71C1C' },
]

const LEAD_SOURCES = [
  { value: 'organic',      label: 'Organic / Everyday' },
  { value: 'referral',     label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'purchased',    label: 'Purchased Lead' },
  { value: 'door_to_door', label: 'Door to Door' },
  { value: 'event',        label: 'Event' },
  { value: 'other',        label: 'Other' },
]

export default function LeadsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    state: '', age: '', status: 'new', lead_source: 'organic',
    follow_up_date: '', notes: ''
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

      const aid = agentRecord?.id ?? null
      setAgentId(aid)

      let query = supabase
        .from('crm_leads')
        .select('*, agents!crm_leads_agent_id_fkey(full_name)')
        .order('created_at', { ascending: false })

      if (!admin) query = query.eq('agent_id', aid)

      const { data } = await query
      setLeads(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = leads.filter(l => {
    const nameMatch = !search ||
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search)
    const statusMatch = !filterStatus || l.status === filterStatus
    const sourceMatch = !filterSource || l.lead_source === filterSource
    return nameMatch && statusMatch && sourceMatch
  })

  const statusCounts = LEAD_STATUSES.reduce((acc, s) => {
    acc[s.value] = leads.filter(l => l.status === s.value).length
    return acc
  }, {} as Record<string, number>)

  async function handleAddLead() {
    if (!form.first_name.trim() || !form.last_name.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('crm_leads')
      .insert({
        agent_id: agentId,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        email: form.email || null,
        state: form.state || null,
        age: form.age ? Number(form.age) : null,
        status: form.status,
        lead_source: form.lead_source,
        follow_up_date: form.follow_up_date || null,
        notes: form.notes || null,
      })
      .select('*, agents!crm_leads_agent_id_fkey(full_name)')
      .single()

    if (!error && data) {
      setLeads([data, ...leads])
      setForm({ first_name: '', last_name: '', phone: '', email: '', state: '', age: '', status: 'new', lead_source: 'organic', follow_up_date: '', notes: '' })
      setShowAdd(false)
    }
    setSaving(false)
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Leads Pipeline
          </h1>
          <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
            {leads.length} total lead{leads.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ padding: '10px 20px', backgroundColor: showAdd ? '#FFFFFF' : '#C9A96E', color: showAdd ? '#4A4A4A' : '#1A1A1A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit' }}
        >
          {showAdd ? 'Cancel' : '+ Add Lead'}
        </button>
      </div>

      {/* Pipeline Status Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '8px', marginBottom: '20px' }}>
        {LEAD_STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(filterStatus === s.value ? '' : s.value)}
            style={{
              padding: '10px 6px',
              borderRadius: '8px',
              border: filterStatus === s.value ? `2px solid ${s.color}` : '1px solid #E5E1DA',
              backgroundColor: filterStatus === s.value ? `${s.color}12` : '#FFFFFF',
              cursor: 'pointer',
              textAlign: 'center',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: '700', color: s.color }}>{statusCounts[s.value] ?? 0}</div>
            <div style={{ fontSize: '10px', color: '#7A7A7A', fontWeight: '600', marginTop: '2px', lineHeight: 1.2 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Add Lead Form */}
      {showAdd && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>New Lead</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={lbl}>First Name *</label><input style={inp} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="John" /></div>
              <div><label style={lbl}>Last Name *</label><input style={inp} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Smith" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" /></div>
              <div><label style={lbl}>Email</label><input style={inp} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@email.com" /></div>
              <div><label style={lbl}>Age</label><input type="number" style={inp} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="35" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>State</label>
                <input style={inp} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="LA" maxLength={2} />
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {LEAD_STATUSES.filter(s => s.value !== 'converted').map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Lead Source</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={form.lead_source} onChange={e => setForm({ ...form, lead_source: e.target.value })}>
                  {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Follow-up Date</label>
                <input type="date" style={inp} value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="How did you meet them? What did you discuss?" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleAddLead}
                disabled={saving || !form.first_name.trim() || !form.last_name.trim()}
                style={{ padding: '10px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', opacity: saving || !form.first_name.trim() ? 0.6 : 1 }}
              >
                {saving ? 'Saving...' : 'Add Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          style={{ flex: 1, padding: '9px 14px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF' }}
        />
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          style={{ padding: '9px 14px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
        >
          <option value="">All Sources</option>
          {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(search || filterStatus || filterSource) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterSource('') }}
            style={{ padding: '9px 16px', backgroundColor: '#FFFFFF', color: '#7A7A7A', border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Leads Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
        {filtered.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9F7F4' }}>
                {['Name', 'Phone', 'Age/State', ...(isAdmin ? ['Agent'] : []), 'Source', 'Status', 'Follow-up', 'Notes', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #E5E1DA', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => {
                const statusInfo = LEAD_STATUSES.find(s => s.value === lead.status)
                const sourceInfo = LEAD_SOURCES.find(s => s.value === lead.lead_source)
                const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date() && !['converted', 'not_interested', 'lost'].includes(lead.status)
                return (
                  <tr key={lead.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                    <td style={{ padding: '13px 16px' }}>
                      <Link href={`/crm/leads/${lead.id}`} style={{ fontWeight: '600', fontSize: '14px', color: '#1A1A1A', textDecoration: 'none' }}>
                        {lead.first_name} {lead.last_name}
                      </Link>
                      {lead.email && <div style={{ fontSize: '11px', color: '#AAA', marginTop: '1px' }}>{lead.email}</div>}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '13px', color: '#4A4A4A' }}>{lead.phone || '—'}</td>
                    <td style={{ padding: '13px 16px', fontSize: '13px', color: '#4A4A4A' }}>
                      {[lead.age, lead.state].filter(Boolean).join(' · ') || '—'}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: '#4A4A4A' }}>
                        {lead.agents?.full_name ?? '—'}
                      </td>
                    )}
                    <td style={{ padding: '13px 16px', fontSize: '12px', color: '#7A7A7A' }}>
                      {sourceInfo?.label ?? lead.lead_source}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: `${statusInfo?.color}18`, color: statusInfo?.color ?? '#888', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        {statusInfo?.label ?? lead.status}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      {lead.follow_up_date ? (
                        <span style={{ fontSize: '12px', fontWeight: '600', color: isOverdue ? '#E53935' : '#4A4A4A' }}>
                          {isOverdue ? '⚠ ' : ''}{new Date(lead.follow_up_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '12px', color: '#7A7A7A', maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lead.notes || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <Link href={`/crm/leads/${lead.id}`} style={{ fontSize: '12px', color: '#C9A96E', textDecoration: 'none', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>◎</div>
            <p style={{ fontSize: '15px', color: '#7A7A7A', fontWeight: '500', marginBottom: '4px' }}>
              {search || filterStatus || filterSource ? 'No leads match your filters' : 'No leads yet'}
            </p>
            <p style={{ fontSize: '13px', color: '#AAA', marginBottom: '16px' }}>
              Start tracking the people you talk to every day
            </p>
            {!search && !filterStatus && !filterSource && (
              <button
                onClick={() => setShowAdd(true)}
                style={{ padding: '10px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit' }}
              >
                Add First Lead
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
