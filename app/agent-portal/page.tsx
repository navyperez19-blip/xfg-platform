'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import AgentMessages from '../components/AgentMessages'

const LICENSED_STEPS = [
  { key: 'xfg_email', title: 'Create Your XFG Email' },
  { key: 'discord', title: 'Join XFG Discord' },
  { key: 'license_check', title: 'License Status' },
  { key: 'contracting_info', title: 'Contracting Information' },
  { key: 'contact_team', title: 'Contact the XFG Team' },
  { key: 'system_setup', title: 'System Setup' },
]

const UNLICENSED_STEPS = [
  { key: 'xfg_email', title: 'Create Your XFG Email' },
  { key: 'discord', title: 'Join XFG Discord' },
  { key: 'license_check', title: 'License Status' },
  { key: 'complete_course', title: 'Complete Pre-License Course' },
  { key: 'book_exam', title: 'Book State Exam' },
  { key: 'pass_exam', title: 'Pass State Exam' },
  { key: 'fingerprints', title: 'Complete Fingerprinting' },
  { key: 'submit_application', title: 'Submit License Application' },
  { key: 'obtain_license', title: 'Obtain License' },
  { key: 'contracting_info', title: 'Contracting Information' },
  { key: 'contact_team', title: 'Contact the XFG Team' },
  { key: 'system_setup', title: 'System Setup' },
]

