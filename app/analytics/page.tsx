'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
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

export default function AnalyticsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      if (!user) { router.push('/login'); return }
      if (!['executive', 'superadmin'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      const { data: agentsData } = await supabase.from('agents').select('*')
      const { data: historyData } = await supabase
        .from('stage_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      setAgents(agentsData || [])
      setHistory(historyData || [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Georgia, serif' }}>Loading analytics...</p>
    </main>
  )

  const total = agents.length
  const active = agents.filter(a => a.current_stage === 'active').length
  const pipeline = agents.filter(a => a.current_stage !== 'active').length
  const locked = agents.filter(a => a.is_locked).length
  const supported = agents.filter(a => a.agent_model === 'supported').length
  const independent = agents.filter(a => a.agent_model === 'independent').length

  const card = { background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '1.25rem' }

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', color: '#1A1814', fontFamily: 'Georgia, serif', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <p style={{ color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>XFG · X Financial Group</p>
            <h1 style={{ color: '#1A1814', fontSize: '1.6rem', fontWeight: '400', marginBottom: '0.2rem' }}>Analytics</h1>
            <p style={{ color: '#6B6966', fontSize: '0.85rem' }}>Executive overview</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}
          >
            ← Dashboard
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={card}>
            <p style={{ color: '#6B6966', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Agents</p>
            <p style={{ fontSize: '2rem', fontWeight: '400', color: '#C9A96E' }}>{total}</p>
          </div>
          <div style={card}>
            <p style={{ color: '#6B6966', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Agents</p>
            <p style={{ fontSize: '2rem', fontWeight: '400', color: '#1A1814' }}>{active}</p>
          </div>
          <div style={card}>
            <p style={{ color: '#6B6966', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>In Pipeline</p>
            <p style={{ fontSize: '2rem', fontWeight: '400', color: '#1A1814' }}>{pipeline}</p>
          </div>
          <div style={card}>
            <p style={{ color: '#6B6966', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Locked Agents</p>
            <p style={{ fontSize: '2rem', fontWeight: '400', color: '#C9A96E' }}>{locked}</p>
          </div>
          <div style={card}>
            <p style={{ color: '#6B6966', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Supported Model</p>
            <p style={{ fontSize: '2rem', fontWeight: '400', color: '#1A1814' }}>{supported}</p>
          </div>
          <div style={card}>
            <p style={{ color: '#6B6966', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Independent Model</p>
            <p style={{ fontSize: '2rem', fontWeight: '400', color: '#1A1814' }}>{independent}</p>
          </div>
        </div>

        <div style={{ ...card, marginBottom: '1.25rem' }}>
          <p style={{ color: '#C9A96E', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Agents by Stage</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {STAGES.map(stage => {
              const count = agents.filter(a => a.current_stage === stage.key).length
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={stage.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#1A1814', fontSize: '0.85rem' }}>{stage.label}</span>
                    <span style={{ color: '#6B6966', fontSize: '0.8rem' }}>{count} agents</span>
                  </div>
                  <div style={{ background: '#EDEAE4', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div
                      style={{ background: '#C9A96E', height: '6px', borderRadius: '4px', width: `${pct}%`, transition: 'width 0.3s ease' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={card}>
          <p style={{ color: '#C9A96E', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Recent Stage Changes</p>
          {history.length === 0 ? (
            <p style={{ color: '#6B6966', fontSize: '0.85rem' }}>No stage changes yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {history.map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EDEAE4', border: '1px solid #DDD9D2', borderRadius: '6px', padding: '0.6rem 0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#6B6966' }}>{h.from_stage?.replace(/_/g, ' ')}</span>
                    <span style={{ color: '#9A9890' }}>→</span>
                    <span style={{ color: '#1A1814' }}>{h.to_stage?.replace(/_/g, ' ')}</span>
                    {h.is_override && (
                      <span style={{ fontSize: '0.7rem', background: '#FEE2E2', color: '#8B2635', border: '1px solid #FCA5A5', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>Override</span>
                    )}
                  </div>
                  <span style={{ color: '#9A9890', fontSize: '0.75rem' }}>{new Date(h.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
