'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { POLICY_STATUSES } from '@/app/crm-constants'

export default function AgentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [agent, setAgent] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalClients: 0,
    totalPolicies: 0,
    activePolicies: 0,
    mtdPolicies: 0,
    mtdPremium: 0,
    ytdPremium: 0,
    totalPremium: 0,
  })
  const [carrierMix, setCarrierMix] = useState<{ carrier: string; count: number; premium: number }[]>([])
  const [activeTab, setActiveTab] = useState<'clients' | 'policies' | 'contracting' | 'leads' | 'activity'>('policies')
  const [agentCarriers, setAgentCarriers] = useState<Record<string, string>>({})
  const [launchWindow, setLaunchWindow] = useState<{
    active: boolean
    dayNumber: number
    daysRemaining: number
    currentAP: number
    goal: number
  } | null>(null)
  const [americoFormSubmitted, setAmericoFormSubmitted] = useState(false)
  const [aigFormSubmitted, setAigFormSubmitted] = useState(false)
  const [mutualOmahaRequested, setMutualOmahaRequested] = useState(false)
  const [agentLeads, setAgentLeads] = useState<any[]>([])
  const [agentActivity, setAgentActivity] = useState<any[]>([])
  const [monthlyGoal, setMonthlyGoal] = useState<number>(5000)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase
        .from('users').select('role').eq('id', user.id).single()

      const adminRoles = ['superadmin', 'executive']
      if (!adminRoles.includes(userRecord?.role ?? '')) {
        router.push('/crm')
        return
      }

      // Get agent info
      const { data: agentData } = await supabase
        .from('agents')
        .select('id, full_name, email, agent_model, current_stage, created_at, states_licensed, npn, carriers, americo_form_submitted, americo_surelc_unlocked, mutual_omaha_requested, mutual_omaha_surelc_unlocked, aig_form_submitted, dialer_active, dialer_active_at')
        .eq('id', agentId)
        .single()

      if (!agentData) { router.push('/crm/admin'); return }
      setAgent(agentData)
      setAgentCarriers(agentData.carriers ?? {})
      // Calculate 30-day launch window
      const carriers = agentData.carriers ?? {}
      const ethosMet = carriers['Ethos'] === 'submitted' || carriers['Ethos'] === 'active'
      if (ethosMet && agentData.dialer_active && agentData.dialer_active_at) {
        const startDate = new Date(agentData.dialer_active_at)
        const now = new Date()
        const dayNumber = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        const daysRemaining = Math.max(0, 30 - dayNumber + 1)

        const { data: windowPolicies } = await supabase
          .from('crm_policies')
          .select('annual_premium')
          .eq('agent_id', agentId)
          .not('status', 'in', '("cancelled","lapsed","chargedback")')

        const currentAP = (windowPolicies ?? []).reduce((sum: number, p: any) => sum + (Number(p.annual_premium) || 0), 0)

        setLaunchWindow({
          active: dayNumber <= 30,
          dayNumber,
          daysRemaining,
          currentAP,
          goal: 5000
        })
      }

      setAmericoFormSubmitted(agentData.americo_form_submitted ?? false)
      setAigFormSubmitted((agentData as any).aig_form_submitted ?? false)
      setMutualOmahaRequested((agentData as any).mutual_omaha_requested ?? false)

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

      // Get all policies for this agent
      const { data: policyData } = await supabase
        .from('crm_policies')
        .select(`
          id, carrier, product_type, policy_number,
          face_amount, monthly_premium, annual_premium,
          date_written, effective_date, status, notes, created_at,
          crm_clients(id, first_name, last_name, state)
        `)
        .eq('agent_id', agentId)
        .order('date_written', { ascending: false })

      const allPolicies = policyData ?? []
      setPolicies(allPolicies)

      // Get all clients
      const { data: clientData } = await supabase
        .from('crm_clients')
        .select(`
          id, first_name, last_name, state, email, phone,
          health_status, created_at,
          crm_policies(id, carrier, product_type, status, annual_premium)
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      setClients(clientData ?? [])

      // Calculate stats
      const activePols = allPolicies.filter(p => ['active', 'issued', 'approved'].includes(p.status))
      const mtdPols = allPolicies.filter(p => p.date_written >= startOfMonth)
      const ytdPols = allPolicies.filter(p => p.date_written >= startOfYear)
      const mtdPremium = mtdPols.reduce((s, p) => s + (Number(p.annual_premium) || 0), 0)
      const ytdPremium = ytdPols.reduce((s, p) => s + (Number(p.annual_premium) || 0), 0)
      const totalPremium = activePols.reduce((s, p) => s + (Number(p.annual_premium) || 0), 0)

      setStats({
        totalClients: clientData?.length ?? 0,
        totalPolicies: allPolicies.length,
        activePolicies: activePols.length,
        mtdPolicies: mtdPols.length,
        mtdPremium,
        ytdPremium,
        totalPremium,
      })

      // Carrier mix
      const carrierMap: Record<string, { count: number; premium: number }> = {}
      activePols.forEach(p => {
        if (!p.carrier) return
        if (!carrierMap[p.carrier]) carrierMap[p.carrier] = { count: 0, premium: 0 }
        carrierMap[p.carrier].count++
        carrierMap[p.carrier].premium += Number(p.annual_premium) || 0
      })
      const mix = Object.entries(carrierMap)
        .map(([carrier, data]) => ({ carrier, ...data }))
        .sort((a, b) => b.count - a.count)
      setCarrierMix(mix)

      // Fetch goal from crm_goals table
      const now2 = new Date()
      const { data: goalData } = await supabase
        .from('crm_goals')
        .select('premium_target')
        .eq('agent_id', agentId)
        .eq('period_type', 'monthly')
        .eq('period_year', now2.getFullYear())
        .eq('period_number', now2.getMonth() + 1)
        .single()

      if (goalData?.premium_target) {
        setMonthlyGoal(Number(goalData.premium_target))
      }

      // Fetch leads for this agent
      const { data: leadsData } = await supabase
        .from('crm_leads')
        .select('id, first_name, last_name, phone, status, lead_source, follow_up_date, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      setAgentLeads(leadsData ?? [])

      // Fetch activity for this agent
      const { data: activityData } = await supabase
        .from('crm_notes')
        .select('id, note_type, content, follow_up_date, created_at, crm_clients(first_name, last_name)')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50)

      setAgentActivity(activityData ?? [])

      setLoading(false)
    }
    load()
  }, [agentId, router])

  // Real-time subscription for admin agent detail
  useEffect(() => {
    if (!agentId) return

    const channel = supabase
      .channel('admin-agent-detail-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agents',
        filter: `id=eq.${agentId}`
      }, async () => {
        const { data: agentData } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .single()
        if (agentData) {
          setAmericoFormSubmitted(agentData.americo_form_submitted ?? false)
          setAigFormSubmitted((agentData as any).aig_form_submitted ?? false)
          setMutualOmahaRequested(agentData.mutual_omaha_requested ?? false)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [agentId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Clients', value: stats.totalClients, color: '#C9A96E' },
    { label: 'Active Policies', value: stats.activePolicies, color: '#27AE60' },
    { label: 'MTD Policies', value: stats.mtdPolicies, color: '#2196F3' },
    { label: 'MTD Premium', value: `$${stats.mtdPremium.toLocaleString()}`, color: '#9C27B0' },
    { label: 'YTD Premium', value: `$${stats.ytdPremium.toLocaleString()}`, color: '#E91E63' },
    { label: 'Total Premium', value: `$${stats.totalPremium.toLocaleString()}`, color: '#FF9800' },
  ]

  const colors = ['#C9A96E', '#2196F3', '#27AE60', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4']

  return (
    <div style={{ maxWidth: '1000px' }}>
      {/* Back */}
      <Link href="/crm/admin" style={{ fontSize: '13px', color: '#C9A96E', textDecoration: 'none', fontWeight: '600', display: 'inline-block', marginBottom: '20px' }}>
        ← Back to Leaderboard
      </Link>

      {/* Agent Header */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#1A1A1A', flexShrink: 0 }}>
            {agent.full_name?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>
              {agent.full_name}
            </h1>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {agent.email && <span style={{ fontSize: '13px', color: '#7A7A7A' }}>{agent.email}</span>}
              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', backgroundColor: agent.agent_model === 'independent' ? '#EDE9FE' : '#FEF3C7', color: agent.agent_model === 'independent' ? '#5B21B6' : '#92400E' }}>
                {agent.agent_model}
              </span>
              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', backgroundColor: '#E8F5E9', color: '#2E7D32' }}>
                {agent.current_stage}
              </span>
              {agent.npn && <span style={{ fontSize: '12px', color: '#AAA' }}>NPN: {agent.npn}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Goal Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Monthly Goal</p>
            {editingGoal ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', color: '#7A7A7A' }}>$</span>
                <input
                  type="number"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  style={{ width: '120px', padding: '6px 10px', fontSize: '16px', fontWeight: '700', border: '1px solid #C9A96E', borderRadius: '6px', outline: 'none', fontFamily: 'inherit' }}
                  autoFocus
                />
              </div>
            ) : (
              <p style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A' }}>${monthlyGoal.toLocaleString()}</p>
            )}
          </div>
          <div style={{ width: '1px', height: '40px', backgroundColor: '#E5E1DA' }} />
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>MTD Progress</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '120px', height: '8px', backgroundColor: '#F0EDE8', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((stats.mtdPremium / monthlyGoal) * 100, 100)}%`, backgroundColor: stats.mtdPremium >= monthlyGoal ? '#27AE60' : '#C9A96E', borderRadius: '4px', transition: 'width 0.3s ease' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A' }}>
                {Math.min(Math.round((stats.mtdPremium / monthlyGoal) * 100), 100)}%
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#7A7A7A', marginTop: '3px' }}>${stats.mtdPremium.toLocaleString()} of ${monthlyGoal.toLocaleString()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {editingGoal ? (
            <>
              <button
                onClick={() => { setEditingGoal(false); setGoalInput('') }}
                style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!goalInput) return
                  setSavingGoal(true)
                  const now3 = new Date()
                  await supabase
                    .from('crm_goals')
                    .upsert({
                      agent_id: agentId,
                      period_type: 'monthly',
                      period_year: now3.getFullYear(),
                      period_number: now3.getMonth() + 1,
                      premium_target: Number(goalInput),
                    }, { onConflict: 'agent_id,period_type,period_year,period_number' })
                  setMonthlyGoal(Number(goalInput))
                  setEditingGoal(false)
                  setGoalInput('')
                  setSavingGoal(false)
                }}
                disabled={savingGoal}
                style={{ padding: '8px 16px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', opacity: savingGoal ? 0.6 : 1 }}
              >
                {savingGoal ? 'Saving...' : 'Save Goal'}
              </button>
            </>
          ) : (
            <button
              onClick={() => { setEditingGoal(true); setGoalInput(String(monthlyGoal)) }}
              style={{ padding: '8px 18px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
            >
              Set Goal
            </button>
          )}
        </div>
      </div>

      {/* 30-Day Launch Window */}
      {launchWindow && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1px solid #C9A96E'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🚀 30-Day Launch Window</p>
                <p style={{ fontSize: '24px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>
                  {launchWindow.active ? `Day ${launchWindow.dayNumber} of 30` : 'Window Closed'}
                </p>
                <p style={{ fontSize: '13px', color: '#AAA', margin: 0 }}>
                  {launchWindow.active ? `${launchWindow.daysRemaining} days remaining` : 'Past 30-day window'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: '#AAA', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AP Written</p>
                <p style={{ fontSize: '24px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>${launchWindow.currentAP.toLocaleString()}</p>
                <p style={{ fontSize: '13px', color: '#AAA', margin: 0 }}>of $5,000 goal</p>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#AAA' }}>Progress</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#C9A96E' }}>{Math.min(100, Math.round((launchWindow.currentAP / launchWindow.goal) * 100))}%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#3A3A3A', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (launchWindow.currentAP / launchWindow.goal) * 100)}%`,
                  backgroundColor:
                    launchWindow.currentAP >= launchWindow.goal ? '#22C55E' :
                    launchWindow.currentAP >= launchWindow.goal * 0.6 ? '#F59E0B' :
                    '#EF4444',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease'
                }} />
              </div>
              <p style={{ fontSize: '12px', margin: '8px 0 0 0', color:
                launchWindow.currentAP >= launchWindow.goal ? '#22C55E' :
                launchWindow.currentAP >= launchWindow.goal * 0.6 ? '#F59E0B' :
                '#EF4444'
              }}>
                {launchWindow.currentAP >= launchWindow.goal
                  ? '✅ Goal reached!'
                  : launchWindow.active
                  ? launchWindow.currentAP >= launchWindow.goal * 0.6
                    ? '⚠️ On pace — keep pushing!'
                    : '🔴 Behind pace — needs attention!'
                  : launchWindow.currentAP >= launchWindow.goal
                  ? '✅ Hit the goal!'
                  : '❌ Missed the $5K goal'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {statCards.map(card => (
          <div key={card.label} style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '14px 16px', border: '1px solid #E5E1DA' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: card.color, marginBottom: '4px' }}>{card.value}</div>
            <div style={{ fontSize: '10px', color: '#7A7A7A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1.3 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Carrier Mix */}
      {carrierMix.length > 0 && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '20px', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', marginBottom: '14px' }}>Carrier Mix</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {carrierMix.map((c, i) => {
              const maxCount = carrierMix[0].count
              const pct = Math.round((c.count / maxCount) * 100)
              return (
                <div key={c.carrier}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>{c.carrier}</span>
                    <span style={{ fontSize: '12px', color: '#7A7A7A' }}>{c.count} polic{c.count !== 1 ? 'ies' : 'y'} · ${c.premium.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#F0EDE8', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: colors[i % colors.length], borderRadius: '3px' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E1DA', overflowX: 'auto' }}>
          {(['policies', 'clients', 'leads', 'activity', 'contracting'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '14px 20px',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '13px',
                fontWeight: activeTab === tab ? '700' : '500',
                color: activeTab === tab ? '#1A1A1A' : '#7A7A7A',
                cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid #C9A96E' : '2px solid transparent',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {tab === 'policies' ? `Policies (${policies.length})`
                : tab === 'clients' ? `Clients (${clients.length})`
                : tab === 'leads' ? `Leads (${agentLeads.length})`
                : tab === 'activity' ? `Activity (${agentActivity.length})`
                : 'Contracting'}
            </button>
          ))}
        </div>

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          policies.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9F7F4' }}>
                  {['Date Written', 'Client', 'Carrier', 'Product', 'Premium', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #E5E1DA', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policies.map((policy, i) => {
                  const client = policy.crm_clients
                  const statusInfo = POLICY_STATUSES.find(s => s.value === policy.status)
                  return (
                    <tr key={policy.id} style={{ borderBottom: i < policies.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                      <td style={{ padding: '13px 16px', fontSize: '12px', color: '#7A7A7A', whiteSpace: 'nowrap' }}>
                        {policy.date_written ? new Date(policy.date_written).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        {client ? (
                          <Link href={`/crm/clients/${client.id}`} style={{ fontWeight: '600', fontSize: '13px', color: '#1A1A1A', textDecoration: 'none' }}>
                            {client.first_name} {client.last_name}
                          </Link>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: '#4A4A4A' }}>{policy.carrier}</td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: '#4A4A4A' }}>{policy.product_type}</td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>
                        {policy.annual_premium ? `$${Number(policy.annual_premium).toLocaleString()}/yr` : policy.monthly_premium ? `$${Number(policy.monthly_premium).toLocaleString()}/mo` : '—'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: `${statusInfo?.color}18`, color: statusInfo?.color ?? '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {statusInfo?.label ?? policy.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#7A7A7A' }}>No policies yet</p>
            </div>
          )
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          clients.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9F7F4' }}>
                  {['Client', 'State', 'Health', 'Policies', 'Premium', 'Date Added'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #E5E1DA', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client, i) => {
                  const clientPolicies = client.crm_policies ?? []
                  const totalPremium = clientPolicies.reduce((s: number, p: any) => s + (Number(p.annual_premium) || 0), 0)
                  return (
                    <tr key={client.id} style={{ borderBottom: i < clients.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                      <td style={{ padding: '13px 16px' }}>
                        <Link href={`/crm/clients/${client.id}`} style={{ fontWeight: '600', fontSize: '13px', color: '#1A1A1A', textDecoration: 'none' }}>
                          {client.first_name} {client.last_name}
                        </Link>
                        {client.phone && <div style={{ fontSize: '11px', color: '#AAA', marginTop: '1px' }}>{client.phone}</div>}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', color: '#4A4A4A' }}>{client.state || '—'}</td>
                      <td style={{ padding: '13px 16px' }}>
                        {client.health_status ? (
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', backgroundColor: client.health_status === 'excellent' ? '#E8F5E9' : client.health_status === 'good' ? '#FFF8E1' : client.health_status === 'fair' ? '#FFF3E0' : '#FFEBEE', color: client.health_status === 'excellent' ? '#2E7D32' : client.health_status === 'good' ? '#F57F17' : client.health_status === 'fair' ? '#E65100' : '#C62828' }}>
                            {client.health_status}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>{clientPolicies.length}</td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: '600', color: totalPremium > 0 ? '#9C27B0' : '#CCC' }}>
                        {totalPremium > 0 ? `$${totalPremium.toLocaleString()}/yr` : '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '12px', color: '#7A7A7A' }}>
                        {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#7A7A7A' }}>No clients yet</p>
            </div>
          )
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          agentLeads.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9F7F4' }}>
                  {['Name', 'Phone', 'Source', 'Status', 'Follow-up', 'Added'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #E5E1DA', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentLeads.map((lead, i) => {
                  const statusColors: Record<string, string> = {
                    new: '#7A7A7A', attempted: '#2196F3', contacted: '#C9A96E',
                    interested: '#9C27B0', quoted: '#FF9800', applied: '#27AE60',
                    converted: '#43A047', not_interested: '#E53935', lost: '#B71C1C'
                  }
                  const color = statusColors[lead.status] ?? '#7A7A7A'
                  const isOverdue = lead.follow_up_date && lead.follow_up_date < new Date().toISOString().split('T')[0]
                  return (
                    <tr key={lead.id} style={{ borderBottom: i < agentLeads.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>
                        {lead.first_name} {lead.last_name}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4A4A4A' }}>{lead.phone || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#7A7A7A', textTransform: 'capitalize' }}>
                        {lead.lead_source?.replace('_', ' ') || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {lead.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: isOverdue ? '#E53935' : '#4A4A4A', fontWeight: isOverdue ? '700' : '400' }}>
                        {lead.follow_up_date ? new Date(lead.follow_up_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#7A7A7A' }}>
                        {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#7A7A7A' }}>No leads added yet</p>
            </div>
          )
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          agentActivity.length > 0 ? (
            <div>
              {agentActivity.map((note, i) => {
                const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
                  call:      { icon: '📞', color: '#2196F3', label: 'Phone Call' },
                  text:      { icon: '💬', color: '#27AE60', label: 'Text' },
                  email:     { icon: '✉️', color: '#C9A96E', label: 'Email' },
                  meeting:   { icon: '🤝', color: '#9C27B0', label: 'Meeting' },
                  follow_up: { icon: '🔔', color: '#FF9800', label: 'Follow Up' },
                  note:      { icon: '📝', color: '#7A7A7A', label: 'Note' },
                }
                const config = typeConfig[note.note_type] ?? typeConfig.note
                const client = note.crm_clients
                return (
                  <div key={note.id} style={{ padding: '14px 20px', borderBottom: i < agentActivity.length - 1 ? '1px solid #F0EDE8' : 'none', display: 'flex', gap: '12px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: `${config.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                      {config.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: config.color }}>{config.label}</span>
                          {client && (
                            <span style={{ fontSize: '12px', color: '#7A7A7A' }}>· {client.first_name} {client.last_name}</span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: '#AAA' }}>
                          {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#4A4A4A', lineHeight: 1.5, margin: 0 }}>{note.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#7A7A7A' }}>No activity logged yet</p>
            </div>
          )
        )}

        {/* Contracting Tab */}
        {/* Contracting Tab */}
        {activeTab === 'contracting' && (
          <div style={{ padding: '20px 24px' }}>

            {/* Americo Banner */}
            {americoFormSubmitted && (
              <div style={{ padding: '12px 16px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#14532D', marginBottom: '2px' }}>📋 Americo Form Submitted</p>
                  <p style={{ fontSize: '12px', color: '#166534' }}>Agent has submitted the Americo form. Anna will email them the SureLC link.</p>
                </div>
                <button
                  onClick={async () => {
                    await supabase.from('agents').update({ americo_form_submitted: false, americo_form_submitted_at: null, updated_at: new Date().toISOString() }).eq('id', agentId)
                    setAmericoFormSubmitted(false)
                  }}
                  style={{ padding: '6px 12px', backgroundColor: '#FEE2E2', color: '#C0392B', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
                >
                  Reset
                </button>
              </div>
            )}

            {/* AIG Banner */}
            {aigFormSubmitted && (
              <div style={{ padding: '12px 16px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#14532D', marginBottom: '2px' }}>📋 AIG (Core Bridge) Form Submitted</p>
                  <p style={{ fontSize: '12px', color: '#166534' }}>Agent has submitted the AIG form. Anna will email them the SureLC link.</p>
                </div>
                <button
                  onClick={async () => {
                    await supabase.from('agents').update({ aig_form_submitted: false, aig_form_submitted_at: null, updated_at: new Date().toISOString() }).eq('id', agentId)
                    setAigFormSubmitted(false)
                  }}
                  style={{ padding: '6px 12px', backgroundColor: '#FEE2E2', color: '#C0392B', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
                >
                  Reset
                </button>
              </div>
            )}

            {/* Mutual of Omaha Banner */}
            {mutualOmahaRequested && (
              <div style={{ padding: '12px 16px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#14532D', marginBottom: '2px' }}>📋 Mutual of Omaha — Direct SureLC Access</p>
                  <p style={{ fontSize: '12px', color: '#166534' }}>Agents now have direct access to the Mutual of Omaha SureLC link from their My Contracting page. No unlock needed.</p>
                </div>
                <button
                  onClick={async () => {
                    await supabase.from('agents').update({ mutual_omaha_requested: false, mutual_omaha_requested_at: null, updated_at: new Date().toISOString() }).eq('id', agentId)
                    setMutualOmahaRequested(false)
                  }}
                  style={{ padding: '6px 12px', backgroundColor: '#FEE2E2', color: '#C0392B', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
                >
                  Reset
                </button>
              </div>
            )}

            {/* Carrier List */}
            {[
              { name: 'Aflac' },
              { name: 'Americo' },
              { name: 'AIG (Core Bridge)' },
              { name: 'Transamerica' },
              { name: 'UHL (United Home Life)' },
              { name: 'AHL (American Home Life)' },
              { name: 'Mutual of Omaha' },
              { name: 'Ethos' },
            ].map((carrier, i, arr) => {
              const status = agentCarriers[carrier.name] || 'none'
              const config = {
                none:      { label: 'Not Started', color: '#7A7A7A', bg: '#F5F5F5' },
                submitted: { label: 'Submitted',   color: '#C9A96E', bg: '#FEF3C7' },
                active:    { label: 'Active',      color: '#27AE60', bg: '#E8F5E9' },
              }[status] ?? { label: 'Not Started', color: '#7A7A7A', bg: '#F5F5F5' }

              return (
                <div key={carrier.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>{carrier.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: config.bg, color: config.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {config.label}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {status === 'none' && (
                        <button
                          onClick={async () => {
                            const updatedCarriers = { ...agentCarriers, [carrier.name]: 'submitted' }
                            const { error } = await supabase.from('agents').update({ carriers: updatedCarriers, updated_at: new Date().toISOString() }).eq('id', agentId)
                            if (!error) {
                              setAgentCarriers(updatedCarriers)
                              if (agent.current_stage !== 'active') {
                                await supabase.from('agents').update({ current_stage: 'active', updated_at: new Date().toISOString() }).eq('id', agentId)
                                setAgent({ ...agent, current_stage: 'active' })
                              }
                            }
                          }}
                          style={{ padding: '5px 12px', backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
                        >
                          Mark Submitted
                        </button>
                      )}
                      {status === 'submitted' && (
                        <button
                          onClick={async () => {
                            const updatedCarriers = { ...agentCarriers, [carrier.name]: 'active' }
                            const { error } = await supabase.from('agents').update({ carriers: updatedCarriers, updated_at: new Date().toISOString() }).eq('id', agentId)
                            if (!error) setAgentCarriers(updatedCarriers)
                          }}
                          style={{ padding: '5px 12px', backgroundColor: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}
                        >
                          Mark Active
                        </button>
                      )}
                      {status !== 'none' && (
                        <button
                          onClick={async () => {
                            const updatedCarriers = { ...agentCarriers, [carrier.name]: 'none' }
                            const { error } = await supabase.from('agents').update({ carriers: updatedCarriers, updated_at: new Date().toISOString() }).eq('id', agentId)
                            if (!error) setAgentCarriers(updatedCarriers)
                          }}
                          style={{ padding: '5px 10px', backgroundColor: '#FFFFFF', color: '#AAA', border: '1px solid #E5E1DA', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
