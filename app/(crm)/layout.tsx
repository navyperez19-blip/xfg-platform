'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import CRMNav from '@/components/crm/CRMNav'

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [navAgent, setNavAgent] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: userRecord } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('id', user.id)
        .single()

      const adminRoles = ['superadmin', 'executive']
      const admin = adminRoles.includes(userRecord?.role ?? '')

      if (admin) {
        setIsAdmin(true)
        setNavAgent({
          id: userRecord?.id ?? '',
          full_name: userRecord?.full_name ?? '',
          agent_model: userRecord?.role ?? 'superadmin',
        })
        setLoading(false)
        return
      }

      const { data: agentRecord } = await supabase
        .from('agents')
        .select('id, full_name, agent_model, current_stage')
        .eq('user_id', user.id)
        .single()

      const crmEligibleStages = ['active']
      if (!agentRecord || !crmEligibleStages.includes(agentRecord.current_stage)) {
        router.push('/pipeline')
        return
      }

      // Auto-create monthly goal of $12,000 if not already set
      const now = new Date()
      const { data: existingGoal } = await supabase
        .from('crm_goals')
        .select('id')
        .eq('agent_id', agentRecord.id)
        .eq('period_type', 'monthly')
        .eq('period_year', now.getFullYear())
        .eq('period_number', now.getMonth() + 1)
        .single()

      if (!existingGoal) {
        await supabase.from('crm_goals').insert({
          agent_id: agentRecord.id,
          period_type: 'monthly',
          period_year: now.getFullYear(),
          period_number: now.getMonth() + 1,
          premium_target: 12000,
        })
      }

      setIsAdmin(false)
      setNavAgent({
        id: agentRecord.id,
        full_name: agentRecord.full_name ?? '',
        agent_model: agentRecord.agent_model ?? 'agent',
      })
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F2ED',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#F5F2ED',
      fontFamily: "'Inter', sans-serif",
      isolation: 'isolate',
    }}>
      <CRMNav agent={navAgent} isAdmin={isAdmin} />
      <main style={{
        flex: 1,
        marginLeft: '240px',
        padding: '32px',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
        marginTop: '48px',
      }}>
        {children}
      </main>
    </div>
  )
}
