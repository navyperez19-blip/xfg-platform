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

const LICENSED_STEPS = [
  { key: 'xfg_email', label: 'XFG Email' },
  { key: 'discord', label: 'Discord' },
  { key: 'license_check', label: 'License Check' },
  { key: 'contracting_info', label: 'Contracting Info' },
  { key: 'contact_team', label: 'Contact Team' },
  { key: 'system_setup', label: 'System Setup' },
  { key: 'activation', label: 'Activation' },
]

const UNLICENSED_STEPS = [
  { key: 'xfg_email', label: 'XFG Email' },
  { key: 'discord', label: 'Discord' },
  { key: 'license_check', label: 'License Check' },
  { key: 'complete_course', label: 'Pre-License Course' },
  { key: 'book_exam', label: 'Book Exam' },
  { key: 'pass_exam', label: 'Pass Exam' },
  { key: 'fingerprints', label: 'Fingerprinting' },
  { key: 'submit_application', label: 'License Application' },
  { key: 'obtain_license', label: 'Obtain License' },
  { key: 'contracting_info', label: 'Contracting Info' },
  { key: 'contact_team', label: 'Contact Team' },
  { key: 'system_setup', label: 'System Setup' },
  { key: 'activation', label: 'Activation' },
]

const card = { background: '#FFFFFF', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '20px' }
const sectionTitle = { color: '#C9A96E', fontSize: '11px', fontWeight: '700' as const, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '16px' }
const inp = { width: '100%', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '12px 14px', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1814', boxSizing: 'border-box' as const }
const lbl = { color: '#6B6966', fontSize: '11px', fontWeight: '600' as const, display: 'block', marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }

export default function AgentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [agent, setAgent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [stageHistory, setStageHistory] = useState<any[]>([])
  const [contactLogs, setContactLogs] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('agents').select('*').eq('id', params.id).single()
      if (data) {
        setAgent(data)
        const { data: history } = await supabase.from('stage_history').select('*').eq('agent_id', params.id).order('created_at', { ascending: false })
        setStageHistory(history || [])
        const { data: logs } = await supabase.from('contact_logs').select('*').eq('agent_id', params.id).order('created_at', { ascending: false })
        setContactLogs(logs || [])
      }
      const user2 = await getCurrentUser()
      setCurrentUser(user2)
      setLoading(false)
    }
    load()
  }, [params.id, router])

  const moveStage = async (direction: 'forward' | 'backward') => {
    if (!agent) return
    setSaving(true)
    const currentIndex = STAGES.findIndex(s => s.key === agent.current_stage)
    const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1
    if (newIndex < 0 || newIndex >= STAGES.length) { setSaving(false); return }
    const newStage = STAGES[newIndex].key

    const stageToWizardStep: Record<string, string> = {
      contacted: 'xfg_email',
      licensing: agent.is_licensed === 'yes' ? 'contracting_info' : 'complete_course',
      onboarding: 'complete_course',
      contracting: 'contracting_info',
      system_setup: 'system_setup',
      training: 'system_setup',
      activation: 'activation',
      active: 'activation',
    }

    const wizardStep = stageToWizardStep[newStage] || 'xfg_email'

    await supabase.from('agents').update({ current_stage: newStage, wizard_step: wizardStep, updated_at: new Date().toISOString() }).eq('id', agent.id)
    await supabase.from('stage_history').insert({ agent_id: agent.id, from_stage: agent.current_stage, to_stage: newStage, changed_by: currentUser?.id })
    const { data: admins } = await supabase.from('users').select('id').in('role', ['superadmin', 'executive'])
    if (admins) await supabase.from('notifications').insert(admins.map(a => ({ recipient_id: a.id, agent_id: agent.id, type: 'stage_change', title: 'Agent stage updated', message: `${agent.full_name} moved from ${agent.current_stage.replace(/_/g, ' ')} to ${newStage.replace(/_/g, ' ')} by ${currentUser?.full_name}` })))
    setAgent({ ...agent, current_stage: newStage, wizard_step: wizardStep })
    setSaving(false)
  }

  const toggleLock = async () => {
    if (!agent) return
    setSaving(true)
    await supabase.from('agents').update({ is_locked: !agent.is_locked, updated_at: new Date().toISOString() }).eq('id', agent.id)
    setAgent({ ...agent, is_locked: !agent.is_locked })
    setSaving(false)
  }

  const updateField = async (field: string, value: any) => {
    await supabase.from('agents').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', agent.id)
    setAgent({ ...agent, [field]: value })
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Inter, sans-serif' }}>Loading agent...</p>
    </main>
  )

  if (!agent) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Inter, sans-serif' }}>Agent not found.</p>
    </main>
  )

  const currentStageIndex = STAGES.findIndex(s => s.key === agent.current_stage)
  const wizardSteps = agent.is_licensed === 'no' ? UNLICENSED_STEPS : LICENSED_STEPS
  const wizardStepIndex = wizardSteps.findIndex(s => s.key === agent.wizard_step)
  const wizardProgress = wizardStepIndex >= 0 ? Math.round((wizardStepIndex / (wizardSteps.length - 1)) * 100) : 0

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={() => router.push('/pipeline')} style={{ background: 'transparent', border: 'none', color: '#9A9890', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif', padding: 0 }}>
            ← Back to Pipeline
          </button>
          {['superadmin', 'executive'].includes(currentUser?.role || '') && (
            <button
              onClick={async () => {
                const confirmed = confirm(`Are you sure you want to permanently delete ${agent.full_name}?`)
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
              style={{ background: '#FFF5F5', border: '1px solid #8B2635', color: '#8B2635', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}
            >
              Delete Agent
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
          <div>

            {/* Agent Identity Card */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h1 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>{agent.full_name}</h1>
                  <p style={{ color: '#C9A96E', fontFamily: 'monospace', fontSize: '13px', marginBottom: '4px' }}>{agent.xfg_id}</p>
                  <span style={{ background: '#F5EDD9', color: '#8B6A2E', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>
                    {STAGES.find(s => s.key === agent.current_stage)?.label || agent.current_stage}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {agent.is_locked && <p style={{ color: '#C9A96E', fontSize: '13px', fontWeight: '600' }}>🔒 Locked</p>}
                  {agent.is_licensed === 'yes' && <span style={{ background: '#F0FFF4', color: '#2D6A4F', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', display: 'block', marginTop: '4px' }}>Licensed</span>}
                  {agent.is_licensed === 'no' && <span style={{ background: '#FFF5F5', color: '#8B2635', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', display: 'block', marginTop: '4px' }}>Not Licensed</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={lbl}>Full Name</label>
                  <input type="text" defaultValue={agent.full_name} style={inp} onBlur={async (e) => { if (e.target.value !== agent.full_name) await updateField('full_name', e.target.value) }} />
                </div>
                <div>
                  <label style={lbl}>Phone</label>
                  <input type="tel" defaultValue={agent.phone || ''} style={inp} onBlur={async (e) => { if (e.target.value !== agent.phone) await updateField('phone', e.target.value) }} />
                </div>
                <div>
                  <label style={lbl}>Email</label>
                  <input type="email" defaultValue={agent.email} style={inp} onBlur={async (e) => { if (e.target.value !== agent.email) await updateField('email', e.target.value) }} />
                </div>
                <div>
                  <label style={lbl}>State</label>
                  <select defaultValue={agent.state} style={inp} onChange={async (e) => await updateField('state', e.target.value)}>
                    {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>XFG Email</label>
                  <input type="email" defaultValue={agent.xfg_email || ''} placeholder="firstnamelastname.xfg@gmail.com" style={inp} onBlur={async (e) => { if (e.target.value !== agent.xfg_email) await updateField('xfg_email', e.target.value) }} />
                </div>
                <div>
                  <label style={lbl}>Licensed Status</label>
                  <select defaultValue={agent.is_licensed || ''} style={inp} onChange={async (e) => await updateField('is_licensed', e.target.value)}>
                    <option value="">Unknown</option>
                    <option value="yes">Yes — Active License</option>
                    <option value="no">No — Not Licensed</option>
                    <option value="expired">Expired License</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>NPN</label>
                  <input type="text" defaultValue={agent.npn || ''} placeholder="e.g. 12345678" style={inp} onBlur={async (e) => { if (e.target.value !== agent.npn) await updateField('npn', e.target.value) }} />
                </div>
                <div>
                  <label style={lbl}>Former IMO/FMO</label>
                  <input type="text" defaultValue={agent.former_imo || ''} placeholder="e.g. PHP Agency" style={inp} onBlur={async (e) => { if (e.target.value !== agent.former_imo) await updateField('former_imo', e.target.value) }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>States Licensed In</label>
                  <input type="text" defaultValue={agent.states_licensed || ''} placeholder="e.g. LA, TX, FL" style={inp} onBlur={async (e) => { if (e.target.value !== agent.states_licensed) await updateField('states_licensed', e.target.value) }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Previous Carriers</label>
                  <textarea defaultValue={agent.previous_carriers || ''} placeholder="List previous carriers..." style={{ ...inp, height: '70px', resize: 'vertical' as const }} onBlur={async (e) => { if (e.target.value !== agent.previous_carriers) await updateField('previous_carriers', e.target.value) }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Release Terms</label>
                  <textarea defaultValue={agent.release_terms || ''} placeholder="Any release terms from former IMO..." style={{ ...inp, height: '70px', resize: 'vertical' as const }} onBlur={async (e) => { if (e.target.value !== agent.release_terms) await updateField('release_terms', e.target.value) }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Agent Model</label>
                  <select defaultValue={agent.agent_model || ''} style={inp} onChange={async (e) => await updateField('agent_model', e.target.value || null)}>
                    <option value="">Not assigned</option>
                    <option value="supported">Supported</option>
                    <option value="independent">Independent</option>
                  </select>
                </div>
              </div>
              <p style={{ color: '#9A9890', fontSize: '11px', marginTop: '12px' }}>Changes save automatically when you click out of a field.</p>
            </div>

            {/* Carrier Contracting */}
            <div style={card}>
              <p style={sectionTitle}>Carrier Contracting</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Mutual of Omaha', 'Ethos', 'Instabrain', 'Corbridge', 'AHL'].map(carrier => {
                  const carriers = agent.carriers || {}
                  const status = carriers[carrier] || 'none'
                  return (
                    <div key={carrier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: status === 'active' ? '#F0FFF4' : status === 'submitted' ? '#FFFBF0' : '#F5F2ED', border: `1px solid ${status === 'active' ? '#A8D5B5' : status === 'submitted' ? '#E8C87A' : '#DDD9D2'}`, borderRadius: '8px', padding: '10px 14px' }}>
                      <p style={{ color: '#1A1814', fontSize: '14px', fontWeight: '600' }}>{carrier}</p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={async () => { const updated = { ...(agent.carriers || {}), [carrier]: status === 'submitted' ? 'none' : 'submitted' }; await updateField('carriers', updated) }} style={{ background: status === 'submitted' ? '#B5652A' : '#FFFFFF', border: `1px solid ${status === 'submitted' ? '#B5652A' : '#DDD9D2'}`, color: status === 'submitted' ? '#FFFFFF' : '#6B6966', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>
                          {status === 'submitted' ? '⏳ Submitted' : 'Submit'}
                        </button>
                        <button onClick={async () => { const updated = { ...(agent.carriers || {}), [carrier]: status === 'active' ? 'none' : 'active' }; await updateField('carriers', updated) }} style={{ background: status === 'active' ? '#2D6A4F' : '#FFFFFF', border: `1px solid ${status === 'active' ? '#2D6A4F' : '#DDD9D2'}`, color: status === 'active' ? '#FFFFFF' : '#6B6966', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>
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
              <p style={sectionTitle}>Contact Log</p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input type="text" id="contact-note-input" placeholder="Add a contact note..." style={{ ...inp, flex: 1 }} />
                <button
                  onClick={async () => {
                    const noteEl = document.getElementById('contact-note-input') as HTMLInputElement
                    const note = noteEl?.value?.trim() || ''
                    const now = new Date().toISOString()
                    await supabase.from('contact_logs').insert({ agent_id: agent.id, logged_by_name: currentUser.full_name, logged_by_id: currentUser.id, note })
                    await supabase.from('agents').update({ last_contact_at: now, last_contact_by: currentUser.full_name, last_contact_note: note, updated_at: now }).eq('id', agent.id)
                    setAgent({ ...agent, last_contact_at: now, last_contact_by: currentUser.full_name, last_contact_note: note })
                    if (noteEl) noteEl.value = ''
                    const { data: logs } = await supabase.from('contact_logs').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false })
                    setContactLogs(logs || [])
                  }}
                  style={{ background: '#C9A96E', border: 'none', color: '#FFFFFF', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' as const }}
                >
                  Log Contact
                </button>
              </div>
              {contactLogs.length === 0 ? (
                <p style={{ color: '#9A9890', fontSize: '14px' }}>No contact logs yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {contactLogs.map(log => (
                    <div key={log.id} style={{ background: '#F5EDD9', border: '1px solid #E8C87A', borderRadius: '8px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: '#1A1814', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>{log.logged_by_name}</p>
                          {log.note && <p style={{ color: '#6B6966', fontSize: '13px', marginBottom: '4px' }}>{log.note}</p>}
                          <p style={{ color: '#9A9890', fontSize: '11px' }}>
                            {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this contact log?')) return
                            await supabase.from('contact_logs').delete().eq('id', log.id)
                            setContactLogs(prev => prev.filter(l => l.id !== log.id))
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#DDD9D2', cursor: 'pointer', fontSize: '14px', padding: '0', flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#8B2635')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#DDD9D2')}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div>

            {/* Wizard Progress */}
            <div style={card}>
              <p style={sectionTitle}>Onboarding Progress</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ color: '#1A1814', fontSize: '14px', fontWeight: '600' }}>Step {wizardStepIndex + 1} of {wizardSteps.length}</p>
                <p style={{ color: '#C9A96E', fontSize: '14px', fontWeight: '700' }}>{wizardProgress}%</p>
              </div>
              <div style={{ background: '#F0EDE8', borderRadius: '4px', height: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ background: '#C9A96E', height: '8px', borderRadius: '4px', width: `${wizardProgress}%` }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {wizardSteps.map((step, index) => {
                  const isComplete = index < wizardStepIndex
                  const isCurrent = index === wizardStepIndex
                  return (
                    <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '6px', background: isCurrent ? '#F5EDD9' : 'transparent' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isComplete ? '#2D6A4F' : isCurrent ? '#C9A96E' : '#DDD9D2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: '700' }}>{isComplete ? '✓' : index + 1}</span>
                      </div>
                      <p style={{ color: isComplete ? '#2D6A4F' : isCurrent ? '#8B6A2E' : '#9A9890', fontSize: '13px', fontWeight: isCurrent ? '600' : '400' }}>{step.label}</p>
                      {isCurrent && <span style={{ marginLeft: 'auto', background: '#C9A96E', color: '#FFFFFF', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>Current</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Stage Controls */}
            <div style={card}>
              <p style={sectionTitle}>Pipeline Stage</p>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '14px' }}>
                {STAGES.map((stage, index) => (
                  <span key={stage.key} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: index < currentStageIndex ? '#F0FFF4' : index === currentStageIndex ? '#C9A96E' : '#F0EDE8', color: index < currentStageIndex ? '#2D6A4F' : index === currentStageIndex ? '#FFFFFF' : '#9A9890' }}>
                    {stage.label}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => moveStage('backward')} disabled={saving || currentStageIndex === 0} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif', opacity: (saving || currentStageIndex === 0) ? 0.4 : 1 }}>
                  ← Back
                </button>
                <button onClick={() => moveStage('forward')} disabled={saving || currentStageIndex === STAGES.length - 1 || agent.is_locked} style={{ flex: 1, background: '#C9A96E', border: 'none', color: '#FFFFFF', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif', opacity: (saving || currentStageIndex === STAGES.length - 1 || agent.is_locked) ? 0.4 : 1 }}>
                  Forward →
                </button>
                <button onClick={toggleLock} disabled={saving || !canLockAgent(currentUser?.role || '')} style={{ background: agent.is_locked ? '#F5EDD9' : '#FFFFFF', border: `1px solid ${agent.is_locked ? '#C9A96E' : '#DDD9D2'}`, color: agent.is_locked ? '#8B6A2E' : '#6B6966', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif', opacity: (saving || !canLockAgent(currentUser?.role || '')) ? 0.4 : 1 }}>
                  {agent.is_locked ? '🔒' : '🔓'}
                </button>
              </div>
            </div>

            {/* Executive Override */}
            {['executive', 'superadmin'].includes(currentUser?.role || '') && (
              <div style={{ ...card, border: '1px solid #E8B8B8' }}>
                <p style={{ ...sectionTitle, color: '#8B2635' }}>Executive Override</p>
                <p style={{ color: '#9A9890', fontSize: '13px', marginBottom: '12px' }}>Force move to any stage. Permanently logged.</p>
                <select id="override-stage" style={{ ...inp, marginBottom: '8px' }}>
                  <option value="">Select target stage...</option>
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <input id="override-reason" type="text" placeholder="Reason for override (required)..." style={{ ...inp, marginBottom: '10px' }} />
                <button
                  style={{ width: '100%', background: '#8B2635', border: 'none', color: '#FFFFFF', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}
                  onClick={async () => {
                    const stageEl = document.getElementById('override-stage') as HTMLSelectElement
                    const reasonEl = document.getElementById('override-reason') as HTMLInputElement
                    const newStage = stageEl.value
                    const reason = reasonEl.value.trim()
                    if (!newStage) { alert('Please select a target stage.'); return }
                    if (!reason) { alert('A reason is required.'); return }
                    await supabase.from('agents').update({ current_stage: newStage, updated_at: new Date().toISOString() }).eq('id', agent.id)
                    await supabase.from('overrides').insert({ agent_id: agent.id, performed_by: currentUser.id, override_type: 'stage_skip', previous_value: agent.current_stage, new_value: newStage, reason })
                    await supabase.from('stage_history').insert({ agent_id: agent.id, from_stage: agent.current_stage, to_stage: newStage, changed_by: currentUser.id, is_override: true, override_reason: reason })
                    const { data: admins } = await supabase.from('users').select('id').in('role', ['superadmin', 'executive'])
                    if (admins) await supabase.from('notifications').insert(admins.map(a => ({ recipient_id: a.id, agent_id: agent.id, type: 'override_logged', title: 'Override applied', message: `${currentUser.full_name} overrode ${agent.full_name} to ${newStage}: ${reason}` })))
                    setAgent({ ...agent, current_stage: newStage })
                    stageEl.value = ''
                    reasonEl.value = ''
                    alert('Override applied and logged.')
                  }}
                >
                  Apply Override
                </button>
              </div>
            )}

            {/* Notes */}
            <div style={card}>
              <p style={sectionTitle}>Internal Notes</p>
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
                <p style={{ color: '#9A9890', fontSize: '13px' }}>No stage changes yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {stageHistory.map(h => (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5F2ED', border: '1px solid #EBE8E3', borderRadius: '6px', padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        <span style={{ color: '#9A9890' }}>{h.from_stage?.replace(/_/g, ' ')}</span>
                        <span style={{ color: '#DDD9D2' }}>→</span>
                        <span style={{ color: '#1A1814', fontWeight: '600' }}>{h.to_stage?.replace(/_/g, ' ')}</span>
                        {h.is_override && <span style={{ background: '#FFF5F5', color: '#8B2635', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px' }}>Override</span>}
                      </div>
                      <span style={{ color: '#9A9890', fontSize: '12px' }}>{new Date(h.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
