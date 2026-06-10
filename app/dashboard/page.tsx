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
