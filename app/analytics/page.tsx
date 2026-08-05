'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/auth'
import { useRouter } from 'next/navigation'
import LeadershipTab from './components/LeadershipTab'
import TopPerformersTab from './components/TopPerformersTab'
import SalesTab from './components/SalesTab'
import AgentTrackerTab from './components/AgentTrackerTab'
import ContractingTrackerTab from './components/ContractingTrackerTab'
import OverviewTab from './components/OverviewTab'
import PageSkeleton from '@/app/components/PageSkeleton'


export default function AnalyticsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'contracting' | 'agentTracker' | 'leadership' | 'topPerformers' | 'sales'>('overview')
  const [salesRecords, setSalesRecords] = useState<any[]>([])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser()
      if (!user) { router.push('/login'); return }
      if (user.role === 'sales_director') { router.push('/pipeline'); return }
      if (!['executive', 'superadmin'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      const { data: agentsData } = await supabase.from('agents').select('*')
      const { data: historyData } = await supabase
        .from('stage_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      setAgents(agentsData || [])
      setHistory(historyData || [])

      const { data: records } = await supabase
        .from('discord_sales_records')
        .select('*')
        .order('sale_date', { ascending: false })

      if (records) {
        setSalesRecords(records)
      }

      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Real-time subscription for contracting tracker
  useEffect(() => {
    const channel = supabase
      .channel('agents-contracting-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, async () => {
        const { data: agentsData } = await supabase.from('agents').select('*')
        setAgents(agentsData || [])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) return <PageSkeleton />

  return (
    <main style={{ minHeight: '100vh', background: '#F5F2ED', padding: isMobile ? '16px 12px' : '32px 24px' }}>
      <div style={{ margin: '0 auto' }}>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: '#C9A96E', fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>XFG · X Financial Group</p>
          <h1 style={{ color: '#1A1814', fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em' }}>Analytics</h1>
        </div>

        <div style={{ display: 'flex', borderBottom: '2px solid #E5E1DA', marginBottom: '24px', gap: '4px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {[{ key: 'overview', label: 'Overview' }, { key: 'contracting', label: 'Contracting Tracker' }, { key: 'agentTracker', label: 'Agent Tracker' }, { key: 'leadership', label: 'Leadership' }, { key: 'topPerformers', label: 'Top 1%' }, { key: 'sales', label: 'Sales' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as 'overview' | 'contracting' | 'agentTracker' | 'leadership' | 'topPerformers' | 'sales')} style={{ padding: isMobile ? '10px 14px' : '12px 24px', whiteSpace: 'nowrap' as const, border: 'none', backgroundColor: 'transparent', fontSize: '14px', fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? '#1A1814' : '#7A7A7A', cursor: 'pointer', borderBottom: activeTab === tab.key ? '2px solid #C9A96E' : '2px solid transparent', marginBottom: '-2px', fontFamily: 'inherit' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && <OverviewTab agents={agents} history={history} />}

        {/* CONTRACTING TRACKER TAB */}
        {activeTab === 'contracting' && <ContractingTrackerTab agents={agents} setAgents={setAgents} />}

        {/* AGENT TRACKER TAB */}
        {activeTab === 'agentTracker' && <AgentTrackerTab agents={agents} setAgents={setAgents} />}

        {/* LEADERSHIP TAB */}
        {activeTab === 'leadership' && <LeadershipTab agents={agents} />}

        {/* TOP PERFORMERS TAB */}
        {activeTab === 'topPerformers' && <TopPerformersTab agents={agents} />}

        {/* SALES TAB */}
        {activeTab === 'sales' && <SalesTab salesRecords={salesRecords} />}
      </div>
    </main>
  )
}
