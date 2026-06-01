'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AgentMessages from '../components/AgentMessages'
import { useRouter } from 'next/navigation'

const STAGES = [
  { key: 'contacted', label: 'Contacted', order: 2 },
  { key: 'licensing', label: 'Licensing', order: 3 },
  { key: 'onboarding', label: 'Onboarding', order: 4 },
  { key: 'contracting', label: 'Contracting', order: 5 },
  { key: 'system_setup', label: 'System Setup', order: 6 },
  { key: 'training', label: 'Training', order: 7 },
  { key: 'activation', label: 'Activation', order: 8 },
  { key: 'active', label: 'Active Agent', order: 9 },
]

const card = { background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '16px', marginBottom: '1.25rem' }
const sectionTitle = { color: '#C9A96E', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1rem', fontFamily: 'Georgia, serif' }

export default function AgentPortalPage() {
  const router = useRouter()
  const [agent, setAgent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checklistItems, setChecklistItems] = useState<any[]>([])
  const [checklistProgress, setChecklistProgress] = useState<any[]>([])
  const [stateResources, setStateResources] = useState<any>(null)
  const [movingStage, setMovingStage] = useState(false)

  const loadChecklist = async (agentData: any) => {
    const { data: items } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('stage', agentData.current_stage)
      .order('display_order')

    const { data: progress } = await supabase
      .from('agent_checklist_progress')
      .select('*')
      .eq('agent_id', agentData.id)

    setChecklistItems(items || [])
    setChecklistProgress(progress || [])

    if (agentData.current_stage === 'licensing') {
      const { data: examLink } = await supabase
        .from('state_exam_links')
        .select('*')
        .eq('state_code', agentData.state)
        .single()
      const { data: bgLink } = await supabase
        .from('state_background_links')
        .select('*')
        .eq('state_code', agentData.state)
        .single()
      setStateResources({ exam: examLink, background: bgLink })
    } else {
      setStateResources(null)
    }
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (agentData) {
        setAgent(agentData)
        await loadChecklist(agentData)
      }

      setLoading(false)
    }
    load()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getStatus = (itemId: string) => {
    const p = checklistProgress.find(p => p.checklist_item_id === itemId)
    return p ? p.status : 'not_started'
  }

  const toggleItem = async (itemId: string) => {
    if (!agent || agent.is_locked) return
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

  const moveToNextStage = async () => {
    if (!agent || movingStage) return
    const currentIndex = STAGES.findIndex(s => s.key === agent.current_stage)
    const nextStage = STAGES[currentIndex + 1]
    if (!nextStage) return
    setMovingStage(true)
    await supabase
      .from('agents')
      .update({ current_stage: nextStage.key })
      .eq('id', agent.id)
    const updatedAgent = { ...agent, current_stage: nextStage.key }
    setAgent(updatedAgent)
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .in('role', ['superadmin', 'executive'])

    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map(admin => ({
          recipient_id: admin.id,
          agent_id: agent.id,
          type: 'stage_change',
          title: 'Agent self-advanced',
          message: `${agent.full_name} moved themselves from ${agent.current_stage.replace(/_/g, ' ')} to ${nextStage.key.replace(/_/g, ' ')}`
        }))
      )
    }
    await loadChecklist(updatedAgent)
    setMovingStage(false)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Georgia, serif' }}>Loading your portal...</p>
    </main>
  )

  if (!agent) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#1A1814', fontFamily: 'Georgia, serif', marginBottom: '0.5rem' }}>No agent profile found.</p>
        <p style={{ color: '#6B6966', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>Please contact your administrator.</p>
      </div>
    </main>
  )

  const currentStageIndex = STAGES.findIndex(s => s.key === agent.current_stage)
  const currentStage = STAGES[currentStageIndex]
  const nextStage = STAGES[currentStageIndex + 1]
  const requiredItems = checklistItems.filter(i => i.is_required)
  const allComplete = requiredItems.length > 0 && requiredItems.every(i => getStatus(i.id) === 'approved')

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', color: '#1A1814', fontFamily: 'Georgia, serif' }}>
      <div style={{ width: '100%', maxWidth: '680px', margin: '0 auto', padding: '16px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <p style={{ color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>XFG · X Financial Group</p>
            <h1 style={{ color: '#1A1814', fontSize: '24px', fontWeight: '700', marginBottom: '0.2rem' }}>My Portal</h1>
            <p style={{ color: '#6B6966', fontSize: '15px' }}>Welcome, {agent.full_name}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => router.push('/change-password')} style={{ background: 'transparent', border: '1px solid #DDD9D2', color: '#6B6966', padding: '14px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '15px', fontFamily: 'Georgia, serif' }}>
              Change Password
            </button>
            <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #DDD9D2', color: '#6B6966', padding: '14px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '15px', fontFamily: 'Georgia, serif' }}>
              Sign Out
            </button>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '14px 16px', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <p style={{ color: '#6B6966', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Georgia, serif' }}>Onboarding Progress</p>
            <p style={{ color: '#C9A96E', fontSize: '15px', fontFamily: 'Georgia, serif' }}>{Math.round((currentStageIndex / 8) * 100)}%</p>
          </div>
          <div style={{ background: '#EDEAE4', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
            <div style={{ background: '#C9A96E', height: '6px', borderRadius: '4px', width: `${Math.round((currentStageIndex / 8) * 100)}%`, transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ color: '#9A9890', fontSize: '13px', marginTop: '0.5rem', fontFamily: 'Georgia, serif' }}>
            Step {currentStageIndex + 1} of 9 · {STAGES[currentStageIndex]?.label}
          </p>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: '#C9A96E', fontFamily: 'monospace', fontSize: '18px', fontWeight: '600', marginBottom: '0.25rem' }}>{agent.xfg_id}</p>
              <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '0.15rem' }}>{agent.email}</p>
              {agent.phone && <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '0.15rem' }}>{agent.phone}</p>}
              <p style={{ color: '#6B6966', fontSize: '15px' }}>State: {agent.state}</p>
              <div style={{ marginTop: '12px' }}>
                <p style={{ color: '#6B6966', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>XFG Email</p>
                {agent.xfg_email ? (
                  <p style={{ color: '#C9A96E', fontSize: '14px', fontWeight: '600' }}>{agent.xfg_email}</p>
                ) : (
                  <p style={{ color: '#9A9890', fontSize: '13px', fontStyle: 'italic' }}>Not set yet</p>
                )}
                <input
                  type="email"
                  defaultValue={agent.xfg_email || ''}
                  placeholder="firstnamelastname.xfg@gmail.com"
                  style={{ width: '100%', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1814', marginTop: '6px', boxSizing: 'border-box' as const }}
                  onBlur={async (e) => {
                    if (e.target.value && e.target.value !== agent.xfg_email) {
                      await supabase.from('agents').update({ xfg_email: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                      setAgent({ ...agent, xfg_email: e.target.value })
                      const { data: admins } = await supabase.from('users').select('id').in('role', ['superadmin', 'executive'])
                      if (admins) await supabase.from('notifications').insert(admins.map(a => ({ recipient_id: a.id, agent_id: agent.id, type: 'profile_update', title: 'Agent added XFG email', message: `${agent.full_name} set their XFG email: ${e.target.value}` })))
                    }
                  }}
                />
                <p style={{ color: '#9A9890', fontSize: '11px', marginTop: '4px' }}>Enter your XFG Gmail once created</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ background: '#F5EDD9', border: '1px solid #C9A96E', color: '#C9A96E', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                {currentStage?.label}
              </span>
              {agent.is_locked && <p style={{ color: '#C9A96E', fontSize: '13px', marginTop: '0.5rem' }}>🔒 Admin managing</p>}
              {agent.agent_model && <p style={{ color: '#6B6966', fontSize: '13px', marginTop: '0.25rem', textTransform: 'capitalize' }}>{agent.agent_model} model</p>}
            </div>
          </div>
        </div>

        <div style={card}>
          <p style={sectionTitle}>Your Progress</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {STAGES.map((stage, index) => {
              const isComplete = index < currentStageIndex
              const isCurrent = index === currentStageIndex
              return (
                <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '10px 12px', borderRadius: '6px', background: isCurrent ? '#F5EDD9' : 'transparent', border: isCurrent ? '1px solid #DDD9D2' : '1px solid transparent' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', fontWeight: '700', background: isComplete ? '#E8F5EE' : isCurrent ? '#C9A96E' : '#EDEAE4', color: isComplete ? '#2D6A4F' : isCurrent ? '#FFFFFF' : '#9A9890', border: isComplete ? '1px solid #2D6A4F' : isCurrent ? 'none' : '1px solid #DDD9D2' }}>
                    {isComplete ? '✓' : stage.order}
                  </div>
                  <span style={{ fontSize: '15px', color: isComplete ? '#2D6A4F' : isCurrent ? '#1A1814' : '#9A9890', fontWeight: isCurrent ? '600' : '400' }}>
                    {stage.label}
                  </span>
                  {isCurrent && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#C9A96E' }}>Current</span>}
                  {isComplete && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#2D6A4F' }}>Done</span>}
                </div>
              )
            })}
          </div>
        </div>

        {checklistItems.length > 0 && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={sectionTitle}>Stage Checklist</p>
              {allComplete
                ? <span style={{ background: '#E8F5EE', color: '#2D6A4F', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>All Complete</span>
                : <span style={{ background: '#FDF3E3', color: '#8B6A2E', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>In Progress</span>
              }
            </div>
            {!agent.is_locked && <p style={{ color: '#6B6966', fontSize: '13px', marginBottom: '0.75rem' }}>Tap each item to mark it complete.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {checklistItems.map(item => {
                const isApproved = getStatus(item.id) === 'approved'
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '14px 12px', borderRadius: '6px', background: isApproved ? '#E8F5EE' : '#EDEAE4', border: `1px solid ${isApproved ? '#2D6A4F' : '#DDD9D2'}`, cursor: agent.is_locked ? 'default' : 'pointer' }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${isApproved ? '#2D6A4F' : '#9A9890'}`, background: isApproved ? '#2D6A4F' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isApproved && <span style={{ color: '#FFFFFF', fontSize: '0.65rem', fontWeight: '700' }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: isApproved ? '#6FCF97' : '#1A1814', fontSize: '15px', textDecoration: isApproved ? 'line-through' : 'none', margin: 0, fontWeight: '500' }}>{item.title}</p>
                      {item.description && (
                        <p style={{ color: '#6B6966', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                          {item.description.includes('discord.gg') ? (
                            <>
                              {item.description.split('https://')[0]}
                              <a
                                href={'https://' + item.description.split('https://')[1]}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#C9A96E', fontWeight: '600', textDecoration: 'underline' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Click here to join Discord
                              </a>
                            </>
                          ) : item.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {allComplete && nextStage && !agent.is_locked && (
              <button
                onClick={moveToNextStage}
                disabled={movingStage}
                style={{ marginTop: '1.25rem', width: '100%', padding: '14px 20px', background: movingStage ? '#B8944F' : '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: movingStage ? 'default' : 'pointer', fontSize: '15px', fontWeight: '700', fontFamily: 'Georgia, serif', letterSpacing: '0.04em' }}
              >
                {movingStage ? 'Moving...' : `Move to ${nextStage.label} →`}
              </button>
            )}
          </div>
        )}

        {agent.current_stage === 'contacted' && (
          <div style={card}>
            <p style={sectionTitle}>Getting Started Resources</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a href="https://discord.gg/nCEWxbJPU2" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '1rem', textDecoration: 'none' }}>
                <div>
                  <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Join XFG Discord</p>
                  <p style={{ color: '#6B6966', fontSize: '13px' }}>Connect with your team and stay updated</p>
                </div>
                <span style={{ color: '#C9A96E', fontSize: '15px', fontWeight: '600' }}>Join →</span>
              </a>
              <div style={{ background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '1rem' }}>
                <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Create Your XFG Gmail</p>
                <p style={{ color: '#6B6966', fontSize: '13px', marginBottom: '8px' }}>Set up your XFG email address in Gmail:</p>
                <p style={{ color: '#C9A96E', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace' }}>firstnamelastname.xfg@gmail.com</p>
                <p style={{ color: '#9A9890', fontSize: '12px', marginTop: '4px' }}>Example: tristanperez.xfg@gmail.com</p>
              </div>
            </div>
          </div>
        )}

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

        <div style={card}>
          <p style={sectionTitle}>Messages from Your Team</p>
          <AgentMessages agentId={agent.id} agentEmail={agent.email} agentName={agent.full_name} isAdminView={false} />
        </div>

        <div style={card}>
          <p style={sectionTitle}>My Information</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ color: '#6B6966', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>National Producer Number (NPN)</label>
              <input type="text" defaultValue={agent.npn || ''} placeholder="e.g. 12345678" style={{ width: '100%', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '10px 14px', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1814', boxSizing: 'border-box' as const }}
                onBlur={async (e) => {
                  if (e.target.value !== agent.npn) {
                    await supabase.from('agents').update({ npn: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                    setAgent({ ...agent, npn: e.target.value })
                    const { data: admins } = await supabase.from('users').select('id').in('role', ['superadmin', 'executive'])
                    if (admins) await supabase.from('notifications').insert(admins.map(a => ({ recipient_id: a.id, agent_id: agent.id, type: 'profile_update', title: 'Agent updated NPN', message: `${agent.full_name} added their National Producer Number: ${e.target.value}` })))
                  }
                }} />
            </div>
            <div>
              <label style={{ color: '#6B6966', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>States Licensed In</label>
              <input type="text" defaultValue={agent.states_licensed || ''} placeholder="e.g. LA, TX, FL, GA" style={{ width: '100%', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '10px 14px', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1814', boxSizing: 'border-box' as const }}
                onBlur={async (e) => {
                  if (e.target.value !== agent.states_licensed) {
                    await supabase.from('agents').update({ states_licensed: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                    setAgent({ ...agent, states_licensed: e.target.value })
                    const { data: admins } = await supabase.from('users').select('id').in('role', ['superadmin', 'executive'])
                    if (admins) await supabase.from('notifications').insert(admins.map(a => ({ recipient_id: a.id, agent_id: agent.id, type: 'profile_update', title: 'Agent updated licensed states', message: `${agent.full_name} updated their licensed states: ${e.target.value}` })))
                  }
                }} />
            </div>
            <div>
              <label style={{ color: '#6B6966', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Former IMO/FMO</label>
              <input type="text" defaultValue={agent.former_imo || ''} placeholder="e.g. PHP Agency" style={{ width: '100%', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '10px 14px', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1814', boxSizing: 'border-box' as const }}
                onBlur={async (e) => {
                  if (e.target.value !== agent.former_imo) {
                    await supabase.from('agents').update({ former_imo: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                    setAgent({ ...agent, former_imo: e.target.value })
                    const { data: admins } = await supabase.from('users').select('id').in('role', ['superadmin', 'executive'])
                    if (admins) await supabase.from('notifications').insert(admins.map(a => ({ recipient_id: a.id, agent_id: agent.id, type: 'profile_update', title: 'Agent updated former IMO/FMO', message: `${agent.full_name} listed their former IMO/FMO: ${e.target.value}` })))
                  }
                }} />
            </div>
            <div>
              <label style={{ color: '#6B6966', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>Previous Carriers</label>
              <textarea defaultValue={agent.previous_carriers || ''} placeholder="List all previous carriers..." style={{ width: '100%', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '10px 14px', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1814', boxSizing: 'border-box' as const, height: '80px', resize: 'vertical' as const }}
                onBlur={async (e) => {
                  if (e.target.value !== agent.previous_carriers) {
                    await supabase.from('agents').update({ previous_carriers: e.target.value, updated_at: new Date().toISOString() }).eq('id', agent.id)
                    setAgent({ ...agent, previous_carriers: e.target.value })
                    const { data: admins } = await supabase.from('users').select('id').in('role', ['superadmin', 'executive'])
                    if (admins) await supabase.from('notifications').insert(admins.map(a => ({ recipient_id: a.id, agent_id: agent.id, type: 'profile_update', title: 'Agent updated previous carriers', message: `${agent.full_name} listed their previous carriers: ${e.target.value}` })))
                  }
                }} />
            </div>
          </div>
        </div>

        <div style={card}>
          <p style={sectionTitle}>Upload Documents</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'E&O Insurance', field: 'eo_document_url', url: agent.eo_document_url },
              { label: 'Insurance License', field: 'license_document_url', url: agent.license_document_url },
              { label: 'Contract Document', field: 'contract_document_url', url: agent.contract_document_url },
            ].map(doc => (
              <div key={doc.field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '14px 16px' }}>
                <div>
                  <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{doc.label}</p>
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: '#C9A96E', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>View →</a>
                  ) : (
                    <p style={{ color: '#9A9890', fontSize: '13px' }}>Not uploaded yet</p>
                  )}
                </div>
                <div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" id={`portal-upload-${doc.field}`} style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const filePath = `${agent.id}/${doc.field}-${Date.now()}.${file.name.split('.').pop()}`
                      const { error: uploadError } = await supabase.storage.from('agent-documents').upload(filePath, file)
                      if (!uploadError) {
                        const { data: urlData } = supabase.storage.from('agent-documents').getPublicUrl(filePath)
                        await supabase.from('agents').update({ [doc.field]: urlData.publicUrl, updated_at: new Date().toISOString() }).eq('id', agent.id)
                        setAgent({ ...agent, [doc.field]: urlData.publicUrl })
                        const { data: admins } = await supabase.from('users').select('id').in('role', ['superadmin', 'executive'])
                        if (admins) await supabase.from('notifications').insert(admins.map(a => ({ recipient_id: a.id, agent_id: agent.id, type: 'document_upload', title: `Agent uploaded ${doc.label}`, message: `${agent.full_name} uploaded their ${doc.label} document` })))
                      }
                    }}
                  />
                  <label htmlFor={`portal-upload-${doc.field}`} style={{ background: '#C9A96E', color: '#FFFFFF', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'inline-block' }}>
                    {doc.url ? 'Replace' : 'Upload'}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <p style={sectionTitle}>Carrier Contracting</p>
          <p style={{ color: '#6B6966', fontSize: '13px', marginBottom: '12px' }}>Your active carrier contracts managed by your admin team.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {['Mutual of Omaha', 'Ethos', 'Instabrain', 'Corbridge', 'AHL'].map(carrier => {
              const carriers = agent.carriers || {}
              const isActive = carriers[carrier] === true
              return (
                <div key={carrier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isActive ? '#F0FFF4' : '#F0EDE8', border: `1px solid ${isActive ? '#A8D5B5' : '#DDD9D2'}`, borderRadius: '10px', padding: '14px 16px' }}>
                  <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '600' }}>{carrier}</p>
                  <span style={{ background: isActive ? '#2D6A4F' : '#DDD9D2', color: isActive ? '#FFFFFF' : '#9A9890', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                    {isActive ? '✓ Active' : 'Pending'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={card}>
          <p style={sectionTitle}>What Happens Next</p>
          <p style={{ color: '#6B6966', fontSize: '15px', lineHeight: '1.6' }}>
            {agent.current_stage === 'contacted' && 'Our team has reached out to you. Please check your email and respond as soon as possible to move forward with licensing.'}
            {agent.current_stage === 'licensing' && 'You are in the licensing phase. Use the state resources above to book your exam, complete your background check, and fingerprinting.'}
            {agent.current_stage === 'onboarding' && 'Your onboarding call is being scheduled. You will receive details shortly. Once locked, your admin team will guide you through next steps.'}
            {agent.current_stage === 'contracting' && 'You are in the contracting phase. Please review and sign all required documents sent to you.'}
            {agent.current_stage === 'system_setup' && 'Your dialer and CRM access are being configured. You will receive login credentials shortly.'}
            {agent.current_stage === 'training' && 'You are in training. Complete all required carrier, product, and sales process certifications.'}
            {agent.current_stage === 'activation' && 'Almost there! Your final activation call is being scheduled. This is the last step before you go active.'}
            {agent.current_stage === 'active' && '🎉 Congratulations — you are now an active XFG agent. Check your email for CRM, dialer, and Discord access.'}
          </p>
        </div>

      </div>
    </main>
  )
}
