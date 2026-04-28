'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
]

export default function NewAgentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    state: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: counterData } = await supabase
      .from('agents')
      .select('xfg_id')
      .order('created_at', { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (counterData && counterData.length > 0) {
      const lastId = counterData[0].xfg_id
      const lastNumber = parseInt(lastId.replace('XFG-', ''))
      nextNumber = lastNumber + 1
    }
    const xfg_id = 'XFG-' + String(nextNumber).padStart(6, '0')

    const { error: insertError } = await supabase
      .from('agents')
      .insert({
        ...form,
        xfg_id,
        current_stage: 'new_lead',
        is_locked: false,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.push('/pipeline')
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.push('/pipeline')}
          className="text-gray-400 hover:text-white text-sm mb-6 block transition"
        >
          ← Back to Pipeline
        </button>
        <h1 className="text-2xl font-bold mb-2">Add New Agent</h1>
        <p className="text-gray-400 mb-8">A permanent XFG ID will be assigned automatically.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
              placeholder="555-555-5555"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">State</label>
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              required
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a state...</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Creating Agent...' : 'Create Agent'}
          </button>
        </form>
      </div>
    </main>
  )
}