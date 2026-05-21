'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useRouter } from 'next/navigation'
import NotificationBell from '../components/NotificationBell'

const S = {
  page: { minHeight: '100vh', background: '#F5F2ED', color: '#1A1814', fontFamily: 'Georgia, serif' },
  inner: { maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' },
  brand: { color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: '0.5rem' },
  title: { color: '#1A1814', fontSize: '1.8rem', fontWeight: '400', marginBottom: '0.25rem' },
  subtitle: { color: '#6B6966', fontSize: '0.9rem' },
  badge: { display: 'inline-block', background: '#F5EDD9', border: '1px solid #C9A96E', color: '#8B6A2E', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '0.2rem 0.6rem', borderRadius: '4px', marginLeft: '0.5rem' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  signout: { background: 'transparent', border: '1px solid #DDD9D2', color: '#6B6966', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Georgia, serif' },
  navRow: { display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' as const },
  navBtn: { background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#1A1814', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Georgia, serif', textDecoration: 'none', display: 'inline-block' },
  navBtnGold: { background: '#C9A96E', border: '1px solid #C9A96E', color: '#FFFFFF', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Georgia, serif', textDecoration: 'none', display: 'inline-block', fontWeight: '600' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' },
  statCard: { background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '1.5rem', textAlign: 'center' as const },
  statLabel: { color: '#6B6966', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.5rem' },
  statNum: { fontSize: '2.2rem', fontWeight: '400' },
  card: { background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '1.5rem' },
  cardTitle: { color: '#C9A96E', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1rem' },
  permItem: { color: '#6B6966', fontSize: '0.95rem', marginBottom: '0.5rem' },
}

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
    <main style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#6B6966', fontFamily: 'Georgia, serif' }}>Loading...</p>
      </div>
    </main>
  )

  return (
    <main style={S.page}>
      <div style={S.inner}>
        <div style={S.header}>
          <div>
            <p style={S.brand}>XFG · X Financial Group</p>
            <h1 style={S.title}>
              {profile.full_name}
              <span style={S.badge}>{profile.role}</span>
            </h1>
            <p style={S.subtitle}>Agent Operations Platform</p>
          </div>
          <div style={S.headerRight}>
            <NotificationBell />
            <button onClick={() => router.push('/change-password')} style={S.signout}>Settings</button>
            <button onClick={handleLogout} style={S.signout}>Sign Out</button>
          </div>
        </div>

        <div style={S.navRow}>
          <button onClick={() => router.push('/pipeline')} style={S.navBtnGold}>Pipeline</button>
          {['finley', 'executive', 'superadmin'].includes(profile.role) && (
            <button onClick={() => router.push('/agents/new')} style={S.navBtn}>+ New Agent</button>
          )}
          {['executive', 'superadmin'].includes(profile.role) && (
            <button onClick={() => router.push('/analytics')} style={S.navBtn}>Analytics</button>
          )}
          <button onClick={() => router.push('/search')} style={S.navBtn}>Search Agents</button>
        </div>

        <div style={S.statsGrid}>
          <div style={S.statCard}>
            <p style={S.statLabel}>Total Agents</p>
            <p style={{ ...S.statNum, color: '#C9A96E' }}>{stats.total}</p>
          </div>
          <div style={S.statCard}>
            <p style={S.statLabel}>In Pipeline</p>
            <p style={{ ...S.statNum, color: '#1A1814' }}>{stats.pipeline}</p>
          </div>
          <div style={S.statCard}>
            <p style={S.statLabel}>Active</p>
            <p style={{ ...S.statNum, color: '#2D6A4F' }}>{stats.active}</p>
          </div>
        </div>

        <div style={S.card}>
          <p style={S.cardTitle}>Your Access</p>
          {profile.role === 'finley' && (
            <>
              <p style={S.permItem}>· Create and manage new agents</p>
              <p style={S.permItem}>· Track licensing and exam progress</p>
              <p style={S.permItem}>· Schedule onboarding calls</p>
            </>
          )}
          {profile.role === 'joe' && (
            <>
              <p style={S.permItem}>· Verify contracts and agreements</p>
              <p style={S.permItem}>· Confirm dialer and CRM setup</p>
            </>
          )}
          {profile.role === 'jesse' && (
            <>
              <p style={S.permItem}>· Verify all training completions</p>
              <p style={S.permItem}>· Move agents through training</p>
            </>
          )}
          {profile.role === 'noah' && (
            <>
              <p style={S.permItem}>· Conduct activation calls</p>
              <p style={S.permItem}>· Mark agents as Active</p>
            </>
          )}
          {['executive', 'superadmin'].includes(profile.role) && (
            <>
              <p style={S.permItem}>· Full access to all pipeline stages</p>
              <p style={S.permItem}>· Override any stage with audit log</p>
              <p style={S.permItem}>· Assign agent models</p>
              <p style={S.permItem}>· Executive analytics and reporting</p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
