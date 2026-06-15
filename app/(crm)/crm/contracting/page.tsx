'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

const CARRIERS = [
  { name: 'Aflac',                  description: 'Supplemental insurance',        surelcLink: null },
  { name: 'Americo',                description: 'Life insurance',                surelcLink: 'https://surelc.surancebay.com/sbweb/login.jsp?branch=Joseph%20P%20James&branchEditable=off&branchRequired=on&branchVisible=on&gaId=233&gaName=Quility%20Sales' },
  { name: 'Transamerica',           description: 'Life & health insurance',       surelcLink: null },
  { name: 'UHL (United Home Life)', description: 'Life insurance',                surelcLink: null },
  { name: 'AHL (American Home Life)', description: 'Life insurance',              surelcLink: null },
  { name: 'Mutual of Omaha',        description: 'Life & Medicare supplements',   surelcLink: 'https://surelc.surancebay.com/sbweb/login.jsp?branch=Family%20Capital%20Agency&branchEditable=off&branchRequired=on&branchVisible=on&gaId=1279&gaName=Supreme%20Life%20Brokerage', requiresUnlock: true },
  { name: 'Ethos',                  description: 'Term life insurance',           surelcLink: null },
]

const STATUS_CONFIG = {
  none:      { label: 'Not Started', color: '#7A7A7A', bg: '#F5F5F5', icon: '○' },
  submitted: { label: 'Submitted',   color: '#C9A96E', bg: '#FEF3C7', icon: '◑' },
  active:    { label: 'Active',      color: '#27AE60', bg: '#E8F5E9', icon: '●' },
}

