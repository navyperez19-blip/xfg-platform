'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ total: 0, pipeline: 0, active: 0 })

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      if (!user) { router.push('/login'); return }
      setProfile(user)

      const { data: agents } = await supabase.from('agents').select('current_stage')
      if (agents) {
        setStats({
          total: agents.length,
          pipeline: agents.filter(a => a.current_stage !== 'active').length,
          active: agents.filter(a => a.current_stage === 'active').length,
        })
      }
    }
    load()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      superadmin: 'bg-red-900 text-red-300',
      executive: 'bg-purple-900 text-purple-300',
      finley: 'bg-blue-900 text-blue-300',
      joe: 'bg-yellow-900 text-yellow-300',
      jesse: 'bg-teal-900 text-teal-300',
      noah: 'bg-green-900 text-green-300',
      agent: 'bg-gray-800 text-gray-300',
    }
    return colors[role] || 'bg-gray-800 text-gray-300'
  }

  if (!profile) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">XFG Platform</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-400">Welcome, {profile.full_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getRoleBadgeColor(profile.role)}`}>
                {profile.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition text-sm"
          >
            Sign Out
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => router.push('/pipeline')}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-sm transition"
          >
            View Pipeline
          </button>
          {['executive', 'superadmin'].includes(profile.role) && (
            <button
              onClick={() => router.push('/analytics')}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm transition"
            >
              Analytics
            </button>
          )}
          {['finley', 'executive', 'superadmin'].includes(profile.role) && (
            <button
              onClick={() => router.push('/agents/new')}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-sm transition"
            >
              + New Agent
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 p-6 rounded-2xl">
            <h2 className="text-lg font-semibold mb-1">Total Agents</h2>
            <p className="text-4xl font-bold text-blue-400">{stats.total}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl">
            <h2 className="text-lg font-semibold mb-1">In Pipeline</h2>
            <p className="text-4xl font-bold text-yellow-400">{stats.pipeline}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl">
            <h2 className="text-lg font-semibold mb-1">Active Agents</h2>
            <p className="text-4xl font-bold text-green-400">{stats.active}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Your Role Permissions</h2>
          <div className="space-y-2 text-sm text-gray-400">
            {profile.role === 'finley' && (
              <>
                <p>✅ Create and manage new agents</p>
                <p>✅ Track licensing and exam progress</p>
                <p>✅ Schedule onboarding calls</p>
                <p>✅ Move agents through licensing stages</p>
              </>
            )}
            {profile.role === 'joe' && (
              <>
                <p>✅ Verify contracts and agreements</p>
                <p>✅ Confirm dialer setup</p>
                <p>✅ Confirm CRM access</p>
                <p>✅ Move agents through contracting and system setup</p>
              </>
            )}
            {profile.role === 'jesse' && (
              <>
                <p>✅ Verify carrier training</p>
                <p>✅ Verify product training</p>
                <p>✅ Verify sales process training</p>
                <p>✅ Move agents through training stage</p>
              </>
            )}
            {profile.role === 'noah' && (
              <>
                <p>✅ Conduct activation calls</p>
                <p>✅ Set KPIs and expectations</p>
                <p>✅ Mark agents as Active</p>
              </>
            )}
            {['executive', 'superadmin'].includes(profile.role) && (
              <>
                <p>✅ Full access to all stages</p>
                <p>✅ Override any stage</p>
                <p>✅ Assign agent models</p>
                <p>✅ View all analytics</p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
