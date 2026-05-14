'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const STAGES = [
{ key: 'new_lead', label: 'New Lead' },
{ key: 'contacted', label: 'Contacted' },
{ key: 'licensing', label: 'Licensing' },
{ key: 'onboarding', label: 'Onboarding' },
{ key: 'contracting', label: 'Contracting' },
{ key: 'system_setup', label: 'System Setup' },
{ key: 'training', label: 'Training' },
{ key: 'activation', label: 'Activation' },
{ key: 'active', label: 'Active' },
]

export default function PipelinePage() {
const router = useRouter()
const [agents, setAgents] = useState<any[]>([])
const [loading, setLoading] = useState(true)
const [search, setSearch] = useState('')
const [filterState, setFilterState] = useState('')
const [filterModel, setFilterModel] = useState('')

useEffect(() => {
const getAgents = async () => {
const { data: { user } } = await supabase.auth.getUser()
if (!user) { router.push('/login'); return }
const { data } = await supabase.from('agents').select('*').order('created_at', { ascending: false })
setAgents(data || [])
setLoading(false)
}
getAgents()
}, [router])

const filteredAgents = agents.filter(a => {
const matchesSearch = search === '' ||
a.full_name.toLowerCase().includes(search.toLowerCase()) ||
a.email.toLowerCase().includes(search.toLowerCase()) ||
a.xfg_id.toLowerCase().includes(search.toLowerCase())
const matchesState = filterState === '' || a.state === filterState
const matchesModel = filterModel === '' || a.agent_model === filterModel
return matchesSearch && matchesState && matchesModel
})

const agentsByStage = (stageKey: string) => filteredAgents.filter(a => a.current_stage === stageKey)
const uniqueStates = [...new Set(agents.map(a => a.state))].sort()

if (loading) return (
<main style={{ minHeight: '100vh', background: '#0F0F0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
<p style={{ color: '#9A9890', fontFamily: 'Georgia, serif' }}>Loading pipeline...</p>
</main>
)

return (
<main style={{ minHeight: '100vh', background: '#0F0F0E', color: '#F5F2ED', fontFamily: 'Georgia, serif', padding: '1.5rem' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
<div>
<p style={{ color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>XFG · X Financial Group</p>
<h1 style={{ color: '#F5F2ED', fontSize: '1.4rem', fontWeight: '400' }}>Agent Pipeline</h1>
</div>
<div style={{ display: 'flex', gap: '0.75rem' }}>
<button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: '1px solid #2E2C29', color: '#9A9890', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>Dashboard</button>
<button onClick={() => router.push('/agents/new')} style={{ background: '#C9A96E', border: 'none', color: '#0F0F0E', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Georgia, serif', fontWeight: '600' }}>+ New Agent</button>
</div>
</div>

<div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
<input
type="text"
placeholder="Search by name, email, or XFG ID..."
value={search}
onChange={(e) => setSearch(e.target.value)}
style={{ background: '#1A1917', color: '#F5F2ED', border: '1px solid #2E2C29', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontFamily: 'Georgia, serif', outline: 'none', width: '280px' }}
/>
<select value={filterState} onChange={(e) => setFilterState(e.target.value)} style={{ background: '#1A1917', color: '#F5F2ED', border: '1px solid #2E2C29', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', fontFamily: 'Georgia, serif', outline: 'none' }}>
<option value="">All States</option>
{uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
</select>
<select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} style={{ background: '#1A1917', color: '#F5F2ED', border: '1px solid #2E2C29', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', fontFamily: 'Georgia, serif', outline: 'none' }}>
<option value="">All Models</option>
<option value="supported">Supported</option>
<option value="independent">Independent</option>
</select>
{(search || filterState || filterModel) && (
<button onClick={() => { setSearch(''); setFilterState(''); setFilterModel('') }} style={{ background: 'transparent', border: '1px solid #2E2C29', color: '#9A9890', padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Georgia, serif' }}>Clear</button>
)}
<span style={{ color: '#5C5A56', fontSize: '0.8rem' }}>{filteredAgents.length} of {agents.length} agents</span>
</div>

<div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem' }}>
{STAGES.map((stage) => (
<div key={stage.key} style={{ minWidth: '190px', maxWidth: '190px', flexShrink: 0 }}>
<div style={{ background: '#1A1917', borderTop: '2px solid #C9A96E', borderLeft: '1px solid #2E2C29', borderRight: '1px solid #2E2C29', borderRadius: '8px 8px 0 0', padding: '0.6rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
<span style={{ color: '#C9A96E', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{stage.label}</span>
<span style={{ background: '#242220', color: '#9A9890', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>{agentsByStage(stage.key).length}</span>
</div>
<div style={{ background: '#111110', border: '1px solid #2E2C29', borderTop: 'none', borderRadius: '0 0 8px 8px', minHeight: '400px', padding: '0.5rem' }}>
{agentsByStage(stage.key).map((agent) => (
<div
key={agent.id}
onClick={() => router.push(`/agents/${agent.id}`)}
style={{ background: '#1A1917', border: '1px solid #2E2C29', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.5rem', cursor: 'pointer' }}
>
<p style={{ color: '#F5F2ED', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.2rem' }}>{agent.full_name}</p>
<p style={{ color: '#C9A96E', fontSize: '0.72rem', fontFamily: 'monospace', marginBottom: '0.2rem' }}>{agent.xfg_id}</p>
<p style={{ color: '#5C5A56', fontSize: '0.72rem' }}>{agent.state}</p>
                  <p style={{ color: '#9A9890', fontSize: '0.68rem', marginTop: '0.2rem' }}>
                    {Math.floor((Date.now() - new Date(agent.updated_at).getTime()) / (1000 * 60 * 60 * 24))}d in stage
                  </p>
{agent.agent_model && <p style={{ color: '#9A9890', fontSize: '0.7rem', marginTop: '0.2rem', textTransform: 'capitalize' }}>{agent.agent_model}</p>}
{agent.is_locked && <p style={{ color: '#C9A96E', fontSize: '0.7rem', marginTop: '0.2rem' }}>🔒 Locked</p>}
</div>
))}
{agentsByStage(stage.key).length === 0 && (
<p style={{ color: '#2E2C29', fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem' }}>—</p>
)}
</div>
</div>
))}
</div>
</main>
)
}
