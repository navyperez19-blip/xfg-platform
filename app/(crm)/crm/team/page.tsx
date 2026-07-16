'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function MyTeamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [agentName, setAgentName] = useState('')
  const [downline, setDownline] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()

      setAgentName(userRecord?.full_name?.split(' ')[0] ?? '')

      const { data: agentRecord } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!agentRecord) { setLoading(false); return }

      // Fetch downline agents
      const { data: downlineAgents } = await supabase
        .from('agents')
        .select('id, full_name, dialer_active')
        .eq('upline_agent_id', agentRecord.id)
        .eq('current_stage', 'active')

      if (downlineAgents && downlineAgents.length > 0) {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

        const downlineWithStats = await Promise.all(downlineAgents.map(async (agent) => {
          const { data: policies } = await supabase
            .from('crm_policies')
            .select('annual_premium, status, date_written')
            .eq('agent_id', agent.id)
            .not('status', 'in', '("cancelled","lapsed","chargedback")')

          const mtdAP = (policies ?? [])
            .filter(p => p.date_written >= monthStart)
            .reduce((sum, p) => sum + (Number(p.annual_premium) || 0), 0)

          const activePolicies = (policies ?? [])
            .filter(p => ['active','issued','approved','submitted','pending'].includes(p.status))
            .length

          const indicator = mtdAP > 0 ? 'green' : activePolicies > 0 ? 'yellow' : 'red'

          return { ...agent, mtdAP, activePolicies, indicator }
        }))

        setDownline(downlineWithStats)
      }

      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
    </div>
  )

  const totalMtdAP = downline.reduce((sum, a) => sum + a.mtdAP, 0)
  const totalActivePolicies = downline.reduce((sum, a) => sum + a.activePolicies, 0)
  const producing = downline.filter(a => a.indicator === 'green').length
  const low = downline.filter(a => a.indicator === 'yellow').length
  const inactive = downline.filter(a => a.indicator === 'red').length

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 0 48px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 4px 0' }}>👥 My Team</h1>
        <p style={{ fontSize: '14px', color: '#7A7A7A', margin: 0 }}>Your downline agents and their production</p>
      </div>

      {downline.length === 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EBE8E3', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', margin: '0 0 12px 0' }}>👥</p>
          <p style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 6px 0' }}>No team members yet</p>
          <p style={{ fontSize: '13px', color: '#7A7A7A', margin: 0 }}>Your downline agents will appear here once assigned by your admin.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EBE8E3', padding: '16px' }}>
              <p style={{ fontSize: '11px', color: '#7A7A7A', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team Size</p>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', margin: 0 }}>{downline.length}</p>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EBE8E3', padding: '16px' }}>
              <p style={{ fontSize: '11px', color: '#7A7A7A', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team MTD AP</p>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#7C3AED', margin: 0 }}>${totalMtdAP.toLocaleString()}</p>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EBE8E3', padding: '16px' }}>
              <p style={{ fontSize: '11px', color: '#7A7A7A', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Policies</p>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#22C55E', margin: 0 }}>{totalActivePolicies}</p>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EBE8E3', padding: '16px' }}>
              <p style={{ fontSize: '11px', color: '#7A7A7A', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producing</p>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#22C55E', margin: 0 }}>{producing} <span style={{ fontSize: '13px', color: '#AAA' }}>/ {downline.length}</span></p>
            </div>
          </div>

          {/* Status Summary */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: '#166534', backgroundColor: '#D1FAE5', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>🟢 {producing} Producing</span>
            <span style={{ fontSize: '13px', color: '#92400E', backgroundColor: '#FEF3C7', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>🟡 {low} Low</span>
            <span style={{ fontSize: '13px', color: '#991B1B', backgroundColor: '#FEE2E2', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>🔴 {inactive} Inactive</span>
          </div>

          {/* Agent List */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EBE8E3', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #EBE8E3', backgroundColor: '#F9F7F4' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>MTD AP</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Active Policies</span>
              </div>
            </div>
            {downline
              .sort((a, b) => b.mtdAP - a.mtdAP)
              .map((agent, index) => (
              <div key={agent.id} style={{ padding: '14px 24px', borderTop: index > 0 ? '1px solid #F0EDE8' : 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>
                      {agent.indicator === 'green' ? '🟢' : agent.indicator === 'yellow' ? '🟡' : '🔴'}
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#1A1A1A', flexShrink: 0 }}>
                      {agent.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>{agent.full_name}</span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: agent.mtdAP > 0 ? '#7C3AED' : '#CCC', margin: 0, textAlign: 'right' }}>${agent.mtdAP.toLocaleString()}</p>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: agent.activePolicies > 0 ? '#22C55E' : '#CCC', margin: 0, textAlign: 'right' }}>{agent.activePolicies}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
