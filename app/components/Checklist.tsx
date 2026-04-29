'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface ChecklistProps {
  agentId: string
  stage: string
}

export default function Checklist({ agentId, stage }: ChecklistProps) {
  const [items, setItems] = useState<any[]>([])
  const [progress, setProgress] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: checklistItems, error: e1 } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('stage', stage)
        .order('display_order')

      if (e1) { setError(e1.message); setLoading(false); return }

      const { data: progressData, error: e2 } = await supabase
        .from('agent_checklist_progress')
        .select('*')
        .eq('agent_id', agentId)

      if (e2) { setError(e2.message); setLoading(false); return }

      setItems(checklistItems || [])
      setProgress(progressData || [])
      setLoading(false)
    }
    load()
  }, [agentId, stage])

  const getStatus = (itemId: string) => {
    const p = progress.find(p => p.checklist_item_id === itemId)
    return p ? p.status : 'not_started'
  }

  const toggleItem = async (itemId: string) => {
    const current = getStatus(itemId)
    const newStatus = current === 'approved' ? 'not_started' : 'approved'
    const existing = progress.find(p => p.checklist_item_id === itemId)
    if (existing) {
      await supabase
        .from('agent_checklist_progress')
        .update({ status: newStatus, completed_at: newStatus === 'approved' ? new Date().toISOString() : null })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('agent_checklist_progress')
        .insert({ agent_id: agentId, checklist_item_id: itemId, status: newStatus, completed_at: newStatus === 'approved' ? new Date().toISOString() : null })
    }
    setProgress(prev => {
      const updated = prev.filter(p => p.checklist_item_id !== itemId)
      return [...updated, { checklist_item_id: itemId, status: newStatus }]
    })
  }

  const allComplete = items.filter(i => i.is_required).every(i => getStatus(i.id) === 'approved')

  if (loading) return (
    <div className="text-yellow-400 text-sm p-2">Loading checklist for stage: {stage}...</div>
  )

  if (error) return (
    <div className="text-red-400 text-sm p-2">Checklist error: {error}</div>
  )

  if (items.length === 0) return (
    <div className="text-gray-400 text-sm p-2">No checklist items for stage: {stage}</div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Stage Checklist</h3>
        {allComplete ? (
          <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">All Complete</span>
        ) : (
          <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded-full">Incomplete</span>
        )}
      </div>
      <div className="space-y-2">
        {items.map(item => {
          const status = getStatus(item.id)
          const isApproved = status === 'approved'
          return (
            <div key={item.id} onClick={() => toggleItem(item.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${isApproved ? 'bg-green-900 bg-opacity-40' : 'bg-gray-800 hover:bg-gray-700'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isApproved ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                {isApproved && <span className="text-white text-xs">✓</span>}
              </div>
              <div>
                <p className={`text-sm font-medium ${isApproved ? 'text-green-300 line-through' : 'text-white'}`}>{item.title}</p>
                {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
              </div>
              {item.is_required && <span className="ml-auto text-xs text-gray-500">Required</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
