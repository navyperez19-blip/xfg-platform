'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '../lib/auth'

const STAGES = [
  { key: 'contacted', label: 'Contacted' },
  { key: 'licensing', label: 'Licensing' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'contracting', label: 'Contracting' },
  { key: 'system_setup', label: 'System Setup' },
  { key: 'active', label: 'Active' },
]

type SortKey = 'full_name' | 'current_stage' | 'state' | 'days' | 'agent_model' | 'npn' | 'xfg_email' | 'is_licensed' | 'phone'

export default function PipelinePage() {
  const router = useRouter()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStages, setFilterStages] = useState<string[]>([])
  const [filterStates, setFilterStates] = useState<string[]>([])
  const [filterModels, setFilterModels] = useState<string[]>([])
  const [view, setView] = useState<'list' | 'board'>('list')
  const [sortKeys, setSortKeys] = useState<{key: SortKey, dir: 'asc' | 'desc'}[]>([{key: 'days', dir: 'desc'}])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [showSmsModal, setShowSmsModal] = useState(false)
  const [smsMessage, setSmsMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [smsResult, setSmsResult] = useState<{sent: number, failed: number, skipped: number} | null>(null)

  useEffect(() => {
    const getAgents = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const profile = await getCurrentUser()
      setCurrentUser(profile)
      const { data } = await supabase.from('agents').select('*').order('created_at', { ascending: false })
      setAgents(data || [])
      setLoading(false)

      const channel = supabase
        .channel('pipeline-agents')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'agents',
        }, async () => {
          const { data: updated } = await supabase.from('agents').select('*').order('created_at', { ascending: false })
          setAgents(updated || [])
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
    getAgents()
  }, [router])

  const getDays = (agent: any) => Math.floor((Date.now() - new Date(agent.updated_at).getTime()) / (1000 * 60 * 60 * 24))

  const getDaysColor = (days: number) => {
    if (days <= 7) return '#2D6A4F'
    if (days <= 14) return '#B5652A'
    return '#8B2635'
  }

  const filteredAgents = agents.filter(a => {
    const matchesSearch = search === '' ||
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.xfg_id.toLowerCase().includes(search.toLowerCase())
    const matchesStage = filterStages.length === 0 || filterStages.includes(a.current_stage)
    const matchesState = filterStates.length === 0 || filterStates.includes(a.state)
    const matchesModel = filterModels.length === 0 || filterModels.includes(a.agent_model)
    return matchesSearch && matchesStage && matchesState && matchesModel
  })

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    for (const {key, dir} of sortKeys) {
      let aVal: any, bVal: any
      if (key === 'days') { aVal = getDays(a); bVal = getDays(b) }
      else if (key === 'full_name') { aVal = a.full_name; bVal = b.full_name }
      else if (key === 'current_stage') { aVal = STAGES.findIndex(s => s.key === a.current_stage); bVal = STAGES.findIndex(s => s.key === b.current_stage) }
      else if (key === 'is_licensed') {
        const order: Record<string, number> = { 'yes': 0, 'expired': 1, 'no': 2, '': 3 }
        aVal = order[a.is_licensed || ''] ?? 3
        bVal = order[b.is_licensed || ''] ?? 3
      }
      else { aVal = a[key] || ''; bVal = b[key] || '' }
      if (aVal < bVal) return dir === 'asc' ? -1 : 1
      if (aVal > bVal) return dir === 'asc' ? 1 : -1
    }
    return 0
  })

  const handleSort = (key: SortKey) => {
    setSortKeys(prev => {
      const existing = prev.find(s => s.key === key)
      if (existing) {
        if (existing.dir === 'desc') return prev.map(s => s.key === key ? {...s, dir: 'asc'} : s)
        return prev.filter(s => s.key !== key)
      }
      return [...prev, {key, dir: 'desc'}]
    })
  }

  const stageCounts = STAGES.map(s => ({ ...s, count: agents.filter(a => a.current_stage === s.key).length }))
  const uniqueStates = [...new Set(agents.map(a => a.state))].filter(Boolean).sort()

  const agentsByStage = (stageKey: string) => filteredAgents.filter(a => a.current_stage === stageKey)

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966' }}>Loading pipeline...</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED' }}>
      <div style={{ maxWidth: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '600', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>XFG · X Financial Group</p>
            <h1 style={{ color: '#1A1814', fontSize: '1.6rem', fontWeight: '700' }}>Agent Pipeline</h1>
            {/* v2 */}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#FFFFFF', border: '1px solid #EBE8E3', borderRadius: '8px', overflow: 'hidden' }}>
              <button onClick={() => setView('list')} style={{ padding: '0.5rem 1rem', border: 'none', background: view === 'list' ? '#F5EDD9' : 'transparent', color: view === 'list' ? '#8B6A2E' : '#6B6966', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>List</button>
              <button onClick={() => setView('board')} style={{ padding: '0.5rem 1rem', border: 'none', background: view === 'board' ? '#F5EDD9' : 'transparent', color: view === 'board' ? '#8B6A2E' : '#6B6966', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Board</button>
            </div>
            <button
              onClick={() => { setSelectMode(!selectMode); setSelectedAgents([]) }}
              style={{ padding: '0.6rem 1.25rem', border: '1px solid #DDD9D2', background: selectMode ? '#FEE2E2' : '#FFFFFF', color: selectMode ? '#C0392B' : '#6B6966', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
            >
              {selectMode ? 'Cancel' : 'Select'}
            </button>
            {selectedAgents.length > 0 && (
              <>
              <button
                onClick={() => { setSmsResult(null); setSmsMessage(''); setShowSmsModal(true) }}
                style={{ padding: '0.6rem 1.25rem', backgroundColor: '#2196F3', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700', fontFamily: 'inherit' }}
              >
                📱 Send Text ({selectedAgents.length})
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete ${selectedAgents.length} agent(s)? This cannot be undone.`)) return
                  setDeleting(true)
                  for (const id of selectedAgents) {
                    await supabase.from('agents').delete().eq('id', id)
                  }
                  setSelectedAgents([])
                  setSelectMode(false)
                  setDeleting(false)
                  window.location.reload()
                }}
                disabled={deleting}
                style={{ padding: '0.6rem 1.25rem', backgroundColor: '#C0392B', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}
              >
                {deleting ? 'Deleting...' : `Delete (${selectedAgents.length})`}
              </button>
              </>
            )}
            {currentUser?.role !== 'sales_director' && (
              <button onClick={() => router.push('/agents/new')} style={{ background: '#C9A96E', border: 'none', color: '#FFFFFF', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>+ New Agent</button>
            )}
          </div>
        </div>

        {/* Stage Summary Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setFilterStages([])} style={{ padding: '0.4rem 0.875rem', borderRadius: '20px', border: '1px solid #DDD9D2', background: filterStages.length === 0 ? '#1A1814' : '#FFFFFF', color: filterStages.length === 0 ? '#FFFFFF' : '#6B6966', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
            All ({agents.length})
          </button>
          {stageCounts.map(s => (
            <button key={s.key} onClick={() => setFilterStages(prev => prev.includes(s.key) ? prev.filter(k => k !== s.key) : [...prev, s.key])} style={{ padding: '0.4rem 0.875rem', borderRadius: '20px', border: '1px solid #DDD9D2', background: filterStages.includes(s.key) ? '#C9A96E' : '#FFFFFF', color: filterStages.includes(s.key) ? '#FFFFFF' : '#6B6966', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
              {s.label} ({s.count})
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Search by name, email, or XFG ID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: '#FFFFFF', color: '#1A1814', border: '1px solid #EBE8E3', borderRadius: '8px', padding: '0.55rem 1rem', fontSize: '0.875rem', outline: 'none', width: '300px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }} />
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              onChange={e => { const val = e.target.value; if (val) setFilterStates(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]) }}
              value=""
              style={{ background: '#FFFFFF', color: '#1A1814', border: filterStates.length > 0 ? '1px solid #C9A96E' : '1px solid #EBE8E3', borderRadius: '8px', padding: '0.55rem 0.875rem', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">States {filterStates.length > 0 ? `(${filterStates.length})` : ''}</option>
              {uniqueStates.map(s => <option key={s} value={s} style={{ fontWeight: filterStates.includes(s) ? '700' : '400' }}>{filterStates.includes(s) ? '✓ ' : ''}{s}</option>)}
            </select>
          </div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              onChange={e => { const val = e.target.value; if (val) setFilterModels(prev => prev.includes(val) ? prev.filter(m => m !== val) : [...prev, val]) }}
              value=""
              style={{ background: '#FFFFFF', color: '#1A1814', border: filterModels.length > 0 ? '1px solid #C9A96E' : '1px solid #EBE8E3', borderRadius: '8px', padding: '0.55rem 0.875rem', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">Models {filterModels.length > 0 ? `(${filterModels.length})` : ''}</option>
              <option value="supported" style={{ fontWeight: filterModels.includes('supported') ? '700' : '400' }}>{filterModels.includes('supported') ? '✓ ' : ''}Supported</option>
              <option value="independent" style={{ fontWeight: filterModels.includes('independent') ? '700' : '400' }}>{filterModels.includes('independent') ? '✓ ' : ''}Independent</option>
            </select>
          </div>
          {(search || filterStages.length > 0 || filterStates.length > 0 || filterModels.length > 0) && (
            <button onClick={() => { setSearch(''); setFilterStages([]); setFilterStates([]); setFilterModels([]) }} style={{ background: '#FFFFFF', border: '1px solid #EBE8E3', color: '#6B6966', padding: '0.55rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>Clear</button>
          )}
          <span style={{ color: '#9A9890', fontSize: '0.8rem', marginLeft: 'auto' }}>{sortedAgents.length} of {agents.length} agents</span>
        </div>

        {/* List View */}
        {view === 'list' && (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1300px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #EBE8E3', backgroundColor: '#FAFAF9' }}>
                  <th style={{ padding: '10px 16px', width: '50px', minWidth: '50px', backgroundColor: '#FAFAF9', borderRight: '1px solid #EBE8E3' }}>
                    <input
                      type="checkbox"
                      checked={selectedAgents.length === sortedAgents.length && sortedAgents.length > 0}
                      onChange={e => setSelectedAgents(e.target.checked ? sortedAgents.map((a: any) => a.id) : [])}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                  {[
                    { label: 'Agent', key: 'full_name' },
                    { label: 'Stage', key: 'current_stage' },
                    { label: 'State', key: 'state' },
                    { label: 'Model', key: 'agent_model' },
                    { label: 'Licensed', key: 'is_licensed' },
                    { label: 'NPN', key: 'npn' },
                    { label: 'Phone', key: 'phone' },
                    { label: 'XFG Email', key: 'xfg_email' },
                    { label: 'Days in Stage', key: 'days' },
                    { label: 'Last Contact', key: 'last_contact_at' },
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key as SortKey)} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B6966', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', background: sortKeys.some(s => s.key === col.key) ? '#FAFAF9' : 'transparent' }}>
                      {col.label} {(() => { const s = sortKeys.find(s => s.key === col.key); if (!s) return ''; const idx = sortKeys.indexOf(s); return `${s.dir === 'desc' ? '↓' : '↑'}${sortKeys.length > 1 ? idx + 1 : ''}` })()}
                    </th>
                  ))}
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B6966', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedAgents.map((agent, index) => {
                  const days = getDays(agent)
                  const stageLabel = STAGES.find(s => s.key === agent.current_stage)?.label || agent.current_stage
                  return (
                    <tr key={agent.id} onClick={() => selectMode ? setSelectedAgents(prev => prev.includes(agent.id) ? prev.filter(id => id !== agent.id) : [...prev, agent.id]) : router.push(`/agents/${agent.id}`)} style={{ borderBottom: index < sortedAgents.length - 1 ? '1px solid #F5F2ED' : 'none', cursor: 'pointer', transition: 'background 0.1s', backgroundColor: selectedAgents.includes(agent.id) ? '#FEF2F2' : 'transparent' }} onMouseEnter={e => (e.currentTarget.style.background = selectedAgents.includes(agent.id) ? '#FEF2F2' : '#FAFAF9')} onMouseLeave={e => (e.currentTarget.style.background = selectedAgents.includes(agent.id) ? '#FEF2F2' : 'transparent')}>
                      <td style={{ padding: '10px 16px', width: '50px', minWidth: '50px', borderRight: '1px solid #EBE8E3' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedAgents.includes(agent.id)}
                          onChange={e => setSelectedAgents(prev => e.target.checked ? [...prev, agent.id] : prev.filter(id => id !== agent.id))}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <p style={{ color: '#1A1814', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.15rem' }}>{agent.full_name}</p>
                        <p style={{ color: '#C9A96E', fontSize: '0.75rem', fontFamily: 'monospace' }}>{agent.xfg_id}</p>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ background: '#F5EDD9', color: '#8B6A2E', fontSize: '0.75rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>{stageLabel}</span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#6B6966', fontSize: '0.875rem' }}>{agent.state}</td>
                      <td style={{ padding: '0.875rem 1rem', color: '#6B6966', fontSize: '0.875rem', textTransform: 'capitalize' }}>{agent.agent_model || '—'}</td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {agent.is_licensed === 'yes' && <span style={{ background: '#F0FFF4', color: '#2D6A4F', fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>Licensed</span>}
                        {agent.is_licensed === 'no' && <span style={{ background: '#FFF5F5', color: '#8B2635', fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>Not Licensed</span>}
                        {agent.is_licensed === 'expired' && <span style={{ background: '#FFFBF0', color: '#B5652A', fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>Expired</span>}
                        {!agent.is_licensed && <span style={{ color: '#9A9890', fontSize: '0.72rem' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <p style={{ color: '#6B6966', fontSize: '0.8rem' }}>{agent.npn || '—'}</p>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#1A1814', fontSize: '0.875rem' }}>
                        {agent.phone ? (
                          <a href={`tel:${agent.phone}`} style={{ color: '#1A1814', textDecoration: 'none', fontWeight: '500' }} onClick={e => e.stopPropagation()}>
                            {agent.phone}
                          </a>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <p style={{ color: '#6B6966', fontSize: '0.8rem' }}>{agent.xfg_email || '—'}</p>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ color: getDaysColor(days), fontSize: '0.875rem', fontWeight: '600' }}>{days}d</span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {agent.last_contact_at ? (
                          <div>
                            <p style={{ color: '#1A1814', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.15rem' }}>{agent.last_contact_by}</p>
                            <p style={{ color: '#9A9890', fontSize: '0.75rem' }}>{new Date(agent.last_contact_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(agent.last_contact_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                            {agent.last_contact_note && <p style={{ color: '#6B6966', fontSize: '0.72rem', marginTop: '0.1rem', fontStyle: 'italic' }}>{agent.last_contact_note.length > 40 ? agent.last_contact_note.substring(0, 40) + '...' : agent.last_contact_note}</p>}
                          </div>
                        ) : (
                          <span style={{ color: '#DDD9D2', fontSize: '0.8rem' }}>No contact yet</span>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {agent.is_locked && <span style={{ background: '#FFF5F5', color: '#8B2635', fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.5rem', borderRadius: '4px', marginRight: '0.4rem' }}>Locked</span>}
                        {!agent.is_locked && <span style={{ background: '#F0FFF4', color: '#2D6A4F', fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Active</span>}
                      </td>
                    </tr>
                  )
                })}
                {sortedAgents.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: '#9A9890', fontSize: '0.9rem' }}>No agents found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Board View */}
        {view === 'board' && (
          <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem' }}>
            {STAGES.map((stage) => (
              <div key={stage.key} style={{ minWidth: '200px', maxWidth: '200px', flexShrink: 0 }}>
                <div style={{ background: '#FFFFFF', borderTop: '2px solid #C9A96E', borderRadius: '8px 8px 0 0', padding: '0.6rem 0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                  <span style={{ color: '#1A1814', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{stage.label}</span>
                  <span style={{ background: '#F5EDD9', color: '#8B6A2E', fontSize: '0.72rem', fontWeight: '700', padding: '0.1rem 0.45rem', borderRadius: '10px' }}>{agentsByStage(stage.key).length}</span>
                </div>
                <div style={{ background: '#F5F2ED', border: '1px solid #EBE8E3', borderTop: 'none', borderRadius: '0 0 8px 8px', minHeight: '400px', padding: '0.5rem' }}>
                  {agentsByStage(stage.key).map((agent) => {
                    const days = getDays(agent)
                    return (
                      <div key={agent.id} onClick={() => router.push(`/agents/${agent.id}`)} style={{ background: '#FFFFFF', border: '1px solid #EBE8E3', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                        <p style={{ color: '#1A1814', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.2rem' }}>{agent.full_name}</p>
                        <p style={{ color: '#C9A96E', fontSize: '0.72rem', fontFamily: 'monospace', marginBottom: '0.2rem' }}>{agent.xfg_id}</p>
                        <p style={{ color: '#9A9890', fontSize: '0.72rem', marginBottom: '0.2rem' }}>{agent.state}</p>
                        <p style={{ color: getDaysColor(days), fontSize: '0.72rem', fontWeight: '600' }}>{days}d in stage</p>
                        {agent.last_contact_at && (
                          <div style={{ marginTop: '0.3rem', borderTop: '1px solid #EBE8E3', paddingTop: '0.3rem' }}>
                            <p style={{ color: '#6B6966', fontSize: '0.68rem', fontWeight: '600' }}>{agent.last_contact_by}</p>
                            <p style={{ color: '#9A9890', fontSize: '0.65rem' }}>{new Date(agent.last_contact_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(agent.last_contact_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                          </div>
                        )}
                        {agent.is_locked && <p style={{ color: '#C9A96E', fontSize: '0.7rem', marginTop: '0.2rem' }}>🔒 Locked</p>}
                      </div>
                    )
                  })}
                  {agentsByStage(stage.key).length === 0 && (
                    <p style={{ color: '#DDD9D2', fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem' }}>—</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SMS Modal */}
      {showSmsModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A1A' }}>📱 Send Text Message</h2>
              <button onClick={() => setShowSmsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: '20px' }}>×</button>
            </div>

            {smsResult ? (
              <div>
                <div style={{ padding: '16px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#14532D', marginBottom: '8px' }}>✅ Messages Sent</p>
                  <p style={{ fontSize: '13px', color: '#166534' }}>✓ Sent: {smsResult.sent}</p>
                  {smsResult.failed > 0 && <p style={{ fontSize: '13px', color: '#C0392B' }}>✗ Failed: {smsResult.failed}</p>}
                  {smsResult.skipped > 0 && <p style={{ fontSize: '13px', color: '#7A7A7A' }}>⚠ Skipped (no phone): {smsResult.skipped}</p>}
                </div>
                <button onClick={() => { setShowSmsModal(false); setSmsResult(null); setSelectMode(false); setSelectedAgents([]) }} style={{ width: '100%', padding: '12px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit' }}>Done</button>
              </div>
            ) : (
              <div>
                <div style={{ padding: '12px 16px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#1E40AF' }}>Sending to <strong>{selectedAgents.length} agents</strong> via GHL SMS (+1 619-514-4614)</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#4A4A4A', display: 'block', marginBottom: '6px' }}>Message</label>
                  <textarea
                    value={smsMessage}
                    onChange={e => setSmsMessage(e.target.value)}
                    placeholder="Type your message here..."
                    style={{ width: '100%', minHeight: '120px', padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <p style={{ fontSize: '11px', color: '#AAA', marginTop: '4px' }}>{smsMessage.length} characters</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowSmsModal(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#F5F5F5', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>Cancel</button>
                  <button
                    onClick={async () => {
                      if (!smsMessage.trim()) return
                      setSending(true)
                      const agentsToText = sortedAgents.filter(a => selectedAgents.includes(a.id))
                      const res = await fetch('/api/ghl/send-sms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ agents: agentsToText, message: smsMessage })
                      })
                      const data = await res.json()
                      setSmsResult(data)
                      setSending(false)
                    }}
                    disabled={sending || !smsMessage.trim()}
                    style={{ flex: 1, padding: '12px', backgroundColor: '#2196F3', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', opacity: sending || !smsMessage.trim() ? 0.6 : 1 }}
                  >
                    {sending ? 'Sending...' : `Send to ${selectedAgents.length} Agents`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
