'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data || [])
    }
    load()
  }, [])

  const markAllRead = async () => {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative bg-gray-800 hover:bg-gray-700 p-2 rounded-xl transition"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-xl z-50">
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No notifications</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-800 ${!n.is_read ? 'bg-blue-900 bg-opacity-20' : ''}`}
                >
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