export default function ContractingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [agentRecord, setAgentRecord] = useState<any>(null)
  const [carriers, setCarriers] = useState<Record<string, string>>({})
  const [americoFormSubmitted, setAmericoFormSubmitted] = useState(false)
  const [mutualOmahaRequested, setMutualOmahaRequested] = useState(false)
  const [mutualOmahaSurelcUnlocked, setMutualOmahaSurelcUnlocked] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // First check users table for role

      // Look up agent record by user_id for ALL users including admins
      const { data: agent } = await supabase
        .from('agents')
        .select('id, full_name, carriers, current_stage, americo_form_submitted, americo_surelc_unlocked, mutual_omaha_requested, mutual_omaha_surelc_unlocked')
        .eq('user_id', user.id)
        .single()

      console.log('Agent record found:', agent?.id, agent?.full_name, 'mutual_omaha_requested:', agent?.mutual_omaha_requested)

      if (!agent) {
        // Admin with no agent record — nothing to show
        router.push('/crm')
        return
      }
      setAgentRecord(agent)
      setCarriers(agent.carriers ?? {})
      setAmericoFormSubmitted(agent.americo_form_submitted ?? false)
      setMutualOmahaRequested((agent as any).mutual_omaha_requested ?? false)
      setMutualOmahaSurelcUnlocked((agent as any).mutual_omaha_surelc_unlocked ?? false)
      setLoading(false)
    }
    load()

    // Subscribe to real-time changes on the agent record
    const subscription = supabase
      .channel('agent-contracting-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents',
        },
        (payload) => {
          const updated = payload.new as any
          setCarriers(updated.carriers ?? {})
          setAmericoFormSubmitted(updated.americo_form_submitted ?? false)
          setMutualOmahaRequested(updated.mutual_omaha_requested ?? false)
          setMutualOmahaSurelcUnlocked(updated.mutual_omaha_surelc_unlocked ?? false)
          setAgentRecord((prev: any) => ({ ...prev, ...updated }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [router])

  async function updateCarrierStatus(carrierName: string, newStatus: string) {
    setSaving(carrierName)
    const updatedCarriers = { ...carriers, [carrierName]: newStatus }

    const { error } = await supabase
      .from('agents')
      .update({ carriers: updatedCarriers, updated_at: new Date().toISOString() })
      .eq('id', agentRecord.id)

    if (!error) {
      setCarriers(updatedCarriers)

      const hasContractingStarted = Object.values(updatedCarriers).some(s => s === 'submitted' || s === 'active')

      if (hasContractingStarted && agentRecord.current_stage !== 'active') {
        const { error: stageError } = await supabase
          .from('agents')
          .update({ current_stage: 'active', updated_at: new Date().toISOString() })
          .eq('id', agentRecord.id)

        if (!stageError) {
          setAgentRecord({ ...agentRecord, current_stage: 'active' })

          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .in('role', ['superadmin', 'executive'])

          if (admins && admins.length > 0) {
            const notifications = admins.map((admin: any) => ({
              recipient_id: admin.id,
              agent_id: agentRecord.id,
              type: 'agent_activated',
              title: 'Agent Activated',
              message: `${agentRecord.full_name} has been automatically activated — they submitted their first carrier contract.`,
              is_read: false,
            }))
            await supabase.from('notifications').insert(notifications)
          }
        }
      }
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  const activeCount = CARRIERS.filter(c => carriers[c.name] === 'active').length
  const submittedCount = CARRIERS.filter(c => carriers[c.name] === 'submitted').length
  const notStartedCount = CARRIERS.filter(c => !carriers[c.name] || carriers[c.name] === 'none').length

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Carrier Contracting
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
          Track your contracting status with each carrier
        </p>
      </div>

      {/* Important Warning Banner */}
      <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
        <div>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#C0392B', marginBottom: '4px' }}>Important — Please Read Before Updating Your Contracting Status</p>
          <p style={{ fontSize: '13px', color: '#C0392B', lineHeight: 1.7 }}>
            Only mark a carrier as <strong>Submitted</strong> or <strong>Active</strong> if you have gone through the contracting process <strong>with XFG</strong>. If you are already contracted with any of these carriers through another agency or IMO, do <strong>not</strong> mark them here — this section tracks your contracting status with X Financial Group only.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Active Contracts', value: activeCount, color: '#27AE60' },
          { label: 'Submitted', value: submittedCount, color: '#C9A96E' },
          { label: 'Not Started', value: notStartedCount, color: '#7A7A7A' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px 20px', border: '1px solid #E5E1DA' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: card.color, marginBottom: '4px' }}>{card.value}</div>
            <div style={{ fontSize: '11px', color: '#7A7A7A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Carrier Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {CARRIERS.map(carrier => {
          const currentStatus = carriers[carrier.name] || 'none'
          const config = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.none
          const isAmerico = carrier.name === 'Americo'
          const isMutualOmaha = carrier.name === 'Mutual of Omaha'

          return (
            <div key={carrier.name} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: config.color, fontWeight: '700', flexShrink: 0 }}>
                    {config.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', marginBottom: '2px' }}>{carrier.name}</p>
                    <p style={{ fontSize: '12px', color: '#7A7A7A' }}>{carrier.description}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: config.bg, color: config.color, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {config.label}
                  </span>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {/* Americo special flow */}
                    {isAmerico && !americoFormSubmitted && (
                      <a
                        href="https://form.jotform.com/261608640967062"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={async () => {
                          await supabase
                            .from('agents')
                            .update({ americo_form_submitted: true, americo_form_submitted_at: new Date().toISOString() })
                            .eq('id', agentRecord.id)
                          setAmericoFormSubmitted(true)
                          await updateCarrierStatus('Americo', 'submitted')
                        }}
                        style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: '#EDE9FE', color: '#5B21B6', border: '1px solid #C4B5FD', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        Complete Americo Form →
                      </a>
                    )}

                    {isAmerico && americoFormSubmitted && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#1B5E20', fontWeight: '600' }}>✓ Form Submitted</span>
                      </div>
                    )}

                    {/* Mutual of Omaha special flow */}
                    {isMutualOmaha && !mutualOmahaRequested && (
                      <button
                        onClick={async () => {
                          await supabase
                            .from('agents')
                            .update({ mutual_omaha_requested: true, mutual_omaha_requested_at: new Date().toISOString() })
                            .eq('id', agentRecord.id)
                          setMutualOmahaRequested(true)

                          // Notify admins
                          const { data: admins } = await supabase
                            .from('users')
                            .select('id')
                            .in('role', ['superadmin', 'executive'])

                          if (admins && admins.length > 0) {
                            const notifications = admins.map((admin: any) => ({
                              recipient_id: admin.id,
                              agent_id: agentRecord.id,
                              type: 'mutual_omaha_requested',
                              title: 'Mutual of Omaha Access Requested',
                              message: `${agentRecord.full_name} has requested access to the Mutual of Omaha SureLC contracting link.`,
                              is_read: false,
                            }))
                            await supabase.from('notifications').insert(notifications)
                          }
                        }}
                        style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: '#EDE9FE', color: '#5B21B6', border: '1px solid #C4B5FD', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        Request Access
                      </button>
                    )}

                    {isMutualOmaha && mutualOmahaRequested && !mutualOmahaSurelcUnlocked && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#92400E', fontWeight: '600' }}>⏳ Awaiting admin approval</span>
                      </div>
                    )}

                    {isMutualOmaha && mutualOmahaSurelcUnlocked && carrier.surelcLink && (
                      <a
                        href={carrier.surelcLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        Start Contracting on SureLC →
                      </a>
                    )}

                    {/* All other non-Americo, non-MutualOmaha carriers */}
                    {!isAmerico && !isMutualOmaha && carrier.surelcLink && (
                      <a
                        href={carrier.surelcLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        Start Contracting on SureLC →
                      </a>
                    )}

                    {/* Americo reset */}
                    {isAmerico && (americoFormSubmitted || currentStatus !== 'none') && (
                      <button
                        onClick={async () => {
                          setSaving('Americo')
                          const updatedCarriers = { ...carriers, Americo: 'none' }
                          await supabase
                            .from('agents')
                            .update({
                              carriers: updatedCarriers,
                              americo_form_submitted: false,
                              americo_form_submitted_at: null,
                              americo_surelc_unlocked: false,
                              americo_surelc_unlocked_at: null,
                              updated_at: new Date().toISOString(),
                            })
                            .eq('id', agentRecord.id)
                          setCarriers(updatedCarriers)
                          setAmericoFormSubmitted(false)
                          setSaving(null)
                        }}
                        disabled={saving === 'Americo'}
                        style={{ padding: '6px 12px', backgroundColor: '#FFFFFF', color: '#AAA', border: '1px solid #E5E1DA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}
                      >
                        Reset
                      </button>
                    )}

                    {/* Mutual of Omaha reset */}
                    {isMutualOmaha && (mutualOmahaRequested || currentStatus !== 'none') && (
                      <button
                        onClick={async () => {
                          setSaving('Mutual of Omaha')
                          const updatedCarriers = { ...carriers, 'Mutual of Omaha': 'none' }
                          await supabase
                            .from('agents')
                            .update({
                              carriers: updatedCarriers,
                              mutual_omaha_requested: false,
                              mutual_omaha_requested_at: null,
                              mutual_omaha_surelc_unlocked: false,
                              mutual_omaha_surelc_unlocked_at: null,
                              updated_at: new Date().toISOString(),
                            })
                            .eq('id', agentRecord.id)
                          setCarriers(updatedCarriers)
                          setMutualOmahaRequested(false)
                          setMutualOmahaSurelcUnlocked(false)
                          setSaving(null)
                        }}
                        disabled={saving === 'Mutual of Omaha'}
                        style={{ padding: '6px 12px', backgroundColor: '#FFFFFF', color: '#AAA', border: '1px solid #E5E1DA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}
                      >
                        Reset
                      </button>
                    )}

                    {/* Standard carrier status buttons */}
                    {!isAmerico && !isMutualOmaha && currentStatus === 'none' && (
                      <button
                        onClick={() => updateCarrierStatus(carrier.name, 'submitted')}
                        disabled={saving === carrier.name}
                        style={{ padding: '6px 14px', backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
                      >
                        Mark Submitted
                      </button>
                    )}
                    {!isAmerico && !isMutualOmaha && currentStatus === 'submitted' && (
                      <>
                        <button
                          onClick={() => updateCarrierStatus(carrier.name, 'active')}
                          disabled={saving === carrier.name}
                          style={{ padding: '6px 14px', backgroundColor: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
                        >
                          Mark Active
                        </button>
                        <button
                          onClick={() => updateCarrierStatus(carrier.name, 'none')}
                          disabled={saving === carrier.name}
                          style={{ padding: '6px 12px', backgroundColor: '#FFFFFF', color: '#AAA', border: '1px solid #E5E1DA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}
                        >
                          Reset
                        </button>
                      </>
                    )}
                    {!isAmerico && !isMutualOmaha && currentStatus === 'active' && (
                      <button
                        onClick={() => updateCarrierStatus(carrier.name, 'none')}
                        disabled={saving === carrier.name}
                        style={{ padding: '6px 12px', backgroundColor: '#FFFFFF', color: '#AAA', border: '1px solid #E5E1DA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Americo Next Steps Banner */}
      {americoFormSubmitted && (
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '16px 18px', marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>📧</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#14532D', marginBottom: '4px' }}>Americo Form Submitted — Next Steps</p>
            <p style={{ fontSize: '13px', color: '#166534', lineHeight: 1.7 }}>
              Your Americo hierarchy form has been received. Keep an eye on your <strong>XFG email inbox</strong> for an email from <strong>Anna</strong> with instructions to begin your SureLC Americo contracting process. If you don't receive it within 24 hours, reach out to Finley or Nick.
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '20px', marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A' }}>Contracting Progress</p>
          <p style={{ fontSize: '13px', color: '#7A7A7A' }}>{activeCount} of {CARRIERS.length} active</p>
        </div>
        <div style={{ height: '8px', backgroundColor: '#F0EDE8', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(activeCount / CARRIERS.length) * 100}%`, backgroundColor: '#27AE60', borderRadius: '4px', transition: 'width 0.3s ease' }} />
        </div>
        {activeCount === CARRIERS.length && (
          <p style={{ fontSize: '13px', color: '#27AE60', fontWeight: '600', marginTop: '10px', textAlign: 'center' }}>
            ✓ All carriers active — you are fully contracted!
          </p>
        )}
      </div>
    </div>
  )
}
