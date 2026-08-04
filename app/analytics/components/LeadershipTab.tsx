'use client'

export default function LeadershipTab({ agents }: { agents: any[] }) {
  const leaders = agents.filter(a => a.is_leader === true)
  return (
    <div>
      {(() => {
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#7A7A7A', margin: 0 }}>{leaders.length} leaders tagged for tracking</p>
            </div>
            {leaders.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: '#AAA' }}>No leaders tagged yet. Toggle "Leadership Team" on an agent's detail page to add them here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                {leaders.map(leader => {
                  const team = agents.filter(a => a.upline_agent_id === leader.id)
                  return (
                    <div key={leader.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '18px 20px' }}>
                      <a href={`/agents/${leader.id}`} style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', textDecoration: 'none' }}>{leader.full_name}</a>
                      <p style={{ fontSize: '12px', color: '#7A7A7A', margin: '2px 0 12px 0' }}>{team.length} team member{team.length !== 1 ? 's' : ''}</p>
                      {team.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {team.map(member => (
                            <a key={member.id} href={`/agents/${member.id}`} style={{ fontSize: '13px', color: '#1A1A1A', textDecoration: 'none', padding: '6px 10px', backgroundColor: '#F9F7F4', borderRadius: '6px' }}>
                              {member.full_name}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#CCC', margin: 0 }}>No team members yet</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
