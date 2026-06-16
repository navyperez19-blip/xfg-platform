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
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          🏆 Agent Leaderboard
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
          Monthly production rankings · {currentMonth}
        </p>
      </div>

      {/* My Stats Card — only for non-admins */}
      {!isAdmin && myStats && (
        <div style={{ backgroundColor: '#1A1A1A', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#1A1A1A', flexShrink: 0 }}>
              {myRank}
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', marginBottom: '2px' }}>Your Ranking</p>
              <p style={{ fontSize: '13px', color: '#888' }}>#{myRank} out of {leaderboard.length} agents</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#C9A96E' }}>{myStats.mtdPolicies}</div>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MTD Policies</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#C9A96E' }}>${myStats.mtdPremium.toLocaleString()}</div>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MTD AP</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#C9A96E' }}>{myStats.activePolicies}</div>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Policies</div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E5E1DA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>
            MTD Production Rankings
          </h2>
          <span style={{ fontSize: '12px', color: '#888' }}>{leaderboard.length} active agents</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9F7F4' }}>
              {['Rank', 'Agent', 'Model', 'MTD Policies', 'MTD AP', 'Active Policies', 'All-Time AP', 'Progress'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #E5E1DA', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
              {isAdmin && <th style={{ padding: '10px 16px', borderBottom: '1px solid #E5E1DA' }}></th>}
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((agent, i) => {
              const isMe = agent.id === myAgentId
              const barWidth = topPremium > 0 ? Math.round((agent.mtdPremium / topPremium) * 100) : 0
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null

              return (
                <tr
                  key={agent.id}
                  style={{
                    borderBottom: i < leaderboard.length - 1 ? '1px solid #F0EDE8' : 'none',
                    backgroundColor: isMe ? '#FFFBF0' : 'transparent',
                  }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {medal ? (
                        <span style={{ fontSize: '20px' }}>{medal}</span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', fontSize: '12px', fontWeight: '700', backgroundColor: '#F0EDE8', color: '#7A7A7A' }}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: isMe ? '#C9A96E' : '#F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: isMe ? '#1A1A1A' : '#7A7A7A', flexShrink: 0 }}>
                        {agent.full_name?.[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: isMe ? '700' : '600', color: '#1A1A1A' }}>
                          {agent.full_name}
                          {isMe && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#C9A96E', fontWeight: '700' }}>YOU</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', backgroundColor: agent.agent_model === 'independent' ? '#EDE9FE' : '#FEF3C7', color: agent.agent_model === 'independent' ? '#5B21B6' : '#92400E' }}>
                      {agent.agent_model}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: '700', color: '#2196F3' }}>
                    {agent.mtdPolicies}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: agent.mtdPremium > 0 ? '#9C27B0' : '#CCC' }}>
                      ${agent.mtdPremium.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#27AE60' }}>
                    {agent.activePolicies}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: agent.alltimePremium > 0 ? '#1A1A1A' : '#CCC' }}>
                      ${agent.alltimePremium.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', minWidth: '120px' }}>
                    <div style={{ height: '6px', backgroundColor: '#F0EDE8', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, backgroundColor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#C9A96E', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: '#AAA', marginTop: '3px' }}>{barWidth}% of leader</div>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/crm/admin/agents/${agent.id}`} style={{ fontSize: '12px', color: '#C9A96E', textDecoration: 'none', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        View →
                      </Link>
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
