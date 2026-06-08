'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  agentId: string
}

export default function Notes({ agentId }: Props) {
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
        setCurrentUser(profile)
      }
      const { data } = await supabase
        .from('notes')
        .select('*, users(full_name)')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
      setNotes(data || [])
    }
    load()
  }, [agentId])

  const addNote = async () => {
    if (!newNote.trim() || !currentUser) return
    setAdding(true)
    const { data: inserted } = await supabase
      .from('notes')
      .insert({ agent_id: agentId, user_id: currentUser.id, content: newNote.trim() })
      .select('*, users(full_name)')
      .single()
    if (inserted) {
      setNotes(prev => [inserted, ...prev])
      setNewNote('')
    }
    setAdding(false)
  }

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
          placeholder="Add an internal note..."
          style={{ flex: 1, background: '#F0EDE8', border: '1px solid #DDD9D2', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'Inter, sans-serif', color: '#1A1814' }}
        />
        <button
          onClick={addNote}
          disabled={adding || !newNote.trim()}
          style={{ background: '#C9A96E', border: 'none', color: '#FFFFFF', padding: '10px 18px', borderRadius: '8px', cursor: adding ? 'default' : 'pointer', fontSize: '14px', fontWeight: '600', opacity: adding || !newNote.trim() ? 0.6 : 1, fontFamily: 'Inter, sans-serif' }}
        >
          {adding ? '...' : 'Add'}
        </button>
      </div>

      {notes.length === 0 ? (
        <p style={{ color: '#9A9890', fontSize: '14px' }}>No notes yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notes.map(note => (
            <div key={note.id} style={{ background: '#F5F2ED', border: '1px solid #EBE8E3', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <p style={{ color: '#1A1814', fontSize: '14px', lineHeight: '1.5', flex: 1 }}>{note.content}</p>
                <button
                  onClick={() => deleteNote(note.id)}
                  style={{ background: 'transparent', border: 'none', color: '#DDD9D2', cursor: 'pointer', fontSize: '14px', padding: '0', flexShrink: 0, lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#8B2635')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#DDD9D2')}
                >
                  ✕
                </button>
              </div>
              <p style={{ color: '#9A9890', fontSize: '11px', marginTop: '6px' }}>
                {note.users?.full_name || 'Admin'} · {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(note.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
