'use client'

import { useState } from 'react'

const STAGES = [
  { key: 'contacted', label: 'Contacted' },
  { key: 'licensing', label: 'Licensing' },
  { key: 'contracting', label: 'Contracting' },
  { key: 'system_setup', label: 'System Setup' },
  { key: 'active', label: 'Active' },
]

export default function OverviewTab({ agents, history }: { agents: any[]; history: any[] }) {
  const [overviewDetail, setOverviewDetail] = useState<'onboarding' | 'discord' | 'xfgEmail' | null>(null)

  const stageCounts = STAGES.map(s => ({
    ...s,
    count: agents.filter(a => a.current_stage === s.key).length
  }))

  const hasXfgEmail = agents.filter(a => a.xfg_email && a.xfg_email.trim() !== '').length
  const completedDiscord = agents.filter(a => a.wizard_step && !['xfg_email', 'discord'].includes(a.wizard_step)).length
  const totalAccountsCreated = agents.length

  const onboardingAgents = agents
  const discordAgents = agents.filter(a => a.wizard_step && !['xfg_email', 'discord'].includes(a.wizard_step))
  const xfgEmailAgents = agents.filter(a => a.xfg_email && a.xfg_email.trim() !== '')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '16px' }}>
        {stageCounts.map(s => (
          <div key={s.key} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{s.count}</p>
            <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div onClick={() => setOverviewDetail(overviewDetail === 'onboarding' ? null : 'onboarding')} style={{ background: overviewDetail === 'onboarding' ? '#FFFBF0' : '#FFFFFF', border: overviewDetail === 'onboarding' ? '1px solid #C9A96E' : '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
          <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{totalAccountsCreated}</p>
          <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Attended Onboarding Meeting</p>
        </div>
        <div onClick={() => setOverviewDetail(overviewDetail === 'discord' ? null : 'discord')} style={{ background: overviewDetail === 'discord' ? '#FFFBF0' : '#FFFFFF', border: overviewDetail === 'discord' ? '1px solid #C9A96E' : '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
          <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{completedDiscord}</p>
          <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Joined Discord</p>
        </div>
        <div onClick={() => setOverviewDetail(overviewDetail === 'xfgEmail' ? null : 'xfgEmail')} style={{ background: overviewDetail === 'xfgEmail' ? '#FFFBF0' : '#FFFFFF', border: overviewDetail === 'xfgEmail' ? '1px solid #C9A96E' : '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
          <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{hasXfgEmail}</p>
          <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Has XFG Email</p>
        </div>
      </div>

      {overviewDetail && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBE8E3', borderRadius: '12px', padding: '20px 24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>
              {overviewDetail === 'onboarding' && `Attended Onboarding Meeting (${onboardingAgents.length})`}
              {overviewDetail === 'discord' && `Joined Discord (${discordAgents.length})`}
              {overviewDetail === 'xfgEmail' && `Has XFG Email (${xfgEmailAgents.length})`}
            </p>
            <button onClick={() => setOverviewDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: '18px' }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
            {(overviewDetail === 'onboarding' ? onboardingAgents : overviewDetail === 'discord' ? discordAgents : xfgEmailAgents).map(a => (
              <a
                key={a.id}
                href={`/agents/${a.id}`}
                style={{ display: 'block', padding: '8px 12px', backgroundColor: '#F9F7F4', borderRadius: '8px', fontSize: '13px', color: '#1A1A1A', textDecoration: 'none', fontWeight: '600' }}
              >
                {a.full_name}
              </a>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #EBE8E3' }}>
          <h2 style={{ color: '#1A1814', fontSize: '16px', fontWeight: '700' }}>All Agents</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#F9F7F4' }}>
                {['Name', 'XFG ID', 'Stage', 'State', 'Model', 'Licensed', 'NPN', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #E5E1DA', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, i) => (
                <tr key={agent.id} style={{ borderBottom: i < agents.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1A1A1A', fontSize: '13px' }}>
                    <a href={`/agents/${agent.id}`} style={{ color: '#1A1A1A', textDecoration: 'none', fontWeight: '600' }}>{agent.full_name}</a>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#C9A96E', fontFamily: 'monospace', fontSize: '12px' }}>{agent.xfg_id}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: '#F5EDD9', color: '#8B6A2E', textTransform: 'capitalize' }}>{(agent.current_stage || '').replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '13px' }}>{agent.state || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '13px', textTransform: 'capitalize' }}>{agent.agent_model || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    {agent.is_licensed === 'yes' ? <span style={{ color: '#2D6A4F', fontWeight: '600' }}>✓ Yes</span> : agent.is_licensed === 'no' ? <span style={{ color: '#8B2635' }}>✗ No</span> : <span style={{ color: '#AAA' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '13px' }}>{agent.npn || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '12px' }}>{agent.created_at ? new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #EBE8E3' }}>
            <h2 style={{ color: '#1A1814', fontSize: '16px', fontWeight: '700' }}>Recent Stage Changes</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#F9F7F4' }}>
                {['Agent', 'From', 'To', 'Changed By', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #E5E1DA' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.id} style={{ borderBottom: i < history.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1A1A1A', fontSize: '13px' }}>{h.agent_name || '—'}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#F5F5F5', color: '#7A7A7A', textTransform: 'capitalize' }}>{(h.from_stage || '').replace('_', ' ') || '—'}</span></td>
                  <td style={{ padding: '12px 16px' }}><span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#F5EDD9', color: '#8B6A2E', textTransform: 'capitalize' }}>{(h.to_stage || '').replace('_', ' ') || '—'}</span></td>
                  <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '13px' }}>{h.changed_by_name || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#6B6966', fontSize: '12px' }}>{h.created_at ? new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
