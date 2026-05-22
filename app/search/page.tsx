'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
    }
    check()
  }, [router])

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)

    const { data } = await supabase
      .from('agents')
      .select('*')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,xfg_id.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    setResults(data || [])
    setLoading(false)
  }

  const STAGE_LABELS: Record<string, string> = {
    contacted: 'Contacted', licensing: 'Licensing',
    onboarding: 'Onboarding', contracting: 'Contracting', system_setup: 'System Setup',
    training: 'Training', activation: 'Activation', active: 'Active'
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', color: '#1A1814', fontFamily: 'Georgia, serif', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#6B6966', fontSize: '0.85rem', fontFamily: 'Georgia, serif', cursor: 'pointer', marginBottom: '1.5rem', padding: '0' }}>
          ← Dashboard
        </button>

        <p style={{ color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>XFG · X Financial Group</p>
        <h1 style={{ color: '#1A1814', fontSize: '1.6rem', fontWeight: '400', marginBottom: '2rem' }}>Agent Search</h1>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, email, phone, or XFG ID..."
            style={{ flex: 1, background: '#FFFFFF', color: '#1A1814', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.95rem', fontFamily: 'Georgia, serif', outline: 'none' }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{ background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontFamily: 'Georgia, serif', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searched && !loading && (
          <p style={{ color: '#6B6966', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {results.length === 0 ? 'No agents found.' : `${results.length} agent${results.length !== 1 ? 's' : ''} found`}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {results.map(agent => (
            <div
              key={agent.id}
              onClick={() => router.push(`/agents/${agent.id}`)}
              style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <p style={{ color: '#1A1814', fontSize: '1rem', fontWeight: '600', marginBottom: '0.2rem' }}>{agent.full_name}</p>
                <p style={{ color: '#C9A96E', fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: '0.2rem' }}>{agent.xfg_id}</p>
                <p style={{ color: '#6B6966', fontSize: '0.8rem', marginBottom: '0.15rem' }}>{agent.email}</p>
                {agent.phone && <p style={{ color: '#6B6966', fontSize: '0.8rem' }}>{agent.phone}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: '#F5EDD9', border: '1px solid #DDD9D2', color: '#8B6A2E', fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'block', marginBottom: '0.4rem' }}>
                  {STAGE_LABELS[agent.current_stage] || agent.current_stage}
                </span>
                <p style={{ color: '#9A9890', fontSize: '0.75rem' }}>{agent.state}</p>
                {agent.agent_model && <p style={{ color: '#6B6966', fontSize: '0.72rem', textTransform: 'capitalize' }}>{agent.agent_model}</p>}
                {agent.is_locked && <p style={{ color: '#C9A96E', fontSize: '0.72rem' }}>🔒 Locked</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
