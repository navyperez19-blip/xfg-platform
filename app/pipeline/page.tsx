'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const STAGES = [
  { key: 'new_lead', label: 'New Lead', color: 'bg-gray-700' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-900' },
  { key: 'licensing', label: 'Licensing', color: 'bg-blue-800' },
  { key: 'onboarding', label: 'Onboarding', color: 'bg-purple-900' },
  { key: 'contracting', label: 'Contracting', color: 'bg-yellow-900' },
  { key: 'system_setup', label: 'System Setup', color: 'bg-yellow-800' },
  { key: 'training', label: 'Training', color: 'bg-teal-900' },
  { key: 'activation', label: 'Activation', color: 'bg-teal-800' },
  { key: 'active', label: 'Active', color: 'bg-green-900' },
]

export default function PipelinePage() {
  const router = useRouter()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getAgents = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('agents').select('*')
      setAgents(data || [])
      setLoading(false)
    }
    getAgents()
  }, [router])

  const agentsByStage = (stageKey: string) =>
    agents.filter((a) => a.current_stage === stageKey)

  if (loading) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Loading pipeline...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agent Pipeline</h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl text-sm transition"
          >
            Dashboard
          </button>
          <button
            onClick={() => router.push('/agents/new')}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-sm transition"
          >
            + New Agent
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div key={stage.key} className="min-w-[200px] max-w-[200px]">
            <div className={`${stage.color} rounded-t-xl px-3 py-2 flex justify-between items-center`}>
              <span className="text-sm font-semibold">{stage.label}</span>
              <span className="text-xs bg-black bg-opacity-30 px-2 py-0.5 rounded-full">
                {agentsByStage(stage.key).length}
              </span>
            </div>
            <div className="bg-gray-900 rounded-b-xl min-h-[400px] p-2 space-y-2">
              {agentsByStage(stage.key).map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => router.push(`/agents/${agent.id}`)}
                  className="bg-gray-800 hover:bg-gray-700 p-3 rounded-xl cursor-pointer transition"
                >
                  <p className="font-semibold text-sm">{agent.full_name}</p>
                  <p className="text-xs text-gray-400">{agent.xfg_id}</p>
                  <p className="text-xs text-gray-500 mt-1">{agent.state}</p>
                  {agent.is_locked && (
                    <span className="text-xs text-yellow-400 mt-1 block">🔒 Locked</span>
                  )}
                </div>
              ))}
              {agentsByStage(stage.key).length === 0 && (
                <p className="text-gray-600 text-xs text-center mt-4">No agents</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}