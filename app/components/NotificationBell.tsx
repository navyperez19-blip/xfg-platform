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

      const channel = supabase
        .channel('notifications-' + user.id)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        }, () => {
          setUnreadCount(prev => prev + 1)
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        }, async () => {
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', user.id)
            .eq('is_read', false)
          setUnreadCount(count || 0)
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
    load()
  }, [])

  return (
    <button
      onClick={() => router.push('/notifications')}
      style={{ position: 'relative', background: 'transparent', border: '1px solid #EBE8E3', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
    >
      <span style={{ fontSize: '1rem' }}>🔔</span>
      {unreadCount > 0 && (
        <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#C9A96E', color: '#FFFFFF', fontSize: '0.65rem', fontWeight: '700', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
