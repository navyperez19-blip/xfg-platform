'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

const ACTIVITY_TYPES = [
  { value: 'call',      label: 'Phone Call',   icon: '📞', color: '#2196F3' },
  { value: 'text',      label: 'Text',         icon: '💬', color: '#27AE60' },
  { value: 'email',     label: 'Email',        icon: '✉️', color: '#C9A96E' },
  { value: 'meeting',   label: 'Meeting',      icon: '🤝', color: '#9C27B0' },
  { value: 'follow_up', label: 'Follow Up',    icon: '🔔', color: '#FF9800' },
  { value: 'note',      label: 'Note',         icon: '📝', color: '#7A7A7A' },
]

export default function ActivityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterFollowUp, setFilterFollowUp] = useState(false)
  const [search, setSearch] = useState('')

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

      let query = supabase
        .from('crm_notes')
        .select(`
          id, note_type, content, follow_up_date, created_at,
          agents!crm_notes_agent_id_fkey(full_name),
          crm_clients(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!admin) query = query.eq('agent_id', aid)

      const { data } = await query
      setActivities(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  const today = new Date().toISOString().split('T')[0]

  const filtered = activities.filter(a => {
    const client = a.crm_clients
    const nameMatch = !search ||
      `${client?.first_name} ${client?.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      a.content?.toLowerCase().includes(search.toLowerCase())
    const typeMatch = !filterType || a.note_type === filterType
    const followUpMatch = !filterFollowUp || (a.follow_up_date && a.follow_up_date >= today)
    return nameMatch && typeMatch && followUpMatch
  })

  const overdueFollowUps = activities.filter(a => a.follow_up_date && a.follow_up_date < today)
  const upcomingFollowUps = activities.filter(a => a.follow_up_date && a.follow_up_date >= today)

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
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Activity Log
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
          All logged interactions across your clients
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Total Activities', value: activities.length, color: '#C9A96E' },
          { label: 'Overdue Follow-ups', value: overdueFollowUps.length, color: overdueFollowUps.length > 0 ? '#E53935' : '#27AE60' },
          { label: 'Upcoming Follow-ups', value: upcomingFollowUps.length, color: '#FF9800' },
          { label: 'This Week', value: activities.filter(a => {
            const d = new Date(a.created_at)
            const now = new Date()
            const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
            return d >= weekAgo
          }).length, color: '#2196F3' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px 20px', border: '1px solid #E5E1DA' }}>
            <div style={{ fontSize: '26px', fontWeight: '700', color: card.color, marginBottom: '4px', letterSpacing: '-0.02em' }}>{card.value}</div>
            <div style={{ fontSize: '11px', color: '#7A7A7A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Overdue Follow-ups Alert */}
      {overdueFollowUps.length > 0 && (
        <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#92400E', marginBottom: '2px' }}>
              {overdueFollowUps.length} overdue follow-up{overdueFollowUps.length !== 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: '12px', color: '#92400E' }}>
              These clients were due for a follow-up and haven't been contacted yet.
            </p>
          </div>
          <button
            onClick={() => setFilterFollowUp(true)}
            style={{ marginLeft: 'auto', padding: '6px 14px', backgroundColor: '#92400E', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            View All
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by client name or note content..."
          style={{ flex: 1, minWidth: '200px', padding: '9px 14px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF' }}
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{ padding: '9px 14px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
        >
          <option value="">All Types</option>
          {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>
        <button
          onClick={() => setFilterFollowUp(!filterFollowUp)}
          style={{ padding: '9px 16px', backgroundColor: filterFollowUp ? '#FF9800' : '#FFFFFF', color: filterFollowUp ? '#FFFFFF' : '#4A4A4A', border: `1px solid ${filterFollowUp ? '#FF9800' : '#E5E1DA'}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          🔔 Follow-ups Only
        </button>
        {(search || filterType || filterFollowUp) && (
          <button
            onClick={() => { setSearch(''); setFilterType(''); setFilterFollowUp(false) }}
            style={{ padding: '9px 16px', backgroundColor: '#FFFFFF', color: '#7A7A7A', border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Activity List */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
        {filtered.length > 0 ? (
          <div>
            {filtered.map((activity, i) => {
              const config = ACTIVITY_TYPES.find(t => t.value === activity.note_type) ?? ACTIVITY_TYPES[5]
              const client = activity.crm_clients
              const isOverdue = activity.follow_up_date && activity.follow_up_date < today
              const isUpcoming = activity.follow_up_date && activity.follow_up_date >= today
              return (
                <div key={activity.id} style={{ padding: '16px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #F0EDE8' : 'none', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: `${config.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    {config.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: config.color }}>{config.label}</span>
                        {client && (
                          <>
                            <span style={{ fontSize: '12px', color: '#CCC' }}>·</span>
                            <Link href={`/crm/clients/${client.id}`} style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', textDecoration: 'none' }}>
                              {client.first_name} {client.last_name}
                            </Link>
                          </>
                        )}
                        {isAdmin && activity.agents?.full_name && (
                          <span style={{ fontSize: '11px', color: '#AAA' }}>by {activity.agents.full_name}</span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#AAA', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                        {new Date(activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4A4A4A', lineHeight: 1.5, margin: 0, marginBottom: activity.follow_up_date ? '6px' : 0 }}>
                      {activity.content}
                    </p>
                    {activity.follow_up_date && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', backgroundColor: isOverdue ? '#FEE2E2' : '#FFF8E1', border: `1px solid ${isOverdue ? '#FECACA' : '#FFE082'}`, borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: isOverdue ? '#C0392B' : '#F57F17' }}>
                        {isOverdue ? '⚠ Overdue:' : '🔔 Follow up:'} {new Date(activity.follow_up_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>📝</div>
            <p style={{ fontSize: '15px', color: '#7A7A7A', fontWeight: '500', marginBottom: '4px' }}>
              {search || filterType || filterFollowUp ? 'No activities match your filters' : 'No activity logged yet'}
            </p>
            <p style={{ fontSize: '13px', color: '#AAA' }}>
              Log calls, texts, and notes on your client profiles to see them here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
