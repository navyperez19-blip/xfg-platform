'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Notes from '../../components/Notes'
import AgentMessages from '../../components/AgentMessages'
import { getCurrentUser, canLockAgent } from '../../lib/auth'

const STAGES = [
  { key: 'contacted', label: 'Contacted' },
  { key: 'licensing', label: 'Licensing' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'contracting', label: 'Contracting' },
  { key: 'system_setup', label: 'System Setup' },
  { key: 'training', label: 'Training' },
  { key: 'activation', label: 'Activation' },
  { key: 'active', label: 'Active' },
]

const card = { background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.25rem' }
const label = { color: '#6B6966', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '0.35rem', fontFamily: 'Georgia, serif' }
const input = { width: '100%', background: '#EDEAE4', color: '#1A1814', border: '1px solid #DDD9D2', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', fontFamily: 'Georgia, serif', outline: 'none' }
const sectionTitle = { color: '#C9A96E', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1rem', fontFamily: 'Georgia, serif' }
const ghostBtn = { background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#1A1814', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }
const goldBtn = { background: '#C9A96E', border: 'none', color: '#FFFFFF', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Georgia, serif', fontWeight: '600' }

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
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Georgia, serif' }}>Loading agent...</p>
    </main>
  )

  if (!agent) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Georgia, serif' }}>Agent not found.</p>
    </main>
  )

  const currentStageIndex = STAGES.findIndex(s => s.key === agent.current_stage)
  const allComplete = checklistItems.filter(i => i.is_required).every(i => getStatus(i.id) === 'approved')

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', color: '#1A1814', fontFamily: 'Georgia, serif', padding: '1.5rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button onClick={() => router.push('/pipeline')} style={{ background: 'transparent', border: 'none', color: '#9A9890', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', padding: 0 }}>
            ← Back to Pipeline
          </button>
          {['superadmin', 'executive'].includes(currentUser?.role || '') && (
            <button
              onClick={async () => {
                const confirmed = confirm(`Are you sure you want to permanently delete ${agent.full_name}? This cannot be undone.`)
                if (!confirmed) return
                const confirmed2 = confirm(`Final confirmation — delete ${agent.full_name} (${agent.xfg_id})?`)
                if (!confirmed2) return
                await supabase.from('agent_checklist_progress').delete().eq('agent_id', agent.id)
                await supabase.from('notes').delete().eq('agent_id', agent.id)
                await supabase.from('stage_history').delete().eq('agent_id', agent.id)
                await supabase.from('overrides').delete().eq('agent_id', agent.id)
                await supabase.from('notifications').delete().eq('agent_id', agent.id)
                await supabase.from('agent_messages').delete().eq('agent_id', agent.id)
                await supabase.from('agents').delete().eq('id', agent.id)
                router.push('/pipeline')
              }}
              style={{ background: '#FFF5F5', border: '1px solid #8B2635', color: '#8B2635', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}
            >
              Delete Agent
            </button>
          )}
        </div>

        {/* Agent Header */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ color: '#1A1814', fontSize: '1.5rem', fontWeight: '400', marginBottom: '0.25rem' }}>{agent.full_name}</h1>
              <p style={{ color: '#C9A96E', fontFamily: 'monospace', fontSize: '0.85rem' }}>{agent.xfg_id}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ background: '#F5EDD9', border: '1px solid #C9A96E', color: '#C9A96E', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
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
                <div>
                  <label style={label}>Licensed Status</label>
                  <select
                    defaultValue={agent.is_licensed || ''}
                    style={input}
                    onChange={async (e) => {
                      await supabase.from('agents').update({ is_licensed: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                      setAgent({ ...agent, is_licensed: e.target.value })
                    }}
                  >
                    <option value="">Unknown</option>
                    <option value="yes">Yes — Active License</option>
                    <option value="no">No — Not Licensed</option>
                    <option value="expired">Expired License</option>
                  </select>
                </div>
                <div>
                  <label style={label}>XFG Email</label>
                  <input
                    type="email"
                    defaultValue={agent.xfg_email || ''}
                    placeholder="firstnamelastname.xfg@gmail.com"
                    style={input}
                    onBlur={async (e) => {
                      if (e.target.value !== agent.xfg_email) {
                        await supabase.from('agents').update({ xfg_email: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                        setAgent({ ...agent, xfg_email: e.target.value })
                      }
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={label}>National Producer Number (NPN)</label>
                    <input type="text" defaultValue={agent.npn || ''} placeholder="e.g. 12345678" style={input} onBlur={async (e) => {
                      if (e.target.value !== agent.npn) {
                        await supabase.from('agents').update({ npn: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                        setAgent({ ...agent, npn: e.target.value })
                      }
                    }} />
                  </div>
                  <div>
                    <label style={label}>Former IMO/FMO</label>
                    <input type="text" defaultValue={agent.former_imo || ''} placeholder="e.g. PHP Agency" style={input} onBlur={async (e) => {
                      if (e.target.value !== agent.former_imo) {
                        await supabase.from('agents').update({ former_imo: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                        setAgent({ ...agent, former_imo: e.target.value })
                      }
                    }} />
                  </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={label}>States Licensed In</label>
                  <input type="text" defaultValue={agent.states_licensed || ''} placeholder="e.g. LA, TX, FL, GA" style={input} onBlur={async (e) => {
                    if (e.target.value !== agent.states_licensed) {
                      await supabase.from('agents').update({ states_licensed: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                      setAgent({ ...agent, states_licensed: e.target.value })
                    }
                  }} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={label}>Previous Carriers</label>
                  <textarea defaultValue={agent.previous_carriers || ''} placeholder="List all previous carriers..." style={{ ...input, height: '80px', resize: 'vertical' as const }} onBlur={async (e) => {
                    if (e.target.value !== agent.previous_carriers) {
                      await supabase.from('agents').update({ previous_carriers: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                      setAgent({ ...agent, previous_carriers: e.target.value })
                    }
                  }} />
                </div>
              </div>
              <p style={{ color: '#6B6966', fontSize: '0.72rem' }}>Changes save automatically when you click out of a field.</p>
            </div>
          )}
        </div>

        {/* State Resources */}
        {agent.current_stage === 'licensing' && stateResources && (
          <div style={card}>
            <p style={sectionTitle}>State Resources — {agent.state}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stateResources.exam && (
                <a href={stateResources.exam.exam_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EDEAE4', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '1rem', textDecoration: 'none' }}>
                  <div>
                    <p style={{ color: '#1A1814', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.2rem' }}>State Licensing Exam</p>
                    <p style={{ color: '#6B6966', fontSize: '0.75rem' }}>Provider: {stateResources.exam.exam_provider}</p>
                  </div>
                  <span style={{ color: '#C9A96E', fontSize: '0.85rem' }}>Book Now →</span>
                </a>
              )}
              <a href="https://www.xcelsolutions.com/?utm_campaign=WS%20-%20National%20-%20Brand&utm_content=Brand&utm_source=google&utm_medium=g&utm_term=xcel%20solutions&utm_id=19187571241&matchtype=e&network=g&device=m&gad_source=1&gad_campaignid=19187571241&gbraid=0AAAAACtEPw98wx-TExb3HTBj-R65yeHBx&gclid=Cj0KCQjwoP_FBhDFARIsANPG24OM9RqW_MI_ankj6xHTBMcE8WhHzsrWkpBGq46gXlwDCf9fPlVxXnwaAjjNEALw_wcB" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EDEAE4', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '1rem', textDecoration: 'none' }}>
                <div>
                  <p style={{ color: '#1A1814', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.2rem' }}>Life Insurance Pre-Licensing Course</p>
                  <p style={{ color: '#6B6966', fontSize: '0.75rem' }}>Xcel Solutions · Partner code: <span style={{ color: '#C9A96E', fontWeight: '600' }}>karmakore</span></p>
                </div>
                <span style={{ color: '#C9A96E', fontSize: '0.85rem' }}>Start Course →</span>
              </a>
              {stateResources.background && (
                <a href={stateResources.background.background_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EDEAE4', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '1rem', textDecoration: 'none' }}>
                  <div>
                    <p style={{ color: '#1A1814', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.2rem' }}>Background Check</p>
                    <p style={{ color: '#6B6966', fontSize: '0.75rem' }}>Provider: {stateResources.background.provider}</p>
                  </div>
                  <span style={{ color: '#C9A96E', fontSize: '0.85rem' }}>Start Now →</span>
                </a>
              )}
              {stateResources.background?.fingerprint_url && (
                <a href={stateResources.background.fingerprint_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EDEAE4', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '1rem', textDecoration: 'none' }}>
                  <div>
                    <p style={{ color: '#1A1814', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.2rem' }}>Fingerprinting</p>
                    <p style={{ color: '#6B6966', fontSize: '0.75rem' }}>Provider: {stateResources.background.provider}</p>
                  </div>
                  <span style={{ color: '#C9A96E', fontSize: '0.85rem' }}>Schedule →</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Executive Override */}
        {['executive', 'superadmin'].includes(currentUser?.role || '') && (
          <div style={{ ...card, background: '#FFF5F5', border: '1px solid #8B2635' }}>
            <p style={{ ...sectionTitle, color: '#8B2635' }}>Executive Override</p>
            <p style={{ color: '#6B6966', fontSize: '0.8rem', marginBottom: '1rem' }}>Force move this agent to any stage. A reason is required and permanently logged.</p>
            <select id="override-stage" style={{ ...input, marginBottom: '0.75rem' }}>
              <option value="">Select target stage...</option>
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
              style={{ width: '100%', background: '#8B2635', border: 'none', color: '#FFFFFF', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Georgia, serif', fontWeight: '600' }}
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
                background: index < currentStageIndex ? '#E8F5EE' : index === currentStageIndex ? '#C9A96E' : '#EDEAE4',
                color: index < currentStageIndex ? '#2D6A4F' : index === currentStageIndex ? '#FFFFFF' : '#9A9890',
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
            <button onClick={toggleLock} disabled={saving || !canLockAgent(currentUser?.role || '')} style={{ ...ghostBtn, color: agent.is_locked ? '#C9A96E' : '#1A1814', opacity: (saving || !canLockAgent(currentUser?.role || '')) ? 0.3 : 1 }}>
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
                ? <span style={{ background: '#E8F5EE', color: '#2D6A4F', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>All Complete</span>
                : <span style={{ background: '#FDF3E3', color: '#8B6A2E', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>Incomplete</span>
            )}
          </div>
          {checklistItems.length === 0 ? (
            <p style={{ color: '#6B6966', fontSize: '0.85rem' }}>No checklist items for this stage.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {checklistItems.map(item => {
                const isApproved = getStatus(item.id) === 'approved'
                return (
                  <div key={item.id} onClick={() => toggleItem(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '6px', cursor: 'pointer', background: isApproved ? '#E8F5EE' : '#EDEAE4', border: `1px solid ${isApproved ? '#2D6A4F' : '#DDD9D2'}` }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${isApproved ? '#2D6A4F' : '#9A9890'}`, background: isApproved ? '#2D6A4F' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isApproved && <span style={{ color: '#FFFFFF', fontSize: '0.65rem', fontWeight: '700' }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: isApproved ? '#2D6A4F' : '#1A1814', fontSize: '0.85rem', textDecoration: isApproved ? 'line-through' : 'none' }}>{item.title}</p>
                      {item.description && <p style={{ color: '#6B6966', fontSize: '0.75rem', marginTop: '0.1rem' }}>{item.description}</p>}
                    </div>
                    {item.is_required && <span style={{ color: '#9A9890', fontSize: '0.7rem' }}>Required</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>


        {/* Carriers */}
        <div style={card}>
          <p style={sectionTitle}>Carrier Contracting</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {['Mutual of Omaha', 'Ethos', 'Instabrain', 'Corbridge', 'AHL'].map(carrier => {
              const carriers = agent.carriers || {}
              const status = carriers[carrier] || 'none'
              return (
                <div key={carrier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: status === 'active' ? '#F0FFF4' : status === 'submitted' ? '#FFFBF0' : '#F5F2ED', border: `1px solid ${status === 'active' ? '#A8D5B5' : status === 'submitted' ? '#E8C87A' : '#DDD9D2'}`, borderRadius: '8px', padding: '0.875rem 1rem' }}>
                  <p style={{ color: '#1A1814', fontSize: '0.9rem', fontWeight: '600' }}>{carrier}</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={async () => {
                        const updated = { ...(agent.carriers || {}), [carrier]: status === 'submitted' ? 'none' : 'submitted' }
                        await supabase.from('agents').update({ carriers: updated, updated_at: new Date().toISOString() }).eq('id', agent.id)
                        setAgent({ ...agent, carriers: updated })
                      }}
                      style={{ background: status === 'submitted' ? '#B5652A' : '#FFFFFF', border: `1px solid ${status === 'submitted' ? '#B5652A' : '#DDD9D2'}`, color: status === 'submitted' ? '#FFFFFF' : '#6B6966', padding: '0.4rem 0.875rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}
                    >
                      {status === 'submitted' ? '⏳ Submitted' : 'Submit'}
                    </button>
                    <button
                      onClick={async () => {
                        const updated = { ...(agent.carriers || {}), [carrier]: status === 'active' ? 'none' : 'active' }
                        await supabase.from('agents').update({ carriers: updated, updated_at: new Date().toISOString() }).eq('id', agent.id)
                        setAgent({ ...agent, carriers: updated })
                      }}
                      style={{ background: status === 'active' ? '#2D6A4F' : '#FFFFFF', border: `1px solid ${status === 'active' ? '#2D6A4F' : '#DDD9D2'}`, color: status === 'active' ? '#FFFFFF' : '#6B6966', padding: '0.4rem 0.875rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}
                    >
                      {status === 'active' ? '✓ Active' : 'Active'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Last Contact */}
        <div style={card}>
          <p style={sectionTitle}>Last Contact</p>
          {agent.last_contact_at && (
            <div style={{ background: '#F5EDD9', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1rem' }}>
              <p style={{ color: '#1A1814', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                {agent.last_contact_by} — {new Date(agent.last_contact_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(agent.last_contact_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </p>
              {agent.last_contact_note && <p style={{ color: '#6B6966', fontSize: '0.85rem' }}>{agent.last_contact_note}</p>}
            </div>
          )}
          {['superadmin', 'executive', 'finley', 'joe', 'jesse'].includes(currentUser?.role || '') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={label}>Contact Note (optional)</label>
                <input
                  type="text"
                  id="contact-note-input"
                  placeholder="e.g. Called to check on licensing progress..."
                  style={input}
                />
              </div>
              <button
                onClick={async () => {
                  const noteEl = document.getElementById('contact-note-input') as HTMLInputElement
                  const note = noteEl?.value?.trim() || ''
                  const now = new Date().toISOString()
                  await supabase.from('agents').update({
                    last_contact_at: now,
                    last_contact_by: currentUser.full_name,
                    last_contact_note: note,
                    updated_at: now
                  }).eq('id', agent.id)
                  setAgent({ ...agent, last_contact_at: now, last_contact_by: currentUser.full_name, last_contact_note: note })
                  if (noteEl) noteEl.value = ''
                }}
                style={{ background: '#C9A96E', border: 'none', color: '#FFFFFF', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', fontFamily: 'Inter, sans-serif', alignSelf: 'flex-start' }}
              >
                Log Contact Now
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={card}>
          <Notes agentId={agent.id} />
        </div>

        {/* Messages */}
        <div style={card}>
          <p style={sectionTitle}>Messages to Agent</p>
          <AgentMessages agentId={agent.id} agentEmail={agent.email} agentName={agent.full_name} isAdminView={true} />
        </div>

        {/* Stage History */}
        <div style={card}>
          <p style={sectionTitle}>Stage History</p>
          {stageHistory.length === 0 ? (
            <p style={{ color: '#6B6966', fontSize: '0.85rem' }}>No stage changes yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stageHistory.map((h) => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EDEAE4', border: '1px solid #DDD9D2', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#6B6966' }}>{h.from_stage?.replace('_', ' ')}</span>
                    <span style={{ color: '#9A9890' }}>→</span>
                    <span style={{ color: '#1A1814' }}>{h.to_stage?.replace('_', ' ')}</span>
                    {h.is_override && <span style={{ background: '#FEE2E2', color: '#8B2635', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '3px', border: '1px solid #FCA5A5' }}>Override</span>}
                  </div>
                  <span style={{ color: '#9A9890', fontSize: '0.75rem' }}>{new Date(h.created_at).toLocaleDateString()}</span>
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
              <span style={{ color: '#6B6966' }}>Created</span>
              <span style={{ color: '#1A1814' }}>{new Date(agent.created_at).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B6966' }}>Last Updated</span>
              <span style={{ color: '#1A1814' }}>{new Date(agent.updated_at).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B6966' }}>Locked</span>
              <span style={{ color: agent.is_locked ? '#C9A96E' : '#2D6A4F' }}>{agent.is_locked ? 'Yes' : 'No'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6B6966' }}>Agent Model</span>
              {['executive', 'superadmin'].includes(currentUser?.role || '') ? (
                <select value={agent.agent_model || ''} style={{ background: '#EDEAE4', color: '#1A1814', border: '1px solid #DDD9D2', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', fontFamily: 'Georgia, serif', outline: 'none' }} onChange={async (e) => {
                  const newModel = e.target.value
                  const { error } = await supabase.from('agents').update({ agent_model: newModel || null, updated_at: new Date().toISOString() }).eq('id', agent.id)
                  if (!error) setAgent({ ...agent, agent_model: newModel })
                }}>
                  <option value="">Not assigned</option>
                  <option value="supported">Supported</option>
                  <option value="independent">Independent</option>
                </select>
              ) : (
                <span style={{ color: agent.agent_model ? '#C9A96E' : '#9A9890' }}>{agent.agent_model || 'Not assigned'}</span>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
