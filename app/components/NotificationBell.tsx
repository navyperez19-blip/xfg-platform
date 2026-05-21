'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useRouter } from 'next/navigation'

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      if (!user) return
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)
      setUnreadCount(count || 0)
    }
    load()
  }, [])

  return (
    <button
      onClick={() => router.push('/notifications')}
      style={{ position: 'relative', background: 'transparent', border: '1px solid #DDD9D2', borderRadius: '6px', padding: '0.35rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
    >
      <span style={{ fontSize: '1rem' }}>🔔</span>
      {unreadCount > 0 && (
        <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#E07070', color: '#fff', fontSize: '0.65rem', fontWeight: '700', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
