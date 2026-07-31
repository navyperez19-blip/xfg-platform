'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useRouter } from 'next/navigation'

const STAGES = [
  { key: 'contacted', label: 'Contacted' },
  { key: 'licensing', label: 'Licensing' },
  { key: 'contracting', label: 'Contracting' },
  { key: 'system_setup', label: 'System Setup' },
  { key: 'active', label: 'Active' },
]

export default function AnalyticsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'contracting' | 'agentTracker' | 'leadership' | 'topPerformers' | 'sales'>('overview')
  const [contractingSearch, setContractingSearch] = useState('')
  const [contractingFilter, setContractingFilter] = useState<string | null>(null)
  const [resetError, setResetError] = useState('')
  const [overviewDetail, setOverviewDetail] = useState<'onboarding' | 'discord' | 'xfgEmail' | null>(null)
  const [salesRecords, setSalesRecords] = useState<any[]>([])
  const [salesPeriod, setSalesPeriod] = useState<'weekly' | 'monthly' | 'allTime'>('weekly')
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  const filterToGroup: Record<string, string> = {
    ethos: 'Ethos',
    americo_form: 'Americo',
    aig_form: 'AIG',
    mutual_requested: 'MutualOfOmaha',
    mutual_unlocked: 'MutualOfOmaha',
    aflac: 'Aflac',
    transamerica: 'Transamerica',
    uhl: 'UHL',
    ahl: 'AHL',
    dialer: 'core',
    dialer_active: 'core',
  }
  const activeGroup = contractingFilter ? (filterToGroup[contractingFilter] ?? null) : null
  const isColumnVisible = (group: string) => !contractingFilter || group === 'core' || group === activeGroup

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      if (!user) { router.push('/login'); return }
      if (user.role === 'sales_director') { router.push('/pipeline'); return }
      if (!['executive', 'superadmin'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      const { data: agentsData } = await supabase.from('agents').select('*')
      const { data: historyData } = await supabase
        .from('stage_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      setAgents(agentsData || [])
      setHistory(historyData || [])

      const { data: records } = await supabase
        .from('discord_sales_records')
        .select('*')
        .order('sale_date', { ascending: false })

      if (records) {
        setSalesRecords(records)
        if (records.length > 0 && !selectedMonth) {
          const latestMonth = records[0].sale_date.slice(0, 7)
          setSelectedMonth(latestMonth)
        }
      }

      setLoading(false)
    }
    load()
  }, [router])

  // Real-time subscription for contracting tracker
  useEffect(() => {
    const channel = supabase
      .channel('agents-contracting-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, async () => {
        const { data: agentsData } = await supabase.from('agents').select('*')
        setAgents(agentsData || [])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Georgia, serif' }}>Loading analytics...</p>
    </main>
  )

  const stageCounts = STAGES.map(s => ({
    ...s,
    count: agents.filter(a => a.current_stage === s.key).length
  }))

  const hasXfgEmail = agents.filter(a => a.xfg_email && a.xfg_email.trim() !== '').length
  const completedDiscord = agents.filter(a => a.wizard_step && !['xfg_email', 'discord'].includes(a.wizard_step)).length
  const totalAccountsCreated = agents.length

  const onboardingAgents = agents
  const discordAgents = agents.filter(a => a.wizard_step && !['xfg_email', 'discord'].includes(a.wizard_step))
  const xfgEmailAgents = agents.filter(a => a.xfg_email && a.xfg_email.trim() !== '')

  const activeAgents = agents.filter(a => a.current_stage === 'active')

  const getCarrierStatus = (agent: any, carrier: string): string => {
    try {
      const carriers = agent.carriers || {}
      return carriers[carrier] || 'none'
    } catch {
      return 'none'
    }
  }

  function getMilestones(agent: any) {
    const carriers = agent.carriers || {}
    return [
      { key: 'onboarding_platform', label: 'Onboarding Platform', value: true, auto: true },
      { key: 'onboarding_meeting', label: 'Onboarding Meeting', value: true, auto: true },
      { key: 'xfg_email', label: 'XFG Email', value: !!(agent.xfg_email && agent.xfg_email.trim() !== ''), auto: true },
      { key: 'discord', label: 'Discord', value: !!(agent.wizard_step && !['xfg_email','discord'].includes(agent.wizard_step)), auto: true },
      { key: 'ethos_contract', label: 'Ethos Contract', value: carriers['Ethos'] === 'active', auto: true },
      { key: 'moo_contract', label: 'MOO Contract', value: carriers['Mutual of Omaha'] === 'active', auto: true },
      { key: 'americo_contract', label: 'Americo Contract', value: carriers['Americo'] === 'active', auto: true },
      { key: 'corebridge_contract', label: 'Corebridge Contract', value: carriers['AIG (Core Bridge)'] === 'active', auto: true },
      { key: 'initial_call_complete', label: 'Initial Call', value: !!agent.initial_call_complete, auto: false },
      { key: 'free_dialer_access', label: 'Free Dialer Access', value: !!agent.free_dialer_access, auto: false },
      { key: 'paid_wavv_dialer_access', label: 'Paid/Wavv Dialer Access', value: !!agent.paid_wavv_dialer_access, auto: false },
      { key: 'sales_training_complete', label: 'Sales Training', value: !!agent.sales_training_complete, auto: false },
      { key: 'system_training_complete', label: 'System Training', value: !!agent.system_training_complete, auto: false },
    ]
  }

  function getProgress(agent: any) {
    const milestones = getMilestones(agent)
    const completed = milestones.filter(m => m.value).length
    return Math.round((completed / milestones.length) * 100)
  }

  async function toggleMilestone(agentId: string, field: string, currentValue: boolean, agents: any[], setAgents: any) {
    const { error } = await supabase.from('agents').update({ [field]: !currentValue, updated_at: new Date().toISOString() }).eq('id', agentId)
    if (!error) {
      setAgents((prev: any[]) => prev.map(a => a.id === agentId ? { ...a, [field]: !currentValue } : a))
    }
  }

  function aggregateSalesRecords(records: any[], period: 'weekly' | 'monthly' | 'allTime', selectedMonth?: string) {
    if (records.length === 0) return null

    let filtered = records
    let periodLabel = 'All-Time'

    if (period === 'weekly') {
      const now = new Date()
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      filtered = records.filter(r => new Date(r.sale_date) >= weekAgo)
      periodLabel = `Last 7 Days (${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
    } else if (period === 'monthly' && selectedMonth) {
      filtered = records.filter(r => r.sale_date.slice(0, 7) === selectedMonth)
      const [year, month] = selectedMonth.split('-')
      periodLabel = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    const carrierMap: Record<string, { totalAP: number; count: number }> = {}
    const agentMap: Record<string, { totalAP: number; carriers: Set<string>; count: number }> = {}

    filtered.forEach(r => {
      const c = r.carrier
      if (!carrierMap[c]) carrierMap[c] = { totalAP: 0, count: 0 }
      carrierMap[c].totalAP += Number(r.amount)
      carrierMap[c].count += 1

      const a = r.agent_name
      if (!agentMap[a]) agentMap[a] = { totalAP: 0, carriers: new Set(), count: 0 }
      agentMap[a].totalAP += Number(r.amount)
      agentMap[a].carriers.add(c)
      agentMap[a].count += 1
    })

    const byCarrier = Object.entries(carrierMap).map(([carrier, d]) => ({ carrier, totalAP: Math.round(d.totalAP * 100) / 100, count: d.count })).sort((a, b) => b.totalAP - a.totalAP)
    const byAgent = Object.entries(agentMap).map(([agent, d]) => ({ agent, totalAP: Math.round(d.totalAP * 100) / 100, carriers: Array.from(d.carriers), count: d.count })).sort((a, b) => b.totalAP - a.totalAP)
    const totalAP = byCarrier.reduce((sum, c) => sum + c.totalAP, 0)
    const totalSales = byCarrier.reduce((sum, c) => sum + c.count, 0)

    return {
      totalAP: Math.round(totalAP * 100) / 100,
      totalSales,
      byCarrier,
      byAgent,
      periodLabel
    }
  }

  function getAvailableMonths(records: any[]): string[] {
    const months = new Set<string>()
    records.forEach(r => months.add(r.sale_date.slice(0, 7)))
    return Array.from(months).sort().reverse()
  }

  const statusBadge = (status: string) => {
    if (status === 'active') return { label: '✓ Active', bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7' }
    if (status === 'submitted') return { label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }
    return { label: '—', bg: '#F5F5F5', color: '#AAA', border: '#E5E1DA' }
  }

  const filteredContracting = activeAgents.filter(a => {
    const nameMatch = !contractingSearch || (a.full_name || '').toLowerCase().includes(contractingSearch.toLowerCase())
    if (!contractingFilter) return nameMatch
    if (contractingFilter === 'ethos') return nameMatch && getCarrierStatus(a, 'Ethos') !== 'none'
    if (contractingFilter === 'americo_form') return nameMatch && a.americo_form_submitted
    if (contractingFilter === 'aig_form') return nameMatch && a.aig_form_submitted
    if (contractingFilter === 'dialer_active') return nameMatch && a.dialer_active
    if (contractingFilter === 'mutual_requested') return nameMatch && a.mutual_omaha_requested
    if (contractingFilter === 'mutual_unlocked') return nameMatch && a.mutual_omaha_surelc_unlocked
    if (contractingFilter === 'aflac') return nameMatch && getCarrierStatus(a, 'Aflac') !== 'none'
    if (contractingFilter === 'transamerica') return nameMatch && getCarrierStatus(a, 'Transamerica') !== 'none'
    if (contractingFilter === 'uhl') return nameMatch && getCarrierStatus(a, 'UHL (United Home Life)') !== 'none'
    if (contractingFilter === 'ahl') return nameMatch && getCarrierStatus(a, 'AHL (American Home Life)') !== 'none'
    if (contractingFilter === 'dialer') return nameMatch && a.dialer_submitted
    return nameMatch
  })

  async function resetCarrier(agentId: string, carrier: string, currentStatus: string) {
    try {
      const agent = agents.find(a => a.id === agentId)
      if (!agent) return
      const newStatus = currentStatus === 'active' ? 'submitted' : 'none'
      const updatedCarriers = { ...(agent.carriers || {}), [carrier]: newStatus }
      const { error } = await supabase.from('agents').update({ carriers: updatedCarriers, updated_at: new Date().toISOString() }).eq('id', agentId)
      if (error) { setResetError('Failed to update. Please try again.'); return }
      setResetError('')
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, carriers: updatedCarriers } : a))
    } catch {
      setResetError('An error occurred. Please try again.')
    }
  }

  async function advanceCarrier(agentId: string, carrier: string, currentStatus: string) {
    try {
      const agent = agents.find(a => a.id === agentId)
      if (!agent) return
      const newStatus = currentStatus === 'none' || !currentStatus ? 'submitted' : 'active'
      const updatedCarriers = { ...(agent.carriers || {}), [carrier]: newStatus }
      const { error } = await supabase.from('agents')
        .update({ carriers: updatedCarriers, updated_at: new Date().toISOString() })
        .eq('id', agentId)
      if (error) { setResetError('Failed to update. Please try again.'); return }
      setResetError('')
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, carriers: updatedCarriers } : a))
    } catch {
      setResetError('An error occurred. Please try again.')
    }
  }

  function getAgentStatusIndicator(agent: any) {
    const carriers = agent.carriers || {}
    const hasActiveCarrier = Object.values(carriers).some((s: any) => s === 'active')
    const dialerActive = agent.dialer_active === true

    if (hasActiveCarrier && dialerActive) {
      return { color: '🟢', label: 'Active', bg: '#E8F5E9', textColor: '#1B5E20', border: '#A5D6A7' }
    }

    const daysWaiting = agent.updated_at
      ? Math.floor((new Date().getTime() - new Date(agent.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    if (daysWaiting >= 7) {
      return { color: '🔴', label: `${daysWaiting}d waiting`, bg: '#FEE2E2', textColor: '#991B1B', border: '#FCA5A5' }
    }
    return { color: '🟡', label: `${daysWaiting}d waiting`, bg: '#FEF3C7', textColor: '#92400E', border: '#FDE68A' }
  }

  const contractingSummary = {
    ethos_active: activeAgents.filter(a => getCarrierStatus(a, 'Ethos') !== 'none').length,
    americo_form: activeAgents.filter(a => a.americo_form_submitted).length,
    aig_form: activeAgents.filter(a => a.aig_form_submitted).length,
    mutual_requested: activeAgents.filter(a => a.mutual_omaha_requested).length,
    mutual_unlocked: activeAgents.filter(a => a.mutual_omaha_surelc_unlocked).length,
    dialer_submitted: activeAgents.filter(a => a.dialer_submitted).length,
    dialer_active: activeAgents.filter(a => a.dialer_active).length,
  }

  const HEADERS = [
    { label: 'Agent',           filter: null,              group: 'core' },
    { label: 'Status',          filter: null,              group: 'core' },
    { label: 'Ethos',           filter: 'ethos',           group: 'Ethos' },
    { label: 'Americo Form',    filter: 'americo_form',    group: 'Americo' },
    { label: 'AIG Form',        filter: 'aig_form',        group: 'AIG' },
    { label: 'Mutual of Omaha', filter: 'mutual_requested',group: 'MutualOfOmaha' },
    { label: 'Aflac',           filter: 'aflac',           group: 'Aflac' },
    { label: 'Transamerica',    filter: 'transamerica',    group: 'Transamerica' },
    { label: 'UHL',             filter: 'uhl',             group: 'UHL' },
    { label: 'AHL',             filter: 'ahl',             group: 'AHL' },
    { label: 'Dialer',          filter: 'dialer',          group: 'core' },
    { label: 'Last Updated',    filter: null,              group: 'core' },
  ]

  const thStyle = (filter: string | null) => ({
    padding: '10px 14px',
    textAlign: 'left' as const,
    fontSize: '10px',
    fontWeight: '700' as const,
    color: contractingFilter === filter && filter ? '#C9A96E' : '#7A7A7A',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    borderBottom: contractingFilter === filter && filter ? '2px solid #C9A96E' : '1px solid #E5E1DA',
    whiteSpace: 'nowrap' as const,
    cursor: filter ? 'pointer' : 'default',
    userSelect: 'none' as const,
    backgroundColor: contractingFilter === filter && filter ? '#FFFBF0' : 'transparent',
  })

  const badgeSpan = (badge: { label: string; bg: string; color: string; border: string }, clickable?: boolean, onClick?: () => void) => (
    <span
      onClick={clickable ? onClick : undefined}
      title={clickable ? 'Click to reset' : undefined}
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '600',
        backgroundColor: badge.bg,
        color: badge.color,
        border: `1px solid ${badge.border}`,
        whiteSpace: 'nowrap',
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      {badge.label}
    </span>
  )

  const emptyBadge = badgeSpan({ label: '—', bg: '#F5F5F5', color: '#AAA', border: '#E5E1DA' })

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', padding: '32px 24px' }}>
      <div style={{ margin: '0 auto' }}>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>XFG · X Financial Group</p>
          <h1 style={{ color: '#1A1814', fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em' }}>Analytics</h1>
        </div>

        <div style={{ display: 'flex', borderBottom: '2px solid #E5E1DA', marginBottom: '24px', gap: '4px' }}>
          {[{ key: 'overview', label: 'Overview' }, { key: 'contracting', label: 'Contracting Tracker' }, { key: 'agentTracker', label: 'Agent Tracker' }, { key: 'leadership', label: 'Leadership' }, { key: 'topPerformers', label: 'Top 1%' }, { key: 'sales', label: 'Sales' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as 'overview' | 'contracting' | 'agentTracker' | 'leadership' | 'topPerformers' | 'sales')} style={{ padding: '12px 24px', border: 'none', backgroundColor: 'transparent', fontSize: '14px', fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? '#1A1814' : '#7A7A7A', cursor: 'pointer', borderBottom: activeTab === tab.key ? '2px solid #C9A96E' : '2px solid transparent', marginBottom: '-2px', fontFamily: 'inherit' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '16px' }}>
              {stageCounts.map(s => (
                <div key={s.key} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{s.count}</p>
                  <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <div onClick={() => setOverviewDetail(overviewDetail === 'onboarding' ? null : 'onboarding')} style={{ background: overviewDetail === 'onboarding' ? '#FFFBF0' : '#FFFFFF', border: overviewDetail === 'onboarding' ? '1px solid #C9A96E' : '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{totalAccountsCreated}</p>
                <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Attended Onboarding Meeting</p>
              </div>
              <div onClick={() => setOverviewDetail(overviewDetail === 'discord' ? null : 'discord')} style={{ background: overviewDetail === 'discord' ? '#FFFBF0' : '#FFFFFF', border: overviewDetail === 'discord' ? '1px solid #C9A96E' : '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{completedDiscord}</p>
                <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Joined Discord</p>
              </div>
              <div onClick={() => setOverviewDetail(overviewDetail === 'xfgEmail' ? null : 'xfgEmail')} style={{ background: overviewDetail === 'xfgEmail' ? '#FFFBF0' : '#FFFFFF', border: overviewDetail === 'xfgEmail' ? '1px solid #C9A96E' : '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{hasXfgEmail}</p>
                <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Has XFG Email</p>
              </div>
            </div>

            {overviewDetail && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBE8E3', borderRadius: '12px', padding: '20px 24px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>
                    {overviewDetail === 'onboarding' && `Attended Onboarding Meeting (${onboardingAgents.length})`}
                    {overviewDetail === 'discord' && `Joined Discord (${discordAgents.length})`}
                    {overviewDetail === 'xfgEmail' && `Has XFG Email (${xfgEmailAgents.length})`}
                  </p>
                  <button onClick={() => setOverviewDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: '18px' }}>×</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                  {(overviewDetail === 'onboarding' ? onboardingAgents : overviewDetail === 'discord' ? discordAgents : xfgEmailAgents).map(a => (
                    <a
                      key={a.id}
                      href={`/agents/${a.id}`}
                      style={{ display: 'block', padding: '8px 12px', backgroundColor: '#F9F7F4', borderRadius: '8px', fontSize: '13px', color: '#1A1A1A', textDecoration: 'none', fontWeight: '600' }}
                    >
                      {a.full_name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', overflow: 'hidden', marginBottom: '32px' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #EBE8E3' }}>
                <h2 style={{ color: '#1A1814', fontSize: '16px', fontWeight: '700' }}>All Agents</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ background: '#F9F7F4' }}>
                      {['Name', 'XFG ID', 'Stage', 'State', 'Model', 'Licensed', 'NPN', 'Joined'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #E5E1DA', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent, i) => (
                      <tr key={agent.id} style={{ borderBottom: i < agents.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1A1A1A', fontSize: '13px' }}>
                          <a href={`/agents/${agent.id}`} style={{ color: '#1A1A1A', textDecoration: 'none', fontWeight: '600' }}>{agent.full_name}</a>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#C9A96E', fontFamily: 'monospace', fontSize: '12px' }}>{agent.xfg_id}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: '#F5EDD9', color: '#8B6A2E', textTransform: 'capitalize' }}>{(agent.current_stage || '').replace('_', ' ')}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '13px' }}>{agent.state || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '13px', textTransform: 'capitalize' }}>{agent.agent_model || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                          {agent.is_licensed === 'yes' ? <span style={{ color: '#2D6A4F', fontWeight: '600' }}>✓ Yes</span> : agent.is_licensed === 'no' ? <span style={{ color: '#8B2635' }}>✗ No</span> : <span style={{ color: '#AAA' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '13px' }}>{agent.npn || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '12px' }}>{agent.created_at ? new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {history.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #EBE8E3' }}>
                  <h2 style={{ color: '#1A1814', fontSize: '16px', fontWeight: '700' }}>Recent Stage Changes</h2>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#F9F7F4' }}>
                      {['Agent', 'From', 'To', 'Changed By', 'Date'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #E5E1DA' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={h.id} style={{ borderBottom: i < history.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1A1A1A', fontSize: '13px' }}>{h.agent_name || '—'}</td>
                        <td style={{ padding: '12px 16px' }}><span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#F5F5F5', color: '#7A7A7A', textTransform: 'capitalize' }}>{(h.from_stage || '').replace('_', ' ') || '—'}</span></td>
                        <td style={{ padding: '12px 16px' }}><span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#F5EDD9', color: '#8B6A2E', textTransform: 'capitalize' }}>{(h.to_stage || '').replace('_', ' ') || '—'}</span></td>
                        <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '13px' }}>{h.changed_by_name || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '12px' }}>{h.created_at ? new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONTRACTING TRACKER TAB */}
        {activeTab === 'contracting' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px', marginBottom: '24px' }}>
              {[
                { label: 'Ethos', value: contractingSummary.ethos_active, color: '#27AE60', filter: 'ethos' },
                { label: 'Americo Form', value: contractingSummary.americo_form, color: '#C9A96E', filter: 'americo_form' },
                { label: 'AIG Form', value: contractingSummary.aig_form, color: '#5B21B6', filter: 'aig_form' },
                { label: 'Mutual Requested', value: contractingSummary.mutual_requested, color: '#5B21B6', filter: 'mutual_requested' },
                { label: 'Mutual Unlocked', value: contractingSummary.mutual_unlocked, color: '#27AE60', filter: 'mutual_unlocked' },
                { label: 'Dialer Submitted', value: contractingSummary.dialer_submitted, color: '#2196F3', filter: 'dialer' },
                { label: 'Dialer Active', value: contractingSummary.dialer_active, color: '#27AE60', filter: 'dialer_active' },
              ].map(card => (
                <div key={card.label} onClick={() => setContractingFilter(contractingFilter === card.filter ? null : card.filter)} style={{ background: contractingFilter === card.filter ? '#FFFBF0' : '#FFFFFF', border: contractingFilter === card.filter ? '1px solid #C9A96E' : '1px solid #DDD9D2', borderRadius: '12px', padding: '16px 20px', cursor: 'pointer' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: card.color, marginBottom: '4px' }}>{card.value}</div>
                  <div style={{ fontSize: '11px', color: '#7A7A7A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1.4 }}>{card.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={contractingSearch} onChange={e => setContractingSearch(e.target.value)} placeholder="Search agents..." style={{ padding: '10px 16px', fontSize: '13px', border: '1px solid #DDD9D2', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF', width: '300px' }} />
              {contractingFilter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', backgroundColor: '#FFFBF0', border: '1px solid #C9A96E', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#92400E', fontWeight: '600' }}>Filtering: {contractingFilter.replace('_', ' ')}</span>
                  <button onClick={() => setContractingFilter(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A96E', fontSize: '16px', padding: 0, lineHeight: 1 }}>×</button>
                </div>
              )}
            </div>

            {resetError && (
              <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', color: '#C0392B', fontSize: '13px', marginBottom: '16px' }}>⚠ {resetError}</div>
            )}

            <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #EBE8E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: '#1A1814', fontSize: '16px', fontWeight: '700' }}>Agent Contracting Status</h2>
                <span style={{ fontSize: '12px', color: '#888' }}>{filteredContracting.length} agents</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1200px' }}>
                  <thead>
                    <tr style={{ background: '#F9F7F4' }}>
                      {HEADERS.map(h => (
                        isColumnVisible(h.group) ? (
                          <th key={h.label} onClick={() => h.filter && setContractingFilter(contractingFilter === h.filter ? null : h.filter)} style={thStyle(h.filter)}>
                            {h.label} {h.filter ? (contractingFilter === h.filter ? '▼' : '↕') : ''}
                          </th>
                        ) : null
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracting.map((agent, i) => {
                      const ethos = getCarrierStatus(agent, 'Ethos')
                      const aflac = getCarrierStatus(agent, 'Aflac')
                      const trans = getCarrierStatus(agent, 'Transamerica')
                      const uhl = getCarrierStatus(agent, 'UHL (United Home Life)')
                      const ahl = getCarrierStatus(agent, 'AHL (American Home Life)')
                      const moOmaha = getCarrierStatus(agent, 'Mutual of Omaha')

                      const moStatus = (() => {
                        if (moOmaha === 'active') return { label: '✓ Active', bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7' }
                        if (agent.mutual_omaha_surelc_unlocked) return { label: '🔓 Unlocked', bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7' }
                        if (agent.mutual_omaha_requested) return { label: '📋 Requested', bg: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD' }
                        if (moOmaha === 'submitted') return { label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }
                        return { label: '—', bg: '#F5F5F5', color: '#AAA', border: '#E5E1DA' }
                      })()

                      return (
                        <tr key={agent.id} style={{ borderBottom: i < filteredContracting.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                          <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1A1A1A', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            <a href={`/agents/${agent.id}`} style={{ color: '#1A1A1A', textDecoration: 'none', fontWeight: '600' }}>{agent.full_name}</a>
                          </td>
                          {/* Status Indicator */}
                          <td style={{ padding: '12px 14px' }}>
                            {(() => {
                              const status = getAgentStatusIndicator(agent)
                              return (
                                <span style={{
                                  display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                                  fontSize: '11px', fontWeight: '600', backgroundColor: status.bg,
                                  color: status.textColor, border: `1px solid ${status.border}`, whiteSpace: 'nowrap'
                                }}>
                                  {status.color} {status.label}
                                </span>
                              )
                            })()}
                          </td>
                          {/* Ethos */}
                          {isColumnVisible('Ethos') && (
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {ethos === 'none' && badgeSpan({ label: '+ Submit', bg: '#F5F5F5', color: '#555', border: '#E5E1DA' }, true, () => advanceCarrier(agent.id, 'Ethos', ethos))}
                                {ethos === 'submitted' && (
                                  <>
                                    {badgeSpan({ label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => resetCarrier(agent.id, 'Ethos', 'submitted'))}
                                    {badgeSpan({ label: 'Mark Active', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => advanceCarrier(agent.id, 'Ethos', ethos))}
                                  </>
                                )}
                                {ethos === 'active' && badgeSpan(statusBadge(ethos), true, () => resetCarrier(agent.id, 'Ethos', ethos))}
                              </div>
                            </td>
                          )}
                          {/* Americo */}
                          {isColumnVisible('Americo') && (
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {(() => {
                                  const americo = getCarrierStatus(agent, 'Americo')
                                  return (
                                    <>
                                      {americo === 'none' && agent.americo_form_submitted && (
                                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', whiteSpace: 'nowrap' }}>📋 Form Submitted</span>
                                      )}
                                      {americo === 'none' && !agent.americo_form_submitted && emptyBadge}
                                      {americo === 'submitted' && (
                                        <>
                                          {badgeSpan({ label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => resetCarrier(agent.id, 'Americo', 'submitted'))}
                                          {badgeSpan({ label: 'Mark Active', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => advanceCarrier(agent.id, 'Americo', americo))}
                                        </>
                                      )}
                                      {americo === 'active' && badgeSpan(statusBadge(americo), true, () => resetCarrier(agent.id, 'Americo', americo))}
                                      {americo === 'none' && agent.americo_form_submitted && badgeSpan({ label: 'Mark Submitted', bg: '#F5F5F5', color: '#555', border: '#E5E1DA' }, true, () => advanceCarrier(agent.id, 'Americo', 'none'))}
                                    </>
                                  )
                                })()}
                              </div>
                            </td>
                          )}
                          {/* AIG */}
                          {isColumnVisible('AIG') && (
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {(() => {
                                  const aig = getCarrierStatus(agent, 'AIG (Core Bridge)')
                                  return (
                                    <>
                                      {aig === 'none' && agent.aig_form_submitted && (
                                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#EDE9FE', color: '#5B21B6', border: '1px solid #C4B5FD', whiteSpace: 'nowrap' }}>📋 Form Submitted</span>
                                      )}
                                      {aig === 'none' && !agent.aig_form_submitted && emptyBadge}
                                      {aig === 'submitted' && (
                                        <>
                                          {badgeSpan({ label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => resetCarrier(agent.id, 'AIG (Core Bridge)', 'submitted'))}
                                          {badgeSpan({ label: 'Mark Active', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => advanceCarrier(agent.id, 'AIG (Core Bridge)', aig))}
                                        </>
                                      )}
                                      {aig === 'active' && badgeSpan(statusBadge(aig), true, () => resetCarrier(agent.id, 'AIG (Core Bridge)', aig))}
                                      {aig === 'none' && agent.aig_form_submitted && badgeSpan({ label: 'Mark Submitted', bg: '#F5F5F5', color: '#555', border: '#E5E1DA' }, true, () => advanceCarrier(agent.id, 'AIG (Core Bridge)', 'none'))}
                                    </>
                                  )
                                })()}
                              </div>
                            </td>
                          )}
                          {/* Mutual of Omaha */}
                          {isColumnVisible('MutualOfOmaha') && (
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {moOmaha === 'none' && !agent.mutual_omaha_requested && emptyBadge}
                                {moOmaha === 'none' && agent.mutual_omaha_requested && (
                                  <>
                                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#EDE9FE', color: '#5B21B6', border: '1px solid #C4B5FD', whiteSpace: 'nowrap' }}>📋 Requested</span>
                                    {badgeSpan({ label: 'Mark Submitted', bg: '#F5F5F5', color: '#555', border: '#E5E1DA' }, true, () => advanceCarrier(agent.id, 'Mutual of Omaha', 'none'))}
                                  </>
                                )}
                                {moOmaha === 'submitted' && (
                                  <>
                                    {badgeSpan({ label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => resetCarrier(agent.id, 'Mutual of Omaha', 'submitted'))}
                                    {badgeSpan({ label: 'Mark Active', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => advanceCarrier(agent.id, 'Mutual of Omaha', moOmaha))}
                                  </>
                                )}
                                {moOmaha === 'active' && badgeSpan(moStatus, true, () => resetCarrier(agent.id, 'Mutual of Omaha', moOmaha))}
                              </div>
                            </td>
                          )}
                          {/* Aflac */}
                          {isColumnVisible('Aflac') && (
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {aflac === 'none' && badgeSpan({ label: '+ Submit', bg: '#F5F5F5', color: '#555', border: '#E5E1DA' }, true, () => advanceCarrier(agent.id, 'Aflac', aflac))}
                                {aflac === 'submitted' && (
                                  <>
                                    {badgeSpan({ label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => resetCarrier(agent.id, 'Aflac', 'submitted'))}
                                    {badgeSpan({ label: 'Mark Active', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => advanceCarrier(agent.id, 'Aflac', aflac))}
                                  </>
                                )}
                                {aflac === 'active' && badgeSpan(statusBadge(aflac), true, () => resetCarrier(agent.id, 'Aflac', aflac))}
                              </div>
                            </td>
                          )}
                          {/* Transamerica */}
                          {isColumnVisible('Transamerica') && (
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {trans === 'none' && badgeSpan({ label: '+ Submit', bg: '#F5F5F5', color: '#555', border: '#E5E1DA' }, true, () => advanceCarrier(agent.id, 'Transamerica', trans))}
                                {trans === 'submitted' && (
                                  <>
                                    {badgeSpan({ label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => resetCarrier(agent.id, 'Transamerica', 'submitted'))}
                                    {badgeSpan({ label: 'Mark Active', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => advanceCarrier(agent.id, 'Transamerica', trans))}
                                  </>
                                )}
                                {trans === 'active' && badgeSpan(statusBadge(trans), true, () => resetCarrier(agent.id, 'Transamerica', trans))}
                              </div>
                            </td>
                          )}
                          {/* UHL */}
                          {isColumnVisible('UHL') && (
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {uhl === 'none' && badgeSpan({ label: '+ Submit', bg: '#F5F5F5', color: '#555', border: '#E5E1DA' }, true, () => advanceCarrier(agent.id, 'UHL (United Home Life)', uhl))}
                                {uhl === 'submitted' && (
                                  <>
                                    {badgeSpan({ label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => resetCarrier(agent.id, 'UHL (United Home Life)', 'submitted'))}
                                    {badgeSpan({ label: 'Mark Active', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => advanceCarrier(agent.id, 'UHL (United Home Life)', uhl))}
                                  </>
                                )}
                                {uhl === 'active' && badgeSpan(statusBadge(uhl), true, () => resetCarrier(agent.id, 'UHL (United Home Life)', uhl))}
                              </div>
                            </td>
                          )}
                          {/* AHL */}
                          {isColumnVisible('AHL') && (
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {ahl === 'none' && badgeSpan({ label: '+ Submit', bg: '#F5F5F5', color: '#555', border: '#E5E1DA' }, true, () => advanceCarrier(agent.id, 'AHL (American Home Life)', ahl))}
                                {ahl === 'submitted' && (
                                  <>
                                    {badgeSpan({ label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => resetCarrier(agent.id, 'AHL (American Home Life)', 'submitted'))}
                                    {badgeSpan({ label: 'Mark Active', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, () => advanceCarrier(agent.id, 'AHL (American Home Life)', ahl))}
                                  </>
                                )}
                                {ahl === 'active' && badgeSpan(statusBadge(ahl), true, () => resetCarrier(agent.id, 'AHL (American Home Life)', ahl))}
                              </div>
                            </td>
                          )}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {!agent.dialer_submitted && (
                                badgeSpan({ label: '+ Submit', bg: '#F5F5F5', color: '#555', border: '#E5E1DA' }, true, async () => {
                                  await supabase.from('agents').update({ dialer_submitted: true, dialer_submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', agent.id)
                                  setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, dialer_submitted: true } : a))
                                })
                              )}
                              {agent.dialer_submitted && (
                                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#E3F2FD', color: '#1565C0', border: '1px solid #90CAF9', whiteSpace: 'nowrap' }}>⏳ Submitted</span>
                              )}
                              {agent.dialer_submitted && (
                                agent.dialer_active
                                  ? badgeSpan({ label: '✓ Active', bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7' }, true, async () => {
                                      await supabase.from('agents').update({ dialer_active: false, updated_at: new Date().toISOString() }).eq('id', agent.id)
                                      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, dialer_active: false } : a))
                                    })
                                  : badgeSpan({ label: 'Mark Active', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }, true, async () => {
                                      await supabase.from('agents').update({ dialer_active: true, dialer_active_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', agent.id)
                                      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, dialer_active: true, dialer_active_at: new Date().toISOString() } : a))
                                    })
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#AAA', fontSize: '11px', whiteSpace: 'nowrap' }}>
                            {agent.updated_at ? new Date(agent.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* AGENT TRACKER TAB */}
        {activeTab === 'agentTracker' && (
          <div>
            {(() => {
              const activeAgents = agents.filter(a => a.current_stage === 'active')
              const avgCompletion = activeAgents.length > 0
                ? Math.round(activeAgents.reduce((sum, a) => sum + getProgress(a), 0) / activeAgents.length)
                : 0
              const fullyOnboarded = activeAgents.filter(a => getProgress(a) === 100).length
              const needsAttention = activeAgents.filter(a => getProgress(a) < 100).length

              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                      <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{activeAgents.length}</p>
                      <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Agents</p>
                    </div>
                    <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                      <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{avgCompletion}%</p>
                      <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Average Completion</p>
                    </div>
                    <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                      <p style={{ color: '#27AE60', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{fullyOnboarded}</p>
                      <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fully Onboarded</p>
                    </div>
                    <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                      <p style={{ color: '#C0392B', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{needsAttention}</p>
                      <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Needs Attention</p>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'visible' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F9F7F4', borderBottom: '1px solid #E5E1DA' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', whiteSpace: 'nowrap', width: '140px' }}>Agent</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Progress</th>
                          {getMilestones(activeAgents[0] || {}).map(m => (
                            <th key={m.key} style={{ padding: '10px 14px', textAlign: 'center', fontSize: '10px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', wordWrap: 'break-word', whiteSpace: 'normal' }}>{m.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeAgents.map((agent, i) => {
                          const milestones = getMilestones(agent)
                          const progress = getProgress(agent)
                          return (
                            <tr key={agent.id} style={{ borderBottom: i < activeAgents.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                              <td style={{ padding: '10px 14px', fontWeight: '600', color: '#1A1A1A', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                <a href={`/agents/${agent.id}`} style={{ color: '#1A1A1A', textDecoration: 'none', fontWeight: '600' }}>{agent.full_name}</a>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: progress === 100 ? '#27AE60' : progress >= 50 ? '#C9A96E' : '#C0392B' }}>{progress}%</span>
                              </td>
                              {milestones.map(m => (
                                <td key={m.key} style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  {m.auto ? (
                                    <span style={{ fontSize: '13px' }}>{m.value ? '✅' : '—'}</span>
                                  ) : (
                                    <span
                                      onClick={() => toggleMilestone(agent.id, m.key, m.value, agents, setAgents)}
                                      style={{ cursor: 'pointer', fontSize: '13px', padding: '2px 8px', borderRadius: '10px', backgroundColor: m.value ? '#D1FAE5' : '#F5F5F5', color: m.value ? '#166534' : '#AAA', fontWeight: '600', display: 'inline-block' }}
                                    >
                                      {m.value ? 'Yes' : 'No'}
                                    </span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* LEADERSHIP TAB */}
        {activeTab === 'leadership' && (
          <div>
            {(() => {
              const leaders = agents.filter(a => a.is_leader === true)
              return (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '14px', color: '#7A7A7A', margin: 0 }}>{leaders.length} leaders tagged for tracking</p>
                  </div>
                  {leaders.length === 0 ? (
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '48px 24px', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: '#AAA' }}>No leaders tagged yet. Toggle &quot;Leadership Team&quot; on an agent&apos;s detail page to add them here.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                      {leaders.map(leader => {
                        const team = agents.filter(a => a.upline_agent_id === leader.id)
                        return (
                          <div key={leader.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '18px 20px' }}>
                            <a href={`/agents/${leader.id}`} style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', textDecoration: 'none' }}>{leader.full_name}</a>
                            <p style={{ fontSize: '12px', color: '#7A7A7A', margin: '2px 0 12px 0' }}>{team.length} team member{team.length !== 1 ? 's' : ''}</p>
                            {team.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {team.map(member => (
                                  <a key={member.id} href={`/agents/${member.id}`} style={{ fontSize: '13px', color: '#1A1A1A', textDecoration: 'none', padding: '6px 10px', backgroundColor: '#F9F7F4', borderRadius: '6px' }}>
                                    {member.full_name}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p style={{ fontSize: '12px', color: '#CCC', margin: 0 }}>No team members yet</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/* TOP PERFORMERS TAB */}
        {activeTab === 'topPerformers' && (
          <div>
            {(() => {
              const topPerformers = agents.filter(a => a.is_top_performer === true)
              return (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '14px', color: '#7A7A7A', margin: 0 }}>{topPerformers.length} top performers tagged for tracking</p>
                  </div>
                  {topPerformers.length === 0 ? (
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '48px 24px', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: '#AAA' }}>No top performers tagged yet. Toggle &quot;Top 1% Performer&quot; on an agent&apos;s detail page to add them here.</p>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F9F7F4', borderBottom: '1px solid #E5E1DA' }}>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase' }}>Agent</th>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase' }}>Phone</th>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase' }}>Email</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase' }}>Stage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topPerformers.map((agent, i) => (
                            <tr key={agent.id} style={{ borderBottom: i < topPerformers.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                              <td style={{ padding: '12px 14px', fontWeight: '600', fontSize: '13px' }}>
                                <a href={`/agents/${agent.id}`} style={{ color: '#1A1A1A', textDecoration: 'none', fontWeight: '600' }}>{agent.full_name}</a>
                              </td>
                              <td style={{ padding: '12px 14px', fontSize: '13px', color: '#4A4A4A' }}>{agent.phone || '—'}</td>
                              <td style={{ padding: '12px 14px', fontSize: '13px', color: '#4A4A4A' }}>{agent.email || '—'}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', backgroundColor: agent.current_stage === 'active' ? '#D1FAE5' : '#F3F4F6', color: agent.current_stage === 'active' ? '#065F46' : '#374151' }}>
                                  {agent.current_stage}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/* SALES TAB */}
        {activeTab === 'sales' && (
          <div>
            <style>{`
              @keyframes xfgPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
              @keyframes xfgFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
              @keyframes xfgHolo { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
              .xfg-hud-num { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }
              .xfg-hero-num {
                background: linear-gradient(110deg, #FFFFFF 20%, #C9A96E 35%, #00E5A8 50%, #C9A96E 65%, #FFFFFF 80%);
                background-size: 250% auto;
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                animation: xfgFloat 4s ease-in-out infinite, xfgHolo 6s linear infinite;
                display: inline-block;
                transition: filter 0.3s ease;
                cursor: default;
              }
              .xfg-hero-num:hover { filter: brightness(1.25) drop-shadow(0 0 20px rgba(0,229,168,0.5)); }
              .xfg-substat-num {
                display: inline-block;
                animation: xfgFloat 4s ease-in-out infinite;
                transition: transform 0.25s ease, color 0.25s ease;
              }
              .xfg-substat-num:hover { transform: translateY(-8px) scale(1.05); color: #00E5A8 !important; }
            `}</style>
            {salesRecords.length === 0 ? (
              <div style={{ backgroundColor: '#0A0A0C', borderRadius: '16px', border: '1px solid #232328', padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: '#6B6B76', fontFamily: 'ui-monospace, monospace' }}>NO DATA STREAM — awaiting first sync from #daily-sales</p>
              </div>
            ) : (() => {
              const availableMonths = getAvailableMonths(salesRecords)
              const data = aggregateSalesRecords(salesRecords, salesPeriod, selectedMonth)
              if (!data) return null

              const periods = [{ key: 'weekly', label: 'WEEKLY' }, { key: 'monthly', label: 'MONTHLY' }, { key: 'allTime', label: 'ALL-TIME' }]
              const activeIndex = periods.findIndex(p => p.key === salesPeriod)

              return (
                <>
                  {/* Segmented control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', display: 'inline-flex', backgroundColor: '#131316', border: '1px solid #232328', borderRadius: '10px', padding: '4px' }}>
                      <div style={{
                        position: 'absolute', top: '4px', bottom: '4px', left: `calc(4px + ${activeIndex} * 88px)`,
                        width: '84px', backgroundColor: '#C9A96E', borderRadius: '7px',
                        transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 16px rgba(201,169,110,0.5)'
                      }} />
                      {periods.map(p => (
                        <button
                          key={p.key}
                          onClick={() => setSalesPeriod(p.key as 'weekly' | 'monthly' | 'allTime')}
                          style={{
                            position: 'relative', width: '84px', padding: '9px 0', border: 'none', background: 'transparent',
                            fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'ui-monospace, monospace',
                            color: salesPeriod === p.key ? '#0A0A0C' : '#6B6B76', transition: 'color 0.25s ease', zIndex: 1
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {salesPeriod === 'monthly' && (
                      <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        style={{
                          padding: '9px 16px', borderRadius: '10px', border: '1px solid #232328', fontSize: '12px', fontWeight: '700',
                          color: '#C9A96E', backgroundColor: '#131316', cursor: 'pointer', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em'
                        }}
                      >
                        {availableMonths.map(m => {
                          const [year, month] = m.split('-')
                          const label = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          return <option key={m} value={m}>{label.toUpperCase()}</option>
                        })}
                      </select>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00E5A8', animation: 'xfgPulse 2s ease-in-out infinite' }} />
                      <span style={{ fontSize: '10px', color: '#6B6B76', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.1em' }}>LIVE · SYNCS MON 8AM CST</span>
                    </div>
                  </div>

                  {/* Hero HUD panel */}
                  <div style={{
                    position: 'relative', background: '#0A0A0C', borderRadius: '20px', padding: '36px 40px', marginBottom: '24px',
                    border: '1px solid #232328', overflow: 'hidden',
                    backgroundImage: 'repeating-linear-gradient(115deg, rgba(201,169,110,0.03) 0px, rgba(201,169,110,0.03) 1px, transparent 1px, transparent 40px)'
                  }}>
                    {/* corner brackets */}
                    {[
                      { top: 14, left: 14, borderTop: '2px solid #C9A96E', borderLeft: '2px solid #C9A96E' },
                      { top: 14, right: 14, borderTop: '2px solid #C9A96E', borderRight: '2px solid #C9A96E' },
                      { bottom: 14, left: 14, borderBottom: '2px solid #C9A96E', borderLeft: '2px solid #C9A96E' },
                      { bottom: 14, right: 14, borderBottom: '2px solid #C9A96E', borderRight: '2px solid #C9A96E' },
                    ].map((pos, i) => (
                      <div key={i} style={{ position: 'absolute', width: '18px', height: '18px', ...pos }} />
                    ))}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#00E5A8' }} />
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#00E5A8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.16em', fontFamily: 'ui-monospace, monospace' }}>{data.periodLabel}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '56px', flexWrap: 'wrap', marginTop: '14px' }}>
                      <div style={{ position: 'relative' }}>
                        <p className="xfg-hud-num xfg-hero-num" style={{ fontSize: '52px', fontWeight: '700', margin: 0, letterSpacing: '-0.01em' }}>
                          ${data.totalAP.toLocaleString()}
                        </p>
                        <p style={{ fontSize: '11px', color: '#6B6B76', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'ui-monospace, monospace' }}>Total Annual Premium</p>
                      </div>
                      <div style={{ borderLeft: '1px solid #232328', paddingLeft: '32px' }}>
                        <p className="xfg-hud-num xfg-substat-num" style={{ fontSize: '30px', fontWeight: '700', color: '#C9A96E', margin: 0, animationDelay: '0.3s' }}>{data.totalSales}</p>
                        <p style={{ fontSize: '11px', color: '#6B6B76', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'ui-monospace, monospace' }}>Policies Sold</p>
                      </div>
                      <div style={{ borderLeft: '1px solid #232328', paddingLeft: '32px' }}>
                        <p className="xfg-hud-num xfg-substat-num" style={{ fontSize: '30px', fontWeight: '700', color: '#C9A96E', margin: 0, animationDelay: '0.6s' }}>${data.totalSales > 0 ? Math.round(data.totalAP / data.totalSales).toLocaleString() : 0}</p>
                        <p style={{ fontSize: '11px', color: '#6B6B76', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'ui-monospace, monospace' }}>Avg AP / Sale</p>
                      </div>
                    </div>
                  </div>

                  {/* By Carrier / By Agent */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ backgroundColor: '#0A0A0C', borderRadius: '16px', border: '1px solid #232328', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 22px', borderBottom: '1px solid #232328', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#C9A96E' }} />
                        <p style={{ fontSize: '11px', fontWeight: '700', color: '#C9A96E', margin: 0, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'ui-monospace, monospace' }}>By Carrier</p>
                      </div>
                      <div style={{ padding: '4px 22px' }}>
                        {data.byCarrier.map((c: any, i: number) => (
                          <div key={c.carrier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: i > 0 ? '1px solid #1A1A1E' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="xfg-hud-num" style={{ fontSize: '10px', color: '#3A3A40', width: '16px' }}>{String(i + 1).padStart(2, '0')}</span>
                              <span style={{ fontSize: '13px', color: '#E5E5E5', fontWeight: '600' }}>{c.carrier}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p className="xfg-hud-num" style={{ fontSize: '14px', fontWeight: '700', color: '#00E5A8', margin: 0 }}>${c.totalAP.toLocaleString()}</p>
                              <p style={{ fontSize: '10px', color: '#6B6B76', margin: 0, fontFamily: 'ui-monospace, monospace' }}>{c.count} sale{c.count !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#0A0A0C', borderRadius: '16px', border: '1px solid #232328', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 22px', borderBottom: '1px solid #232328', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#C9A96E' }} />
                        <p style={{ fontSize: '11px', fontWeight: '700', color: '#C9A96E', margin: 0, textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'ui-monospace, monospace' }}>By Agent</p>
                      </div>
                      <div style={{ padding: '4px 22px' }}>
                        {data.byAgent.map((a: any, i: number) => (
                          <div key={a.agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: i > 0 ? '1px solid #1A1A1E' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="xfg-hud-num" style={{ fontSize: '10px', color: '#3A3A40', width: '16px' }}>{String(i + 1).padStart(2, '0')}</span>
                              <div>
                                <p style={{ fontSize: '13px', color: '#E5E5E5', fontWeight: '600', margin: 0 }}>{a.agent}</p>
                                <p style={{ fontSize: '10px', color: '#6B6B76', margin: 0, fontFamily: 'ui-monospace, monospace' }}>{a.carriers.join(', ')} · {a.count} polic{a.count !== 1 ? 'ies' : 'y'}</p>
                              </div>
                            </div>
                            <p className="xfg-hud-num" style={{ fontSize: '14px', fontWeight: '700', color: '#00E5A8', margin: 0 }}>${a.totalAP.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>
    </main>
  )
}
