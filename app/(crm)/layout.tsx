import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import CRMNav from '@/components/crm/CRMNav'

export default async function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  // Check users table for admin role
  const { data: userRecord } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('id', session.user.id)
    .single()

  const adminRoles = ['superadmin', 'executive']
  const isAdmin = adminRoles.includes(userRecord?.role ?? '')

  // Get agent record
  const { data: agentRecord } = await supabase
    .from('agents')
    .select('id, full_name, agent_model, current_stage')
    .eq('user_id', session.user.id)
    .single()

  // Non-admins must be active agents to access CRM
  if (!isAdmin && agentRecord?.current_stage !== 'active') {
    redirect('/pipeline')
  }

  // If no agent record and not admin, redirect
  if (!isAdmin && !agentRecord) {
    redirect('/pipeline')
  }

  const navAgent = {
    id: agentRecord?.id ?? userRecord?.id ?? '',
    full_name: agentRecord?.full_name ?? userRecord?.full_name ?? '',
    agent_model: isAdmin ? (userRecord?.role ?? 'admin') : (agentRecord?.agent_model ?? 'agent'),
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
