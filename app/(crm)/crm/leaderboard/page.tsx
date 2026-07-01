'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

export default function LeaderboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [myAgentId, setMyAgentId] = useState<string | null>(null)
  const [currentMonth] = useState(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase
        .from('users').select('id, role').eq('id', user.id).single()

      const adminRoles = ['superadmin', 'executive']
      const admin = adminRoles.includes(userRecord?.role ?? '')
      setIsAdmin(admin)

      const { data: agentRecord } = await supabase
        .from('agents').select('id').eq('user_id', user.id).single()

      setMyAgentId(agentRecord?.id ?? null)

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

      // Use security definer function to bypass RLS for leaderboard
      const { data: leaderboardData } = await supabase
        .rpc('get_leaderboard_data', { month_start: startOfMonth })

      const stats = (leaderboardData ?? []).map((row: any) => ({
        id: row.agent_id,
        full_name: row.full_name,
        agent_model: row.agent_model,
        mtdPolicies: Number(row.mtd_policies),
        mtdPremium: Number(row.mtd_premium),
        activePolicies: Number(row.active_policies),
        totalPolicies: Number(row.total_policies),
        alltimePremium: Number(row.alltime_premium),
      }))

      setLeaderboard(stats)
      setLoading(false)
    }
    load()
  }, [router])

  // Real-time subscription for leaderboard
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'crm_policies',
      }, async () => {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const { data: leaderboardData } = await supabase
          .rpc('get_leaderboard_data', { month_start: startOfMonth })
        const stats = (leaderboardData ?? []).map((row: any) => ({
          id: row.agent_id,
          full_name: row.full_name,
          agent_model: row.agent_model,
          mtdPolicies: Number(row.mtd_policies),
          mtdPremium: Number(row.mtd_premium),
          activePolicies: Number(row.active_policies),
          totalPolicies: Number(row.total_policies),
          alltimePremium: Number(row.alltime_premium),
        }))
        setLeaderboard(stats)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  const myRank = leaderboard.findIndex(a => a.id === myAgentId) + 1
  const myStats = leaderboard.find(a => a.id === myAgentId)
  const topPremium = leaderboard[0]?.mtdPremium ?? 0

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 0 48px 0' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 4px 0' }}>🏆 Agent Leaderboard</h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A', margin: 0 }}>Monthly production rankings · {currentMonth}</p>
      </div>

      {/* MTD SECTION */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EBE8E3', overflow: 'hidden', marginBottom: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EBE8E3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 2px 0' }}>📅 MTD Production Rankings</h2>
            <p style={{ fontSize: '12px', color: '#7A7A7A', margin: 0 }}>{leaderboard.filter(a => a.mtdPremium > 0).length} agents with production this month · {leaderboard.length} total active</p>
          </div>
          <div style={{ fontSize: '12px', color: '#7A7A7A', backgroundColor: '#F5F2ED', padding: '6px 12px', borderRadius: '20px' }}>
            Resets monthly
          </div>
        </div>

        {/* Producers this month */}
        {leaderboard.filter(a => a.mtdPremium > 0).length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px 0' }}>🚀</p>
            <p style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 6px 0' }}>No production yet this month</p>
            <p style={{ fontSize: '13px', color: '#7A7A7A', margin: 0 }}>Be the first to write a policy in {currentMonth}!</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9F7F4' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>Rank</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Policies</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MTD AP</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress</th>
                {isAdmin && <th style={{ padding: '10px 16px', width: '80px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {leaderboard.filter(a => a.mtdPremium > 0).map((agent, index) => {
                const isMe = agent.id === myAgentId
                const topPremium = leaderboard.filter(a => a.mtdPremium > 0)[0]?.mtdPremium ?? 0
                const progress = topPremium > 0 ? (agent.mtdPremium / topPremium) * 100 : 0
                const rank = index + 1
                const barColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#C9A96E'
                return (
                  <tr key={agent.id} style={{ backgroundColor: isMe ? '#FFFBF0' : '#FFFFFF', borderTop: '1px solid #F0EDE8' }}>
                    <td style={{ padding: '14px 16px' }}>
                      {rank === 1 ? <span style={{ fontSize: '22px' }}>🥇</span> : rank === 2 ? <span style={{ fontSize: '22px' }}>🥈</span> : rank === 3 ? <span style={{ fontSize: '22px' }}>🥉</span> : (
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#7A7A7A' }}>{rank}</div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#1A1A1A', flexShrink: 0 }}>
                          {agent.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>{agent.full_name}</span>
                            {isMe && <span style={{ fontSize: '10px', fontWeight: '700', backgroundColor: '#C9A96E', color: '#1A1A1A', padding: '1px 6px', borderRadius: '10px' }}>YOU</span>}
                          </div>
                          <span style={{ fontSize: '11px', color: '#AAA' }}>{agent.agent_model === 'independent' ? 'Independent' : 'Supported'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#2196F3' }}>{agent.mtdPolicies}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#7C3AED' }}>${agent.mtdPremium.toLocaleString()}</span>
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: '140px' }}>
                      <div style={{ height: '6px', backgroundColor: '#F0EDE8', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                        <div style={{ height: '100%', width: `${progress}%`, backgroundColor: barColor, borderRadius: '3px' }} />
                      </div>
                      <p style={{ fontSize: '10px', color: '#AAA', margin: 0, textAlign: 'right' }}>{Math.round(progress)}% of leader</p>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <a href={`/crm/admin/agents/${agent.id}`} style={{ fontSize: '12px', color: '#C9A96E', fontWeight: '600', textDecoration: 'none' }}>View →</a>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Separator */}
        {leaderboard.filter(a => a.mtdPremium > 0).length > 0 && leaderboard.filter(a => a.mtdPremium === 0).length > 0 && (
          <div style={{ padding: '10px 24px', backgroundColor: '#F9F7F4', borderTop: '1px solid #EBE8E3', borderBottom: '1px solid #EBE8E3' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#AAA', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No MTD production yet</p>
          </div>
        )}

        {/* Zero producers */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {leaderboard.filter(a => a.mtdPremium === 0).map((agent) => {
              const isMe = agent.id === myAgentId
              return (
                <tr key={agent.id} style={{ backgroundColor: isMe ? '#FFFBF0' : '#FFFFFF', borderTop: '1px solid #F0EDE8' }}>
                  <td style={{ padding: '12px 16px', width: '60px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#CCC' }}>—</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#AAA', flexShrink: 0 }}>
                        {agent.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#AAA' }}>{agent.full_name}</span>
                        {isMe && <span style={{ fontSize: '10px', fontWeight: '700', backgroundColor: '#C9A96E', color: '#1A1A1A', padding: '1px 6px', borderRadius: '10px' }}>YOU</span>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#CCC' }}>0</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', color: '#CCC' }}>$0</span>
                  </td>
                  <td style={{ padding: '12px 16px', minWidth: '140px' }}>
                    <div style={{ height: '6px', backgroundColor: '#F0EDE8', borderRadius: '3px' }} />
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <a href={`/crm/admin/agents/${agent.id}`} style={{ fontSize: '12px', color: '#C9A96E', fontWeight: '600', textDecoration: 'none' }}>View →</a>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ALL-TIME SECTION */}
      <div style={{ backgroundColor: '#1A1A1A', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #2D2D2D' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#C9A96E', margin: '0 0 2px 0' }}>⭐ All-Time Leaders</h2>
          <p style={{ fontSize: '12px', color: '#7A7A7A', margin: 0 }}>Total AP written since joining XFG</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#111111' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>Rank</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>All-Time AP</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Policies</th>
              {isAdmin && <th style={{ padding: '10px 16px', width: '80px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {[...leaderboard].sort((a, b) => b.alltimePremium - a.alltimePremium).filter(a => a.alltimePremium > 0).slice(0, 10).map((agent, index) => {
              const isMe = agent.id === myAgentId
              const topAlltime = [...leaderboard].sort((a, b) => b.alltimePremium - a.alltimePremium)[0]?.alltimePremium ?? 0
              const progress = topAlltime > 0 ? (agent.alltimePremium / topAlltime) * 100 : 0
              const rank = index + 1
              return (
                <tr key={agent.id} style={{ backgroundColor: isMe ? '#2A2500' : 'transparent', borderTop: '1px solid #2D2D2D' }}>
                  <td style={{ padding: '14px 16px' }}>
                    {rank === 1 ? <span style={{ fontSize: '22px' }}>🥇</span> : rank === 2 ? <span style={{ fontSize: '22px' }}>🥈</span> : rank === 3 ? <span style={{ fontSize: '22px' }}>🥉</span> : (
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#2D2D2D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#555' }}>{rank}</div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#2D2D2D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#C9A96E', flexShrink: 0 }}>
                        {agent.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{agent.full_name}</span>
                          {isMe && <span style={{ fontSize: '10px', fontWeight: '700', backgroundColor: '#C9A96E', color: '#1A1A1A', padding: '1px 6px', borderRadius: '10px' }}>YOU</span>}
                        </div>
                        <div style={{ height: '4px', backgroundColor: '#2D2D2D', borderRadius: '2px', overflow: 'hidden', marginTop: '4px', width: '80px' }}>
                          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#C9A96E', borderRadius: '2px' }} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#C9A96E' }}>${agent.alltimePremium.toLocaleString()}</span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#7A7A7A' }}>{agent.totalPolicies}</span>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <a href={`/crm/admin/agents/${agent.id}`} style={{ fontSize: '12px', color: '#C9A96E', fontWeight: '600', textDecoration: 'none' }}>View →</a>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
