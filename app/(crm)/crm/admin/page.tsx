'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

const PAGE_SIZE = 25

export default function AdminOverviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [agentStats, setAgentStats] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [page, setPage] = useState(0)
  const [totalAgents, setTotalAgents] = useState(0)
  const [orgStats, setOrgStats] = useState({
    totalAgents: 0,
    totalClients: 0,
    totalPolicies: 0,
    mtdPremium: 0,
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase
        .from('users').select('id, role').eq('id', user.id).single()

      const adminRoles = ['superadmin', 'executive']
      if (!adminRoles.includes(userRecord?.role ?? '')) {
        router.push('/crm')
        return
      }

      // Get total count of active agents
      const { count } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('current_stage', 'active')

      setTotalAgents(count ?? 0)

      // Get org-wide stats (all agents)
      const { data: allAgents } = await supabase
        .from('agents')
        .select(`
          id,
          crm_clients(id, crm_policies(id, status, annual_premium, date_written))
        `)
        .eq('current_stage', 'active')

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

      let orgTotalClients = 0
      let orgTotalPolicies = 0
      let orgMtdPremium = 0

      ;(allAgents ?? []).forEach(agent => {
        const clients = (agent as any).crm_clients ?? []
        const allPolicies = clients.flatMap((c: any) => c.crm_policies ?? [])
        const activePolicies = allPolicies.filter((p: any) => ['active', 'issued', 'approved'].includes(p.status))
        const mtdPolicies = allPolicies.filter((p: any) => p.date_written >= startOfMonth)
        orgTotalClients += clients.length
        orgTotalPolicies += activePolicies.length
        orgMtdPremium += mtdPolicies.reduce((s: number, p: any) => s + (Number(p.annual_premium) || 0), 0)
      })

      setOrgStats({
        totalAgents: count ?? 0,
        totalClients: orgTotalClients,
        totalPolicies: orgTotalPolicies,
        mtdPremium: orgMtdPremium,
      })

      await loadPage(0, startOfMonth)
      setLoading(false)
    }
    load()
  }, [router])

  async function loadPage(pageNum: number, startOfMonth?: string) {
    const som = startOfMonth ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    const { data: agents } = await supabase
      .from('agents')
      .select(`
        id, full_name, agent_model, current_stage,
        crm_clients(id, crm_policies(id, status, annual_premium, date_written))
      `)
      .eq('current_stage', 'active')
      .order('full_name')
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    const stats = (agents ?? []).map(agent => {
      const clients = (agent as any).crm_clients ?? []
      const allPolicies = clients.flatMap((c: any) => c.crm_policies ?? [])
      const activePolicies = allPolicies.filter((p: any) => ['active', 'issued', 'approved'].includes(p.status))
      const mtdPolicies = allPolicies.filter((p: any) => p.date_written >= som)
      const mtdPremium = mtdPolicies.reduce((s: number, p: any) => s + (Number(p.annual_premium) || 0), 0)
      const totalPremium = activePolicies.reduce((s: number, p: any) => s + (Number(p.annual_premium) || 0), 0)
      return {
        ...agent,
        clientCount: clients.length,
        activePolicyCount: activePolicies.length,
        totalPolicyCount: allPolicies.length,
        mtdPoliciesCount: mtdPolicies.length,
        mtdPremium,
        totalPremium,
      }
    })

    stats.sort((a, b) => b.mtdPremium - a.mtdPremium)
    setAgentStats(stats)
    setPage(pageNum)
  }

  const totalPages = Math.ceil(totalAgents / PAGE_SIZE)

  const statCards = [
    { label: 'Active Agents', value: orgStats.totalAgents, color: '#C9A96E', icon: '◉' },
    { label: 'Total Clients', value: orgStats.totalClients, color: '#2196F3', icon: '◈' },
    { label: 'Active Policies', value: orgStats.totalPolicies, color: '#27AE60', icon: '◆' },
    {
      label: 'MTD Premium',
      value: `$${orgStats.mtdPremium.toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
      color: '#9C27B0',
      icon: '$',
    },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Agent Production Overview
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
          All active agents · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Org KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {statCards.map(card => (
          <div key={card.label} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #E5E1DA', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '20px', color: card.color, marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>{card.value}</div>
            <div style={{ fontSize: '11px', color: '#7A7A7A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Agent Leaderboard */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E1DA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>
            Agent Leaderboard — MTD Production
          </h2>
          <span style={{ fontSize: '12px', color: '#888' }}>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalAgents)} of {totalAgents} agents
          </span>
        </div>

        {agentStats.length > 0 ? (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9F7F4' }}>
                  {['Rank', 'Agent', 'Model', 'Clients', 'Total Policies', 'Active Policies', 'MTD Policies', 'MTD Premium', 'Total Premium', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #E5E1DA', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Search and Filter Bar */}
                <tr>
                  <td colSpan={99} style={{ padding: '12px 16px', borderBottom: '1px solid #E5E1DA' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search agents by name or email..."
                        style={{ flex: 1, minWidth: '200px', padding: '10px 16px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF' }}
                      />
                      <select
                        value={stageFilter}
                        onChange={e => setStageFilter(e.target.value)}
                        style={{ padding: '10px 14px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
                      >
                        <option value="">All Stages</option>
                        <option value="contacted">Contacted</option>
                        <option value="licensing">Licensing</option>
                        <option value="contracting">Contracting</option>
                        <option value="system_setup">System Setup</option>
                        <option value="active">Active</option>
                      </select>
                      <select
                        value={modelFilter}
                        onChange={e => setModelFilter(e.target.value)}
                        style={{ padding: '10px 14px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
                      >
                        <option value="">All Models</option>
                        <option value="supported">Supported</option>
                        <option value="independent">Independent</option>
                      </select>
                      {(search || stageFilter || modelFilter) && (
                        <button
                          onClick={() => { setSearch(''); setStageFilter(''); setModelFilter('') }}
                          style={{ padding: '10px 16px', backgroundColor: '#F5F2ED', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {agentStats
                  .filter(agent => {
                    const nameMatch = !search ||
                      (agent.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
                      (agent.email || '').toLowerCase().includes(search.toLowerCase())
                    const stageMatch = !stageFilter || agent.current_stage === stageFilter
                    const modelMatch = !modelFilter || agent.agent_model === modelFilter
                    return nameMatch && stageMatch && modelMatch
                  })
                  .map((agent, i) => {
                  const globalRank = page * PAGE_SIZE + i + 1
                  return (
                    <tr key={agent.id} style={{ borderBottom: i < agentStats.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', fontSize: '12px', fontWeight: '700', backgroundColor: globalRank === 1 ? '#FFD700' : globalRank === 2 ? '#C0C0C0' : globalRank === 3 ? '#CD7F32' : '#F0EDE8', color: globalRank <= 3 ? '#1A1A1A' : '#7A7A7A' }}>
                          {globalRank}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#1A1A1A' }}>{agent.full_name}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', backgroundColor: agent.agent_model === 'independent' ? '#EDE9FE' : '#FEF3C7', color: agent.agent_model === 'independent' ? '#5B21B6' : '#92400E' }}>
                          {agent.agent_model}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>{agent.clientCount}</td>
                      <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>{agent.totalPolicyCount}</td>
                      <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: '600', color: '#27AE60' }}>{agent.activePolicyCount}</td>
                      <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: '600', color: '#2196F3' }}>{agent.mtdPoliciesCount}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: agent.mtdPremium > 0 ? '#9C27B0' : '#CCC' }}>
                          ${agent.mtdPremium.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: agent.totalPremium > 0 ? '#1A1A1A' : '#CCC' }}>
                          ${agent.totalPremium.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <Link href={`/crm/admin/agents/${agent.id}`} style={{ fontSize: '12px', color: '#C9A96E', textDecoration: 'none', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E1DA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={() => loadPage(page - 1)}
                  disabled={page === 0}
                  style={{ padding: '8px 20px', backgroundColor: '#FFFFFF', color: page === 0 ? '#CCC' : '#1A1A1A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
                >
                  ← Previous
                </button>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => loadPage(i)}
                      style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #E5E1DA', backgroundColor: page === i ? '#C9A96E' : '#FFFFFF', color: page === i ? '#1A1A1A' : '#4A4A4A', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => loadPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  style={{ padding: '8px 20px', backgroundColor: '#FFFFFF', color: page >= totalPages - 1 ? '#CCC' : '#1A1A1A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', color: '#7A7A7A' }}>No active agents yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
