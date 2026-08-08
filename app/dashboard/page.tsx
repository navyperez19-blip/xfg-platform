'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useRouter } from 'next/navigation'
import NotificationBell from '../components/NotificationBell'
import PageSkeleton from '@/app/components/PageSkeleton'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ total: 0, pipeline: 0, active: 0 })
  const [stageStats, setStageStats] = useState({ contacted: 0, licensing: 0, contracting: 0, systemSetup: 0, active: 0 })
  const [weeklySales, setWeeklySales] = useState<{ totalAP: number; totalSales: number; prevWeekAP: number }>({ totalAP: 0, totalSales: 0, prevWeekAP: 0 })
  const [teamLeaderboard, setTeamLeaderboard] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      if (!user) { router.push('/login'); return }
      setProfile(user)
      const { data: agents } = await supabase.from('agents').select('current_stage')
      if (agents) {
        setStats({
          total: agents.length,
          pipeline: agents.filter(a => a.current_stage !== 'active').length,
          active: agents.filter(a => a.current_stage === 'active').length,
        })
      }

      // Stage breakdown
      const { data: allAgents } = await supabase.from('agents').select('id, full_name, current_stage, upline_agent_id, is_leader')
      if (allAgents) {
        setStageStats({
          contacted: allAgents.filter(a => a.current_stage === 'contacted').length,
          licensing: allAgents.filter(a => a.current_stage === 'licensing').length,
          contracting: allAgents.filter(a => a.current_stage === 'contracting').length,
          systemSetup: allAgents.filter(a => a.current_stage === 'system_setup').length,
          active: allAgents.filter(a => a.current_stage === 'active').length,
        })

        // Team leaderboard - leaders with their downline's weekly AP
        const leaders = allAgents.filter(a => a.is_leader === true)
        if (leaders.length > 0) {
          const now = new Date()
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          const weekAgoStr = weekAgo.toISOString().split('T')[0]

          const { data: salesRecords } = await supabase
            .from('discord_sales_records')
            .select('agent_name, amount, sale_date')
            .gte('sale_date', weekAgoStr)

          const teamsData = leaders.map(leader => {
            const teamMemberNames = new Set([
              leader.full_name,
              ...allAgents.filter(a => a.upline_agent_id === leader.id).map(a => a.full_name)
            ])
            const teamSales = (salesRecords || []).filter(r => teamMemberNames.has(r.agent_name))
            const totalAP = teamSales.reduce((sum, r) => sum + Number(r.amount), 0)
            return {
              leaderName: leader.full_name,
              leaderId: leader.id,
              memberCount: teamMemberNames.size,
              totalAP: Math.round(totalAP * 100) / 100,
            }
          }).sort((a, b) => b.totalAP - a.totalAP).slice(0, 5)

          setTeamLeaderboard(teamsData)
        }
      }

      // Weekly sales totals + previous week comparison
      const nowForSales = new Date()
      const weekAgoForSales = new Date(nowForSales)
      weekAgoForSales.setDate(weekAgoForSales.getDate() - 7)
      const twoWeeksAgo = new Date(nowForSales)
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

      const { data: thisWeekSales } = await supabase
        .from('discord_sales_records')
        .select('amount')
        .gte('sale_date', weekAgoForSales.toISOString().split('T')[0])

      const { data: prevWeekSales } = await supabase
        .from('discord_sales_records')
        .select('amount')
        .gte('sale_date', twoWeeksAgo.toISOString().split('T')[0])
        .lt('sale_date', weekAgoForSales.toISOString().split('T')[0])

      const thisWeekTotal = (thisWeekSales || []).reduce((sum, r) => sum + Number(r.amount), 0)
      const prevWeekTotal = (prevWeekSales || []).reduce((sum, r) => sum + Number(r.amount), 0)

      setWeeklySales({
        totalAP: Math.round(thisWeekTotal * 100) / 100,
        totalSales: (thisWeekSales || []).length,
        prevWeekAP: Math.round(prevWeekTotal * 100) / 100,
      })
    }
    load()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) return <PageSkeleton />

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '600', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>XFG · X Financial Group</p>
            <h1 style={{ color: '#1A1814', fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>Welcome back, {profile.full_name}</h1>
            <p style={{ color: '#6B6966', fontSize: '0.9rem' }}>Agent Operations Platform</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ background: '#F5EDD9', color: '#8B6A2E', fontSize: '0.72rem', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: '20px' }}>{profile.role}</span>
            <NotificationBell />
            <button onClick={() => router.push('/change-password')} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Settings</button>
            <button onClick={handleLogout} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Sign Out</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/pipeline')} style={{ background: '#C9A96E', border: 'none', color: '#FFFFFF', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>Pipeline</button>
          <button onClick={() => router.push('/crm')} style={{ background: '#C9A96E', border: 'none', color: '#FFFFFF', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>Production CRM</button>
          {['finley', 'executive', 'superadmin'].includes(profile.role) && (
            <button onClick={() => router.push('/agents/new')} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#1A1814', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>+ New Agent</button>
          )}
          {['executive', 'superadmin'].includes(profile.role) && (
            <button onClick={() => router.push('/analytics')} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#1A1814', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Analytics</button>
          )}
          {['executive', 'superadmin'].includes(profile.role) && (
            <button onClick={() => router.push('/tasks')} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#1A1814', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>✅ Tasks</button>
          )}
          <button onClick={() => router.push('/search')} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#1A1814', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Search Agents</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px 0' }}>XFG · Team Overview</p>
            <p style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>Agency Performance</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1A1A1A', padding: '5px 12px', borderRadius: '20px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ADE80' }} />
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#C9A96E', letterSpacing: '0.04em' }}>LIVE</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div onClick={() => router.push('/pipeline')} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '14px 16px', cursor: 'pointer' }}>
            <p style={{ fontSize: '12px', color: '#8A8780', margin: '0 0 6px 0' }}>Active Agents</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 8px 0' }}>{stats.active}</p>
            <div style={{ height: '4px', backgroundColor: '#F0EDE5', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${stats.total > 0 ? Math.min(100, (stats.active / stats.total) * 100) : 0}%`, height: '100%', backgroundColor: '#C9A96E' }} />
            </div>
          </div>
          <div onClick={() => router.push('/analytics')} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '14px 16px', cursor: 'pointer' }}>
            <p style={{ fontSize: '12px', color: '#8A8780', margin: '0 0 6px 0' }}>Weekly AP</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 8px 0' }}>${weeklySales.totalAP.toLocaleString()}</p>
            <div style={{ height: '4px', backgroundColor: '#F0EDE5', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${weeklySales.prevWeekAP > 0 ? Math.min(100, (weeklySales.totalAP / (weeklySales.prevWeekAP * 1.5)) * 100) : 50}%`, height: '100%', backgroundColor: weeklySales.totalAP >= weeklySales.prevWeekAP ? '#4ADE80' : '#E67E5A' }} />
            </div>
          </div>
          <div onClick={() => router.push('/analytics')} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '14px 16px', cursor: 'pointer' }}>
            <p style={{ fontSize: '12px', color: '#8A8780', margin: '0 0 6px 0' }}>Policies Sold</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 8px 0' }}>{weeklySales.totalSales}</p>
            <div style={{ height: '4px', backgroundColor: '#F0EDE5', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: '55%', height: '100%', backgroundColor: '#C9A96E' }} />
            </div>
          </div>
          <div onClick={() => router.push('/pipeline')} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '14px 16px', cursor: 'pointer' }}>
            <p style={{ fontSize: '12px', color: '#8A8780', margin: '0 0 6px 0' }}>In Pipeline</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 8px 0' }}>{stats.pipeline}</p>
            <div style={{ height: '4px', backgroundColor: '#F0EDE5', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${stats.total > 0 ? Math.min(100, (stats.pipeline / stats.total) * 100) : 0}%`, height: '100%', backgroundColor: '#4ADE80' }} />
            </div>
          </div>
        </div>

        <p style={{ fontSize: '12px', fontWeight: '700', color: '#8A8780', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px 0' }}>Pipeline Flow</p>
        <div onClick={() => router.push('/pipeline')} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '26px', cursor: 'pointer' }}>
          {[
            { label: 'Contacted', count: stageStats.contacted, color: '#E6D5B0' },
            { label: 'Licensing', count: stageStats.licensing, color: '#DCC28C' },
            { label: 'Contracting', count: stageStats.contracting, color: '#C9A96E' },
            { label: 'System Setup', count: stageStats.systemSetup, color: '#B8935A' },
            { label: 'Active', count: stageStats.active, color: '#4ADE80' },
          ].map(stage => {
            const max = Math.max(stageStats.contacted, stageStats.licensing, stageStats.contracting, stageStats.systemSetup, stageStats.active, 1)
            return (
              <div key={stage.label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 36px', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#52514E' }}>{stage.label}</span>
                <div style={{ height: '10px', backgroundColor: '#F0EDE5', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${(stage.count / max) * 100}%`, height: '100%', backgroundColor: stage.color, borderRadius: '5px' }} />
                </div>
                <span style={{ fontSize: '12px', color: '#1A1A1A', textAlign: 'right' as const }}>{stage.count}</span>
              </div>
            )
          })}
        </div>

        {teamLeaderboard.length > 0 && (
          <>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#8A8780', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px 0' }}>Team Production This Week</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teamLeaderboard.map((team, i) => {
                const initials = team.leaderName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div
                    key={team.leaderId}
                    onClick={() => router.push(`/agents/${team.leaderId}`)}
                    style={{
                      backgroundColor: i === 0 ? '#1A1A1A' : '#FFFFFF',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      display: 'grid',
                      gridTemplateColumns: '20px 34px 1fr 80px',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700', color: i === 0 ? '#C9A96E' : '#8A8780' }}>{i + 1}</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: i === 0 ? '#C9A96E' : '#F0EDE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: i === 0 ? '#1A1A1A' : '#52514E' }}>
                      {initials}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: i === 0 ? '#FFFFFF' : '#1A1A1A', margin: 0 }}>{team.leaderName}'s Team</p>
                      <p style={{ fontSize: '10px', color: '#8A8780', margin: '1px 0 0 0' }}>{team.memberCount} agent{team.memberCount !== 1 ? 's' : ''}</p>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: i === 0 ? '#FFFFFF' : '#1A1A1A', margin: 0, textAlign: 'right' as const }}>${team.totalAP.toLocaleString()}</p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
