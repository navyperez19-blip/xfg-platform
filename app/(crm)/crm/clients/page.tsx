'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { POLICY_STATUSES } from '@/app/crm-constants'

export default function ClientsListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .single()

      const adminRoles = ['superadmin', 'executive']
      const admin = adminRoles.includes(userRecord?.role ?? '')
      setIsAdmin(admin)

      const { data: agentRecord } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!agentRecord?.id) {
        setClients([])
        setLoading(false)
        return
      }

      const aid = agentRecord.id

      let query = supabase
        .from('crm_clients')
        .select(`
          id, first_name, last_name, email, phone,
          state, health_status, tobacco_user, created_at,
          crm_policies (
            id, carrier, product_type, status,
            monthly_premium, annual_premium, date_written
          ),
          agents!crm_clients_agent_id_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      query = query.eq('agent_id', aid)

      const { data } = await query
      setClients(data ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  const filtered = clients.filter(c => {
    const nameMatch = !search ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    const latestPolicy = c.crm_policies?.[0]
    const statusMatch = !statusFilter || latestPolicy?.status === statusFilter
    return nameMatch && statusMatch
  })

  const totalPremium = filtered.reduce((sum, c) => {
    const p = c.crm_policies?.[0]
    return sum + (Number(p?.annual_premium) || 0)
  }, 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            {isAdmin ? 'All Clients' : 'My Clients'}
          </h1>
          <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
            {filtered.length} client{filtered.length !== 1 ? 's' : ''}
            {totalPremium > 0 && ` · $${totalPremium.toLocaleString()} annual premium`}
          </p>
        </div>
        <Link href="/crm/clients/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#C9A96E', color: '#1A1A1A', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '700' }}>
          + Add Client
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          style={{ flex: 1, padding: '10px 14px', fontSize: '14px', border: '1px solid #E5E1DA', borderRadius: '8px', backgroundColor: '#FFFFFF', outline: 'none', fontFamily: 'inherit' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', fontSize: '14px', border: '1px solid #E5E1DA', borderRadius: '8px', backgroundColor: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <option value="">All Statuses</option>
          {POLICY_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter('') }} style={{ padding: '10px 16px', backgroundColor: '#FFFFFF', color: '#7A7A7A', border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
        {filtered.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9F7F4' }}>
                {['Client Name', ...(isAdmin ? ['Agent'] : []), 'Location', 'Health', 'Carrier', 'Product', 'Premium', 'Status', 'Date Written', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #E5E1DA', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => {
                const latestPolicy = client.crm_policies?.[0]
                const agentData = client.agents
                const statusInfo = POLICY_STATUSES.find(s => s.value === latestPolicy?.status)
                const isLast = i === filtered.length - 1
                return (
                  <tr key={client.id} style={{ borderBottom: !isLast ? '1px solid #F0EDE8' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/crm/clients/${client.id}`} style={{ fontWeight: '600', fontSize: '14px', color: '#1A1A1A', textDecoration: 'none', display: 'block' }}>
                        {client.first_name} {client.last_name}
                      </Link>
                      {client.phone && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{client.phone}</div>}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>{agentData?.full_name ?? '—'}</td>
                    )}
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>{client.state || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {client.health_status ? (
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', backgroundColor: client.health_status === 'excellent' ? '#E8F5E9' : client.health_status === 'good' ? '#FFF8E1' : client.health_status === 'fair' ? '#FFF3E0' : '#FFEBEE', color: client.health_status === 'excellent' ? '#2E7D32' : client.health_status === 'good' ? '#F57F17' : client.health_status === 'fair' ? '#E65100' : '#C62828', textTransform: 'capitalize' }}>
                          {client.health_status}{client.tobacco_user ? ' · 🚬' : ''}
                        </span>
                      ) : <span style={{ color: '#CCC', fontSize: '12px' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>{latestPolicy?.carrier ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>{latestPolicy?.product_type ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>
                      {latestPolicy?.annual_premium ? `$${Number(latestPolicy.annual_premium).toLocaleString()}/yr` : latestPolicy?.monthly_premium ? `$${Number(latestPolicy.monthly_premium).toLocaleString()}/mo` : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {latestPolicy ? (
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: `${statusInfo?.color}18`, color: statusInfo?.color ?? '#888', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                          {statusInfo?.label ?? latestPolicy.status}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', color: '#BBB', backgroundColor: '#F5F5F5' }}>No Policy</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#888' }}>
                      {latestPolicy?.date_written ? new Date(latestPolicy.date_written).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/crm/clients/${client.id}`} style={{ fontSize: '12px', color: '#C9A96E', textDecoration: 'none', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>◈</div>
            <p style={{ fontSize: '15px', color: '#7A7A7A', fontWeight: '500', marginBottom: '4px' }}>
              {search || statusFilter ? 'No clients match your search' : 'No clients yet'}
            </p>
            {!search && !statusFilter && (
              <Link href="/crm/clients/new" style={{ display: 'inline-block', marginTop: '16px', padding: '10px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                Add First Client
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
