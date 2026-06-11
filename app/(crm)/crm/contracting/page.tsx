'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

const CARRIERS = [
  { name: 'Aflac',              description: 'Supplemental insurance' },
  { name: 'Americo',            description: 'Life insurance' },
  { name: 'Transamerica',       description: 'Life & health insurance' },
  { name: 'UHL (United Home Life)', description: 'Life insurance' },
  { name: 'AHL (American Home Life)', description: 'Life insurance' },
  { name: 'Mutual of Omaha',    description: 'Life & Medicare supplements' },
  { name: 'Ethos',              description: 'Term life insurance' },
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
  const [, setIsAdmin] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase
        .from('users').select('role').eq('id', user.id).single()

      const adminRoles = ['superadmin', 'executive']
      setIsAdmin(adminRoles.includes(userRecord?.role ?? ''))

      const { data: agent } = await supabase
        .from('agents')
        .select('id, full_name, carriers, current_stage')
        .eq('user_id', user.id)
        .single()

      if (!agent) { router.push('/crm'); return }
      setAgentRecord(agent)
      setCarriers(agent.carriers ?? {})
      setLoading(false)
    }
    load()
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

      // If at least one carrier is submitted or active and agent is not yet active — promote them
      const hasContractingStarted = Object.values(updatedCarriers).some(s => s === 'submitted' || s === 'active')

      if (hasContractingStarted && agentRecord.current_stage !== 'active') {
        const { error: stageError } = await supabase
          .from('agents')
          .update({ current_stage: 'active', updated_at: new Date().toISOString() })
          .eq('id', agentRecord.id)

        if (!stageError) {
          setAgentRecord({ ...agentRecord, current_stage: 'active' })

          // Notify all admins
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .in('role', ['superadmin', 'executive'])

          if (admins && admins.length > 0) {
            const notifications = admins.map((admin: any) => ({
              user_id: admin.id,
              type: 'agent_activated',
              title: 'Agent Activated',
              message: `${agentRecord.full_name} has been automatically activated — they submitted their first carrier contract.`,
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
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Carrier Contracting
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
          Track your contracting status with each carrier
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Active Contracts', value: activeCount, color: '#27AE60', bg: '#E8F5E9' },
          { label: 'Submitted', value: submittedCount, color: '#C9A96E', bg: '#FEF3C7' },
          { label: 'Not Started', value: notStartedCount, color: '#7A7A7A', bg: '#F5F5F5' },
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
          const isSaving = saving === carrier.name

          return (
            <div key={carrier.name} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: config.color, fontWeight: '700', flexShrink: 0 }}>
                    {config.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', marginBottom: '2px' }}>{carrier.name}</p>
                    <p style={{ fontSize: '12px', color: '#7A7A7A' }}>{carrier.description}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: config.bg, color: config.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {config.label}
                  </span>

                  {/* Status buttons */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {currentStatus === 'none' && (
                      <button
                        onClick={() => updateCarrierStatus(carrier.name, 'submitted')}
                        disabled={isSaving}
                        style={{ padding: '6px 14px', backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', opacity: isSaving ? 0.6 : 1 }}
                      >
                        Mark Submitted
                      </button>
                    )}
                    {currentStatus === 'submitted' && (
                      <>
                        <button
                          onClick={() => updateCarrierStatus(carrier.name, 'active')}
                          disabled={isSaving}
                          style={{ padding: '6px 14px', backgroundColor: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', opacity: isSaving ? 0.6 : 1 }}
                        >
                          Mark Active
                        </button>
                        <button
                          onClick={() => updateCarrierStatus(carrier.name, 'none')}
                          disabled={isSaving}
                          style={{ padding: '6px 12px', backgroundColor: '#FFFFFF', color: '#AAA', border: '1px solid #E5E1DA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', opacity: isSaving ? 0.6 : 1 }}
                        >
                          Reset
                        </button>
                      </>
                    )}
                    {currentStatus === 'active' && (
                      <button
                        onClick={() => updateCarrierStatus(carrier.name, 'none')}
                        disabled={isSaving}
                        style={{ padding: '6px 12px', backgroundColor: '#FFFFFF', color: '#AAA', border: '1px solid #E5E1DA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', opacity: isSaving ? 0.6 : 1 }}
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
            ✓ All carriers active — you're fully contracted!
          </p>
        )}
      </div>
    </div>
  )
}
