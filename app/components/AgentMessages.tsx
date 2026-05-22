'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  agentId: string
  agentEmail: string
  agentName: string
  isAdminView: boolean
}

export default function AgentMessages({ agentId, agentEmail, agentName, isAdminView }: Props) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
        setCurrentUser(profile)
      }

      const { data } = await supabase
        .from('agent_messages')
        .select('*, users(full_name, role)')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: true })

      setMessages(data || [])

      if (!isAdminView) {
        await supabase
          .from('agent_messages')
          .update({ is_read: true })
          .eq('agent_id', agentId)
          .eq('is_read', false)
      }
    }
    load()
  }, [agentId, isAdminView])

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return
    setSending(true)

    const { data: inserted } = await supabase
      .from('agent_messages')
      .insert({
        agent_id: agentId,
        sent_by: currentUser.id,
        message: newMessage.trim(),
      })
      .select('*, users(full_name, role)')
      .single()

    if (inserted) {
      setMessages(prev => [...prev, inserted])
      setNewMessage('')

      await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentEmail,
          agentName,
          senderName: currentUser.full_name,
          message: newMessage.trim(),
        })
      })
    }

    setSending(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
        {messages.length === 0 && (
          <p style={{ color: '#9A9890', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>No messages yet.</p>
        )}
        {messages.map(msg => {
          const isAdmin = msg.users?.role !== 'agent'
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
              <div style={{ background: isAdmin ? '#C9A96E' : '#F0EDE8', borderRadius: isAdmin ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '0.75rem 1rem', maxWidth: '80%' }}>
                <p style={{ color: isAdmin ? '#FFFFFF' : '#1A1814', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{msg.message}</p>
                <p style={{ color: isAdmin ? 'rgba(255,255,255,0.7)' : '#9A9890', fontSize: '0.72rem' }}>
                  {msg.users?.full_name} · {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {isAdminView && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Write a message to this agent..."
            style={{ flex: 1, background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.875rem', outline: 'none', fontFamily: 'Inter, sans-serif' }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            style={{ background: '#C9A96E', border: 'none', color: '#FFFFFF', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: sending ? 'default' : 'pointer', fontSize: '0.875rem', fontWeight: '600', opacity: sending || !newMessage.trim() ? 0.6 : 1 }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      )}
    </div>
  )
}
