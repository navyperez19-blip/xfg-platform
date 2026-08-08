'use client'

import { supabase } from '../../lib/supabase'

function getMilestones(agent: any) {
  const carriers = agent.carriers || {}
  return [
    { key: 'onboarding_platform', label: 'Onboarding Platform', value: true, auto: true },
    { key: 'onboarding_meeting', label: 'Onboarding Meeting', value: true, auto: true },
    { key: 'xfg_email', label: 'XFG Email', value: !!(agent.xfg_email && agent.xfg_email.trim() !== ''), auto: true },
    { key: 'discord', label: 'Discord', value: !!(agent.wizard_step && !['xfg_email','discord'].includes(agent.wizard_step)), auto: true },
    { key: 'ethos_contract', label: 'Ethos Contract', value: carriers['Ethos'] === 'active', auto: true },
    { key: 'moo_contract', label: 'MOO Contract', value: carriers['Mutual of Omaha'] === 'active', auto: true },
    { key: 'americo_contract', label: 'Americo Contract', value: carriers['Americo'] === 'active', auto: true },
    { key: 'corebridge_contract', label: 'Corebridge Contract', value: carriers['AIG (Core Bridge)'] === 'active', auto: true },
    { key: 'initial_call_complete', label: 'Initial Call', value: !!agent.initial_call_complete, auto: false },
    { key: 'free_dialer_access', label: 'Free Dialer Access', value: !!agent.free_dialer_access, auto: false },
    { key: 'paid_wavv_dialer_access', label: 'Paid/Wavv Dialer Access', value: !!agent.paid_wavv_dialer_access, auto: false },
    { key: 'sales_training_complete', label: 'Sales Training', value: !!agent.sales_training_complete, auto: false },
    { key: 'system_training_complete', label: 'System Training', value: !!agent.system_training_complete, auto: false },
  ]
}

function getProgress(agent: any) {
  const milestones = getMilestones(agent)
  const completed = milestones.filter(m => m.value).length
  return Math.round((completed / milestones.length) * 100)
}

async function toggleMilestone(agentId: string, field: string, currentValue: boolean, agents: any[], setAgents: any) {
  const { error } = await supabase.from('agents').update({ [field]: !currentValue, updated_at: new Date().toISOString() }).eq('id', agentId)
  if (!error) {
    setAgents((prev: any[]) => prev.map(a => a.id === agentId ? { ...a, [field]: !currentValue } : a))
  }
}

export default function AgentTrackerTab({ agents, setAgents }: { agents: any[], setAgents: any }) {
  return (
    <div>
      {(() => {
        const activeAgents = agents.filter(a => a.current_stage === 'active')
        const avgCompletion = activeAgents.length > 0
          ? Math.round(activeAgents.reduce((sum, a) => sum + getProgress(a), 0) / activeAgents.length)
          : 0
        const fullyOnboarded = activeAgents.filter(a => getProgress(a) === 100).length
        const needsAttention = activeAgents.filter(a => getProgress(a) < 100).length

        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{activeAgents.length}</p>
                <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Agents</p>
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#1A1814', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{avgCompletion}%</p>
                <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Average Completion</p>
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#27AE60', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{fullyOnboarded}</p>
                <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fully Onboarded</p>
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#C0392B', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{needsAttention}</p>
                <p style={{ color: '#6B6966', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Needs Attention</p>
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'visible' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9F7F4', borderBottom: '1px solid #E5E1DA' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', whiteSpace: 'nowrap', width: '140px' }}>Agent</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Progress</th>
                    {getMilestones(activeAgents[0] || {}).map(m => (
                      <th key={m.key} style={{ padding: '10px 14px', textAlign: 'center', fontSize: '10px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', wordWrap: 'break-word', whiteSpace: 'normal' }}>{m.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeAgents.map((agent, i) => {
                    const milestones = getMilestones(agent)
                    const progress = getProgress(agent)
                    return (
                      <tr key={agent.id} style={{ borderBottom: i < activeAgents.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontWeight: '600', color: '#1A1A1A', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          <a href={`/agents/${agent.id}`} style={{ color: '#1A1A1A', textDecoration: 'none', fontWeight: '600' }}>{agent.full_name}</a>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: progress === 100 ? '#27AE60' : progress >= 50 ? '#C9A96E' : '#C0392B' }}>{progress}%</span>
                        </td>
                        {milestones.map(m => (
                          <td key={m.key} style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {m.auto ? (
                              <span style={{ fontSize: '13px' }}>{m.value ? '✅' : '—'}</span>
                            ) : (
                              <span
                                onClick={() => toggleMilestone(agent.id, m.key, m.value, agents, setAgents)}
                                style={{ cursor: 'pointer', fontSize: '13px', padding: '2px 8px', borderRadius: '10px', backgroundColor: m.value ? '#D1FAE5' : '#F5F5F5', color: m.value ? '#166534' : '#AAA', fontWeight: '600', display: 'inline-block' }}
                              >
                                {m.value ? 'Yes' : 'No'}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      })()}
    </div>
  )
}
