import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { POLICY_STATUSES } from '@/app/crm-constants'

export default async function CRMDashboard() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  const { data: userRecord } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('id', session!.user.id)
    .single()

  const adminRoles = ['superadmin', 'executive']
  const isAdmin = adminRoles.includes(userRecord?.role ?? '')

  const { data: agentRecord } = await supabase
    .from('agents')
    .select('id, full_name')
    .eq('user_id', session!.user.id)
    .single()

  const agentId = agentRecord?.id
  const displayName = agentRecord?.full_name ?? userRecord?.full_name ?? ''
  const firstName = displayName.split(' ')[0]

  // Fetch this agent's clients and policies
  const { data: clients } = await supabase
    .from('crm_clients')
    .select('id')
    .eq('agent_id', agentId)

  const { data: policies } = await supabase
    .from('crm_policies')
    .select('id, status, annual_premium, monthly_premium, date_written')
    .eq('agent_id', agentId)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0]

  const activePolicies = policies?.filter(p =>
    ['active', 'issued', 'approved'].includes(p.status)
  ) ?? []

  const mtdPolicies = policies?.filter(p =>
    p.date_written >= startOfMonth
  ) ?? []

  const mtdPremium = mtdPolicies.reduce((sum, p) =>
    sum + (Number(p.annual_premium) || 0), 0
  )

  // Recent clients
  const { data: recentClients } = await supabase
    .from('crm_clients')
    .select(`
      id, first_name, last_name, state, created_at,
      crm_policies (
        id, carrier, product_type, status,
        monthly_premium, annual_premium
      )
    `)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(5)

  const statCards = [
    { label: 'Total Clients', value: clients?.length ?? 0, icon: '◈', color: '#C9A96E' },
    { label: 'Active Policies', value: activePolicies.length, icon: '◉', color: '#27AE60' },
    { label: 'MTD Policies', value: mtdPolicies.length, icon: '◆', color: '#2196F3' },
    {
      label: 'MTD Premium',
      value: `$${mtdPremium.toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
      icon: '$',
      color: '#9C27B0',
    },
  ]

  function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '26px',
          fontWeight: '700',
          color: '#1A1A1A',
          marginBottom: '4px',
          letterSpacing: '-0.02em',
        }}>
          Good {getGreeting()}, {firstName} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {statCards.map((card) => (
          <div key={card.label} style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E5E1DA',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: '22px', color: card.color, marginBottom: '8px' }}>
              {card.icon}
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1A1A1A',
              letterSpacing: '-0.02em',
              marginBottom: '4px',
            }}>
              {card.value}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#7A7A7A',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <Link href="/crm/clients/new" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          backgroundColor: '#C9A96E',
          color: '#1A1A1A',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '600',
        }}>
          + Add New Client
        </Link>
        <Link href="/crm/clients" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          backgroundColor: '#FFFFFF',
          color: '#1A1A1A',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '600',
          border: '1px solid #E5E1DA',
        }}>
          View All Clients
        </Link>
        {isAdmin && (
          <Link href="/crm/admin" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#1A1A1A',
            color: '#FFFFFF',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600',
          }}>
            Agent Overview →
          </Link>
        )}
      </div>

      {/* Recent Clients Table */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E1DA',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E5E1DA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>
            Recent Clients
          </h2>
          <Link href="/crm/clients" style={{
            fontSize: '12px', color: '#C9A96E', textDecoration: 'none', fontWeight: '600'
          }}>
            View all →
          </Link>
        </div>

        {recentClients && recentClients.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9F7F4' }}>
                {['Client', 'State', 'Carrier', 'Product', 'Premium', 'Status', 'Date Added'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#7A7A7A',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    borderBottom: '1px solid #E5E1DA',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentClients.map((client, i) => {
                const latestPolicy = (client as any).crm_policies?.[0]
                const statusInfo = POLICY_STATUSES.find(s => s.value === latestPolicy?.status)
                return (
                  <tr key={client.id} style={{
                    borderBottom: i < recentClients.length - 1 ? '1px solid #F0EDE8' : 'none',
                  }}>
                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/crm/clients/${client.id}`} style={{
                        fontWeight: '600', fontSize: '14px',
                        color: '#1A1A1A', textDecoration: 'none',
                      }}>
                        {client.first_name} {client.last_name}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>
                      {client.state || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>
                      {latestPolicy?.carrier || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>
                      {latestPolicy?.product_type || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>
                      {latestPolicy?.annual_premium
                        ? `$${Number(latestPolicy.annual_premium).toLocaleString()}/yr`
                        : latestPolicy?.monthly_premium
                        ? `$${Number(latestPolicy.monthly_premium).toLocaleString()}/mo`
                        : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {latestPolicy ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: `${statusInfo?.color}18`,
                          color: statusInfo?.color ?? '#888',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}>
                          {statusInfo?.label ?? latestPolicy.status}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#BBB' }}>No policy</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#7A7A7A' }}>
                      {new Date(client.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>◈</div>
            <p style={{ fontSize: '15px', color: '#7A7A7A', marginBottom: '4px', fontWeight: '500' }}>
              No clients yet
            </p>
            <p style={{ fontSize: '13px', color: '#AAA', marginBottom: '20px' }}>
              Start tracking your book of business
            </p>
            <Link href="/crm/clients/new" style={{
              display: 'inline-block',
              padding: '10px 24px',
              backgroundColor: '#C9A96E',
              color: '#1A1A1A',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '600',
            }}>
              Add Your First Client
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
