'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useRouter } from 'next/navigation'
import NotificationBell from '../components/NotificationBell'

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
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">XFG Platform</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-gray-400 text-sm">Welcome, {profile.full_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getRoleBadgeColor(profile.role)}`}>
                {profile.role}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-xl transition text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => router.push('/pipeline')}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-sm transition"
          >
            Pipeline
          </button>
          {['finley', 'executive', 'superadmin'].includes(profile.role) && (
            <button
              onClick={() => router.push('/agents/new')}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-sm transition"
            >
              + New Agent
            </button>
          )}
          {['executive', 'superadmin'].includes(profile.role) && (
            <button
              onClick={() => router.push('/analytics')}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm transition"
            >
              Analytics
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 p-4 rounded-2xl text-center">
            <p className="text-gray-400 text-xs mb-1">Total</p>
            <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-2xl text-center">
            <p className="text-gray-400 text-xs mb-1">Pipeline</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.pipeline}</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-2xl text-center">
            <p className="text-gray-400 text-xs mb-1">Active</p>
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-4">
          <h2 className="text-base font-semibold mb-3">Your Permissions</h2>
          <div className="space-y-1 text-sm text-gray-400">
            {profile.role === 'finley' && (
              <>
                <p>✅ Create and manage new agents</p>
                <p>✅ Track licensing and exam progress</p>
                <p>✅ Schedule onboarding calls</p>
              </>
            )}
            {profile.role === 'joe' && (
              <>
                <p>✅ Verify contracts and agreements</p>
                <p>✅ Confirm dialer and CRM setup</p>
              </>
            )}
            {profile.role === 'jesse' && (
              <>
                <p>✅ Verify all training completions</p>
                <p>✅ Move agents through training</p>
              </>
            )}
            {profile.role === 'noah' && (
              <>
                <p>✅ Conduct activation calls</p>
                <p>✅ Mark agents as Active</p>
              </>
            )}
            {['executive', 'superadmin'].includes(profile.role) && (
              <>
                <p>✅ Full access to all stages</p>
                <p>✅ Override any stage</p>
                <p>✅ View all analytics</p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
