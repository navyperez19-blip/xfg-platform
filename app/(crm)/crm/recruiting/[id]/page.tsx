'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

const DRAFT_STATUSES: Record<string, { label: string; color: string }> = {
  pending_review: { label: 'Pending Review', color: '#F5A623' },
  approved: { label: 'Approved', color: '#2196F3' },
  sent: { label: 'Sent', color: '#27AE60' },
  rejected: { label: 'Rejected', color: '#E53935' },
}

const CHANNEL_LABELS: Record<string, string> = {
  sms: 'SMS',
  email: 'Email',
  instagram_dm: 'Instagram DM',
}

const ACTIVITY_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  note: { icon: '📝', color: '#7A7A7A', label: 'Note' },
  sms: { icon: '💬', color: '#27AE60', label: 'SMS' },
  email: { icon: '✉️', color: '#C9A96E', label: 'Email' },
  call: { icon: '📞', color: '#2196F3', label: 'Call' },
  instagram_dm: { icon: '📷', color: '#9C27B0', label: 'Instagram DM' },
  voicemail: { icon: '🔔', color: '#FF9800', label: 'Voicemail' },
}

function fitScoreColor(score: number | null) {
  if (score === null || score === undefined) return '#BBB'
  if (score <= 40) return '#E53935'
  if (score <= 70) return '#F5A623'
  return '#27AE60'
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const badge: React.CSSProperties = { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }
const pill: React.CSSProperties = { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: '#F4F1EB', color: '#4A4A4A' }
const sectionCard: React.CSSProperties = { backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '24px', marginBottom: '16px' }
const sectionTitle: React.CSSProperties = { fontSize: '13px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }
const fieldLabel: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }
const fieldValue: React.CSSProperties = { fontSize: '13px', color: '#1A1A1A', fontWeight: '500' }

export default function RecruitDetailPage() {
  const router = useRouter()
  const params = useParams()
  const recruitId = params.id as string

  const [loading, setLoading] = useState(true)
  const [recruit, setRecruit] = useState<any>(null)
  const [drafts, setDrafts] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [stageHistory, setStageHistory] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [updatingStage, setUpdatingStage] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userRecord?.role !== 'superadmin') { router.push('/crm'); return }

      const { data: recruitData } = await supabase
        .from('recruits')
        .select('*')
        .eq('id', recruitId)
        .single()

      if (!recruitData) { router.push('/crm/recruiting'); return }
      setRecruit(recruitData)

      const { data: draftsData } = await supabase
        .from('recruit_outreach_drafts')
        .select('*')
        .eq('recruit_id', recruitId)
        .order('created_at', { ascending: false })
      setDrafts(draftsData ?? [])

      const { data: activitiesData } = await supabase
        .from('recruit_activities')
        .select('*')
        .eq('recruit_id', recruitId)
        .order('created_at', { ascending: false })
      setActivities(activitiesData ?? [])

      const { data: historyData } = await supabase
        .from('recruit_stage_history')
        .select('*')
        .eq('recruit_id', recruitId)
        .order('changed_at', { ascending: false })
      setStageHistory(historyData ?? [])

      setLoading(false)
    }
    load()
  }, [recruitId, router])

  async function updateStage(newStage: string) {
    if (!recruit || newStage === recruit.recruit_stage) return
    setUpdatingStage(true)
    const fromStage = recruit.recruit_stage

    const { error: updateError } = await supabase
      .from('recruits')
      .update({ recruit_stage: newStage })
      .eq('id', recruitId)

    if (updateError) { setUpdatingStage(false); return }

    const { data: historyRow } = await supabase
      .from('recruit_stage_history')
      .insert({
        recruit_id: recruitId,
        from_stage: fromStage,
        to_stage: newStage,
        changed_by: userId,
        changed_at: new Date().toISOString(),
      })
      .select()
      .single()

    setRecruit({ ...recruit, recruit_stage: newStage })
    if (historyRow) setStageHistory([historyRow, ...stageHistory])
    setUpdatingStage(false)
  }

  if (loading) return <PageSkeleton />

  const stageInfo = RECRUIT_STAGES.find(s => s.value === recruit.recruit_stage)

  return (
    <div style={{ maxWidth: '900px' }}>
      <Link href="/crm/recruiting" style={{ fontSize: '13px', color: '#C9A96E', textDecoration: 'none', fontWeight: '600', display: 'inline-block', marginBottom: '20px' }}>
        ← Back to Recruiting
      </Link>

      {/* Header */}
      <div style={sectionCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A1A', marginBottom: '6px' }}>
              {recruit.full_name}
            </h1>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ ...badge, backgroundColor: `${stageInfo?.color ?? '#7A7A7A'}18`, color: stageInfo?.color ?? '#7A7A7A' }}>
                {stageInfo?.label ?? recruit.recruit_stage}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: fitScoreColor(recruit.ai_fit_score) }}>
                {recruit.ai_fit_score === null || recruit.ai_fit_score === undefined ? 'Fit Score: —' : `Fit Score: ${recruit.ai_fit_score}`}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', paddingTop: '16px', borderTop: '1px solid #F0EDE8' }}>
          <div>
            <p style={fieldLabel}>Phone</p>
            <p style={fieldValue}>
              {recruit.phone ? <a href={`tel:${recruit.phone}`} style={{ color: '#1A1A1A', textDecoration: 'none' }}>{recruit.phone}</a> : '—'}
            </p>
          </div>
          <div>
            <p style={fieldLabel}>Email</p>
            <p style={fieldValue}>{recruit.email || '—'}</p>
          </div>
          <div>
            <p style={fieldLabel}>State</p>
            <p style={fieldValue}>{recruit.state || '—'}</p>
          </div>
          <div>
            <p style={fieldLabel}>City</p>
            <p style={fieldValue}>{recruit.city || '—'}</p>
          </div>
          <div>
            <p style={fieldLabel}>Source</p>
            <p style={fieldValue}>{recruit.source || '—'}</p>
          </div>
          <div>
            <p style={fieldLabel}>Source State</p>
            <p style={fieldValue}>{recruit.source_state || '—'}</p>
          </div>
          <div>
            <p style={fieldLabel}>Date Added</p>
            <p style={fieldValue}>{formatDate(recruit.created_at)}</p>
          </div>
        </div>
      </div>

      {/* License Info */}
      <div style={sectionCard}>
        <p style={sectionTitle}>License Info</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <div>
            <p style={fieldLabel}>License Status</p>
            <p style={fieldValue}>{recruit.license_status || '—'}</p>
          </div>
          <div>
            <p style={fieldLabel}>NPN</p>
            <p style={fieldValue}>{recruit.npn || '—'}</p>
          </div>
          <div>
            <p style={fieldLabel}>Resident State</p>
            <p style={fieldValue}>{recruit.resident_state || '—'}</p>
          </div>
          <div>
            <p style={fieldLabel}>Years Experience</p>
            <p style={fieldValue}>{recruit.years_experience ?? '—'}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={fieldLabel}>License States</p>
            {recruit.license_states?.length > 0 ? (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {recruit.license_states.map((s: string) => <span key={s} style={pill}>{s}</span>)}
              </div>
            ) : <p style={fieldValue}>—</p>}
          </div>
          <div>
            <p style={fieldLabel}>License Types</p>
            {recruit.license_types?.length > 0 ? (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {recruit.license_types.map((t: string) => <span key={t} style={pill}>{t}</span>)}
              </div>
            ) : <p style={fieldValue}>—</p>}
          </div>
        </div>
      </div>

      {/* Professional Info */}
      <div style={sectionCard}>
        <p style={sectionTitle}>Professional Info</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div>
            <p style={fieldLabel}>Current Agency</p>
            <p style={fieldValue}>{recruit.current_agency || '—'}</p>
          </div>
          <div>
            <p style={fieldLabel}>Website</p>
            <p style={fieldValue}>
              {recruit.website ? <a href={recruit.website} target="_blank" rel="noopener noreferrer" style={{ color: '#C9A96E', textDecoration: 'none' }}>{recruit.website}</a> : '—'}
            </p>
          </div>
          <div>
            <p style={fieldLabel}>Instagram</p>
            <p style={fieldValue}>{recruit.instagram_handle || '—'}</p>
          </div>
          <div>
            <p style={fieldLabel}>LinkedIn</p>
            <p style={fieldValue}>
              {recruit.linkedin_url ? <a href={recruit.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: '#C9A96E', textDecoration: 'none' }}>View Profile</a> : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* AI Section */}
      <div style={sectionCard}>
        <p style={sectionTitle}>AI Fit Analysis</p>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={fieldLabel}>Fit Score</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: fitScoreColor(recruit.ai_fit_score) }}>
              {recruit.ai_fit_score === null || recruit.ai_fit_score === undefined ? '—' : `${recruit.ai_fit_score} / 100`}
            </span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#F0EDE5', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${recruit.ai_fit_score ?? 0}%`, height: '100%', backgroundColor: fitScoreColor(recruit.ai_fit_score), borderRadius: '4px' }} />
          </div>
        </div>

        <div style={{ marginBottom: recruit.ai_score_breakdown ? '16px' : 0 }}>
          <p style={fieldLabel}>Summary</p>
          <p style={{ ...fieldValue, lineHeight: 1.5 }}>
            {recruit.ai_summary || 'AI profile not yet generated'}
          </p>
        </div>

        {recruit.ai_score_breakdown && typeof recruit.ai_score_breakdown === 'object' && Object.keys(recruit.ai_score_breakdown).length > 0 && (
          <div>
            <p style={fieldLabel}>Score Breakdown</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {Object.entries(recruit.ai_score_breakdown).map(([factor, value]) => (
                <div key={factor} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#FAFAF8', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#4A4A4A', textTransform: 'capitalize' }}>{factor.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Outreach Drafts */}
      <div style={sectionCard}>
        <p style={sectionTitle}>Outreach Drafts ({drafts.length})</p>
        {drafts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {drafts.map(draft => {
              const statusInfo = DRAFT_STATUSES[draft.status] ?? { label: draft.status, color: '#7A7A7A' }
              return (
                <div key={draft.id} style={{ padding: '14px 16px', backgroundColor: '#FAFAF8', borderRadius: '8px', border: '1px solid #F0EDE8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={pill}>{CHANNEL_LABELS[draft.channel] ?? draft.channel}</span>
                    <span style={{ ...badge, backgroundColor: `${statusInfo.color}18`, color: statusInfo.color }}>{statusInfo.label}</span>
                  </div>
                  {draft.subject && <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>{draft.subject}</p>}
                  <p style={{ fontSize: '13px', color: '#4A4A4A', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{draft.body}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#AAA' }}>No outreach drafts yet</p>
        )}
      </div>

      {/* Activity Log */}
      <div style={sectionCard}>
        <p style={sectionTitle}>Activity Log ({activities.length})</p>
        {activities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activities.map((activity, i) => {
              const config = ACTIVITY_TYPE_CONFIG[activity.activity_type] ?? { icon: '📝', color: '#7A7A7A', label: activity.activity_type }
              return (
                <div key={activity.id} style={{ padding: '12px 0', borderBottom: i < activities.length - 1 ? '1px solid #F0EDE8' : 'none', display: 'flex', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: `${config.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                    {config.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: config.color }}>
                        {config.label}{activity.direction ? ` · ${activity.direction}` : ''}
                      </span>
                      <span style={{ fontSize: '11px', color: '#AAA' }}>{formatDateTime(activity.created_at)}</span>
                    </div>
                    {activity.content && <p style={{ fontSize: '13px', color: '#4A4A4A', lineHeight: 1.5, margin: 0 }}>{activity.content}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#AAA' }}>No activity yet</p>
        )}
      </div>

      {/* Stage Management */}
      <div style={sectionCard}>
        <p style={sectionTitle}>Stage Management</p>
        <div style={{ marginBottom: '20px' }}>
          <label style={fieldLabel}>Recruit Stage</label>
          <select
            value={recruit.recruit_stage}
            onChange={e => updateStage(e.target.value)}
            disabled={updatingStage}
            style={{ padding: '9px 12px', fontSize: '13px', color: '#1A1A1A', backgroundColor: '#FAFAF8', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', opacity: updatingStage ? 0.6 : 1 }}
          >
            {RECRUIT_STAGES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <p style={fieldLabel}>Stage History</p>
        {stageHistory.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
            {stageHistory.map((h, i) => {
              const fromInfo = RECRUIT_STAGES.find(s => s.value === h.from_stage)
              const toInfo = RECRUIT_STAGES.find(s => s.value === h.to_stage)
              return (
                <div key={h.id} style={{ padding: '10px 0', borderBottom: i < stageHistory.length - 1 ? '1px solid #F0EDE8' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#4A4A4A' }}>
                    {h.from_stage ? (
                      <>
                        <span style={{ color: fromInfo?.color ?? '#7A7A7A', fontWeight: '600' }}>{fromInfo?.label ?? h.from_stage}</span>
                        {' → '}
                      </>
                    ) : null}
                    <span style={{ color: toInfo?.color ?? '#7A7A7A', fontWeight: '600' }}>{toInfo?.label ?? h.to_stage}</span>
                    {h.notes && <span style={{ color: '#AAA', marginLeft: '8px' }}>· {h.notes}</span>}
                  </div>
                  <span style={{ fontSize: '11px', color: '#AAA' }}>{formatDateTime(h.changed_at)}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#AAA', marginTop: '6px' }}>No stage changes recorded yet</p>
        )}
      </div>
    </div>
  )
}
