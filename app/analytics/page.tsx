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
  const hasNPN = agents.filter(a => a.npn).length
  const hasXFGEmail = agents.filter(a => a.xfg_email).length
  const licensed = agents.filter(a => a.is_licensed === 'yes').length
  const notLicensed = agents.filter(a => a.is_licensed === 'no').length

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
          <p style={{ color: '#C9A96E', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Profile Completion</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Have NPN', value: hasNPN, color: '#2D6A4F' },
              { label: 'Have XFG Email', value: hasXFGEmail, color: '#2D6A4F' },
              { label: 'Licensed', value: licensed, color: '#2D6A4F' },
              { label: 'Not Licensed', value: notLicensed, color: '#8B2635' },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#F5F2ED', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                <p style={{ color: '#6B6966', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{stat.label}</p>
                <p style={{ color: stat.color, fontSize: '1.75rem', fontWeight: '700' }}>{stat.value}</p>
              </div>
            ))}
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

        <div style={{ ...card, marginBottom: '1.25rem' }}>
          <p style={{ color: '#C9A96E', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Carrier Contracting Status</p>
          {(() => {
            const contractingAgents = agents.filter(a => a.carriers && Object.values(a.carriers).some((v: any) => v === 'submitted' || v === 'active'))
            const totalSubmitted = contractingAgents.filter(a => Object.values(a.carriers || {}).some((v: any) => v === 'submitted')).length
            const totalActive = contractingAgents.filter(a => Object.values(a.carriers || {}).some((v: any) => v === 'active')).length
            return contractingAgents.length > 0 ? (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#FFFBF0', border: '1px solid #E8C87A', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#B5652A', fontSize: '20px', fontWeight: '700' }}>{totalSubmitted}</span>
                  <span style={{ color: '#6B6966', fontSize: '13px', fontWeight: '500' }}>agents with submitted contracts</span>
                </div>
                <div style={{ background: '#F0FFF4', border: '1px solid #A8D5B5', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#2D6A4F', fontSize: '20px', fontWeight: '700' }}>{totalActive}</span>
                  <span style={{ color: '#6B6966', fontSize: '13px', fontWeight: '500' }}>agents with active contracts</span>
                </div>
              </div>
            ) : null
          })()}
          {agents.filter(a => a.carriers && Object.keys(a.carriers).length > 0).length === 0 ? (
            <p style={{ color: '#9A9890', fontSize: '0.875rem' }}>No carrier contracting data yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #EBE8E3' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Agent</th>
                    {['Aflac', 'Americo', 'Transamerica', 'UHL', 'AHL', 'Mutual of Omaha', 'Ethos'].map(carrier => (
                      <th key={carrier} style={{ padding: '10px 12px', textAlign: 'center', color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{carrier}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents
                    .filter(a => a.carriers && Object.values(a.carriers).some(v => v === 'submitted' || v === 'active'))
                    .sort((a, b) => a.full_name.localeCompare(b.full_name))
                    .map((agent, index) => (
                      <tr key={agent.id} style={{ borderBottom: '1px solid #F5F2ED', background: index % 2 === 0 ? '#FFFFFF' : '#FAFAF9', cursor: 'pointer' }} onClick={() => router.push(`/agents/${agent.id}`)}>
                        <td style={{ padding: '10px 12px' }}>
                          <p style={{ color: '#1A1814', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>{agent.full_name}</p>
                          <p style={{ color: '#C9A96E', fontSize: '12px', fontFamily: 'monospace' }}>{agent.xfg_id}</p>
                        </td>
                        {['Mutual of Omaha', 'Ethos', 'Instabrain', 'Corbridge', 'AHL'].map(carrier => {
                          const status = agent.carriers?.[carrier] || 'none'
                          return (
                            <td key={carrier} style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {status === 'active' && <span style={{ background: '#F0FFF4', color: '#2D6A4F', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>✓ Active</span>}
                              {status === 'submitted' && <span style={{ background: '#FFFBF0', color: '#B5652A', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>⏳ Submitted</span>}
                              {status === 'none' && <span style={{ color: '#DDD9D2', fontSize: '12px' }}>—</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ ...card, marginBottom: '1.25rem' }}>
          <p style={{ color: '#C9A96E', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Agent XFG Emails</p>
          {agents.filter(a => a.xfg_email).length === 0 ? (
            <p style={{ color: '#9A9890', fontSize: '0.875rem' }}>No agents have set their XFG email yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {agents
                .filter(a => a.xfg_email)
                .sort((a, b) => a.full_name.localeCompare(b.full_name))
                .map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5F2ED', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '0.75rem 1rem', cursor: 'pointer' }} onClick={() => router.push(`/agents/${a.id}`)}>
                    <div>
                      <p style={{ color: '#1A1814', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.15rem' }}>{a.full_name}</p>
                      <p style={{ color: '#C9A96E', fontSize: '0.8rem', fontFamily: 'monospace' }}>{a.xfg_id}</p>
                    </div>
                    <p style={{ color: '#6B6966', fontSize: '0.875rem' }}>{a.xfg_email}</p>
                  </div>
                ))}
            </div>
          )}
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
