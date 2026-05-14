'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Notes from '../../components/Notes'
import { getCurrentUser, canLockAgent } from '../../lib/auth'

const STAGES = [
  { key: 'new_lead', label: 'New Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'licensing', label: 'Licensing' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'contracting', label: 'Contracting' },
  { key: 'system_setup', label: 'System Setup' },
  { key: 'training', label: 'Training' },
  { key: 'activation', label: 'Activation' },
  { key: 'active', label: 'Active' },
]

const card = { background: '#1A1917', border: '1px solid #2E2C29', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.25rem' }
const label = { color: '#9A9890', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '0.35rem', fontFamily: 'Georgia, serif' }
const input = { width: '100%', background: '#242220', color: '#F5F2ED', border: '1px solid #2E2C29', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', fontFamily: 'Georgia, serif', outline: 'none' }
const sectionTitle = { color: '#C9A96E', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1rem', fontFamily: 'Georgia, serif' }
const ghostBtn = { background: 'transparent', border: '1px solid #2E2C29', color: '#F5F2ED', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }
const goldBtn = { background: '#C9A96E', border: 'none', color: '#0F0F0E', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Georgia, serif', fontWeight: '600' }

export default function AgentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [agent, setAgent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checklistItems, setChecklistItems] = useState<any[]>([])
  const [checklistProgress, setChecklistProgress] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [stageHistory, setStageHistory] = useState<any[]>([])
  const [stateResources, setStateResources] = useState<any>(null)

  useEffect(() => {
    const getAgent = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('id', params.id)
        .single()
      if (data) {
        setAgent(data)
        const { data: examLink } = await supabase
          .from('state_exam_links')
          .select('*')
          .eq('state_code', data.state)
          .single()
        const { data: bgLink } = await supabase
          .from('state_background_links')
          .select('*')
          .eq('state_code', data.state)
          .single()
        setStateResources({ exam: examLink, background: bgLink })
        loadChecklist(data.current_stage, params.id as string)
        const user = await getCurrentUser()
        setCurrentUser(user)
        console.log('Current user role:', user?.role)
      }
      setLoading(false)
    }
    getAgent()
  }, [params.id, router])

  const loadChecklist = async (stage: string, agentId: string) => {
    const { data: items } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('stage', stage)
      .order('display_order')
    const { data: progress } = await supabase
      .from('agent_checklist_progress')
      .select('*')
      .eq('agent_id', agentId)
    setChecklistItems(items || [])
    setChecklistProgress(progress || [])

    const { data: history } = await supabase
      .from('stage_history')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
    setStageHistory(history || [])
  }

  const getStatus = (itemId: string) => {
    const p = checklistProgress.find(p => p.checklist_item_id === itemId)
    return p ? p.status : 'not_started'
  }

  const toggleItem = async (itemId: string) => {
    if (!agent) return
    const current = getStatus(itemId)
    const newStatus = current === 'approved' ? 'not_started' : 'approved'
    const existing = checklistProgress.find(p => p.checklist_item_id === itemId)
    if (existing) {
      await supabase
        .from('agent_checklist_progress')
        .update({ status: newStatus, completed_at: newStatus === 'approved' ? new Date().toISOString() : null })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('agent_checklist_progress')
        .insert({ agent_id: agent.id, checklist_item_id: itemId, status: newStatus, completed_at: newStatus === 'approved' ? new Date().toISOString() : null })
    }
    setChecklistProgress(prev => {
      const updated = prev.filter(p => p.checklist_item_id !== itemId)
      return [...updated, { checklist_item_id: itemId, status: newStatus }]
    })
  }

  const moveStage = async (direction: 'forward' | 'backward') => {
    if (!agent) return
    setSaving(true)
    const currentIndex = STAGES.findIndex(s => s.key === agent.current_stage)
    const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1
    if (newIndex < 0 || newIndex >= STAGES.length) { setSaving(false); return }
    const newStage = STAGES[newIndex].key
    const { error } = await supabase
      .from('agents')
      .update({ current_stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', agent.id)
    if (!error) {
      setAgent({ ...agent, current_stage: newStage })
      loadChecklist(newStage, agent.id)
    }
    setSaving(false)
  }

  const toggleLock = async () => {
    if (!agent) return
    setSaving(true)
    const { error } = await supabase
      .from('agents')
      .update({ is_locked: !agent.is_locked, updated_at: new Date().toISOString() })
      .eq('id', agent.id)
    if (!error) setAgent({ ...agent, is_locked: !agent.is_locked })
    setSaving(false)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0F0F0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#9A9890', fontFamily: 'Georgia, serif' }}>Loading agent...</p>
    </main>
  )

  if (!agent) return (
    <main style={{ minHeight: '100vh', background: '#0F0F0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#9A9890', fontFamily: 'Georgia, serif' }}>Agent not found.</p>
    </main>
  )

  const currentStageIndex = STAGES.findIndex(s => s.key === agent.current_stage)
  const allComplete = checklistItems.filter(i => i.is_required).every(i => getStatus(i.id) === 'approved')

  return (
    <main style={{ minHeight: '100vh', background: '#0F0F0E', color: '#F5F2ED', fontFamily: 'Georgia, serif', padding: '1.5rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <button onClick={() => router.push('/pipeline')} style={{ background: 'none', border: 'none', color: '#9A9890', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Georgia, serif', marginBottom: '1.5rem', display: 'block' }}>
          ← Back to Pipeline
        </button>

        {/* Agent Header */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ color: '#F5F2ED', fontSize: '1.5rem', fontWeight: '400', marginBottom: '0.25rem' }}>{agent.full_name}</h1>
              <p style={{ color: '#C9A96E', fontFamily: 'monospace', fontSize: '0.85rem' }}>{agent.xfg_id}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ background: '#242220', border: '1px solid #C9A96E', color: '#C9A96E', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                {STAGES.find(s => s.key === agent.current_stage)?.label}
              </span>
              {agent.is_locked && <p style={{ color: '#C9A96E', fontSize: '0.8rem', marginTop: '0.5rem' }}>🔒 Locked</p>}
            </div>
          </div>
          {['executive', 'superadmin', 'finley'].includes(currentUser?.role || '') && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={label}>Full Name</label>
                  <input type="text" defaultValue={agent.full_name} style={input} onBlur={async (e) => {
                    if (e.target.value !== agent.full_name) {
                      await supabase.from('agents').update({ full_name: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                      setAgent({ ...agent, full_name: e.target.value })
                    }
                  }} />
                </div>
                <div>
                  <label style={label}>Phone</label>
                  <input type="tel" defaultValue={agent.phone || ''} style={input} onBlur={async (e) => {
                    if (e.target.value !== agent.phone) {
                      await supabase.from('agents').update({ phone: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                      setAgent({ ...agent, phone: e.target.value })
                    }
                  }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div>
                  <label style={label}>Email</label>
                  <input type="email" defaultValue={agent.email} style={input} onBlur={async (e) => {
                    if (e.target.value !== agent.email) {
                      await supabase.from('agents').update({ email: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                      setAgent({ ...agent, email: e.target.value })
                    }
                  }} />
                </div>
                <div>
                  <label style={label}>State</label>
                  <select defaultValue={agent.state} style={input} onChange={async (e) => {
                    await supabase.from('agents').update({ state: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                    setAgent({ ...agent, state: e.target.value })
                  }}>
                    {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p style={{ color: '#5C5A56', fontSize: '0.72rem' }}>Changes save automatically when you click out of a field.</p>
            </div>
          )}
        </div>

        {/* State Resources */}
        {agent.current_stage === 'licensing' && stateResources && (
          <div style={card}>
            <p style={sectionTitle}>State Resources — {agent.state}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stateResources.exam && (
                <a href={stateResources.exam.exam_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#242220', border: '1px solid #2E2C29', borderRadius: '8px', padding: '1rem', textDecoration: 'none' }}>
                  <div>
                    <p style={{ color: '#F5F2ED', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.2rem' }}>State Licensing Exam</p>
                    <p style={{ color: '#9A9890', fontSize: '0.75rem' }}>Provider: {stateResources.exam.exam_provider}</p>
                  </div>
                  <span style={{ color: '#C9A96E', fontSize: '0.85rem' }}>Book Now →</span>
                </a>
              )}
              <a href="https://www.xcelsolutions.com/?utm_campaign=WS%20-%20National%20-%20Brand&utm_content=Brand&utm_source=google&utm_medium=g&utm_term=xcel%20solutions&utm_id=19187571241&matchtype=e&network=g&device=m&gad_source=1&gad_campaignid=19187571241&gbraid=0AAAAACtEPw98wx-TExb3HTBj-R65yeHBx&gclid=Cj0KCQjwoP_FBhDFARIsANPG24OM9RqW_MI_ankj6xHTBMcE8WhHzsrWkpBGq46gXlwDCf9fPlVxXnwaAjjNEALw_wcB" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#242220', border: '1px solid #2E2C29', borderRadius: '8px', padding: '1rem', textDecoration: 'none' }}>
                <div>
                  <p style={{ color: '#F5F2ED', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.2rem' }}>Life Insurance Pre-Licensing Course</p>
                  <p style={{ color: '#9A9890', fontSize: '0.75rem' }}>Xcel Solutions · Partner code: <span style={{ color: '#C9A96E', fontWeight: '600' }}>karmakore</span></p>
                </div>
                <span style={{ color: '#C9A96E', fontSize: '0.85rem' }}>Start Course →</span>
              </a>
              {stateResources.background && (
                <a href={stateResources.background.background_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#242220', border: '1px solid #2E2C29', borderRadius: '8px', padding: '1rem', textDecoration: 'none' }}>
                  <div>
                    <p style={{ color: '#F5F2ED', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.2rem' }}>Background Check</p>
                    <p style={{ color: '#9A9890', fontSize: '0.75rem' }}>Provider: {stateResources.background.provider}</p>
                  </div>
                  <span style={{ color: '#C9A96E', fontSize: '0.85rem' }}>Start Now →</span>
                </a>
              )}
              {stateResources.background?.fingerprint_url && (
                <a href={stateResources.background.fingerprint_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#242220', border: '1px solid #2E2C29', borderRadius: '8px', padding: '1rem', textDecoration: 'none' }}>
                  <div>
                    <p style={{ color: '#F5F2ED', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.2rem' }}>Fingerprinting</p>
                    <p style={{ color: '#9A9890', fontSize: '0.75rem' }}>Provider: {stateResources.background.provider}</p>
                  </div>
                  <span style={{ color: '#C9A96E', fontSize: '0.85rem' }}>Schedule →</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Executive Override */}
        {['executive', 'superadmin'].includes(currentUser?.role || '') && (
          <div style={{ ...card, border: '1px solid #5C2020' }}>
            <p style={{ ...sectionTitle, color: '#E07070' }}>Executive Override</p>
            <p style={{ color: '#9A9890', fontSize: '0.8rem', marginBottom: '1rem' }}>Force move this agent to any stage. A reason is required and permanently logged.</p>
            <select id="override-stage" style={{ ...input, marginBottom: '0.75rem' }}>
              <option value="">Select target stage...</option>
              <option value="new_lead">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="licensing">Licensing</option>
              <option value="onboarding">Onboarding</option>
              <option value="contracting">Contracting</option>
              <option value="system_setup">System Setup</option>
              <option value="training">Training</option>
              <option value="activation">Activation</option>
              <option value="active">Active</option>
            </select>
            <input id="override-reason" type="text" placeholder="Reason for override (required)..." style={{ ...input, marginBottom: '0.75rem' }} />
            <button
              style={{ width: '100%', background: '#8B2635', border: 'none', color: '#F5F2ED', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Georgia, serif', fontWeight: '600' }}
              onClick={async () => {
                const stageEl = document.getElementById('override-stage') as HTMLSelectElement
                const reasonEl = document.getElementById('override-reason') as HTMLInputElement
                const newStage = stageEl.value
                const reason = reasonEl.value.trim()
                if (!newStage) { alert('Please select a target stage.'); return }
                if (!reason) { alert('A reason is required for overrides.'); return }
                const { error } = await supabase.from('agents').update({ current_stage: newStage, updated_at: new Date().toISOString() }).eq('id', agent.id)
                if (!error) {
                  await supabase.from('overrides').insert({ agent_id: agent.id, performed_by: currentUser.id, override_type: 'stage_skip', previous_value: agent.current_stage, new_value: newStage, reason })
                  await supabase.from('stage_history').insert({ agent_id: agent.id, from_stage: agent.current_stage, to_stage: newStage, changed_by: currentUser.id, is_override: true, override_reason: reason })
                  setAgent({ ...agent, current_stage: newStage })
                  loadChecklist(newStage, agent.id)
                  stageEl.value = ''
                  reasonEl.value = ''
                  alert('Override applied and logged.')
                }
              }}
            >
              Apply Override
            </button>
          </div>
        )}

        {/* Stage Progress */}
        <div style={card}>
          <p style={sectionTitle}>Stage Progress</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
            {STAGES.map((stage, index) => (
              <span key={stage.key} style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontFamily: 'Georgia, serif',
                background: index < currentStageIndex ? '#1C3A2A' : index === currentStageIndex ? '#C9A96E' : '#242220',
                color: index < currentStageIndex ? '#6FCF97' : index === currentStageIndex ? '#0F0F0E' : '#5C5A56',
                fontWeight: index === currentStageIndex ? '600' : '400',
              }}>
                {stage.label}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => moveStage('backward')} disabled={saving || currentStageIndex === 0} style={{ ...ghostBtn, opacity: (saving || currentStageIndex === 0) ? 0.3 : 1 }}>
              Move Back
            </button>
            <button onClick={() => moveStage('forward')} disabled={saving || currentStageIndex === STAGES.length - 1 || agent.is_locked} style={{ ...goldBtn, opacity: (saving || currentStageIndex === STAGES.length - 1 || agent.is_locked) ? 0.3 : 1 }}>
              Move Forward
            </button>
            <button onClick={toggleLock} disabled={saving || !canLockAgent(currentUser?.role || '')} style={{ ...ghostBtn, color: agent.is_locked ? '#C9A96E' : '#F5F2ED', opacity: (saving || !canLockAgent(currentUser?.role || '')) ? 0.3 : 1 }}>
              {agent.is_locked ? 'Unlock' : 'Lock'}
            </button>
          </div>
        </div>

        {/* Checklist */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={sectionTitle}>Stage Checklist</p>
            {checklistItems.length > 0 && (
              allComplete
                ? <span style={{ background: '#1C3A2A', color: '#6FCF97', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>All Complete</span>
                : <span style={{ background: '#3A2A1C', color: '#C9A96E', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>Incomplete</span>
            )}
          </div>
          {checklistItems.length === 0 ? (
            <p style={{ color: '#9A9890', fontSize: '0.85rem' }}>No checklist items for this stage.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {checklistItems.map(item => {
                const isApproved = getStatus(item.id) === 'approved'
                return (
                  <div key={item.id} onClick={() => toggleItem(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '6px', cursor: 'pointer', background: isApproved ? '#1C3A2A' : '#242220', border: '1px solid #2E2C29' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${isApproved ? '#6FCF97' : '#5C5A56'}`, background: isApproved ? '#6FCF97' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isApproved && <span style={{ color: '#0F0F0E', fontSize: '0.65rem', fontWeight: '700' }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: isApproved ? '#6FCF97' : '#F5F2ED', fontSize: '0.85rem', textDecoration: isApproved ? 'line-through' : 'none' }}>{item.title}</p>
                      {item.description && <p style={{ color: '#9A9890', fontSize: '0.75rem', marginTop: '0.1rem' }}>{item.description}</p>}
                    </div>
                    {item.is_required && <span style={{ color: '#5C5A56', fontSize: '0.7rem' }}>Required</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={card}>
          <Notes agentId={agent.id} />
        </div>

        {/* Stage History */}
        <div style={card}>
          <p style={sectionTitle}>Stage History</p>
          {stageHistory.length === 0 ? (
            <p style={{ color: '#9A9890', fontSize: '0.85rem' }}>No stage changes yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stageHistory.map((h) => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#242220', border: '1px solid #2E2C29', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#9A9890' }}>{h.from_stage?.replace('_', ' ')}</span>
                    <span style={{ color: '#5C5A56' }}>→</span>
                    <span style={{ color: '#F5F2ED' }}>{h.to_stage?.replace('_', ' ')}</span>
                    {h.is_override && <span style={{ background: '#5C2020', color: '#E07070', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>Override</span>}
                  </div>
                  <span style={{ color: '#5C5A56', fontSize: '0.75rem' }}>{new Date(h.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Details */}
        <div style={{ ...card, marginBottom: 0 }}>
          <p style={sectionTitle}>Agent Details</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9A9890' }}>Created</span>
              <span style={{ color: '#F5F2ED' }}>{new Date(agent.created_at).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9A9890' }}>Last Updated</span>
              <span style={{ color: '#F5F2ED' }}>{new Date(agent.updated_at).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9A9890' }}>Locked</span>
              <span style={{ color: agent.is_locked ? '#C9A96E' : '#6FCF97' }}>{agent.is_locked ? 'Yes' : 'No'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#9A9890' }}>Agent Model</span>
              {['executive', 'superadmin'].includes(currentUser?.role || '') ? (
                <select value={agent.agent_model || ''} style={{ background: '#242220', color: '#F5F2ED', border: '1px solid #2E2C29', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', fontFamily: 'Georgia, serif', outline: 'none' }} onChange={async (e) => {
                  const newModel = e.target.value
                  const { error } = await supabase.from('agents').update({ agent_model: newModel || null, updated_at: new Date().toISOString() }).eq('id', agent.id)
                  if (!error) setAgent({ ...agent, agent_model: newModel })
                }}>
                  <option value="">Not assigned</option>
                  <option value="supported">Supported</option>
                  <option value="independent">Independent</option>
                </select>
              ) : (
                <span style={{ color: agent.agent_model ? '#C9A96E' : '#5C5A56' }}>{agent.agent_model || 'Not assigned'}</span>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
