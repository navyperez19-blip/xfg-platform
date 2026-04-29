'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useRouter } from 'next/navigation'

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

export default function AnalyticsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      if (!user) { router.push('/login'); return }
      if (!['executive', 'superadmin'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      const { data: agentsData } = await supabase.from('agents').select('*')
      const { data: historyData } = await supabase
        .from('stage_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      setAgents(agentsData || [])
      setHistory(historyData || [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Loading analytics...</p>
    </main>
  )

  const total = agents.length
  const active = agents.filter(a => a.current_stage === 'active').length
  const pipeline = agents.filter(a => a.current_stage !== 'active').length
  const locked = agents.filter(a => a.is_locked).length
  const supported = agents.filter(a => a.agent_model === 'supported').length
  const independent = agents.filter(a => a.agent_model === 'independent').length

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-gray-400 text-sm mt-1">Executive overview</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl text-sm transition"
          >
            ← Dashboard
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 p-5 rounded-2xl">
            <p className="text-gray-400 text-sm mb-1">Total Agents</p>
            <p className="text-3xl font-bold text-blue-400">{total}</p>
          </div>
          <div className="bg-gray-900 p-5 rounded-2xl">
            <p className="text-gray-400 text-sm mb-1">Active Agents</p>
            <p className="text-3xl font-bold text-green-400">{active}</p>
          </div>
          <div className="bg-gray-900 p-5 rounded-2xl">
            <p className="text-gray-400 text-sm mb-1">In Pipeline</p>
            <p className="text-3xl font-bold text-yellow-400">{pipeline}</p>
          </div>
          <div className="bg-gray-900 p-5 rounded-2xl">
            <p className="text-gray-400 text-sm mb-1">Locked Agents</p>
            <p className="text-3xl font-bold text-orange-400">{locked}</p>
          </div>
          <div className="bg-gray-900 p-5 rounded-2xl">
            <p className="text-gray-400 text-sm mb-1">Supported Model</p>
            <p className="text-3xl font-bold text-purple-400">{supported}</p>
          </div>
          <div className="bg-gray-900 p-5 rounded-2xl">
            <p className="text-gray-400 text-sm mb-1">Independent Model</p>
            <p className="text-3xl font-bold text-teal-400">{independent}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Agents by Stage</h2>
          <div className="space-y-3">
            {STAGES.map(stage => {
              const count = agents.filter(a => a.current_stage === stage.key).length
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={stage.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{stage.label}</span>
                    <span className="text-gray-400">{count} agents</span>
                  </div>
                  <div className="bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Stage Changes</h2>
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm">No stage changes yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-xl">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">{h.from_stage?.replace(/_/g, ' ')}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-white font-medium">{h.to_stage?.replace(/_/g, ' ')}</span>
                    {h.is_override && <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">Override</span>}
                  </div>
                  <span className="text-xs text-gray-500">{new Date(h.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
