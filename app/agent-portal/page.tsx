'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const STAGES = [
  { key: 'new_lead', label: 'New Lead', order: 1 },
  { key: 'contacted', label: 'Contacted', order: 2 },
  { key: 'licensing', label: 'Licensing', order: 3 },
  { key: 'onboarding', label: 'Onboarding', order: 4 },
  { key: 'contracting', label: 'Contracting', order: 5 },
  { key: 'system_setup', label: 'System Setup', order: 6 },
  { key: 'training', label: 'Training', order: 7 },
  { key: 'activation', label: 'Activation', order: 8 },
  { key: 'active', label: 'Active Agent', order: 9 },
]

export default function AgentPortalPage() {
  const router = useRouter()
  const [agent, setAgent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setAgent(agentData)
      setLoading(false)
    }
    load()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Loading your portal...</p>
    </main>
  )

  if (!agent) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-white text-lg mb-2">No agent profile found.</p>
        <p className="text-gray-400 text-sm">Please contact your administrator.</p>
      </div>
    </main>
  )

  const currentStageIndex = STAGES.findIndex(s => s.key === agent.current_stage)
  const currentStage = STAGES[currentStageIndex]

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Portal</h1>
            <p className="text-gray-400 text-sm mt-0.5">Welcome, {agent.full_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-xl text-sm transition"
          >
            Sign Out
          </button>
        </div>

        <div className="bg-gray-900 rounded-2xl p-5 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-400 font-mono font-bold text-lg">{agent.xfg_id}</p>
              <p className="text-gray-400 text-sm mt-1">{agent.email}</p>
              {agent.phone && <p className="text-gray-400 text-sm">{agent.phone}</p>}
              <p className="text-gray-400 text-sm">State: {agent.state}</p>
            </div>
            <div className="text-right">
              <span className="bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">
                {currentStage?.label}
              </span>
              {agent.is_locked && (
                <p className="text-yellow-400 text-xs mt-1">🔒 Admin managing</p>
              )}
              {agent.agent_model && (
                <p className="text-purple-400 text-xs mt-1 capitalize">{agent.agent_model} model</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-5 mb-4">
          <h2 className="text-base font-semibold mb-4">Your Progress</h2>
          <div className="space-y-2">
            {STAGES.map((stage, index) => {
              const isComplete = index < currentStageIndex
              const isCurrent = index === currentStageIndex
              return (
                <div key={stage.key} className={`flex items-center gap-3 p-3 rounded-xl ${
                  isCurrent ? 'bg-blue-900 bg-opacity-40' :
                  isComplete ? 'bg-green-900 bg-opacity-20' :
                  'bg-gray-800 bg-opacity-40'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    isComplete ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-blue-500 text-white' :
                    'bg-gray-700 text-gray-500'
                  }`}>
                    {isComplete ? '✓' : stage.order}
                  </div>
                  <span className={`text-sm font-medium ${
                    isComplete ? 'text-green-300' :
                    isCurrent ? 'text-white' :
                    'text-gray-500'
                  }`}>
                    {stage.label}
                  </span>
                  {isCurrent && (
                    <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                  {isComplete && (
                    <span className="ml-auto text-xs text-green-400">Complete</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-5">
          <h2 className="text-base font-semibold mb-3">What happens next?</h2>
          {agent.current_stage === 'new_lead' && (
            <p className="text-gray-400 text-sm">Your application has been received. A member of our team will be in touch with you shortly to begin the licensing process.</p>
          )}
          {agent.current_stage === 'contacted' && (
            <p className="text-gray-400 text-sm">Our team has reached out to you. Please check your email and respond as soon as possible to move forward with licensing.</p>
          )}
          {agent.current_stage === 'licensing' && (
            <p className="text-gray-400 text-sm">You are in the licensing phase. Check your state exam and background check links — complete these steps to move forward.</p>
          )}
          {agent.current_stage === 'onboarding' && (
            <p className="text-gray-400 text-sm">Your onboarding call is being scheduled. You will receive details shortly. Once locked, your admin team will guide you through next steps.</p>
          )}
          {agent.current_stage === 'contracting' && (
            <p className="text-gray-400 text-sm">You are in the contracting phase. Please review and sign all required documents sent to you.</p>
          )}
          {agent.current_stage === 'system_setup' && (
            <p className="text-gray-400 text-sm">Your dialer and CRM access are being configured. You will receive login credentials shortly.</p>
          )}
          {agent.current_stage === 'training' && (
            <p className="text-gray-400 text-sm">You are in training. Complete all required carrier, product, and sales process certifications.</p>
          )}
          {agent.current_stage === 'activation' && (
            <p className="text-gray-400 text-sm">Almost there! Your final activation call with Noah is being scheduled. This is the last step before you go active.</p>
          )}
          {agent.current_stage === 'active' && (
            <p className="text-green-400 text-sm font-semibold">🎉 Congratulations! You are now an active XFG agent. Check your email for CRM, dialer, and Discord access.</p>
          )}
        </div>
      </div>
    </main>
  )
}
