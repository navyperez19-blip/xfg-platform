'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Notes from '../../components/Notes'

const STAGES = [
  { key: 'new_lead', label: 'New Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'licensing', label: 'Licensing' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'contracting', label: 'Contracting' },
  { key: 'system_setup', label: 'System Setup' },
  { key: 'training', label: 'Training' },
  { key: 'activation', label: 'Activation' },
  { key: 'active', label: 'Active' },
]

export default function AgentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [agent, setAgent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checklistItems, setChecklistItems] = useState<any[]>([])
  const [checklistProgress, setChecklistProgress] = useState<any[]>([])

  useEffect(() => {
    const getAgent = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('id', params.id)
        .single()
      if (data) {
        setAgent(data)
        loadChecklist(data.current_stage, params.id as string)
      }
      setLoading(false)
    }
    getAgent()
  }, [params.id, router])

  const loadChecklist = async (stage: string, agentId: string) => {
    const { data: items } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('stage', stage)
      .order('display_order')
    const { data: progress } = await supabase
      .from('agent_checklist_progress')
      .select('*')
      .eq('agent_id', agentId)
    setChecklistItems(items || [])
    setChecklistProgress(progress || [])
  }

  const getStatus = (itemId: string) => {
    const p = checklistProgress.find(p => p.checklist_item_id === itemId)
    return p ? p.status : 'not_started'
  }

  const toggleItem = async (itemId: string) => {
    if (!agent) return
    const current = getStatus(itemId)
    const newStatus = current === 'approved' ? 'not_started' : 'approved'
    const existing = checklistProgress.find(p => p.checklist_item_id === itemId)
    if (existing) {
      await supabase
        .from('agent_checklist_progress')
        .update({ status: newStatus, completed_at: newStatus === 'approved' ? new Date().toISOString() : null })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('agent_checklist_progress')
        .insert({ agent_id: agent.id, checklist_item_id: itemId, status: newStatus, completed_at: newStatus === 'approved' ? new Date().toISOString() : null })
    }
    setChecklistProgress(prev => {
      const updated = prev.filter(p => p.checklist_item_id !== itemId)
      return [...updated, { checklist_item_id: itemId, status: newStatus }]
    })
  }

  const moveStage = async (direction: 'forward' | 'backward') => {
    if (!agent) return
    setSaving(true)
    const currentIndex = STAGES.findIndex(s => s.key === agent.current_stage)
    const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1
    if (newIndex < 0 || newIndex >= STAGES.length) { setSaving(false); return }
    const newStage = STAGES[newIndex].key
    const { error } = await supabase
      .from('agents')
      .update({ current_stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', agent.id)
    if (!error) {
      setAgent({ ...agent, current_stage: newStage })
      loadChecklist(newStage, agent.id)
    }
    setSaving(false)
  }

  const toggleLock = async () => {
    if (!agent) return
    setSaving(true)
    const { error } = await supabase
      .from('agents')
      .update({ is_locked: !agent.is_locked, updated_at: new Date().toISOString() })
      .eq('id', agent.id)
    if (!error) setAgent({ ...agent, is_locked: !agent.is_locked })
    setSaving(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Loading agent...</p>
    </main>
  )

  if (!agent) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Agent not found.</p>
    </main>
  )

  const currentStageIndex = STAGES.findIndex(s => s.key === agent.current_stage)
  const allComplete = checklistItems.filter(i => i.is_required).every(i => getStatus(i.id) === 'approved')

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push('/pipeline')} className="text-gray-400 hover:text-white text-sm mb-6 block transition">
          ← Back to Pipeline
        </button>

        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{agent.full_name}</h1>
              <p className="text-blue-400 font-mono mt-1">{agent.xfg_id}</p>
              <p className="text-gray-400 text-sm mt-1">{agent.email}</p>
              {agent.phone && <p className="text-gray-400 text-sm">{agent.phone}</p>}
              <p className="text-gray-400 text-sm">State: {agent.state}</p>
            </div>
            <div className="text-right">
              <span className="bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                {STAGES.find(s => s.key === agent.current_stage)?.label}
              </span>
              {agent.is_locked && <p className="text-yellow-400 text-sm mt-2">Locked</p>}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Stage Progress</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {STAGES.map((stage, index) => (
              <div key={stage.key} className={`px-3 py-1 rounded-full text-xs font-semibold ${
                index < currentStageIndex ? 'bg-green-900 text-green-300' :
                index === currentStageIndex ? 'bg-blue-600 text-white' :
                'bg-gray-800 text-gray-500'
              }`}>
                {stage.label}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => moveStage('backward')} disabled={saving || currentStageIndex === 0} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl text-sm transition disabled:opacity-30">
              Move Back
            </button>
            <button onClick={() => moveStage('forward')} disabled={saving || currentStageIndex === STAGES.length - 1 || agent.is_locked} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-sm transition disabled:opacity-30">
              Move Forward
            </button>
            <button onClick={toggleLock} disabled={saving} className={`px-4 py-2 rounded-xl text-sm transition ${agent.is_locked ? 'bg-yellow-700 hover:bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
              {agent.is_locked ? 'Unlock' : 'Lock'}
            </button>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Stage Checklist</h2>
            {checklistItems.length > 0 && (
              allComplete
                ? <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">All Complete</span>
                : <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded-full">Incomplete</span>
            )}
          </div>
          {checklistItems.length === 0 ? (
            <p className="text-gray-400 text-sm">No checklist items for this stage.</p>
          ) : (
            <div className="space-y-2">
              {checklistItems.map(item => {
                const isApproved = getStatus(item.id) === 'approved'
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
          )}
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <Notes agentId={agent.id} />
        </div>

        <div className="bg-gray-900 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-2">Agent Details</h2>
          <div className="space-y-2 text-sm text-gray-400">
            <p>Created: {new Date(agent.created_at).toLocaleDateString()}</p>
            <p>Last Updated: {new Date(agent.updated_at).toLocaleDateString()}</p>
            <p>Model: {agent.agent_model || 'Not assigned'}</p>
            <p>Locked: {agent.is_locked ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    </main>
  )
}
