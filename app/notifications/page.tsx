'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useRouter } from 'next/navigation'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      if (!user) { router.push('/login'); return }
      if (user.role === 'sales_director') { router.push('/pipeline'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('notifications')
        .select('*, agents(full_name, xfg_id, current_stage)')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })

      setNotifications(data || [])
      setLoading(false)

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)
    }
    load()
  }, [router])

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = async () => {
    if (!userId) return
    await supabase.from('notifications').delete().eq('recipient_id', userId)
    setNotifications([])
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      stage_change: '#C9A96E',
      agent_stuck: '#E07070',
      submission_reviewed: '#6FCF97',
      activation: '#6FCF97',
      override_logged: '#E07070',
    }
    return colors[type] || '#9A9890'
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      stage_change: 'Stage Change',
      agent_stuck: 'Agent Stuck',
      submission_reviewed: 'Submission',
      activation: 'Activation',
      override_logged: 'Override',
    }
    return labels[type] || type
  }

  const STAGE_LABELS: Record<string, string> = {
    contacted: 'Contacted', licensing: 'Licensing',
    onboarding: 'Onboarding', contracting: 'Contracting', system_setup: 'System Setup',
    training: 'Training', activation: 'Activation', active: 'Active'
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6966', fontFamily: 'Georgia, serif' }}>Loading notifications...</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', color: '#1A1814', fontFamily: 'Georgia, serif', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#6B6966', fontSize: '0.85rem', fontFamily: 'Georgia, serif', cursor: 'pointer', marginBottom: '1.5rem', padding: '0' }}>
          ← Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <p style={{ color: '#C9A96E', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>XFG · X Financial Group</p>
            <h1 style={{ color: '#1A1814', fontSize: '1.6rem', fontWeight: '400', marginBottom: '0.2rem' }}>Notifications</h1>
            <p style={{ color: '#6B6966', fontSize: '0.85rem' }}>{notifications.length} total</p>
          </div>
          {notifications.length > 0 && (
            <button onClick={clearAll} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', color: '#6B6966', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>
              Clear All
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: '#6B6966', fontSize: '0.9rem' }}>No notifications yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.map(n => (
              <div key={n.id} style={{ background: '#FFFFFF', border: '1px solid #DDD9D2', borderRadius: '10px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getTypeColor(n.type), flexShrink: 0, marginTop: '0.4rem' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div>
                      <span style={{ background: '#F5EDD9', border: `1px solid ${getTypeColor(n.type)}`, color: getTypeColor(n.type), fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.5rem', borderRadius: '3px', marginRight: '0.5rem' }}>
                        {getTypeLabel(n.type)}
                      </span>
                      {n.agents && (
                        <span style={{ color: '#C9A96E', fontSize: '0.75rem', fontFamily: 'monospace', cursor: 'pointer' }} onClick={() => n.agents && router.push(`/agents/${n.agent_id}`)}>
                          {n.agents.xfg_id}
                        </span>
                      )}
                    </div>
                    <button onClick={() => deleteNotification(n.id)} style={{ background: 'transparent', border: 'none', color: '#9A9890', cursor: 'pointer', fontSize: '0.8rem', padding: '0' }}>✕</button>
                  </div>
                  <p style={{ color: '#1A1814', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{n.title}</p>
                  <p style={{ color: '#6B6966', fontSize: '0.8rem', marginBottom: '0.4rem' }}>{n.message}</p>
                  {n.agents && (
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#9A9890' }}>
                      <span>{n.agents.full_name}</span>
                      <span>Stage: {STAGE_LABELS[n.agents.current_stage] || n.agents.current_stage}</span>
                    </div>
                  )}
                  <p style={{ color: '#9A9890', fontSize: '0.72rem', marginTop: '0.4rem' }}>{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
