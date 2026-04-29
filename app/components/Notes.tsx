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
      <h2 className="text-lg font-semibold mb-4">Notes</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
          placeholder="Add a note..."
          className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
        />
        <button
          onClick={addNote}
          disabled={saving || !newNote.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm transition disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {loading ? (
        <p className="text-gray-400 text-sm">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="text-gray-400 text-sm">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="bg-gray-800 p-3 rounded-xl">
              <p className="text-sm text-white">{note.content}</p>
              <p className="text-xs text-gray-500 mt-1">
                {note.users?.full_name || 'Admin'} · {new Date(note.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
