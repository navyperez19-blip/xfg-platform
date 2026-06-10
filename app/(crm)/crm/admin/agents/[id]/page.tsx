'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { POLICY_STATUSES, CARRIERS } from '@/app/crm-constants'

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
  const [activeTab, setActiveTab] = useState<'clients' | 'policies'>('policies')

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
        .select('id, full_name, email, agent_model, current_stage, created_at, states_licensed, npn')
        .eq('id', agentId)
        .single()

      if (!agentData) { router.push('/crm/admin'); return }
      setAgent(agentData)

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

      setLoading(false)
    }
    load()
  }, [agentId, router])

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
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E1DA' }}>
          {(['policies', 'clients'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '14px 24px',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '13px',
                fontWeight: activeTab === tab ? '700' : '500',
                color: activeTab === tab ? '#1A1A1A' : '#7A7A7A',
                cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid #C9A96E' : '2px solid transparent',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'policies' ? `Policies (${policies.length})` : `Clients (${clients.length})`}
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
      </div>
    </div>
  )
}
