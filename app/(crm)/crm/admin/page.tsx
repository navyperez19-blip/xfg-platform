import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { POLICY_STATUSES } from '@/app/crm-constants'

export default async function AdminOverviewPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: userRecord } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', session!.user.id)
    .single()

  const adminRoles = ['superadmin', 'executive']
  if (!adminRoles.includes(userRecord?.role ?? '')) redirect('/crm')

  const { data: agentsWithData } = await supabase
    .from('agents')
    .select(`
      id, full_name, agent_model, current_stage,
      crm_clients (
        id,
        crm_policies (
          id, status, annual_premium, monthly_premium, date_written
        )
      )
    `)
    .eq('current_stage', 'active')
    .order('full_name')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0]

  let orgTotalClients = 0
  let orgTotalPolicies = 0
  let orgMtdPremium = 0
  let orgTotalPremium = 0

  const agentStats = (agentsWithData ?? []).map(agent => {
    const clients = (agent as any).crm_clients ?? []
    const allPolicies = clients.flatMap((c: any) => c.crm_policies ?? [])
    const activePolicies = allPolicies.filter((p: any) =>
      ['active', 'issued', 'approved'].includes(p.status)
    )
    const mtdPolicies = allPolicies.filter((p: any) =>
      p.date_written >= startOfMonth
    )
    const mtdPremium = mtdPolicies.reduce((s: number, p: any) =>
      s + (Number(p.annual_premium) || 0), 0
    )
    const totalPremium = activePolicies.reduce((s: number, p: any) =>
      s + (Number(p.annual_premium) || 0), 0
    )

    orgTotalClients += clients.length
    orgTotalPolicies += activePolicies.length
    orgMtdPremium += mtdPremium
    orgTotalPremium += totalPremium

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

  agentStats.sort((a, b) => b.mtdPremium - a.mtdPremium)

  const statCards = [
    { label: 'Active Agents', value: agentStats.length, color: '#C9A96E', icon: '◉' },
    { label: 'Total Clients', value: orgTotalClients, color: '#2196F3', icon: '◈' },
    { label: 'Active Policies', value: orgTotalPolicies, color: '#27AE60', icon: '◆' },
    {
      label: 'MTD Premium',
      value: `$${orgMtdPremium.toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
      color: '#9C27B0',
      icon: '$',
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontSize: '24px', fontWeight: '700', color: '#1A1A1A',
          letterSpacing: '-0.02em', marginBottom: '4px',
        }}>
          Agent Production Overview
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
          All active agents · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Org KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {statCards.map(card => (
          <div key={card.label} style={{
            backgroundColor: '#FFFFFF', borderRadius: '12px',
            padding: '20px', border: '1px solid #E5E1DA',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: '20px', color: card.color, marginBottom: '8px' }}>
              {card.icon}
            </div>
            <div style={{
              fontSize: '28px', fontWeight: '700', color: '#1A1A1A',
              letterSpacing: '-0.02em', marginBottom: '4px',
            }}>
              {card.value}
            </div>
            <div style={{
              fontSize: '11px', color: '#7A7A7A', fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Agent Leaderboard */}
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: '12px',
        border: '1px solid #E5E1DA', overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #E5E1DA',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>
            Agent Leaderboard — MTD Production
          </h2>
          <span style={{ fontSize: '12px', color: '#888' }}>Sorted by MTD premium</span>
        </div>

        {agentStats.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9F7F4' }}>
                {['Rank', 'Agent', 'Model', 'Clients', 'Total Policies', 'Active Policies', 'MTD Policies', 'MTD Premium', 'Total Premium'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: '11px',
                    fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase',
                    letterSpacing: '0.07em', borderBottom: '1px solid #E5E1DA', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentStats.map((agent, i) => (
                <tr key={agent.id} style={{
                  borderBottom: i < agentStats.length - 1 ? '1px solid #F0EDE8' : 'none',
                }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '26px', height: '26px', borderRadius: '50%',
                      fontSize: '12px', fontWeight: '700',
                      backgroundColor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#F0EDE8',
                      color: i < 3 ? '#1A1A1A' : '#7A7A7A',
                    }}>
                      {i + 1}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1A1A1A' }}>
                      {agent.full_name}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                      fontSize: '11px', fontWeight: '600', textTransform: 'capitalize',
                      backgroundColor: agent.agent_model === 'independent' ? '#EDE9FE' : '#FEF3C7',
                      color: agent.agent_model === 'independent' ? '#5B21B6' : '#92400E',
                    }}>
                      {agent.agent_model}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>
                    {agent.clientCount}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: '600', color: '#1A1A1A' }}>
                    {agent.totalPolicyCount}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: '600', color: '#27AE60' }}>
                    {agent.activePolicyCount}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: '600', color: '#2196F3' }}>
                    {agent.mtdPoliciesCount}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '15px', fontWeight: '700',
                      color: agent.mtdPremium > 0 ? '#9C27B0' : '#CCC',
                    }}>
                      ${agent.mtdPremium.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '14px', fontWeight: '600',
                      color: agent.totalPremium > 0 ? '#1A1A1A' : '#CCC',
                    }}>
                      ${agent.totalPremium.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', color: '#7A7A7A' }}>
              No active agents in the CRM yet.
            </p>
            <p style={{ fontSize: '13px', color: '#AAA', marginTop: '4px' }}>
              Agents will appear here automatically when they reach Active status in the pipeline.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
