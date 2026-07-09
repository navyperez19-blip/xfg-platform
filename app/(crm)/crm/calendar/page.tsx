'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

const EVENT_TYPES = [
  { value: 'follow_up', label: 'Follow Up', color: '#FF9800', icon: '🔔' },
  { value: 'call',      label: 'Call',       color: '#2196F3', icon: '📞' },
  { value: 'meeting',   label: 'Meeting',    color: '#9C27B0', icon: '🤝' },
  { value: 'reminder',  label: 'Reminder',   color: '#C9A96E', icon: '⏰' },
  { value: 'other',     label: 'Other',      color: '#7A7A7A', icon: '📝' },
]

const STATUS_CONFIG = {
  scheduled:  { label: 'Scheduled',  color: '#2196F3', bg: '#E3F2FD' },
  completed:  { label: 'Completed',  color: '#27AE60', bg: '#E8F5E9' },
  cancelled:  { label: 'Cancelled',  color: '#7A7A7A', bg: '#F5F5F5' },
  no_show:    { label: 'No Show',    color: '#E53935', bg: '#FEE2E2' },
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'follow_up',
    event_date: '', event_time: '', client_id: '', status: 'scheduled'
  })

  useEffect(() => {
    // Check if just connected Google Calendar
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true' && agentId) {
      supabase.from('agents').update({ google_calendar_connected: true }).eq('id', agentId).then(() => {
        setGoogleConnected(true)
        window.history.replaceState({}, '', '/crm/calendar')
      })
    }

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase.from('users').select('role').eq('id', user.id).single()
      const adminRoles = ['superadmin', 'executive']
      const admin = adminRoles.includes(userRecord?.role ?? '')
      setIsAdmin(admin)

      const { data: agentRecord } = await supabase.from('agents').select('id').eq('user_id', user.id).single()
      const aid = agentRecord?.id ?? null
      setAgentId(aid)

      await loadEvents(aid, admin)

      const { data: clientsData } = await supabase
        .from('crm_clients')
        .select('id, first_name, last_name')
        .eq('agent_id', aid)
        .order('first_name')
      setClients(clientsData ?? [])

      // Check if Google Calendar is connected
      if (agentRecord?.id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('google_calendar_connected')
          .eq('id', agentRecord.id)
          .single()
        setGoogleConnected(agentData?.google_calendar_connected ?? false)
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function loadEvents(aid: string | null, admin: boolean) {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const start = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const end = new Date(year, month + 2, 0).toISOString().split('T')[0]

    let query = supabase
      .from('crm_events')
      .select(`id, title, description, event_type, event_date, event_time, status, client_id, agent_id,
        crm_clients(id, first_name, last_name),
        agents!crm_events_agent_id_fkey(full_name)`)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date')
      .order('event_time')

    query = query.eq('agent_id', aid)

    const { data } = await query
    setEvents(data ?? [])
  }

  async function saveEvent() {
    if (!form.title || !form.event_date) return
    setSaving(true)

    const payload = {
      agent_id: agentId,
      title: form.title,
      description: form.description || null,
      event_type: form.event_type,
      event_date: form.event_date,
      event_time: form.event_time || null,
      client_id: form.client_id || null,
      status: form.status,
    }

    let savedEventId = editingEvent?.id

    if (editingEvent) {
      await supabase.from('crm_events').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingEvent.id)
    } else {
      const { data: newEvent } = await supabase.from('crm_events').insert(payload).select().single()
      savedEventId = newEvent?.id
    }

    // Auto-sync to Google Calendar if connected
    if (googleConnected && savedEventId && agentId) {
      try {
        const response = await fetch('/api/google-calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, event: { ...payload, id: savedEventId } })
        })
        const result = await response.json()
        if (result.synced) {
          setSyncMessage('✓ Synced to Google Calendar')
          setTimeout(() => setSyncMessage(''), 3000)
        }
      } catch (err) {
        console.error('Google sync error:', err)
      }
    }

    await loadEvents(agentId, isAdmin)
    setShowAddModal(false)
    setEditingEvent(null)
    resetForm()
    setSaving(false)
  }

  async function updateStatus(eventId: string, newStatus: string) {
    await supabase.from('crm_events').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', eventId)
    await loadEvents(agentId, isAdmin)
  }

  async function deleteEvent(eventId: string) {
    await supabase.from('crm_events').delete().eq('id', eventId)
    await loadEvents(agentId, isAdmin)
  }

  function resetForm() {
    setForm({ title: '', description: '', event_type: 'follow_up', event_date: selectedDate || '', event_time: '', client_id: '', status: 'scheduled' })
  }

  function openAddModal(date?: string) {
    resetForm()
    if (date) setForm(prev => ({ ...prev, event_date: date }))
    setEditingEvent(null)
    setShowAddModal(true)
  }

  function openEditModal(event: any) {
    setForm({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      event_date: event.event_date,
      event_time: event.event_time || '',
      client_id: event.client_id || '',
      status: event.status,
    })
    setEditingEvent(event)
    setShowAddModal(true)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const getEventsForDate = (dateStr: string) => events.filter(e => e.event_date === dateStr)

  const todayEvents = events.filter(e => e.event_date === today)
  const upcomingEvents = events.filter(e => e.event_date > today && e.status === 'scheduled').slice(0, 5)
  const overdueEvents = events.filter(e => e.event_date < today && e.status === 'scheduled')

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FAFAF8', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#4A4A4A', display: 'block', marginBottom: '4px' }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading calendar...</p>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>Calendar</h1>
          <p style={{ fontSize: '14px', color: '#7A7A7A' }}>Schedule and track follow-ups, calls, and meetings</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {syncMessage && (
            <span style={{ fontSize: '12px', color: '#27AE60', fontWeight: '600' }}>{syncMessage}</span>
          )}
          {!isAdmin && (
            googleConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: '8px' }}>
                <span style={{ fontSize: '14px' }}>📅</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#1B5E20' }}>Google Calendar Connected</span>
              </div>
            ) : (
              <a
                href={`/api/auth/google?agentId=${agentId}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#FFFFFF', border: '1px solid #E5E1DA', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: '600', color: '#4A4A4A' }}
              >
                <span style={{ fontSize: '14px' }}>📅</span>
                Connect Google Calendar
              </a>
            )
          )}
          <button
            onClick={() => openAddModal(today)}
            style={{ padding: '10px 20px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Add Event
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Today', value: todayEvents.length, color: '#2196F3', icon: '📅' },
          { label: 'Upcoming', value: upcomingEvents.length, color: '#27AE60', icon: '🗓' },
          { label: 'Overdue', value: overdueEvents.length, color: overdueEvents.length > 0 ? '#E53935' : '#7A7A7A', icon: '⚠️' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px 20px', border: '1px solid #E5E1DA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>{card.icon}</span>
              <span style={{ fontSize: '28px', fontWeight: '700', color: card.color }}>{card.value}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#7A7A7A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Google Calendar Tip Banner */}
      {!isAdmin && !googleConnected && (
        <div style={{ padding: '14px 18px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>📅</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#1E40AF', marginBottom: '4px' }}>Connect Your XFG Google Calendar</p>
            <p style={{ fontSize: '13px', color: '#1E40AF', lineHeight: 1.7 }}>
              To get reminders and notifications for your follow-ups and appointments, connect your Google Calendar. <strong>Use your XFG email address</strong> (e.g. firstnamelastname.xfg@gmail.com) to sign in. If you haven't set up your XFG Gmail yet, create a free Google account at gmail.com using your XFG email format first, then come back and connect it here.
            </p>
          </div>
        </div>
      )}

      {/* Overdue Alert */}
      {overdueEvents.length > 0 && (
        <div style={{ padding: '12px 18px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>⚠️</span>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#C0392B' }}>
            {overdueEvents.length} overdue event{overdueEvents.length !== 1 ? 's' : ''} — these were scheduled in the past and are still open.
          </p>
          <button onClick={() => setSelectedDate('overdue')} style={{ marginLeft: 'auto', padding: '5px 12px', backgroundColor: '#C0392B', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>View All</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        {/* Calendar Grid */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
          {/* Month Navigation */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E1DA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: 'none', border: '1px solid #E5E1DA', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>←</button>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A1A' }}>{MONTHS[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: 'none', border: '1px solid #E5E1DA', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>→</button>
          </div>

          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #E5E1DA' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{d}</div>
            ))}
          </div>

          {/* Calendar Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: '90px', borderRight: '1px solid #F0EDE8', borderBottom: '1px solid #F0EDE8', backgroundColor: '#FAFAF8' }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayEvents = getEventsForDate(dateStr)
              const isToday = dateStr === today
              const isSelected = dateStr === selectedDate

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  style={{
                    minHeight: '90px',
                    borderRight: '1px solid #F0EDE8',
                    borderBottom: '1px solid #F0EDE8',
                    padding: '6px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#FFFBF0' : isToday ? '#F0F7FF' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: isToday ? '700' : '500', color: isToday ? '#2196F3' : '#1A1A1A', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: isToday ? '#E3F2FD' : 'transparent' }}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); openAddModal(dateStr) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A96E', fontSize: '14px', padding: 0, lineHeight: 1 }}
                      >+</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayEvents.slice(0, 3).map(event => {
                      const typeConfig = EVENT_TYPES.find(t => t.value === event.event_type) ?? EVENT_TYPES[0]
                      return (
                        <div
                          key={event.id}
                          onClick={e => { e.stopPropagation(); openEditModal(event) }}
                          style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', backgroundColor: `${typeConfig.color}20`, color: typeConfig.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: event.status === 'completed' ? 'line-through' : 'none', opacity: event.status === 'cancelled' ? 0.5 : 1 }}
                        >
                          {typeConfig.icon} {event.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '10px', color: '#888', paddingLeft: '6px' }}>+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Selected Day Events */}
          {selectedDate && selectedDate !== 'overdue' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E1DA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAF8' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A' }}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <button onClick={() => openAddModal(selectedDate)} style={{ padding: '4px 10px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', fontFamily: 'inherit' }}>+ Add</button>
              </div>
              {getEventsForDate(selectedDate).length > 0 ? (
                <div>
                  {getEventsForDate(selectedDate).map((event, i, arr) => {
                    const typeConfig = EVENT_TYPES.find(t => t.value === event.event_type) ?? EVENT_TYPES[0]
                    return (
                      <div key={event.id} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '14px' }}>{typeConfig.icon}</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A' }}>{event.title}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => openEditModal(event)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A96E', fontSize: '12px', fontFamily: 'inherit' }}>Edit</button>
                            <button onClick={() => deleteEvent(event.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E53935', fontSize: '12px', fontFamily: 'inherit' }}>✕</button>
                          </div>
                        </div>
                        {event.crm_clients && (
                          <Link href={`/crm/clients/${event.crm_clients.id}`} style={{ fontSize: '11px', color: '#C9A96E', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                            👤 {event.crm_clients.first_name} {event.crm_clients.last_name}
                          </Link>
                        )}
                        {event.event_time && <p style={{ fontSize: '11px', color: '#7A7A7A', marginBottom: '4px' }}>🕐 {event.event_time}</p>}
                        {event.description && <p style={{ fontSize: '12px', color: '#4A4A4A', marginBottom: '6px' }}>{event.description}</p>}
                        {isAdmin && event.agents?.full_name && <p style={{ fontSize: '11px', color: '#AAA', marginBottom: '6px' }}>Agent: {event.agents.full_name}</p>}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                            <button
                              key={status}
                              onClick={() => updateStatus(event.id, status)}
                              style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', backgroundColor: event.status === status ? config.bg : '#F5F5F5', color: event.status === status ? config.color : '#AAA', border: `1px solid ${event.status === status ? config.color + '40' : '#E5E1DA'}` }}
                            >
                              {config.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: '#7A7A7A', marginBottom: '12px' }}>No events scheduled</p>
                  <button onClick={() => openAddModal(selectedDate)} style={{ padding: '8px 16px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', fontFamily: 'inherit' }}>+ Schedule Something</button>
                </div>
              )}
            </div>
          )}

          {/* Overdue Events */}
          {selectedDate === 'overdue' && overdueEvents.length > 0 && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #FECACA', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #FECACA', backgroundColor: '#FEF2F2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#C0392B' }}>⚠️ Overdue Events</h3>
                <button onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: '16px' }}>×</button>
              </div>
              {overdueEvents.map((event, i) => {
                const typeConfig = EVENT_TYPES.find(t => t.value === event.event_type) ?? EVENT_TYPES[0]
                return (
                  <div key={event.id} style={{ padding: '12px 16px', borderBottom: i < overdueEvents.length - 1 ? '1px solid #F0EDE8' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A' }}>{typeConfig.icon} {event.title}</span>
                      <span style={{ fontSize: '11px', color: '#E53935', fontWeight: '600' }}>{new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    {event.crm_clients && <p style={{ fontSize: '11px', color: '#C9A96E', marginBottom: '6px' }}>👤 {event.crm_clients.first_name} {event.crm_clients.last_name}</p>}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => updateStatus(event.id, 'completed')} style={{ padding: '3px 10px', backgroundColor: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'inherit' }}>Mark Done</button>
                      <button onClick={() => openEditModal(event)} style={{ padding: '3px 10px', backgroundColor: '#E3F2FD', color: '#1565C0', border: '1px solid #90CAF9', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'inherit' }}>Reschedule</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Upcoming Events */}
          {!selectedDate && upcomingEvents.length > 0 && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E1DA', backgroundColor: '#FAFAF8' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A' }}>Upcoming</h3>
              </div>
              {upcomingEvents.map((event, i) => {
                const typeConfig = EVENT_TYPES.find(t => t.value === event.event_type) ?? EVENT_TYPES[0]
                return (
                  <div key={event.id} onClick={() => openEditModal(event)} style={{ padding: '12px 16px', borderBottom: i < upcomingEvents.length - 1 ? '1px solid #F0EDE8' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: `${typeConfig.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{typeConfig.icon}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '2px' }}>{event.title}</p>
                      <p style={{ fontSize: '11px', color: '#7A7A7A' }}>
                        {new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {event.event_time && ` at ${event.event_time}`}
                        {event.crm_clients && ` · ${event.crm_clients.first_name} ${event.crm_clients.last_name}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Today's Events when no date selected */}
          {!selectedDate && todayEvents.length > 0 && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #BFDBFE', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #BFDBFE', backgroundColor: '#EFF6FF' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#1E40AF' }}>📅 Today</h3>
              </div>
              {todayEvents.map((event, i) => {
                const typeConfig = EVENT_TYPES.find(t => t.value === event.event_type) ?? EVENT_TYPES[0]
                return (
                  <div key={event.id} onClick={() => openEditModal(event)} style={{ padding: '12px 16px', borderBottom: i < todayEvents.length - 1 ? '1px solid #F0EDE8' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: `${typeConfig.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{typeConfig.icon}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '2px' }}>{event.title}</p>
                      <p style={{ fontSize: '11px', color: '#7A7A7A' }}>
                        {event.event_time && `${event.event_time} · `}
                        {event.crm_clients ? `${event.crm_clients.first_name} ${event.crm_clients.last_name}` : typeConfig.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A1A' }}>{editingEvent ? 'Edit Event' : 'Add Event'}</h2>
              <button onClick={() => { setShowAddModal(false); setEditingEvent(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: '20px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>Title *</label>
                <input style={inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Follow up call with client" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>Type</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}>
                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Status</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <option key={value} value={value}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>Date *</label>
                  <input type="date" style={inp} value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>Time (optional)</label>
                  <input type="time" style={inp} value={form.event_time} onChange={e => setForm({ ...form, event_time: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={lbl}>Client (optional)</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">No client linked</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Notes (optional)</label>
                <textarea style={{ ...inp, minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Any additional details..." />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button onClick={() => { setShowAddModal(false); setEditingEvent(null) }} style={{ padding: '10px 20px', backgroundColor: '#FFFFFF', color: '#4A4A4A', border: '1px solid #E5E1DA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                {editingEvent && (
                  <button onClick={() => { deleteEvent(editingEvent.id); setShowAddModal(false) }} style={{ padding: '10px 20px', backgroundColor: '#FEE2E2', color: '#C0392B', border: '1px solid #FECACA', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Delete</button>
                )}
                <button onClick={saveEvent} disabled={saving || !form.title || !form.event_date} style={{ padding: '10px 24px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', opacity: saving || !form.title || !form.event_date ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : editingEvent ? 'Save Changes' : 'Add Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
