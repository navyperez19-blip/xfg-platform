'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const STAGES = [
  { key: 'contacted', label: 'Contacted' },
  { key: 'licensing', label: 'Licensing' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'contracting', label: 'Contracting' },
  { key: 'system_setup', label: 'System Setup' },
  { key: 'training', label: 'Training' },
  { key: 'activation', label: 'Activation' },
  { key: 'active', label: 'Active' },
]

type SortKey = 'full_name' | 'current_stage' | 'state' | 'days' | 'agent_model'

export default function PipelinePage() {
  const router = useRouter()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [view, setView] = useState<'list' | 'board'>('list')
  const [sortKey, setSortKey] = useState<SortKey>('days')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const getAgents = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
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
    const matchesStage = filterStage === '' || a.current_stage === filterStage
    const matchesState = filterState === '' || a.state === filterState
    const matchesModel = filterModel === '' || a.agent_model === filterModel
    return matchesSearch && matchesStage && matchesState && matchesModel
  })

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    let aVal: any, bVal: any
    if (sortKey === 'days') { aVal = getDays(a); bVal = getDays(b) }
    else if (sortKey === 'full_name') { aVal = a.full_name; bVal = b.full_name }
    else if (sortKey === 'current_stage') { aVal = STAGES.findIndex(s => s.key === a.current_stage); bVal = STAGES.findIndex(s => s.key === b.current_stage) }
    else { aVal = a[sortKey] || ''; bVal = b[sortKey] || '' }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '600', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>XFG · X Financial Group</p>
            <h1 style={{ color: '#1A1814', fontSize: '1.6rem', fontWeight: '700' }}>Agent Pipeline</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#FFFFFF', border: '1px solid #EBE8E3', borderRadius: '8px', overflow: 'hidden' }}>
              <button onClick={() => setView('list')} style={{ padding: '0.5rem 1rem', border: 'none', background: view === 'list' ? '#F5EDD9' : 'transparent', color: view === 'list' ? '#8B6A2E' : '#6B6966', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>List</button>
              <button onClick={() => setView('board')} style={{ padding: '0.5rem 1rem', border: 'none', background: view === 'board' ? '#F5EDD9' : 'transparent', color: view === 'board' ? '#8B6A2E' : '#6B6966', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Board</button>
            </div>
            <button onClick={() => router.push('/agents/new')} style={{ background: '#C9A96E', border: 'none', color: '#FFFFFF', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>+ New Agent</button>
          </div>
        </div>

        {/* Stage Summary Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setFilterStage('')} style={{ padding: '0.4rem 0.875rem', borderRadius: '20px', border: '1px solid #DDD9D2', background: filterStage === '' ? '#1A1814' : '#FFFFFF', color: filterStage === '' ? '#FFFFFF' : '#6B6966', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
            All ({agents.length})
          </button>
          {stageCounts.map(s => (
            <button key={s.key} onClick={() => setFilterStage(s.key === filterStage ? '' : s.key)} style={{ padding: '0.4rem 0.875rem', borderRadius: '20px', border: '1px solid #DDD9D2', background: filterStage === s.key ? '#C9A96E' : '#FFFFFF', color: filterStage === s.key ? '#FFFFFF' : '#6B6966', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
              {s.label} ({s.count})
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Search by name, email, or XFG ID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: '#FFFFFF', color: '#1A1814', border: '1px solid #EBE8E3', borderRadius: '8px', padding: '0.55rem 1rem', fontSize: '0.875rem', outline: 'none', width: '300px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }} />
          <select value={filterState} onChange={(e) => setFilterState(e.target.value)} style={{ background: '#FFFFFF', color: '#1A1814', border: '1px solid #EBE8E3', borderRadius: '8px', padding: '0.55rem 0.875rem', fontSize: '0.875rem', outline: 'none' }}>
            <option value="">All States</option>
            {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} style={{ background: '#FFFFFF', color: '#1A1814', border: '1px solid #EBE8E3', borderRadius: '8px', padding: '0.55rem 0.875rem', fontSize: '0.875rem', outline: 'none' }}>
            <option value="">All Models</option>
            <option value="supported">Supported</option>
            <option value="independent">Independent</option>
          </select>
          {(search || filterStage || filterState || filterModel) && (
            <button onClick={() => { setSearch(''); setFilterStage(''); setFilterState(''); setFilterModel('') }} style={{ background: '#FFFFFF', border: '1px solid #EBE8E3', color: '#6B6966', padding: '0.55rem 0.875rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>Clear</button>
          )}
          <span style={{ color: '#9A9890', fontSize: '0.8rem', marginLeft: 'auto' }}>{sortedAgents.length} of {agents.length} agents</span>
        </div>

        {/* List View */}
        {view === 'list' && (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #EBE8E3' }}>
                  {[
                    { label: 'Agent', key: 'full_name' },
                    { label: 'Stage', key: 'current_stage' },
                    { label: 'State', key: 'state' },
                    { label: 'Model', key: 'agent_model' },
                    { label: 'Licensed', key: 'is_licensed' },
                    { label: 'Days in Stage', key: 'days' },
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key as SortKey)} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B6966', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', background: sortKey === col.key ? '#FAFAF9' : 'transparent' }}>
                      {col.label} {sortKey === col.key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                  ))}
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B6966', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedAgents.map((agent, index) => {
                  const days = getDays(agent)
                  const stageLabel = STAGES.find(s => s.key === agent.current_stage)?.label || agent.current_stage
                  return (
                    <tr key={agent.id} onClick={() => router.push(`/agents/${agent.id}`)} style={{ borderBottom: index < sortedAgents.length - 1 ? '1px solid #F5F2ED' : 'none', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
                        <span style={{ color: getDaysColor(days), fontSize: '0.875rem', fontWeight: '600' }}>{days}d</span>
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
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#9A9890', fontSize: '0.9rem' }}>No agents found.</td>
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
    </main>
  )
}