export default function AgentPortalPage() {
  const router = useRouter()
  const [agent, setAgent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [discordConfirmed, setDiscordConfirmed] = useState(false)
  const [contactConfirmed, setContactConfirmed] = useState(false)
  const [stateResources, setStateResources] = useState<any>(null)

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
        setFormData({
          xfg_email: agentData.xfg_email || '',
          npn: agentData.npn || '',
          states_licensed: agentData.states_licensed || '',
          former_imo: agentData.former_imo || '',
          previous_carriers: agentData.previous_carriers || '',
          release_terms: agentData.release_terms || '',
        })

        const stepKey = agentData.wizard_step || 'xfg_email'
        const steps = agentData.is_licensed === 'yes' ? LICENSED_STEPS : UNLICENSED_STEPS
        const stepIndex = steps.findIndex(s => s.key === stepKey)
        setCurrentStep(stepIndex >= 0 ? stepIndex : 0)

        if (agentData.state) {
          const { data: examLink } = await supabase.from('state_exam_links').select('*').eq('state_code', agentData.state).single()
          const { data: bgLink } = await supabase.from('state_background_links').select('*').eq('state_code', agentData.state).single()
          setStateResources({ exam: examLink, background: bgLink })
        }
      }
      setLoading(false)
    }
    load()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const saveAndNext = async (updates: any = {}, nextStepKey?: string) => {
    if (!agent) return
    setSaving(true)

    const steps = agent.is_licensed === 'yes' ? LICENSED_STEPS : UNLICENSED_STEPS
    const nextIndex = currentStep + 1
    const nextKey = nextStepKey || (nextIndex < steps.length ? steps[nextIndex].key : 'done')

    const payload: any = { ...updates, wizard_step: nextKey, updated_at: new Date().toISOString() }

    if (nextKey === 'contracting_info' && agent.current_stage !== 'contracting') {
      payload.current_stage = 'contracting'
    }
    if (nextKey === 'system_setup' && agent.current_stage !== 'system_setup') {
      payload.current_stage = 'system_setup'
    }
    await supabase.from('agents').update(payload).eq('id', agent.id)
    const { data: admins } = await supabase.from('users').select('id').in('role', ['superadmin', 'executive'])
    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map(admin => ({
          recipient_id: admin.id,
          agent_id: agent.id,
          type: 'stage_change',
          title: `Agent completed: ${steps[currentStep]?.title}`,
          message: `${agent.full_name} completed the "${steps[currentStep]?.title}" step and moved to "${steps[currentStep + 1]?.title || 'Done'}"`
        }))
      )
    }
    setAgent({ ...agent, ...payload })
    setCurrentStep(nextIndex)
    setSaving(false)
    window.scrollTo(0, 0)
  }

  const goBack = async () => {
    if (currentStep === 0) return
    setSaving(true)
    const steps = agent.is_licensed === 'yes' ? LICENSED_STEPS : UNLICENSED_STEPS
    const prevIndex = currentStep - 1
    const prevKey = steps[prevIndex].key
    await supabase.from('agents').update({ wizard_step: prevKey, updated_at: new Date().toISOString() }).eq('id', agent.id)
    setAgent({ ...agent, wizard_step: prevKey })
    setCurrentStep(prevIndex)
    setSaving(false)
    window.scrollTo(0, 0)
  }

  const inp = { width: '100%', background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '14px 16px', fontSize: '16px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#1A1814', boxSizing: 'border-box' as const }
  const lbl = { color: '#6B6966', fontSize: '13px', fontWeight: '600' as const, display: 'block', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
  const card = { background: '#FFFFFF', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' }


  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Inter, sans-serif' }}>Loading your portal...</p>
    </main>
  )

  if (!agent) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Inter, sans-serif' }}>No agent profile found. Please contact your administrator.</p>
    </main>
  )

  const steps = agent.is_licensed === 'yes' ? LICENSED_STEPS : (agent.is_licensed === 'no' ? UNLICENSED_STEPS : LICENSED_STEPS)
  const totalSteps = steps.length
  const progress = Math.round((currentStep / (totalSteps - 1)) * 100)
  const stepKey = steps[currentStep]?.key

  if (agent.current_stage === 'active') {
    return (
      <main style={{ minHeight: '100vh', background: '#F5F2ED', padding: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>XFG · X Financial Group</p>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎉</div>
            <h1 style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>You Are Now Active!</h1>
            <p style={{ color: '#6B6966', fontSize: '16px', marginBottom: '4px' }}>Welcome to the XFG team, {agent.full_name}.</p>
            <p style={{ color: '#C9A96E', fontSize: '15px', fontWeight: '600', fontStyle: 'italic' }}>Let's get selling. 🚀</p>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
            <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Your Agent Info</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6B6966', fontSize: '14px' }}>Name</span>
              <span style={{ color: '#1A1814', fontSize: '14px', fontWeight: '600' }}>{agent.full_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6B6966', fontSize: '14px' }}>XFG ID</span>
              <span style={{ color: '#C9A96E', fontSize: '14px', fontFamily: 'monospace', fontWeight: '600' }}>{agent.xfg_id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6B6966', fontSize: '14px' }}>XFG Email</span>
              <span style={{ color: '#1A1814', fontSize: '14px', fontWeight: '600' }}>{agent.xfg_email || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B6966', fontSize: '14px' }}>State</span>
              <span style={{ color: '#1A1814', fontSize: '14px', fontWeight: '600' }}>{agent.state}</span>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
            <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Your Tools & Support</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* CRM Ready */}
              <div style={{ background: '#F5F2ED', border: '1px solid #EBE8E3', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>CRM Access</p>
                  <p style={{ color: '#6B6966', fontSize: '13px' }}>Your client management system is ready</p>
                </div>
                <span style={{ background: '#F0FFF4', color: '#2D6A4F', fontSize: '12px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', border: '1px solid #A8D5B5' }}>✓ Ready</span>
              </div>

              {/* Dialer */}
              <div style={{ background: '#F5F2ED', border: '1px solid #EBE8E3', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>Dialer</p>
                  <p style={{ color: '#6B6966', fontSize: '13px' }}>Once you have your credentials from Finley, log in to your dialer from the bottom of your CRM sidebar</p>
                </div>
              </div>

              {/* CRM Button + Contracting Note */}
              <div style={{ background: '#1A1814', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                <p style={{ color: '#C9A96E', fontSize: '13px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>🎉 Congratulations</p>
                <p style={{ color: '#F5F2ED', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>You're ready — here's your CRM</p>
                <a href="/crm" style={{ display: 'block', background: '#C9A96E', color: '#1A1814', padding: '14px', borderRadius: '10px', textDecoration: 'none', fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>
                  Enter Production CRM →
                </a>
                <div style={{ background: '#242220', border: '1px solid #2E2C29', borderRadius: '10px', padding: '14px 16px', textAlign: 'left' }}>
                  <p style={{ color: '#C9A96E', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>💡 Important Reminder</p>
                  <p style={{ color: '#9A9890', fontSize: '13px', lineHeight: 1.7 }}>
                    Once you're in your CRM, go to <strong style={{ color: '#F5F2ED' }}>My Contracting</strong> to complete your carrier contracting. You should have already submitted <strong style={{ color: '#F5F2ED' }}>Ethos</strong> with Finley or Nick — your next step is <strong style={{ color: '#F5F2ED' }}>Americo</strong>. Once you have your dialer credentials from Finley, you can log in directly from the <strong style={{ color: '#F5F2ED' }}>Open Dialer</strong> button at the bottom of your CRM sidebar.
                  </p>
                </div>
              </div>

              {/* Support */}
              <div style={{ background: '#F5EDD9', border: '1px solid #E8C87A', borderRadius: '10px', padding: '14px 16px' }}>
                <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>Need Support?</p>
                <p style={{ color: '#6B6966', fontSize: '13px', marginBottom: '12px' }}>Reach out to your contracting team for any questions or assistance.</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <a href="tel:8587529085" style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', padding: '10px', borderRadius: '8px', textDecoration: 'none', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>
                    📞 Finley
                  </a>
                  <a href="tel:9858691319" style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', padding: '10px', borderRadius: '8px', textDecoration: 'none', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>
                    📞 Nick
                  </a>
                </div>
              </div>

            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
            <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Messages from Your Team</p>
            <AgentMessages agentId={agent.id} agentEmail={agent.email} agentName={agent.full_name} isAdminView={false} />
          </div>

          {['system_setup', 'training', 'activation', 'active'].includes(agent.current_stage) && (
            <button onClick={() => router.push('/crm')} style={{ width: '100%', background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '12px' }}>Production CRM</button>
          )}
          <button onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '14px', fontSize: '15px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Sign Out</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', padding: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase' }}>XFG · X Financial Group</p>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #DDD9D2', color: '#6B6966', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>Sign Out</button>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ color: '#1A1814', fontSize: '14px', fontWeight: '600' }}>Your Progress</p>
            <p style={{ color: '#C9A96E', fontSize: '14px', fontWeight: '700' }}>{progress}%</p>
          </div>
          <div style={{ background: '#F0EDE8', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#C9A96E', height: '8px', borderRadius: '4px', width: `${progress}%`, transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ color: '#9A9890', fontSize: '12px', marginTop: '6px' }}>Step {currentStep + 1} of {totalSteps} — {steps[currentStep]?.title}</p>
        </div>

        {/* Step 1: XFG Email */}
        {stepKey === 'xfg_email' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Create Your XFG Email</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '20px' }}>Set up your XFG Gmail account and enter it below. This will be your official XFG email address.</p>
            <div style={{ background: '#F5EDD9', border: '1px solid #E8C87A', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
              <p style={{ color: '#8B6A2E', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Your XFG Email Format:</p>
              <p style={{ color: '#C9A96E', fontSize: '16px', fontWeight: '700', fontFamily: 'monospace' }}>firstnamelastname.xfg@gmail.com</p>
              <p style={{ color: '#9A9890', fontSize: '12px', marginTop: '4px' }}>Example: tristanperez.xfg@gmail.com</p>
            </div>
            <a href="https://accounts.google.com/signup" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '14px 16px', textDecoration: 'none', marginBottom: '20px' }}>
              <div>
                <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>Create Gmail Account</p>
                <p style={{ color: '#6B6966', fontSize: '13px' }}>Click here to open Gmail and create your XFG email</p>
              </div>
              <span style={{ color: '#C9A96E', fontSize: '15px', fontWeight: '600' }}>Open Gmail →</span>
            </a>
            <label style={lbl}>Your XFG Email</label>
            <input type="email" value={formData.xfg_email} onChange={(e) => setFormData({ ...formData, xfg_email: e.target.value })} placeholder="firstnamelastname.xfg@gmail.com" style={inp} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {currentStep > 0 && (
                <button onClick={goBack} disabled={saving} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Back</button>
              )}
              <button disabled={saving || !formData.xfg_email} onClick={() => saveAndNext({ xfg_email: formData.xfg_email })} style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving || !formData.xfg_email ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Next →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Discord */}
        {stepKey === 'discord' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Join XFG Discord</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '20px' }}>Our Discord is where the team connects, shares updates, and supports each other. Join before moving forward.</p>
            <a href="https://discord.gg/nCEWxbJPU2" target="_blank" rel="noopener noreferrer" style={{ display: 'block', background: '#5865F2', color: '#FFFFFF', textAlign: 'center', padding: '16px', borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>
              Join XFG Discord →
            </a>
            <div onClick={() => setDiscordConfirmed(!discordConfirmed)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '14px 16px', background: '#F0EDE8', borderRadius: '10px', border: `1px solid ${discordConfirmed ? '#C9A96E' : '#DDD9D2'}` }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${discordConfirmed ? '#C9A96E' : '#DDD9D2'}`, background: discordConfirmed ? '#C9A96E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {discordConfirmed && <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '700' }}>✓</span>}
              </div>
              <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '500' }}>I have joined the XFG Discord</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {currentStep > 0 && (
                <button onClick={goBack} disabled={saving} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Back</button>
              )}
              <button disabled={saving || !discordConfirmed} onClick={() => saveAndNext({})} style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving || !discordConfirmed ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Next →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: License Check */}
        {stepKey === 'license_check' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Are You Currently Licensed?</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '20px' }}>This determines your path through the XFG onboarding process.</p>
            {currentStep > 0 && (
              <button onClick={goBack} disabled={saving} style={{ marginBottom: '12px', background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '12px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Back</button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={async () => {
                  setSaving(true)
                  await supabase.from('agents').update({ is_licensed: 'yes', wizard_step: 'contracting_info', current_stage: 'contracting', updated_at: new Date().toISOString() }).eq('id', agent.id)
                  setAgent({ ...agent, is_licensed: 'yes', wizard_step: 'contracting_info', current_stage: 'contracting' })
                  const licSteps = LICENSED_STEPS
                  setCurrentStep(licSteps.findIndex(s => s.key === 'contracting_info'))
                  setSaving(false)
                  window.scrollTo(0, 0)
                }}
                style={{ background: '#F0FFF4', border: '2px solid #A8D5B5', color: '#2D6A4F', padding: '20px', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '700', fontFamily: 'Inter, sans-serif', textAlign: 'left' as const }}
              >
                ✓ Yes — I have an active insurance license
                <p style={{ fontSize: '13px', fontWeight: '400', color: '#6B6966', marginTop: '4px' }}>You'll go straight to contracting</p>
              </button>
              <button
                onClick={async () => {
                  setSaving(true)
                  await supabase.from('agents').update({ is_licensed: 'no', wizard_step: 'complete_course', current_stage: 'licensing', updated_at: new Date().toISOString() }).eq('id', agent.id)
                  setAgent({ ...agent, is_licensed: 'no', wizard_step: 'complete_course', current_stage: 'licensing' })
                  const unlicSteps = UNLICENSED_STEPS
                  setCurrentStep(unlicSteps.findIndex(s => s.key === 'complete_course'))
                  setSaving(false)
                  window.scrollTo(0, 0)
                }}
                style={{ background: '#FFF5F5', border: '2px solid #E8A8A8', color: '#8B2635', padding: '20px', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '700', fontFamily: 'Inter, sans-serif', textAlign: 'left' as const }}
              >
                ✗ No — I am not yet licensed
                <p style={{ fontSize: '13px', fontWeight: '400', color: '#6B6966', marginTop: '4px' }}>We'll guide you through getting licensed</p>
              </button>
            </div>
          </div>
        )}

        {/* Contracting Info */}
        {stepKey === 'contracting_info' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Contracting Information</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '16px' }}>Please fill in your licensing details below, then reach out to Nick or Finley to get started.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>National Producer Number (NPN) <span style={{ color: '#8B2635' }}>*</span></label>
                <input type="text" value={formData.npn} onChange={(e) => setFormData({ ...formData, npn: e.target.value })} placeholder="e.g. 12345678" style={inp} />
              </div>
              <div>
                <label style={lbl}>States Licensed In <span style={{ color: '#8B2635' }}>*</span></label>
                <input type="text" value={formData.states_licensed} onChange={(e) => setFormData({ ...formData, states_licensed: e.target.value })} placeholder="e.g. LA, TX, FL, GA" style={inp} />
              </div>
            </div>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '16px', marginTop: '8px' }}>
                <p style={{ color: '#1E40AF', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>📋 Complete Your Contracting in the CRM</p>
                <p style={{ color: '#1D4ED8', fontSize: '13px', lineHeight: 1.7 }}>
                  Once you reach your CRM, head to the <strong>My Contracting</strong> section to submit your carrier contracts. Your contracting team will guide you through the rest of the process from there.
                </p>
              </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {currentStep > 0 && (
                <button onClick={goBack} disabled={saving} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Back</button>
              )}
              <button disabled={saving || !formData.npn || !formData.states_licensed} onClick={() => saveAndNext({ npn: formData.npn, states_licensed: formData.states_licensed, former_imo: formData.former_imo, previous_carriers: formData.previous_carriers, release_terms: formData.release_terms })} style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving || !formData.npn || !formData.states_licensed ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Next →'}
              </button>
            </div>
          </div>
        )}

        {/* Contact Team */}
        {stepKey === 'contact_team' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Contact the XFG Team</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '20px' }}>Your information has been submitted. Please reach out to one of our contracting team members to complete the process.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <a href="tel:8587529085" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5EDD9', border: '1px solid #E8C87A', borderRadius: '10px', padding: '16px', textDecoration: 'none' }}>
                <div>
                  <p style={{ color: '#1A1814', fontSize: '16px', fontWeight: '700', marginBottom: '2px' }}>Finley</p>
                  <p style={{ color: '#C9A96E', fontSize: '15px', fontWeight: '600' }}>(858) 752-9085</p>
                </div>
                <span style={{ color: '#C9A96E', fontSize: '20px' }}>📞</span>
              </a>
              <a href="tel:9858691319" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5EDD9', border: '1px solid #E8C87A', borderRadius: '10px', padding: '16px', textDecoration: 'none' }}>
                <div>
                  <p style={{ color: '#1A1814', fontSize: '16px', fontWeight: '700', marginBottom: '2px' }}>Nick</p>
                  <p style={{ color: '#C9A96E', fontSize: '15px', fontWeight: '600' }}>(985) 869-1319</p>
                </div>
                <span style={{ color: '#C9A96E', fontSize: '20px' }}>📞</span>
              </a>
            </div>
            <div onClick={() => setContactConfirmed(!contactConfirmed)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '14px 16px', background: '#F0EDE8', borderRadius: '10px', border: `1px solid ${contactConfirmed ? '#C9A96E' : '#DDD9D2'}`, marginBottom: '4px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${contactConfirmed ? '#C9A96E' : '#DDD9D2'}`, background: contactConfirmed ? '#C9A96E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {contactConfirmed && <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '700' }}>✓</span>}
              </div>
              <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '500' }}>I have reached out to the XFG team</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {currentStep > 0 && (
                <button onClick={goBack} disabled={saving} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Back</button>
              )}
              <button disabled={saving || !contactConfirmed} onClick={async () => { await fetch('/api/send-contracting-alert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentName: agent.full_name, agentEmail: agent.email, xfgEmail: agent.xfg_email, npn: agent.npn, states: agent.states_licensed }) }); saveAndNext({}) }} style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving || !contactConfirmed ? 0.5 : 1 }}>
                {saving ? 'Sending...' : 'Submit & Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* Book Exam */}
        {stepKey === 'book_exam' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Book Your State Exam</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '20px' }}>Book your state licensing exam as soon as possible. Target: within 10-14 days.</p>
            {stateResources?.exam && (
              <a href={stateResources.exam.exam_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5EDD9', border: '1px solid #E8C87A', borderRadius: '10px', padding: '16px', textDecoration: 'none', marginBottom: '20px' }}>
                <div>
                  <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>Book {agent.state} State Exam</p>
                  <p style={{ color: '#6B6966', fontSize: '13px' }}>Provider: {stateResources.exam.exam_provider}</p>
                </div>
                <span style={{ color: '#C9A96E', fontSize: '15px', fontWeight: '600' }}>Book Now →</span>
              </a>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {currentStep > 0 && (
                <button onClick={goBack} disabled={saving} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Back</button>
              )}
              <button disabled={saving} onClick={() => saveAndNext({})} style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {saving ? 'Saving...' : 'I have booked my exam →'}
              </button>
            </div>
          </div>
        )}

        {/* Complete Course */}
        {stepKey === 'complete_course' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Complete Pre-License Course</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '20px' }}>Complete your state pre-licensing course through Xcel Solutions using our partner code for a discount.</p>
            <a href="https://www.xcelsolutions.com/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5EDD9', border: '1px solid #E8C87A', borderRadius: '10px', padding: '16px', textDecoration: 'none', marginBottom: '12px' }}>
              <div>
                <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>Xcel Solutions Pre-License Course</p>
                <p style={{ color: '#6B6966', fontSize: '13px' }}>Partner code: <span style={{ color: '#C9A96E', fontWeight: '700' }}>karmakore</span></p>
              </div>
              <span style={{ color: '#C9A96E', fontSize: '15px', fontWeight: '600' }}>Start →</span>
            </a>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {currentStep > 0 && (
                <button onClick={goBack} disabled={saving} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Back</button>
              )}
              <button disabled={saving} onClick={() => saveAndNext({})} style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {saving ? 'Saving...' : 'I have completed the course →'}
              </button>
            </div>
          </div>
        )}

        {/* Pass Exam */}
        {stepKey === 'pass_exam' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Pass Your State Exam</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '20px' }}>Take and pass your state insurance licensing exam. You've got this!</p>
            <div style={{ background: '#F0FFF4', border: '1px solid #A8D5B5', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: '#2D6A4F', fontSize: '14px', fontWeight: '600' }}>💡 Tip: Review your course materials the night before. Most people pass on their first try.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {currentStep > 0 && (
                <button onClick={goBack} disabled={saving} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Back</button>
              )}
              <button disabled={saving} onClick={() => saveAndNext({})} style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {saving ? 'Saving...' : 'I have passed my exam →'}
              </button>
            </div>
          </div>
        )}

        {/* Fingerprints */}
        {stepKey === 'fingerprints' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Complete Fingerprinting</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '20px' }}>Some states require fingerprinting as part of the license application. Check your state requirements below.</p>
            {stateResources?.background?.fingerprint_url && (
              <a href={stateResources.background.fingerprint_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5EDD9', border: '1px solid #E8C87A', borderRadius: '10px', padding: '16px', textDecoration: 'none', marginBottom: '20px' }}>
                <div>
                  <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>{agent.state} Fingerprinting</p>
                  <p style={{ color: '#6B6966', fontSize: '13px' }}>Provider: {stateResources.background.provider}</p>
                </div>
                <span style={{ color: '#C9A96E', fontSize: '15px', fontWeight: '600' }}>Schedule →</span>
              </a>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {currentStep > 0 && (
                <button onClick={goBack} disabled={saving} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Back</button>
              )}
              <button disabled={saving} onClick={() => saveAndNext({})} style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {saving ? 'Saving...' : 'Completed / Not Required →'}
              </button>
            </div>
          </div>
        )}

        {/* Submit Application */}
        {stepKey === 'submit_application' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Submit License Application</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '20px' }}>Submit your license application through your state's insurance department.</p>
            {stateResources?.background && (
              <a href={stateResources.background.background_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5EDD9', border: '1px solid #E8C87A', borderRadius: '10px', padding: '16px', textDecoration: 'none', marginBottom: '20px' }}>
                <div>
                  <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>{agent.state} License Application</p>
                  <p style={{ color: '#6B6966', fontSize: '13px' }}>Submit through your state portal</p>
                </div>
                <span style={{ color: '#C9A96E', fontSize: '15px', fontWeight: '600' }}>Apply →</span>
              </a>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {currentStep > 0 && (
                <button onClick={goBack} disabled={saving} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Back</button>
              )}
              <button disabled={saving} onClick={() => saveAndNext({})} style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {saving ? 'Saving...' : 'I have submitted my application →'}
              </button>
            </div>
          </div>
        )}

        {/* Obtain License */}
        {stepKey === 'obtain_license' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Obtain Your License</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '20px' }}>Wait for your state to approve and issue your license. This typically takes 5-10 business days.</p>
            <div style={{ background: '#F0FFF4', border: '1px solid #A8D5B5', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: '#2D6A4F', fontSize: '14px', fontWeight: '600' }}>✓ Once you receive your license, click the button below to proceed to contracting.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {currentStep > 0 && (
                <button onClick={goBack} disabled={saving} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Back</button>
              )}
              <button disabled={saving} onClick={async () => {
                  setSaving(true)
                  await supabase.from('agents').update({
                    is_licensed: 'yes',
                    wizard_step: 'contracting_info',
                    current_stage: 'contracting',
                    updated_at: new Date().toISOString()
                  }).eq('id', agent.id)
                  setAgent({ ...agent, is_licensed: 'yes', wizard_step: 'contracting_info', current_stage: 'contracting' })
                  const licSteps = LICENSED_STEPS
                  setCurrentStep(licSteps.findIndex(s => s.key === 'contracting_info'))
                  setSaving(false)
                  window.scrollTo(0, 0)
                }} style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {saving ? 'Saving...' : 'I have received my license →'}
              </button>
            </div>
          </div>
        )}

        {/* System Setup */}
        {stepKey === 'system_setup' && (
          <div style={card}>
            <h2 style={{ color: '#1A1814', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>System Setup</h2>
            <p style={{ color: '#6B6966', fontSize: '15px', marginBottom: '20px' }}>Check off each item as you receive access. The XFG team will confirm each one on their end.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {['XFG Email Configured', 'Agent Profile Complete'].map(item => {
                const items = agent.system_setup_items || {}
                const isChecked = items[item] === true
                return (
                  <div
                    key={item}
                    onClick={async () => {
                      const updated = { ...(agent.system_setup_items || {}), [item]: !isChecked }
                      await supabase.from('agents').update({ system_setup_items: updated, updated_at: new Date().toISOString() }).eq('id', agent.id)
                      setAgent({ ...agent, system_setup_items: updated })
                      if (!isChecked) {
                        const { data: admins } = await supabase.from('users').select('id').in('role', ['superadmin', 'executive'])
                        if (admins) await supabase.from('notifications').insert(admins.map(a => ({ recipient_id: a.id, agent_id: agent.id, type: 'profile_update', title: `Agent confirmed: ${item}`, message: `${agent.full_name} confirmed they have ${item} set up` })))
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: isChecked ? '#F0FFF4' : '#F0EDE8', borderRadius: '10px', border: `1px solid ${isChecked ? '#A8D5B5' : '#DDD9D2'}`, cursor: 'pointer' }}
                  >
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${isChecked ? '#2D6A4F' : '#DDD9D2'}`, background: isChecked ? '#2D6A4F' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isChecked && <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '700' }}>✓</span>}
                    </div>
                    <p style={{ color: isChecked ? '#2D6A4F' : '#1A1814', fontSize: '15px', fontWeight: isChecked ? '600' : '400' }}>{item}</p>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: '20px', borderTop: '1px solid #EBE8E3', paddingTop: '20px' }}>
              {/* Dialer Setup */}
              <div style={{ background: '#F5F2ED', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📞</span>
                  <p style={{ color: '#1A1814', fontSize: '15px', fontWeight: '700' }}>Dialer Setup — Contact Finley</p>
                </div>
                <p style={{ color: '#6B6966', fontSize: '13px', lineHeight: 1.6, marginBottom: '14px' }}>
                  To get your dialer set up, contact Finley directly. He will walk you through the ReadyMode setup process.
                </p>
                <a href="tel:8587529085" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#C9A96E', color: '#1A1814', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '700' }}>
                  📱 Call Finley — (858) 752-9085
                </a>
              </div>

              {/* CRM Contracting Note */}
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>💡</span>
                  <p style={{ color: '#1E40AF', fontSize: '15px', fontWeight: '700' }}>Your Carrier Contracting</p>
                </div>
                <p style={{ color: '#1E40AF', fontSize: '13px', lineHeight: 1.7 }}>
                  Once you&apos;ve spoken with Finley about your dialer setup, head to the <strong>My Contracting</strong> section in your CRM to complete your carrier contracting. You should have already submitted <strong>Ethos</strong> with Finley or Nick — your next step is <strong>Americo</strong>.
                </p>
              </div>

            </div>
            {Object.values(agent.system_setup_items || {}).filter(Boolean).length >= 2 ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                {currentStep > 0 && (
                  <button onClick={goBack} disabled={saving} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    ← Back
                  </button>
                )}
                <button onClick={async () => {
                  setSaving(true)
                  const now = new Date().toISOString()
                  await supabase.from('agents').update({
                    current_stage: 'active',
                    wizard_step: 'done',
                    updated_at: now
                  }).eq('id', agent.id)
                  await supabase.from('stage_history').insert({ agent_id: agent.id, from_stage: agent.current_stage, to_stage: 'active', changed_by: agent.user_id })
                  const { data: admins } = await supabase.from('users').select('id').in('role', ['superadmin', 'executive'])
                  if (admins) await supabase.from('notifications').insert(admins.map(a => ({ recipient_id: a.id, agent_id: agent.id, type: 'activation', title: 'Agent is now Active!', message: `${agent.full_name} has completed system setup and is now an active XFG agent` })))
                  setAgent({ ...agent, current_stage: 'active', wizard_step: 'done' })
                  setSaving(false)
                  window.scrollTo(0, 0)
                }} disabled={saving} style={{ flex: 1, background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {saving ? 'Saving...' : 'Next →'}
                </button>
              </div>
            ) : (
              <p style={{ color: '#9A9890', fontSize: '13px', textAlign: 'center' }}>Check off all items above to continue.</p>
            )}
          </div>
        )}

        <div style={{ marginTop: '16px' }}>
          <AgentMessages agentId={agent.id} agentEmail={agent.email} agentName={agent.full_name} isAdminView={false} />
        </div>

      </div>
    </main>
  )
}
