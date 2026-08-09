'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import PageSkeleton from '@/app/components/PageSkeleton'

const RECRUIT_STAGES = [
  { value: 'discovered', label: 'Discovered', color: '#7A7A7A' },
  { value: 'contacted', label: 'Contacted', color: '#2196F3' },
  { value: 'responded', label: 'Responded', color: '#F5A623' },
  { value: 'appointment', label: 'Appointment', color: '#9C27B0' },
  { value: 'contracting', label: 'Contracting', color: '#FF9800' },
  { value: 'activated', label: 'Activated', color: '#27AE60' },
  { value: 'archived', label: 'Archived', color: '#E53935' },
]

const SOURCE_STATES = ['LA', 'FL', 'CA']

function fitScoreColor(score: number | null) {
  if (score === null || score === undefined) return '#BBB'
  if (score <= 40) return '#E53935'
  if (score <= 70) return '#F5A623'
  return '#27AE60'
}

export default function RecruitingListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [recruits, setRecruits] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [sourceStateFilter, setSourceStateFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userRecord?.role !== 'superadmin') { router.push('/crm'); return }

      const { data } = await supabase
        .from('recruits')
        .select('*')
        .order('created_at', { ascending: false })

      setRecruits(data ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  const filtered = recruits.filter(r => {
    const q = search.toLowerCase()
    const searchMatch = !q ||
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q) ||
      r.state?.toLowerCase().includes(q)
    const stageMatch = !stageFilter || r.recruit_stage === stageFilter
    const sourceStateMatch = !sourceStateFilter || r.source_state === sourceStateFilter
    return searchMatch && stageMatch && sourceStateMatch
  })

  if (loading) return <PageSkeleton />

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Recruiting
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A' }}>
          {filtered.length} recruit{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, or state..."
          style={{ flex: 1, minWidth: '220px', padding: '10px 14px', fontSize: '14px', border: '1px solid #E5E1DA', borderRadius: '8px', backgroundColor: '#FFFFFF', outline: 'none', fontFamily: 'inherit' }}
        />
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          style={{ padding: '10px 14px', fontSize: '14px', border: '1px solid #E5E1DA', borderRadius: '8px', backgroundColor: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <option value="">All Stages</option>
          {RECRUIT_STAGES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={sourceStateFilter}
          onChange={e => setSourceStateFilter(e.target.value)}
          style={{ padding: '10px 14px', fontSize: '14px', border: '1px solid #E5E1DA', borderRadius: '8px', backgroundColor: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <option value="">All Source States</option>
          {SOURCE_STATES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {(search || stageFilter || sourceStateFilter) && (
          <button onClick={() => { setSearch(''); setStageFilter(''); setSourceStateFilter('') }} style={{ padding: '10px 16px', backgroundColor: '#FFFFFF', color: '#7A7A7A', border: '1px solid #E5E1DA', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
        {filtered.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9F7F4' }}>
                {['Name', 'Phone', 'Email', 'State', 'License Status', 'Stage', 'XFG Fit Score', 'Source State', 'Date Added'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #E5E1DA', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((recruit, i) => {
                const stageInfo = RECRUIT_STAGES.find(s => s.value === recruit.recruit_stage)
                const isLast = i === filtered.length - 1
                return (
                  <tr
                    key={recruit.id}
                    onClick={() => router.push(`/crm/recruiting/${recruit.id}`)}
                    style={{ borderBottom: !isLast ? '1px solid #F0EDE8' : 'none', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/crm/recruiting/${recruit.id}`} style={{ fontWeight: '600', fontSize: '14px', color: '#1A1A1A', textDecoration: 'none', display: 'block' }}>
                        {recruit.full_name}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>{recruit.phone || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>{recruit.email || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>{recruit.state || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>{recruit.license_status || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: `${stageInfo?.color ?? '#7A7A7A'}18`, color: stageInfo?.color ?? '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        {stageInfo?.label ?? recruit.recruit_stage}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: fitScoreColor(recruit.ai_fit_score) }}>
                      {recruit.ai_fit_score === null || recruit.ai_fit_score === undefined ? '—' : recruit.ai_fit_score}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#4A4A4A' }}>{recruit.source_state || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#888' }}>
                      {recruit.created_at ? new Date(recruit.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>◈</div>
            <p style={{ fontSize: '15px', color: '#7A7A7A', fontWeight: '500', marginBottom: '4px' }}>
              {search || stageFilter || sourceStateFilter ? 'No recruits match your search' : 'No recruits yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
