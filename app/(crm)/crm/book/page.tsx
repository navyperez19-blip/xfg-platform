'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { POLICY_STATUSES, CARRIERS } from '@/app/crm-constants'

export default function BookOfBusinessPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [policies, setPolicies] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [viewMode, setViewMode] = useState<'me' | 'downlines'>('me')
  const [agentId, setAgentId] = useState<string | null>(null)

  // Filters
  const [filterCarrier, setFilterCarrier] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterSearch, setFilterSearch] = useState('')

  // Sort
  const [sortField, setSortField] = useState('date_written')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

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

      setAgentId(agentRecord?.id ?? null)

      await fetchPolicies(agentRecord?.id ?? null, admin, 'me')
      setLoading(false)
    }
    load()
  }, [router])

  async function fetchPolicies(aid: string | null, admin: boolean, mode: 'me' | 'downlines') {
    let query = supabase
      .from('crm_policies')
      .select(`
        id, carrier, product_type, policy_number,
        face_amount, monthly_premium, annual_premium,
        date_written, effective_date, status, notes,
        created_at,
        crm_clients (
          id, first_name, last_name, state, date_of_birth
        ),
        agents!crm_policies_agent_id_fkey (
          id, full_name
        )
      `)
      .order('date_written', { ascending: false })

    if (!admin || mode === 'me') {
      query = query.eq('agent_id', aid)
    }

    const { data } = await query
    setPolicies(data ?? [])
  }

  async function handleViewMode(mode: 'me' | 'downlines') {
    setViewMode(mode)
    await fetchPolicies(agentId, isAdmin, mode)
  }

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const filtered = policies
    .filter(p => {
      const client = p.crm_clients
      const nameMatch = !filterSearch ||
        `${client?.first_name} ${client?.last_name}`.toLowerCase().includes(filterSearch.toLowerCase()) ||
        p.policy_number?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        p.carrier?.toLowerCase().includes(filterSearch.toLowerCase())
      const carrierMatch = !filterCarrier || p.carrier === filterCarrier
      const statusMatch = !filterStatus || p.status === filterStatus
      const productMatch = !filterProduct || p.product_type === filterProduct
      return nameMatch && carrierMatch && statusMatch && productMatch
    })
    .sort((a, b) => {
      let aVal = a[sortField] ?? ''
      let bVal = b[sortField] ?? ''
      if (sortField === 'client_name') {
        aVal = `${a.crm_clients?.first_name} ${a.crm_clients?.last_name}`
        bVal = `${b.crm_clients?.first_name} ${b.crm_clients?.last_name}`
      }
      if (sortField === 'annual_premium' || sortField === 'monthly_premium' || sortField === 'face_amount') {
        return sortDir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })

  const totalAnnualPremium = filtered.reduce((sum, p) => sum + (Number(p.annual_premium) || 0), 0)
  const totalMonthlyPremium = filtered.reduce((sum, p) => sum + (Number(p.monthly_premium) || 0), 0)
  const activePolicies = filtered.filter(p => ['active', 'issued', 'approved'].includes(p.status))

  const uniqueProducts = [...new Set(policies.map(p => p.product_type).filter(Boolean))]

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return <span style={{ color: '#555', marginLeft: '4px' }}>↕</span>
    return <span style={{ color: '#C9A96E', marginLeft: '4px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Book of Business
          </h1>
          <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
            {filtered.length} polic{filtered.length !== 1 ? 'ies' : 'y'}
            {totalAnnualPremium > 0 && ` · $${totalAnnualPremium.toLocaleString()} annual premium`}
          </p>
        </div>

        {/* Just Me / Downlines toggle — admin only */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAdmin && (
            <div style={{ display: 'flex', backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              {(['me', 'downlines'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleViewMode(mode)}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    fontFamily: 'inherit',
                    backgroundColor: viewMode === mode ? '#C9A96E' : 'transparent',
                    color: viewMode === mode ? '#1A1A1A' : '#888',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {mode === 'me' ? 'Just Me' : 'All Agents'}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              const headers = ['Date Written', 'Effective Date', 'Client Name', 'State', 'Agent', 'Carrier', 'Product', 'Policy Number', 'Face Amount', 'Monthly Premium', 'Annual Premium', 'Status']
              const rows = filtered.map(p => [
                p.date_written ?? '',
                p.effective_date ?? '',
                p.crm_clients ? `${p.crm_clients.first_name} ${p.crm_clients.last_name}` : '',
                p.crm_clients?.state ?? '',
                p.agents?.full_name ?? '',
                p.carrier ?? '',
                p.product_type ?? '',
                p.policy_number ?? '',
                p.face_amount ?? '',
                p.monthly_premium ?? '',
                p.annual_premium ?? '',
                p.status ?? '',
              ])
              const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `book-of-business-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}
            style={{ padding: '9px 18px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Policies', value: filtered.length, color: '#C9A96E' },
          { label: 'Active Policies', value: activePolicies.length, color: '#27AE60' },
          { label: 'Annual Premium', value: `$${totalAnnualPremium.toLocaleString()}`, color: '#9C27B0' },
          { label: 'Monthly Premium', value: `$${totalMonthlyPremium.toLocaleString()}`, color: '#2196F3' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px 20px', border: '1px solid #E5E1DA' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: card.color, marginBottom: '4px' }}>{card.value}</div>
            <div style={{ fontSize: '11px', color: '#7A7A7A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E1DA', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
          <input
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder="Search client name, policy #, or carrier..."
            style={{ padding: '9px 12px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FAFAF8' }}
          />
          <select
            value={filterCarrier}
            onChange={e => setFilterCarrier(e.target.value)}
            style={{ padding: '9px 12px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FAFAF8', cursor: 'pointer' }}
          >
            <option value="">All Carriers</option>
            {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '9px 12px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FAFAF8', cursor: 'pointer' }}
          >
            <option value="">All Statuses</option>
            {POLICY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={filterProduct}
            onChange={e => setFilterProduct(e.target.value)}
            style={{ padding: '9px 12px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FAFAF8', cursor: 'pointer' }}
          >
            <option value="">All Products</option>
            {uniqueProducts.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {(filterSearch || filterCarrier || filterStatus || filterProduct) && (
          <button
            onClick={() => { setFilterSearch(''); setFilterCarrier(''); setFilterStatus(''); setFilterProduct('') }}
            style={{ marginTop: '10px', padding: '5px 14px', backgroundColor: '#FFFFFF', color: '#7A7A7A', border: '1px solid #E5E1DA', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Policy Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
        {filtered.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9F7F4' }}>
                  {[
                    { label: 'Submitted', field: 'date_written' },
                    { label: 'Effective', field: 'effective_date' },
                    { label: 'Client', field: 'client_name' },
                    { label: 'State', field: null },
                    ...(isAdmin && viewMode === 'downlines' ? [{ label: 'Agent', field: null }] : []),
                    { label: 'Carrier / Product', field: 'carrier' },
                    { label: 'Policy #', field: 'policy_number' },
                    { label: 'Coverage', field: 'face_amount' },
                    { label: 'Premium / Billing', field: 'annual_premium' },
                    { label: 'Status', field: 'status' },
                  ].map(col => (
                    <th
                      key={col.label}
                      onClick={() => col.field && handleSort(col.field)}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#7A7A7A',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        borderBottom: '1px solid #E5E1DA',
                        whiteSpace: 'nowrap',
                        cursor: col.field ? 'pointer' : 'default',
                        userSelect: 'none',
                      }}
                    >
                      {col.label}
                      {col.field && <SortIcon field={col.field} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((policy, i) => {
                  const client = policy.crm_clients
                  const agent = policy.agents
                  const statusInfo = POLICY_STATUSES.find(s => s.value === policy.status)
                  const isLast = i === filtered.length - 1
                  return (
                    <tr
                      key={policy.id}
                      style={{ borderBottom: !isLast ? '1px solid #F0EDE8' : 'none' }}
                    >
                      <td style={{ padding: '13px 14px', fontSize: '13px', color: '#4A4A4A', whiteSpace: 'nowrap' }}>
                        {policy.date_written
                          ? new Date(policy.date_written).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td style={{ padding: '13px 14px', fontSize: '13px', color: '#4A4A4A', whiteSpace: 'nowrap' }}>
                        {policy.effective_date
                          ? new Date(policy.effective_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        {client ? (
                          <Link href={`/crm/clients/${client.id}`} style={{ fontWeight: '600', fontSize: '14px', color: '#1A1A1A', textDecoration: 'none' }}>
                            {client.first_name} {client.last_name}
                          </Link>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '13px 14px', fontSize: '13px', color: '#4A4A4A' }}>
                        {client?.state || '—'}
                      </td>
                      {isAdmin && viewMode === 'downlines' && (
                        <td style={{ padding: '13px 14px', fontSize: '13px', color: '#4A4A4A' }}>
                          {agent?.full_name || '—'}
                        </td>
                      )}
                      <td style={{ padding: '13px 14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>{policy.carrier}</div>
                        <div style={{ fontSize: '12px', color: '#7A7A7A', marginTop: '2px' }}>{policy.product_type}</div>
                      </td>
                      <td style={{ padding: '13px 14px', fontSize: '12px', color: '#7A7A7A', fontFamily: 'monospace' }}>
                        {policy.policy_number || '—'}
                      </td>
                      <td style={{ padding: '13px 14px', fontSize: '13px', color: '#1A1A1A', fontWeight: '600' }}>
                        {policy.face_amount ? `$${Number(policy.face_amount).toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        {policy.annual_premium ? (
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>
                              ${Number(policy.annual_premium).toLocaleString()}/yr
                            </div>
                            {policy.monthly_premium && (
                              <div style={{ fontSize: '12px', color: '#7A7A7A', marginTop: '1px' }}>
                                ${Number(policy.monthly_premium).toLocaleString()}/mo
                              </div>
                            )}
                          </div>
                        ) : policy.monthly_premium ? (
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>
                            ${Number(policy.monthly_premium).toLocaleString()}/mo
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: `${statusInfo?.color}18`,
                          color: statusInfo?.color ?? '#888',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                        }}>
                          {statusInfo?.label ?? policy.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>◆</div>
            <p style={{ fontSize: '15px', color: '#7A7A7A', fontWeight: '500', marginBottom: '4px' }}>
              {filterSearch || filterCarrier || filterStatus || filterProduct
                ? 'No policies match your filters'
                : 'No policies yet'}
            </p>
            {!filterSearch && !filterCarrier && !filterStatus && !filterProduct && (
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
