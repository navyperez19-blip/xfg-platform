'use client'

export default function TopPerformersTab({ agents }: { agents: any[] }) {
  const topPerformers = agents.filter(a => a.is_top_performer === true)
  return (
    <div>
      {(() => {
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#7A7A7A', margin: 0 }}>{topPerformers.length} top performers tagged for tracking</p>
            </div>
            {topPerformers.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: '#AAA' }}>No top performers tagged yet. Toggle "Top 1% Performer" on an agent's detail page to add them here.</p>
              </div>
            ) : (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9F7F4', borderBottom: '1px solid #E5E1DA' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase' }}>Agent</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase' }}>Phone</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase' }}>Email</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase' }}>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPerformers.map((agent, i) => (
                      <tr key={agent.id} style={{ borderBottom: i < topPerformers.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '600', fontSize: '13px' }}>
                          <a href={`/agents/${agent.id}`} style={{ color: '#1A1A1A', textDecoration: 'none', fontWeight: '600' }}>{agent.full_name}</a>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '13px', color: '#4A4A4A' }}>{agent.phone || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: '13px', color: '#4A4A4A' }}>{agent.email || '—'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', backgroundColor: agent.current_stage === 'active' ? '#D1FAE5' : '#F3F4F6', color: agent.current_stage === 'active' ? '#065F46' : '#374151' }}>
                            {agent.current_stage}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
