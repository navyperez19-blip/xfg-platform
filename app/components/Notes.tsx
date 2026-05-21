'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface NotesProps {
  agentId: string
}

export default function Notes({ agentId }: NotesProps) {
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadNotes = async () => {
      const { data } = await supabase
        .from('notes')
        .select('*, users(full_name)')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
      setNotes(data || [])
      setLoading(false)
    }
    loadNotes()
  }, [agentId])

  const addNote = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data, error } = await supabase
      .from('notes')
      .insert({
        agent_id: agentId,
        author_id: user.id,
        content: newNote.trim(),
        is_internal: true
      })
      .select('*, users(full_name)')
      .single()
    if (!error && data) {
      setNotes(prev => [data, ...prev])
      setNewNote('')
    }
    setSaving(false)
  }

  return (
    <div>
      <p style={{ color: '#C9A96E', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'Georgia, serif' }}>Notes</p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
          placeholder="Add a note..."
          style={{ flex: 1, background: '#EDEAE4', color: '#1A1814', border: '1px solid #DDD9D2', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', fontFamily: 'Georgia, serif', outline: 'none' }}
        />
        <button
          onClick={addNote}
          disabled={saving || !newNote.trim()}
          style={{ background: '#C9A96E', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontFamily: 'Georgia, serif', fontWeight: '600', cursor: saving || !newNote.trim() ? 'not-allowed' : 'pointer', opacity: saving || !newNote.trim() ? 0.5 : 1 }}
        >
          Add
        </button>
      </div>
      {loading ? (
        <p style={{ color: '#6B6966', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>Loading notes...</p>
      ) : notes.length === 0 ? (
        <p style={{ color: '#6B6966', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>No notes yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notes.map(note => (
            <div key={note.id} style={{ background: '#EDEAE4', border: '1px solid #DDD9D2', borderRadius: '6px', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <p style={{ color: '#1A1814', fontSize: '0.85rem', fontFamily: 'Georgia, serif', flex: 1 }}>{note.content}</p>
                <button
                  onClick={async () => {
                    if (!confirm('Delete this note?')) return
                    await supabase.from('notes').delete().eq('id', note.id)
                    setNotes(prev => prev.filter(n => n.id !== note.id))
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#9A9890', cursor: 'pointer', fontSize: '0.8rem', padding: '0', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
              <p style={{ color: '#9A9890', fontSize: '0.72rem', fontFamily: 'Georgia, serif', marginTop: '0.35rem' }}>
                {note.users?.full_name || 'Admin'} · {new Date(note.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
