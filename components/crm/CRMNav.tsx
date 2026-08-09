'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Trophy, UsersRound, Filter, Users, UserPlus, ClipboardList, Calendar, BookOpen, AlertTriangle, FileCheck, User, Shield, Phone, ArrowLeft } from 'lucide-react'

type Agent = {
  id: string
  full_name: string
  agent_model: string
}

export default function CRMNav({
  agent,
  isAdmin,
}: {
  agent: Agent
  isAdmin: boolean
}) {
  const pathname = usePathname()

  const navItems = [
    { href: '/crm', label: 'Dashboard', icon: <LayoutDashboard size={16} />, exact: true },
    { href: '/crm/leaderboard', label: 'Leaderboard', icon: <Trophy size={16} /> },
    { href: '/crm/team', label: 'My Team', icon: <UsersRound size={16} /> },
    { href: '/crm/leads', label: 'Leads Pipeline', icon: <Filter size={16} /> },
    { href: '/crm/clients', label: 'My Clients', icon: <Users size={16} /> },
    { href: '/crm/clients/new', label: 'Add Client', icon: <UserPlus size={16} /> },
    { href: '/crm/activity', label: 'Activity Log', icon: <ClipboardList size={16} /> },
    { href: '/crm/calendar', label: 'Calendar', icon: <Calendar size={16} /> },
    { href: '/crm/book', label: 'Book of Business', icon: <BookOpen size={16} /> },
    { href: '/crm/alerts', label: 'Policy Alerts', icon: <AlertTriangle size={16} /> },
    { href: '/crm/contracting', label: 'My Contracting', icon: <FileCheck size={16} /> },
    { href: '/crm/profile', label: 'My Profile', icon: <User size={16} /> },
    ...(isAdmin ? [{ href: '/crm/admin', label: 'All Agents', icon: <Shield size={16} /> }] : []),
  ]

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside style={{
      width: '240px',
      height: '100vh',
      backgroundColor: '#1A1A1A',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100,
      overflowY: 'hidden',
      borderRight: '1px solid #2A2A2A',
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #2A2A2A' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.2em',
          color: '#C9A96E',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          XFG
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#FFFFFF',
          letterSpacing: '0.02em',
        }}>
          XFG CRM
        </div>
      </div>

      {/* Agent info */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #2A2A2A' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#C9A96E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: '700',
          color: '#1A1A1A',
          marginBottom: '10px',
        }}>
          {agent.full_name?.[0]}
        </div>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF', lineHeight: 1.3 }}>
          {agent.full_name}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#666',
          marginTop: '2px',
          textTransform: 'capitalize',
          letterSpacing: '0.05em',
        }}>
          {agent.agent_model}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '2px',
                textDecoration: 'none',
                backgroundColor: active ? '#C9A96E15' : 'transparent',
                border: active ? '1px solid #C9A96E30' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{
                color: active ? '#C9A96E' : '#555',
                width: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {item.icon}
              </span>
              <span style={{
                fontSize: '13px',
                fontWeight: active ? '600' : '400',
                color: active ? '#FFFFFF' : '#888',
              }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom links - always visible */}
      <div style={{ padding: '12px', borderTop: '1px solid #2A2A2A', flexShrink: 0 }}>
        <a
          href="https://ascenti.readymode.com/login_new/?then=/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            textDecoration: 'none',
            marginBottom: '2px',
            backgroundColor: '#C9A96E18',
            border: '1px solid #C9A96E30',
          }}
        >
          <Phone size={16} color="#C9A96E" />
          <span style={{ fontSize: '13px', color: '#C9A96E', fontWeight: '600' }}>Open Dialer</span>
          <span style={{ fontSize: '10px', color: '#555', marginLeft: 'auto' }}>↗</span>
        </a>
        {isAdmin && (
          <Link
            href="/pipeline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} color="#555" />
            <span style={{ fontSize: '12px', color: '#555' }}>Back to Pipeline</span>
          </Link>
        )}
      </div>
    </aside>
  )
}
