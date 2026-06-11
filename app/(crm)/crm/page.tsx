'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { POLICY_STATUSES } from '@/app/crm-constants'

export default function CRMDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [, setAgentId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    ytdPremium: 0,
    mtdPremium: 0,
    totalClients: 0,
    activePolicies: 0,
    mtdPolicies: 0,
    totalPolicies: 0,
    monthlyGoal: 5000,
    chargebackCount: 0,
    chargebackPremium: 0,
    persistencyRate: 100,
    atRiskCount: 0,
  })
  const [carrierMix, setCarrierMix] = useState<{ carrier: string; count: number; premium: number }[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; premium: number; count: number }[]>([])
  const [followUpsToday, setFollowUpsToday] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase
        .from('users').select('id, full_name, role').eq('id', user.id).single()

      const adminRoles = ['superadmin', 'executive']
      const admin = adminRoles.includes(userRecord?.role ?? '')
      setIsAdmin(admin)

      const { data: agentRecord } = await supabase
        .from('agents').select('id, full_name').eq('user_id', user.id).single()

      const aid = agentRecord?.id ?? null
      setAgentId(aid)

      const displayName = agentRecord?.full_name ?? userRecord?.full_name ?? ''
      setFirstName(displayName.split(' ')[0])

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

      // Fetch all policies for this agent
      const { data: policies } = await supabase
        .from('crm_policies')
        .select('id, status, annual_premium, monthly_premium, date_written, carrier, product_type, created_at, crm_clients(first_name, last_name)')
        .eq('agent_id', aid)
        .order('created_at', { ascending: false })

      const allPolicies = policies ?? []
      const activePols = allPolicies.filter(p => ['active', 'issued', 'approved'].includes(p.status))
      const mtdPols = allPolicies.filter(p => p.date_written >= startOfMonth)
      const ytdPols = allPolicies.filter(p => p.date_written >= startOfYear)

      const mtdPremium = mtdPols.reduce((s, p) => s + (Number(p.annual_premium) || 0), 0)
      const ytdPremium = ytdPols.reduce((s, p) => s + (Number(p.annual_premium) || 0), 0)

      // Fetch client count
      const { data: clients } = await supabase
        .from('crm_clients').select('id').eq('agent_id', aid)

      const now2 = new Date()
      const nineMonthsAgo = new Date(now2.getFullYear(), now2.getMonth() - 9, now2.getDate()).toISOString().split('T')[0]
      const chargebacks = allPolicies.filter(p => p.status === 'chargeback')
      const cbPremium = chargebacks.reduce((s, p) => s + (Number(p.annual_premium) || 0), 0)
      const olderThan9 = allPolicies.filter(p => p.date_written < nineMonthsAgo && ['active','cancelled','lapsed','chargeback'].includes(p.status))
      const stillActive = olderThan9.filter(p => p.status === 'active')
      const persistency = olderThan9.length > 0 ? Math.round((stillActive.length / olderThan9.length) * 100) : 100
      const atRisk = allPolicies.filter(p => p.status === 'active' && p.date_written >= nineMonthsAgo)

      setStats({
        ytdPremium,
        mtdPremium,
        totalClients: clients?.length ?? 0,
        activePolicies: activePols.length,
        mtdPolicies: mtdPols.length,
        totalPolicies: allPolicies.length,
        monthlyGoal: 12000,
        chargebackCount: chargebacks.length,
        chargebackPremium: cbPremium,
        persistencyRate: persistency,
        atRiskCount: atRisk.length,
      })

      // Carrier Mix
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

      // Monthly Trend — last 6 months
      const trend: { month: string; premium: number; count: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = d.toISOString().split('T')[0]
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
        const monthPols = allPolicies.filter(p => p.date_written >= monthStart && p.date_written <= monthEnd)
        trend.push({
          month: d.toLocaleDateString('en-US', { month: 'short' }),
          premium: monthPols.reduce((s, p) => s + (Number(p.annual_premium) || 0), 0),
          count: monthPols.length,
        })
      }
      setMonthlyTrend(trend)

      // Recent Activity — last 5 policies
      setRecentActivity(allPolicies.slice(0, 5))

      // Follow-ups due today or overdue
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: followUps } = await supabase
        .from('crm_notes')
        .select('id, follow_up_date, content, note_type, crm_clients(id, first_name, last_name, phone)')
        .eq('agent_id', aid)
        .lte('follow_up_date', todayStr)
        .not('follow_up_date', 'is', null)
        .order('follow_up_date', { ascending: true })
        .limit(10)

      setFollowUpsToday(followUps ?? [])

      setLoading(false)
    }
    load()
  }, [router])

  function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
  }

  const goalPct = Math.min(Math.round((stats.mtdPremium / stats.monthlyGoal) * 100), 100)
  const circumference = 2 * Math.PI * 40
  const strokeDash = (goalPct / 100) * circumference

  const maxTrendPremium = Math.max(...monthlyTrend.map(m => m.premium), 1)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px', letterSpacing: '-0.02em' }}>
            Good {getGreeting()}, {firstName} 👋
          </h1>
          <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/crm/clients/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#C9A96E', color: '#1A1A1A', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>
            + Add Client
          </Link>
          {isAdmin && (
            <Link href="/crm/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>
              Agent Overview →
            </Link>
          )}
        </div>
      </div>

      {/* Top Row — YTD Goal Ring + KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* YTD Production + Goal Ring */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>MTD Goal</p>
          <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '16px' }}>
            <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#F0EDE8" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={goalPct >= 100 ? '#27AE60' : '#C9A96E'}
                strokeWidth="8"
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A', lineHeight: 1 }}>{goalPct}%</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em' }}>
              ${stats.mtdPremium.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#7A7A7A', marginTop: '2px' }}>
              of ${stats.monthlyGoal.toLocaleString()} goal
            </div>
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F0EDE8', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#9C27B0' }}>
              ${stats.ytdPremium.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#7A7A7A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>YTD Premium</div>
          </div>
        </div>

        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: '1fr 1fr', gap: '16px' }}>
          {[
            { label: 'Total Clients', value: stats.totalClients, color: '#C9A96E', icon: '◈' },
            { label: 'Active Policies', value: stats.activePolicies, color: '#27AE60', icon: '◉' },
            { label: 'Persistency', value: `${stats.persistencyRate}%`, color: stats.persistencyRate >= 80 ? '#27AE60' : stats.persistencyRate >= 60 ? '#FF9800' : '#E53935', icon: '◎' },
            { label: 'At Risk', value: stats.atRiskCount, color: '#FF9800', icon: '◇' },
            { label: 'Chargebacks', value: stats.chargebackCount, color: '#9C27B0', icon: '⚠' },
            { label: 'CB Premium', value: `$${stats.chargebackPremium.toLocaleString()}`, color: '#E53935', icon: '$' },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px 18px', border: '1px solid #E5E1DA' }}>
              <div style={{ fontSize: '18px', color: card.color, marginBottom: '6px' }}>{card.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '3px' }}>{card.value}</div>
              <div style={{ fontSize: '11px', color: '#7A7A7A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{card.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Second Row — Revenue Trend + Carrier Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Revenue Trend */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', marginBottom: '2px' }}>Revenue Trend</p>
            <p style={{ fontSize: '12px', color: '#7A7A7A' }}>Monthly production — last 6 months</p>
          </div>
          {monthlyTrend.some(m => m.premium > 0) ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px', marginBottom: '8px' }}>
                {monthlyTrend.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#7A7A7A', fontWeight: '600' }}>
                      {m.count > 0 ? m.count : ''}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        backgroundColor: i === monthlyTrend.length - 1 ? '#C9A96E' : '#E5E1DA',
                        borderRadius: '4px 4px 0 0',
                        height: `${Math.max((m.premium / maxTrendPremium) * 80, m.premium > 0 ? 4 : 0)}px`,
                        transition: 'height 0.3s ease',
                        minHeight: m.premium > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {monthlyTrend.map((m, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: '#7A7A7A', fontWeight: '600' }}>
                    {m.month}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F0EDE8', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#C9A96E' }}>${stats.ytdPremium.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: '#7A7A7A' }}>YTD Total</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>{stats.mtdPolicies} deals</div>
                  <div style={{ fontSize: '11px', color: '#7A7A7A' }}>This month</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '13px', color: '#7A7A7A' }}>No production recorded yet</p>
              <Link href="/crm/clients/new" style={{ fontSize: '12px', color: '#C9A96E', fontWeight: '600', textDecoration: 'none' }}>Add a policy to see trends →</Link>
            </div>
          )}
        </div>

        {/* Carrier Mix */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', marginBottom: '2px' }}>Carrier Mix</p>
            <p style={{ fontSize: '12px', color: '#7A7A7A' }}>Active policies by carrier</p>
          </div>
          {carrierMix.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {carrierMix.map((c, i) => {
                const maxCount = carrierMix[0].count
                const pct = Math.round((c.count / maxCount) * 100)
                const colors = ['#C9A96E', '#2196F3', '#27AE60', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4']
                return (
                  <div key={c.carrier}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>{c.carrier}</span>
                      <span style={{ fontSize: '12px', color: '#7A7A7A' }}>{c.count} polic{c.count !== 1 ? 'ies' : 'y'} · ${c.premium.toLocaleString()}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#F0EDE8', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: colors[i % colors.length], borderRadius: '3px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px' }}>
              <p style={{ fontSize: '13px', color: '#7A7A7A' }}>No active policies yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Follow-ups Due */}
      {followUpsToday.length > 0 && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #FDE68A', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFBEB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🔔</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#92400E' }}>
                  {followUpsToday.length} Follow-up{followUpsToday.length !== 1 ? 's' : ''} Due
                </p>
                <p style={{ fontSize: '12px', color: '#B45309' }}>These clients are waiting to hear from you</p>
              </div>
            </div>
            <Link href="/crm/activity" style={{ fontSize: '12px', color: '#92400E', textDecoration: 'none', fontWeight: '600' }}>
              View all →
            </Link>
          </div>
          <div>
            {followUpsToday.map((item, i) => {
              const client = item.crm_clients
              const isOverdue = item.follow_up_date < new Date().toISOString().split('T')[0]
              return (
                <div key={item.id} style={{ padding: '12px 20px', borderBottom: i < followUpsToday.length - 1 ? '1px solid #FEF3C7' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {client && (
                      <Link href={`/crm/clients/${client.id}`} style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A', textDecoration: 'none', display: 'block', marginBottom: '2px' }}>
                        {client.first_name} {client.last_name}
                      </Link>
                    )}
                    <p style={{ fontSize: '12px', color: '#7A7A7A', margin: 0 }}>{item.content}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                    {client?.phone && (
                      <a href={`tel:${client.phone}`} style={{ display: 'inline-block', padding: '5px 12px', backgroundColor: '#C9A96E', color: '#1A1A1A', borderRadius: '6px', fontSize: '12px', fontWeight: '700', textDecoration: 'none', marginBottom: '4px' }}>
                        📞 Call
                      </a>
                    )}
                    <div style={{ fontSize: '11px', color: isOverdue ? '#E53935' : '#F57F17', fontWeight: '600', marginTop: '3px' }}>
                      {isOverdue ? '⚠ Overdue' : '📅 Today'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Third Row — Recent Activity */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E1DA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', marginBottom: '2px' }}>Recent Activity</p>
            <p style={{ fontSize: '12px', color: '#7A7A7A' }}>Latest policy updates</p>
          </div>
          <Link href="/crm/book" style={{ fontSize: '12px', color: '#C9A96E', textDecoration: 'none', fontWeight: '600' }}>View all →</Link>
        </div>
        {recentActivity.length > 0 ? (
          <div>
            {recentActivity.map((policy, i) => {
              const statusInfo = POLICY_STATUSES.find(s => s.value === policy.status)
              const client = policy.crm_clients
              return (
                <div key={policy.id} style={{ padding: '14px 20px', borderBottom: i < recentActivity.length - 1 ? '1px solid #F0EDE8' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: `${statusInfo?.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: statusInfo?.color ?? '#888', flexShrink: 0 }}>
                      ◆
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>
                        {client ? `${client.first_name} ${client.last_name}` : 'Unknown Client'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7A7A7A', marginTop: '1px' }}>
                        {policy.carrier} · {policy.product_type}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: `${statusInfo?.color}18`, color: statusInfo?.color ?? '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {statusInfo?.label ?? policy.status}
                    </span>
                    <div style={{ fontSize: '11px', color: '#AAA', marginTop: '3px' }}>
                      {policy.date_written ? new Date(policy.date_written).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#7A7A7A' }}>No recent activity</p>
            <p style={{ fontSize: '12px', color: '#AAA', marginTop: '4px' }}>Policy updates will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}
