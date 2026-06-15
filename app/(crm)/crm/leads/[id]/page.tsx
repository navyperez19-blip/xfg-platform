'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { createCalendarEventFromFollowUp } from '@/app/_actions/crm-actions'

const LEAD_STATUSES = [
  { value: 'new',            label: 'New',            color: '#7A7A7A' },
  { value: 'attempted',      label: 'Attempted',      color: '#2196F3' },
  { value: 'contacted',      label: 'Contacted',      color: '#C9A96E' },
  { value: 'interested',     label: 'Interested',     color: '#9C27B0' },
  { value: 'quoted',         label: 'Quoted',         color: '#FF9800' },
  { value: 'applied',        label: 'Applied',        color: '#27AE60' },
  { value: 'converted',      label: 'Converted',      color: '#43A047' },
  { value: 'not_interested', label: 'Not Interested', color: '#E53935' },
  { value: 'lost',           label: 'Lost',           color: '#B71C1C' },
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

export default function LeadDetailPage() {
  const router = useRouter()
  const params = useParams()
  const leadId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lead, setLead] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [agentId, setAgentId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteForm, setNoteForm] = useState({ note_type: 'call', content: '' })
  const [savingNote, setSavingNote] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: agentRecord } = await supabase
        .from('agents').select('id').eq('user_id', user.id).single()
      setAgentId(agentRecord?.id ?? null)

      const { data: leadData } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (!leadData) { router.push('/crm/leads'); return }
      setLead(leadData)
      setForm(leadData)

      const { data: notesData } = await supabase
        .from('crm_lead_notes')
        .select('*, agents!crm_lead_notes_agent_id_fkey(full_name)')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      setNotes(notesData ?? [])
      setLoading(false)
    }
    load()
  }, [leadId, router])

  async function saveLead() {
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('crm_leads')
      .update({
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
      .eq('id', leadId)

    if (error) { setError(error.message); setSaving(false); return }
    setLead({ ...lead, ...form })
    setEditing(false)
    setSuccess('Lead updated.')
    setTimeout(() => setSuccess(''), 3000)
    setSaving(false)
  }

  async function updateStatus(newStatus: string) {
    await supabase.from('crm_leads').update({ status: newStatus }).eq('id', leadId)
    setLead({ ...lead, status: newStatus })
    setForm({ ...form, status: newStatus })
    setSuccess('Status updated.')
    setTimeout(() => setSuccess(''), 2000)
  }

  async function convertToClient() {
    setSaving(true)
    setError('')

    const { data: newClient, error: clientError } = await supabase
      .from('crm_clients')
      .insert({
        agent_id: agentId,
        first_name: lead.first_name,
        last_name: lead.last_name,
        phone: lead.phone,
        email: lead.email,
        state: lead.state,
        notes: lead.notes,
      })
      .select()
      .single()

    if (clientError) { setError(clientError.message); setSaving(false); return }

    await supabase
      .from('crm_leads')
      .update({ status: 'converted', converted_client_id: newClient.id, converted_at: new Date().toISOString() })
      .eq('id', leadId)

    setSaving(false)
    router.push(`/crm/clients/${newClient.id}`)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  const statusInfo = LEAD_STATUSES.find(s => s.value === lead.status)
  const sourceInfo = LEAD_SOURCES.find(s => s.value === lead.lead_source)
  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', fontSize: '13px', color: '#1A1A1A', backgroundColor: '#FAFAF8', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }

  return (
    <div style={{ maxWidth: '800px' }}>
      <Link href="/crm/leads" style={{ fontSize: '13px', color: '#C9A96E', textDecoration: 'none', fontWeight: '600', display: 'inline-block', marginBottom: '20px' }}>
        ← Back to Leads
      </Link>

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

      {/* Lead Header */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A', marginBottom: '6px' }}>
              {lead.first_name} {lead.last_name}
            </h1>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: `${statusInfo?.color}18`, color: statusInfo?.color ?? '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {statusInfo?.label ?? lead.status}
              </span>
              <span style={{ fontSize: '12px', color: '#7A7A7A' }}>{sourceInfo?.label ?? lead.lead_source}</span>
              {lead.age && <span style={{ fontSize: '12px', color: '#7A7A7A' }}>Age {lead.age}</span>}
              {lead.state && <span style={{ fontSize: '12px', color: '#7A7A7A' }}>{lead.state}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {lead.status !== 'converted' && (
              <button
                onClick={() => setShowConvert(true)}
                style={{ padding: '8px 16px', backgroundColor: '#27AE60', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}
              >
                Convert to Client →
              </button>
            )}
            <button
              onClick={() => { setEditing(!editing); setForm(lead) }}
              style={{ padding: '8px 16px', backgroundColor: editing ? '#FFFFFF' : '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>

        {/* Contact Info */}
        {!editing && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', paddingTop: '16px', borderTop: '1px solid #F0EDE8' }}>
            {[
              { label: 'Phone', value: lead.phone || '—' },
              { label: 'Email', value: lead.email || '—' },
              { label: 'Follow-up', value: lead.follow_up_date ? new Date(lead.follow_up_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: '11px', fontWeight: '600', color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>{item.label}</p>
                <p style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: '500' }}>{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Edit Form */}
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F0EDE8' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={lbl}>First Name</label><input style={inp} value={form.first_name ?? ''} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
              <div><label style={lbl}>Last Name</label><input style={inp} value={form.last_name ?? ''} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={lbl}>Phone</label><input style={inp} value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label style={lbl}>Email</label><input style={inp} value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><label style={lbl}>Age</label><input type="number" style={inp} value={form.age ?? ''} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={lbl}>State</label><input style={inp} value={form.state ?? ''} onChange={e => setForm({ ...form, state: e.target.value })} maxLength={2} /></div>
              <div>
                <label style={lbl}>Status</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Source</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={form.lead_source} onChange={e => setForm({ ...form, lead_source: e.target.value })}>
                  {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Follow-up Date</label><input type="date" style={inp} value={form.follow_up_date ?? ''} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} /></div>
            </div>
            <div><label style={lbl}>Notes</label><textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={saveLead} disabled={saving} style={{ padding: '10px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Status Update */}
      {lead.status !== 'converted' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '16px 20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Update Status</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {LEAD_STATUSES.filter(s => s.value !== 'converted').map(s => (
              <button
                key={s.value}
                onClick={() => updateStatus(s.value)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', border: `1px solid ${lead.status === s.value ? s.color : '#E5E1DA'}`,
                  backgroundColor: lead.status === s.value ? `${s.color}18` : '#FFFFFF',
                  color: lead.status === s.value ? s.color : '#7A7A7A',
                  cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Convert Confirmation */}
      {showConvert && (
        <div style={{ backgroundColor: '#F0FAF4', borderRadius: '12px', border: '1px solid #C8E6C9', padding: '20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', marginBottom: '6px' }}>
            Convert {lead.first_name} {lead.last_name} to a Client?
          </p>
          <p style={{ fontSize: '13px', color: '#4A4A4A', marginBottom: '16px' }}>
            This will create a new client record with their contact info. You can then add a policy to their profile.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={convertToClient}
              disabled={saving}
              style={{ padding: '10px 24px', backgroundColor: '#27AE60', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Converting...' : 'Yes, Convert to Client'}
            </button>
            <button
              onClick={() => setShowConvert(false)}
              style={{ padding: '10px 20px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E1DA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>Activity Log ({notes.length})</h2>
          <button
            onClick={() => setShowAddNote(!showAddNote)}
            style={{ padding: '8px 16px', backgroundColor: showAddNote ? '#FFFFFF' : '#C9A96E', color: showAddNote ? '#4A4A4A' : '#1A1A1A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
          >
            {showAddNote ? 'Cancel' : '+ Log Activity'}
          </button>
        </div>

        {showAddNote && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E1DA', backgroundColor: '#FAFAF8' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={lbl}>Activity Type</label>
                <select
                  value={noteForm.note_type}
                  onChange={e => setNoteForm({ ...noteForm, note_type: e.target.value })}
                  style={{ ...inp, cursor: 'pointer' }}
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
                <label style={lbl}>Notes *</label>
                <textarea
                  value={noteForm.content}
                  onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                  placeholder="What happened? Left voicemail? Spoke briefly? Scheduled a call?"
                  rows={3}
                  style={{ ...inp, resize: 'vertical', minHeight: '70px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={async () => {
                    if (!noteForm.content.trim()) return
                    setSavingNote(true)
                    const { data: newNote, error } = await supabase
                      .from('crm_lead_notes')
                      .insert({
                        lead_id: leadId,
                        agent_id: agentId,
                        note_type: noteForm.note_type,
                        content: noteForm.content,
                      })
                      .select('*, agents!crm_lead_notes_agent_id_fkey(full_name)')
                      .single()
                    if (!error && newNote) {
                      setNotes([newNote, ...notes])
                      setNoteForm({ note_type: 'call', content: '' })
                      setShowAddNote(false)
                    }
                    // Auto-create calendar event if follow-up date is set
                    if (!error && noteForm.follow_up_date && agentId) {
                      const leadName = lead ? `${lead.first_name} ${lead.last_name}` : 'Lead'
                      await createCalendarEventFromFollowUp(
                        agentId,
                        null,
                        leadId,
                        noteForm.follow_up_date,
                        `Follow up with ${leadName}`,
                        noteForm.content || undefined
                      )
                    }
                    setSavingNote(false)
                  }}
                  disabled={savingNote || !noteForm.content.trim()}
                  style={{ padding: '9px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', opacity: savingNote || !noteForm.content.trim() ? 0.6 : 1 }}
                >
                  {savingNote ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                <div key={note.id} style={{ padding: '14px 20px', borderBottom: i < notes.length - 1 ? '1px solid #F0EDE8' : 'none', display: 'flex', gap: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: `${config.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                    {config.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: config.color }}>{config.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', color: '#AAA' }}>
                          {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this activity?')) return
                            await supabase.from('crm_lead_notes').delete().eq('id', note.id)
                            setNotes(notes.filter(n => n.id !== note.id))
                          }}
                          style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: '14px', padding: 0 }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4A4A4A', lineHeight: 1.5, margin: 0 }}>{note.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#7A7A7A', marginBottom: '4px' }}>No activity yet</p>
            <p style={{ fontSize: '12px', color: '#AAA' }}>Log every call, text, and interaction to track your follow-up history</p>
          </div>
        )}
      </div>
    </div>
  )
}
