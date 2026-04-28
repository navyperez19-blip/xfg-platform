'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setEmail(user.email || '')
      }
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">XFG Platform</h1>
            <p className="text-gray-400 mt-1">Welcome, {email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition"
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
          <button
            onClick={() => router.push('/agents/new')}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-sm transition"
          >
            + New Agent
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 p-6 rounded-2xl">
            <h2 className="text-lg font-semibold mb-1">Total Agents</h2>
            <p className="text-4xl font-bold text-blue-400">0</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl">
            <h2 className="text-lg font-semibold mb-1">In Pipeline</h2>
            <p className="text-4xl font-bold text-yellow-400">0</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl">
            <h2 className="text-lg font-semibold mb-1">Active Agents</h2>
            <p className="text-4xl font-bold text-green-400">0</p>
          </div>
        </div>
      </div>
    </main>
  )
}
