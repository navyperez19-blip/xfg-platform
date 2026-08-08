'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useRouter } from 'next/navigation'
import NotificationBell from '../components/NotificationBell'

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

  if (!profile) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Inter, sans-serif' }}>Loading...</p>
    </main>
  )

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
          <button onClick={() => router.push('/search')} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#1A1814', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Search Agents</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <p style={{ color: '#6B6966', fontSize: '0.8rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Total Agents</p>
            <p style={{ color: '#C9A96E', fontSize: '2.5rem', fontWeight: '700', lineHeight: 1 }}>{stats.total}</p>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <p style={{ color: '#6B6966', fontSize: '0.8rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>In Pipeline</p>
            <p style={{ color: '#1A1814', fontSize: '2.5rem', fontWeight: '700', lineHeight: 1 }}>{stats.pipeline}</p>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <p style={{ color: '#6B6966', fontSize: '0.8rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Active Agents</p>
            <p style={{ color: '#2D6A4F', fontSize: '2.5rem', fontWeight: '700', lineHeight: 1 }}>{stats.active}</p>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ color: '#C9A96E', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Your Access Level</p>
          {profile.role === 'finley' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <p style={{ color: '#1A1814', fontSize: '0.9rem' }}>✓ Create and manage agents</p>
              <p style={{ color: '#1A1814', fontSize: '0.9rem' }}>✓ Track licensing progress</p>
              <p style={{ color: '#1A1814', fontSize: '0.9rem' }}>✓ Schedule onboarding calls</p>
              <p style={{ color: '#1A1814', fontSize: '0.9rem' }}>✓ Move agents through licensing</p>
            </div>
          )}
          {['executive', 'superadmin'].includes(profile.role) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <p style={{ color: '#1A1814', fontSize: '0.9rem' }}>✓ Full access to all stages</p>
              <p style={{ color: '#1A1814', fontSize: '0.9rem' }}>✓ Override any stage with audit log</p>
              <p style={{ color: '#1A1814', fontSize: '0.9rem' }}>✓ Assign agent models</p>
              <p style={{ color: '#1A1814', fontSize: '0.9rem' }}>✓ Executive analytics and reporting</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
