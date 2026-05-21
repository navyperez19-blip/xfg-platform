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
    <nav style={{ background: '#FFFFFF', borderBottom: '1px solid #DDD9D2', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <span style={{ color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Georgia, serif', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
          XFG
        </span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                background: pathname === item.path ? '#F5EDD9' : 'transparent',
                border: pathname === item.path ? '1px solid #DDD9D2' : '1px solid transparent',
                color: pathname === item.path ? '#1A1814' : '#6B6966',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontFamily: 'Georgia, serif',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: '#6B6966', fontSize: '0.75rem', fontFamily: 'Georgia, serif' }}>{profile.full_name}</span>
        <span style={{ background: '#F5EDD9', border: '1px solid #DDD9D2', color: '#8B6A2E', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.5rem', borderRadius: '3px', fontFamily: 'Georgia, serif' }}>{profile.role}</span>
        <button onClick={() => router.push('/change-password')} style={{ background: 'transparent', border: '1px solid #DDD9D2', color: '#6B6966', padding: '0.3rem 0.75rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Georgia, serif' }}>
          Settings
        </button>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #DDD9D2', color: '#6B6966', padding: '0.3rem 0.75rem', borderRadius: '5px', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Georgia, serif' }}>
          Sign Out
        </button>
      </div>
    </nav>
  )
}
