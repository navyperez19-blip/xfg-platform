'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'

export default function NavBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      setProfile(user)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) return null
  if (profile.role === 'agent') return null

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Pipeline', path: '/pipeline' },
    { label: 'Search', path: '/search' },
    ...((['executive', 'superadmin'].includes(profile.role)) ? [{ label: 'Analytics', path: '/analytics' }] : []),
    ...((['finley', 'executive', 'superadmin'].includes(profile.role)) ? [{ label: '+ New Agent', path: '/agents/new' }] : []),
  ]

  return (
    <nav style={{ background: '#FFFFFF', borderBottom: '1px solid #EBE8E3', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <span style={{ color: '#C9A96E', fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
          XFG
        </span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                background: pathname === item.path ? '#F5EDD9' : 'transparent',
                border: 'none',
                color: pathname === item.path ? '#8B6A2E' : '#6B6966',
                padding: '0.4rem 0.875rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: pathname === item.path ? '600' : '500',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: '#6B6966', fontSize: '0.875rem', fontWeight: '500' }}>{profile.full_name}</span>
        <span style={{ background: '#F5EDD9', color: '#8B6A2E', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>{profile.role}</span>
        <button onClick={() => router.push('/change-password')} style={{ background: 'transparent', border: '1px solid #EBE8E3', color: '#6B6966', padding: '0.35rem 0.875rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500', fontFamily: 'Inter, sans-serif' }}>
          Settings
        </button>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #EBE8E3', color: '#6B6966', padding: '0.35rem 0.875rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500', fontFamily: 'Inter, sans-serif' }}>
          Sign Out
        </button>
      </div>
    </nav>
  )
}
