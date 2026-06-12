'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

export default function AlertsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)

  const [chargebacks, setChargebacks] = useState<any[]>([])
  const [lapsed, setLapsed] = useState<any[]>([])
  const [cancelled, setCancelled] = useState<any[]>([])
  const [atRisk, setAtRisk] = useState<any[]>([])

  const [stats, setStats] = useState({
    persistencyRate: 0,
    chargebackCount: 0,
    chargebackPremium: 0,
    atRiskCount: 0,
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase
        .from('users').select('id, role').eq('id', user.id).single()

      const adminRoles = ['superadmin', 'executive']
      const admin = adminRoles.includes(userRecord?.role ?? '')
      setIsAdmin(admin)

      const { data: agentRecord } = await supabase
        .from('agents').select('id').eq('user_id', user.id).single()

      const aid = agentRecord?.id ?? null
      setAgentId(aid)

      // Fetch all policies
      let query = supabase
        .from('crm_policies')
        .select(`
          id, status, carrier, product_type, policy_number,
          annual_premium, monthly_premium, date_written, effective_date,
          crm_clients(id, first_name, last_name, phone, email),
          agents!crm_policies_agent_id_fkey(id, full_name)
        `)
        .order('date_written', { ascending: false })

      if (!admin) {
        query = query.eq('agent_id', aid)
      }
      // Admins see all agents — no filter applied

      const { data: policies } = await query
      const all = policies ?? []

      const now = new Date()
      const nineMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 9, now.getDate()).toISOString().split('T')[0]

      // Chargebacks — status = chargeback
      const cbs = all.filter(p => p.status === 'chargeback')
      setChargebacks(cbs)

      // Lapsed — status = lapsed
      const lps = all.filter(p => p.status === 'lapsed')
      setLapsed(lps)

      // Cancelled — status = cancelled
      const cnc = all.filter(p => p.status === 'cancelled')
      setCancelled(cnc)

      // At Risk — active policies written less than 9 months ago (still in chargeback window)
      const risk = all.filter(p =>
        p.status === 'active' &&
        p.date_written >= nineMonthsAgo
      )
      setAtRisk(risk)

      // Persistency — active policies older than 9 months / total policies older than 9 months
      const olderThan9 = all.filter(p => p.date_written < nineMonthsAgo && ['active', 'cancelled', 'lapsed', 'chargeback'].includes(p.status))
      const stillActive = olderThan9.filter(p => p.status === 'active')
      const persistency = olderThan9.length > 0 ? Math.round((stillActive.length / olderThan9.length) * 100) : 0

      const cbPremium = cbs.reduce((s, p) => s + (Number(p.annual_premium) || 0), 0)

      setStats({
        persistencyRate: persistency,
        chargebackCount: cbs.length,
        chargebackPremium: cbPremium,
        atRiskCount: risk.length,
      })

      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

    function PolicyRow({ policy, showAgent }: { policy: any; showAgent: boolean }) {
      const client = policy.crm_clients
      const agent = policy.agents
      const isChargebackWindow = policy.date_written && (() => {
        const written = new Date(policy.date_written)
        const now = new Date()
        const diffMonths = (now.getFullYear() - written.getFullYear()) * 12 + (now.getMonth() - written.getMonth())
        return diffMonths < 9
      })()

      return (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0EDE8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>
                {client ? (
                  <Link href={`/crm/clients/${client.id}`} style={{ color: '#1A1A1A', textDecoration: 'none' }}>
                    {client.first_name} {client.last_name}
                  </Link>
                ) : 'Unknown Client'}
              </div>
              <div style={{ fontSize: '12px', color: '#7A7A7A', marginTop: '2px' }}>
                {policy.carrier} · {policy.product_type}
                {policy.policy_number && ` · #${policy.policy_number}`}
              </div>
              {showAgent && agent && (
                <div style={{ fontSize: '12px', color: '#C9A96E', fontWeight: '600', marginTop: '2px' }}>
                  Agent: {agent.full_name}
                </div>
              )}
              {client?.phone && (
                <div style={{ fontSize: '12px', color: '#AAA', marginTop: '1px' }}>{client.phone}</div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A' }}>
              {policy.annual_premium ? `$${Number(policy.annual_premium).toLocaleString()}/yr` : policy.monthly_premium ? `$${Number(policy.monthly_premium).toLocaleString()}/mo` : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#AAA', marginTop: '2px' }}>
              Written {policy.date_written ? new Date(policy.date_written).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </div>
            {isChargebackWindow && (
              <div style={{ fontSize: '10px', color: '#9C27B0', fontWeight: '700', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                In chargeback window
              </div>
            )}
          </div>
        </div>
      )
    }

  function Section({ title, subtitle, count, color, children, emptyText }: {
    title: string; subtitle: string; count: number; color: string; children: React.ReactNode; emptyText: string
  }) {
    return (
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '16px 20px', borderBottom: count > 0 ? '1px solid #E5E1DA' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>{title}</p>
            <p style={{ fontSize: '12px', color: '#7A7A7A', marginTop: '1px' }}>{subtitle}</p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '28px', height: '28px', borderRadius: '20px', padding: '0 8px', fontSize: '13px', fontWeight: '700', backgroundColor: count > 0 ? `${color}18` : '#F5F5F5', color: count > 0 ? color : '#CCC' }}>
            {count}
          </span>
        </div>
        {count > 0 ? children : (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#AAA' }}>{emptyText}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Policy Alerts
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
          Chargebacks, cancellations, lapsed policies, and at-risk business
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          {
            label: 'Persistency Rate',
            value: `${stats.persistencyRate}%`,
            subtitle: 'Policies active after 9 months',
            color: stats.persistencyRate >= 80 ? '#27AE60' : stats.persistencyRate >= 60 ? '#FF9800' : '#E53935',
          },
          {
            label: 'Chargebacks',
            value: stats.chargebackCount,
            subtitle: `$${stats.chargebackPremium.toLocaleString()} lost premium`,
            color: '#9C27B0',
          },
          {
            label: 'At Risk',
            value: stats.atRiskCount,
            subtitle: 'Active — in chargeback window',
            color: '#FF9800',
          },
          {
            label: 'Lapsed',
            value: lapsed.length,
            subtitle: 'Stopped paying — needs follow-up',
            color: '#E53935',
          },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px 20px', border: '1px solid #E5E1DA' }}>
            <div style={{ fontSize: '26px', fontWeight: '700', color: card.color, marginBottom: '4px', letterSpacing: '-0.02em' }}>{card.value}</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#1A1A1A', marginBottom: '2px' }}>{card.label}</div>
            <div style={{ fontSize: '11px', color: '#7A7A7A' }}>{card.subtitle}</div>
          </div>
        ))}
      </div>

      {/* At Risk Section */}
      <Section
        title="At Risk — Chargeback Window"
        subtitle="Active policies written less than 9 months ago — monitor closely"
        count={atRisk.length}
        color="#FF9800"
        emptyText="No active policies in the chargeback window"
      >
        {atRisk.map(p => <PolicyRow key={p.id} policy={p} showAgent={isAdmin} />)}
      </Section>

      {/* Chargebacks Section */}
      <Section
        title="Chargebacks"
        subtitle="Policies cancelled within the 9-month commission window"
        count={chargebacks.length}
        color="#9C27B0"
        emptyText="No chargebacks — great retention!"
      >
        {chargebacks.map(p => <PolicyRow key={p.id} policy={p} showAgent={isAdmin} />)}
      </Section>

      {/* Lapsed Section */}
      <Section
        title="Lapsed Policies"
        subtitle="Client stopped paying — follow up to save the policy"
        count={lapsed.length}
        color="#E53935"
        emptyText="No lapsed policies"
      >
        {lapsed.map(p => <PolicyRow key={p.id} policy={p} showAgent={isAdmin} />)}
      </Section>

      {/* Cancelled Section */}
      <Section
        title="Cancelled Policies"
        subtitle="Formally cancelled — no longer in force"
        count={cancelled.length}
        color="#B71C1C"
        emptyText="No cancelled policies"
      >
        {cancelled.map(p => <PolicyRow key={p.id} policy={p} showAgent={isAdmin} />)}
      </Section>
    </div>
  )
}
