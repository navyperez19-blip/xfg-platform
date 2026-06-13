'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useRouter } from 'next/navigation'

const STAGES = [
  { key: 'contacted', label: 'Contacted' },
  { key: 'licensing', label: 'Licensing' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'contracting', label: 'Contracting' },
  { key: 'system_setup', label: 'System Setup' },
  { key: 'active', label: 'Active' },
]


export default function AnalyticsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'contracting'>('overview')
  const [contractingSearch, setContractingSearch] = useState('')
  const [contractingFilter, setContractingFilter] = useState<string | null>(null)

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
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Georgia, serif' }}>Loading analytics...</p>
    </main>
  )

  const stageCounts = STAGES.map(s => ({
    ...s,
    count: agents.filter(a => a.current_stage === s.key).length
  }))

  const activeAgents = agents.filter(a => a.current_stage === 'active')

  const filteredContracting = activeAgents.filter(a => {
    const nameMatch = !contractingSearch || a.full_name?.toLowerCase().includes(contractingSearch.toLowerCase())
    if (!contractingFilter) return nameMatch
    if (contractingFilter === 'ethos') return nameMatch && getCarrierStatus(a, 'Ethos') === 'active'
    if (contractingFilter === 'americo_form') return nameMatch && a.americo_form_submitted
    if (contractingFilter === 'americo_surelc') return nameMatch && a.americo_surelc_unlocked
    if (contractingFilter === 'americo_pending') return nameMatch && a.americo_form_submitted && !a.americo_surelc_unlocked
    if (contractingFilter === 'mutual_requested') return nameMatch && a.mutual_omaha_requested
    if (contractingFilter === 'mutual_unlocked') return nameMatch && a.mutual_omaha_surelc_unlocked
    if (contractingFilter === 'aflac') return nameMatch && getCarrierStatus(a, 'Aflac') !== 'none'
    if (contractingFilter === 'transamerica') return nameMatch && getCarrierStatus(a, 'Transamerica') !== 'none'
    if (contractingFilter === 'uhl') return nameMatch && getCarrierStatus(a, 'UHL (United Home Life)') !== 'none'
    if (contractingFilter === 'ahl') return nameMatch && getCarrierStatus(a, 'AHL (American Home Life)') !== 'none'
    return nameMatch
  })

  const getCarrierStatus = (agent: any, carrier: string) => {
    const carriers = agent.carriers || {}
    return carriers[carrier] || 'none'
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') return { label: '✓ Active', bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7' }
    if (status === 'submitted') return { label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }
    return { label: '—', bg: '#F5F5F5', color: '#AAA', border: '#E5E1DA' }
  }

  const getAmericoStatus = (agent: any) => {
    if (agent.americo_surelc_unlocked) return { label: '🔓 SureLC Unlocked', bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7' }
    if (agent.americo_form_submitted) return { label: '📋 Form Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }
    return { label: '—', bg: '#F5F5F5', color: '#AAA', border: '#E5E1DA' }
  }

  const getMutualOmahaStatus = (agent: any) => {
    const carrierStatus = getCarrierStatus(agent, 'Mutual of Omaha')
    if (carrierStatus === 'active') return { label: '✓ Active', bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7' }
    if (agent.mutual_omaha_surelc_unlocked) return { label: '🔓 SureLC Unlocked', bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7' }
    if (agent.mutual_omaha_requested) return { label: '📋 Requested', bg: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD' }
    if (carrierStatus === 'submitted') return { label: '⏳ Submitted', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }
    return { label: '—', bg: '#F5F5F5', color: '#AAA', border: '#E5E1DA' }
  }

  const Badge = ({ status }: { status: { label: string; bg: string; color: string; border: string } }) => (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: status.bg, color: status.color, border: `1px solid ${status.border}`, whiteSpace: 'nowrap' }}>
      {status.label}
    </span>
  )

  // Contracting summary counts
  const contractingSummary = {
    ethos_active: activeAgents.filter(a => getCarrierStatus(a, 'Ethos') === 'active').length,
    americo_form: activeAgents.filter(a => a.americo_form_submitted).length,
    americo_unlocked: activeAgents.filter(a => a.americo_surelc_unlocked).length,
    mutual_requested: activeAgents.filter(a => a.mutual_omaha_requested).length,
    mutual_unlocked: activeAgents.filter(a => a.mutual_omaha_surelc_unlocked).length,
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>XFG · X Financial Group</p>
          <h1 style={{ color: '#1A1814', fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em' }}>Analytics</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #E5E1DA', marginBottom: '24px', gap: '4px' }}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'contracting', label: 'Contracting Tracker' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'overview' | 'contracting')}
              style={{ padding: '12px 24px', border: 'none', backgroundColor: 'transparent', fontSize: '14px', fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? '#1A1814' : '#7A7A7A', cursor: 'pointer', borderBottom: activeTab === tab.key ? '2px solid #C9A96E' : '2px solid transparent', marginBottom: '-2px', fontFamily: 'inherit' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            {/* Stage Counts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {stageCounts.map(s => (
                <div key={s.key} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{s.count}</p>
                  <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Agent Table */}
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
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1A1814', fontSize: '13px' }}>{agent.full_name}</td>
                        <td style={{ padding: '12px 16px', color: '#C9A96E', fontFamily: 'monospace', fontSize: '12px' }}>{agent.xfg_id}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: '#F5EDD9', color: '#8B6A2E', textTransform: 'capitalize' }}>
                            {agent.current_stage?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '13px' }}>{agent.state || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '13px', textTransform: 'capitalize' }}>{agent.agent_model || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                          {agent.is_licensed === 'yes' && <span style={{ color: '#2D6A4F', fontWeight: '600' }}>✓ Yes</span>}
                          {agent.is_licensed === 'no' && <span style={{ color: '#8B2635' }}>✗ No</span>}
                          {!agent.is_licensed && <span style={{ color: '#AAA' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '13px' }}>{agent.npn || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '12px' }}>{agent.created_at ? new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Stage History */}
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
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1A1814', fontSize: '13px' }}>{h.agent_name || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#F5F5F5', color: '#7A7A7A', textTransform: 'capitalize' }}>{h.from_stage?.replace('_', ' ') || '—'}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#F5EDD9', color: '#8B6A2E', textTransform: 'capitalize' }}>{h.to_stage?.replace('_', ' ') || '—'}</span>
                        </td>
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
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
              {[
                { label: 'Ethos Active', value: contractingSummary.ethos_active, color: '#27AE60' },
                { label: 'Americo Form Submitted', value: contractingSummary.americo_form, color: '#C9A96E' },
                { label: 'Americo SureLC Unlocked', value: contractingSummary.americo_unlocked, color: '#27AE60' },
                { label: 'Mutual of Omaha Requested', value: contractingSummary.mutual_requested, color: '#5B21B6' },
                { label: 'Mutual of Omaha Unlocked', value: contractingSummary.mutual_unlocked, color: '#27AE60' },
              ].map(card => (
                <div key={card.label} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '16px 20px' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: card.color, marginBottom: '4px' }}>{card.value}</div>
                  <div style={{ fontSize: '11px', color: '#7A7A7A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1.4 }}>{card.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={contractingSearch}
                onChange={e => setContractingSearch(e.target.value)}
                placeholder="Search agents..."
                style={{ padding: '10px 16px', fontSize: '13px', border: '1px solid #DDD9D2', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF', width: '300px' }}
              />
              {contractingFilter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', backgroundColor: '#FFFBF0', border: '1px solid #C9A96E', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#92400E', fontWeight: '600' }}>
                    Filtering by: {contractingFilter.replace('_', ' ')}
                  </span>
                  <button onClick={() => setContractingFilter(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A96E', fontSize: '16px', padding: 0, lineHeight: 1 }}>×</button>
                </div>
              )}
            </div>

            {/* Contracting Table */}
            <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #EBE8E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: '#1A1814', fontSize: '16px', fontWeight: '700' }}>Agent Contracting Status</h2>
                <span style={{ fontSize: '12px', color: '#888' }}>{filteredContracting.length} active agents</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1200px' }}>
                  <thead>
                    <tr style={{ background: '#F9F7F4' }}>
                      {[
                        { label: 'Agent', filter: null },
                        { label: 'Ethos', filter: 'ethos' },
                        { label: 'Americo Form', filter: 'americo_form' },
                        { label: 'Americo SureLC', filter: 'americo_surelc' },
                        { label: 'Mutual of Omaha', filter: 'mutual_requested' },
                        { label: 'Aflac', filter: 'aflac' },
                        { label: 'Transamerica', filter: 'transamerica' },
                        { label: 'UHL', filter: 'uhl' },
                        { label: 'AHL', filter: 'ahl' },
                        { label: 'Last Updated', filter: null },
                      ].map(h => (
                        <th
                          key={h.label}
                          onClick={() => h.filter && setContractingFilter(contractingFilter === h.filter ? null : h.filter)}
                          style={{
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontSize: '10px',
                            fontWeight: '700',
                            color: contractingFilter === h.filter ? '#C9A96E' : '#7A7A7A',
                            textTransform: 'uppercase',
                            letterSpacing: '0.07em',
                            borderBottom: contractingFilter === h.filter ? '2px solid #C9A96E' : '1px solid #E5E1DA',
                            whiteSpace: 'nowrap',
                            cursor: h.filter ? 'pointer' : 'default',
                            userSelect: 'none',
                            backgroundColor: contractingFilter === h.filter ? '#FFFBF0' : 'transparent',
                          }}
                        >
                          {h.label} {h.filter ? (contractingFilter === h.filter ? '▼' : '↕') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracting.map((agent, i) => (
                      <tr key={agent.id} style={{ borderBottom: i < filteredContracting.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1A1814', fontSize: '13px', whiteSpace: 'nowrap' }}>{agent.full_name}</td>
                        <td style={{ padding: '12px 14px' }}><Badge status={getStatusBadge(getCarrierStatus(agent, 'Ethos'))} /></td>
                        <td style={{ padding: '12px 14px' }}><Badge status={getAmericoStatus(agent)} /></td>
                        <td style={{ padding: '12px 14px' }}>
                          <Badge status={
                            agent.americo_surelc_unlocked
                              ? { label: '🔓 Unlocked', bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7' }
                              : agent.americo_form_submitted
                              ? { label: '⏳ Pending Unlock', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' }
                              : { label: '—', bg: '#F5F5F5', color: '#AAA', border: '#E5E1DA' }
                          } />
                        </td>
                        <td style={{ padding: '12px 14px' }}><Badge status={getMutualOmahaStatus(agent)} /></td>
                        <td style={{ padding: '12px 14px' }}><Badge status={getStatusBadge(getCarrierStatus(agent, 'Aflac'))} /></td>
                        <td style={{ padding: '12px 14px' }}><Badge status={getStatusBadge(getCarrierStatus(agent, 'Transamerica'))} /></td>
                        <td style={{ padding: '12px 14px' }}><Badge status={getStatusBadge(getCarrierStatus(agent, 'UHL (United Home Life)'))} /></td>
                        <td style={{ padding: '12px 14px' }}><Badge status={getStatusBadge(getCarrierStatus(agent, 'AHL (American Home Life)'))} /></td>
                        <td style={{ padding: '12px 14px', color: '#AAA', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {agent.updated_at ? new Date(agent.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
