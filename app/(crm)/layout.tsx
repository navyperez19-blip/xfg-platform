import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import CRMNav from '@/components/crm/CRMNav'

export default async function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return allCookies },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  const adminRoles = ['superadmin', 'executive']
  const isAdmin = adminRoles.includes(userRecord?.role ?? '')

  if (isAdmin) {
    const navAgent = {
      id: userRecord?.id ?? '',
      full_name: userRecord?.full_name ?? '',
      agent_model: userRecord?.role ?? 'superadmin',
    }
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#F5F2ED',
        fontFamily: "'Inter', sans-serif",
      }}>
        <CRMNav agent={navAgent} isAdmin={true} />
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

  const { data: agentRecord } = await supabase
    .from('agents')
    .select('id, full_name, agent_model, current_stage')
    .eq('user_id', user.id)
    .single()

  const crmEligibleStages = ['system_setup', 'training', 'activation', 'active']
  if (!agentRecord || !crmEligibleStages.includes(agentRecord.current_stage)) {
    redirect('/pipeline')
  }

  const navAgent = {
    id: agentRecord!.id,
    full_name: agentRecord!.full_name ?? '',
    agent_model: agentRecord!.agent_model ?? 'agent',
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#F5F2ED',
      fontFamily: "'Inter', sans-serif",
    }}>
      <CRMNav agent={navAgent} isAdmin={false} />
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
