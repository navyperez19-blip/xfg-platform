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

      const crmEligibleStages = ['system_setup', 'training', 'activation', 'active']
      if (!agentRecord || !crmEligibleStages.includes(agentRecord.current_stage)) {
        router.push('/pipeline')
        return
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
    }}>
      <CRMNav agent={navAgent} isAdmin={isAdmin} />
      <main style={{
        flex: 1,
        marginLeft: '240px',
        padding: '32px',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  )
}
