'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { toast } from 'sonner'
import ConfirmModal from '@/app/components/ConfirmModal'
import PageSkeleton from '@/app/components/PageSkeleton'

export default function TasksPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [completions, setCompletions] = useState<any[]>([])
  const [staffUsers, setStaffUsers] = useState<any[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'daily' as 'daily' | 'one_off',
    assigned_to: '',
    due_date: ''
  })

  const canCreateTasks = ['Tristan', 'Tate'].some(name =>
    currentUser?.full_name?.toLowerCase().includes(name.toLowerCase())
  )

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userRecord } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!userRecord || !['superadmin', 'executive'].includes(userRecord.role)) {
        router.push('/dashboard')
        return
      }

      setCurrentUser(userRecord)

      const { data: staff } = await supabase
        .from('users')
        .select('id, full_name, role')
        .in('role', ['superadmin', 'executive'])
        .order('full_name')

      setStaffUsers(staff ?? [])

      const { data: tasksData } = await supabase
        .from('admin_tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      setTasks(tasksData ?? [])

      const today = new Date().toISOString().split('T')[0]
      const { data: completionsData } = await supabase
        .from('admin_task_completions')
        .select('*')
        .eq('completed_date', today)

      setCompletions(completionsData ?? [])
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

  const isCompletedToday = (taskId: string) => {
    return completions.some(c => c.task_id === taskId)
  }

  async function toggleDailyCompletion(task: any) {
    const today = new Date().toISOString().split('T')[0]
    const alreadyDone = isCompletedToday(task.id)

    if (alreadyDone) {
      await supabase.from('admin_task_completions').delete().eq('task_id', task.id).eq('completed_date', today)
      setCompletions(prev => prev.filter(c => c.task_id !== task.id))
    } else {
      const { data } = await supabase.from('admin_task_completions').insert({
        task_id: task.id,
        completed_by: currentUser.id,
        completed_date: today
      }).select().single()
      if (data) setCompletions(prev => [...prev, data])
      if (data) toast.success('Nice work! ✓')
    }
  }

  async function toggleOneOffCompletion(task: any) {
    const newCompleted = !task.completed
    await supabase.from('admin_tasks').update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }).eq('id', task.id)

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t))
  }

  async function createTask() {
    if (!newTask.title || !newTask.assigned_to) return

    const { data, error } = await supabase.from('admin_tasks').insert({
      title: newTask.title,
      description: newTask.description || null,
      task_type: newTask.task_type,
      assigned_to: newTask.assigned_to,
      assigned_by: currentUser.id,
      due_date: newTask.task_type === 'one_off' && newTask.due_date ? newTask.due_date : null
    }).select().single()

    if (!error && data) {
      setTasks(prev => [data, ...prev])
      toast.success(`Task assigned to ${staffUsers.find(u => u.id === newTask.assigned_to)?.full_name}`)

      await supabase.from('notifications').insert({
        recipient_id: newTask.assigned_to,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `${currentUser.full_name} assigned you a ${newTask.task_type === 'daily' ? 'daily' : ''} task: "${newTask.title}"`,
        is_read: false
      })

      setNewTask({ title: '', description: '', task_type: 'daily', assigned_to: '', due_date: '' })
      setShowCreateForm(false)
    }
  }

  async function archiveTask(taskId: string) {
    await supabase.from('admin_tasks').update({ is_active: false }).eq('id', taskId)
    toast.success('Task removed')
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setConfirmArchiveId(null)
  }

  if (loading) return <PageSkeleton />

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: isMobile ? '12px' : '0', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 4px 0' }}>✅ Admin Tasks</h1>
          <p style={{ fontSize: '14px', color: '#7A7A7A', margin: 0 }}>Daily checklist and assigned tasks for the team</p>
        </div>
        {canCreateTasks && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{ padding: '10px 20px', backgroundColor: '#C9A96E', color: '#1A1A1A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
          >
            {showCreateForm ? 'Cancel' : '+ New Task'}
          </button>
        )}
      </div>

      {showCreateForm && canCreateTasks && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', padding: '20px 24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              placeholder="Task title"
              value={newTask.title}
              onChange={e => setNewTask({ ...newTask, title: e.target.value })}
              style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}
            />
            <textarea
              placeholder="Description (optional)"
              value={newTask.description}
              onChange={e => setNewTask({ ...newTask, description: e.target.value })}
              style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', minHeight: '70px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select
                value={newTask.task_type}
                onChange={e => setNewTask({ ...newTask, task_type: e.target.value as 'daily' | 'one_off' })}
                style={{ flex: 1, padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', minWidth: '160px' }}
              >
                <option value="daily">Daily Recurring</option>
                <option value="one_off">One-Off Task</option>
              </select>
              <select
                value={newTask.assigned_to}
                onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}
                style={{ flex: 1, padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', minWidth: '160px' }}
              >
                <option value="">Assign to...</option>
                {staffUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
              {newTask.task_type === 'one_off' && (
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                  style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}
                />
              )}
            </div>
            <button
              onClick={createTask}
              style={{ padding: '10px 20px', backgroundColor: '#1A1A1A', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', alignSelf: 'flex-start' }}
            >
              Create Task
            </button>
          </div>
        </div>
      )}

      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : undefined, gridTemplateColumns: isMobile ? undefined : `repeat(${staffUsers.length}, minmax(260px, 1fr))`, gap: '16px', overflowX: isMobile ? 'visible' : 'auto', paddingBottom: '8px' }}>
        {staffUsers.map(user => {
          const userTasks = tasks.filter(t => t.assigned_to === user.id)
          const userDaily = userTasks.filter(t => t.task_type === 'daily')
          const userOneOffPending = userTasks.filter(t => t.task_type === 'one_off' && !t.completed)
          const userOneOffDone = userTasks.filter(t => t.task_type === 'one_off' && t.completed)
          const totalOpen = userDaily.filter(t => !isCompletedToday(t.id)).length + userOneOffPending.length

          return (
            <div key={user.id} style={{ backgroundColor: '#F4F1EB', borderRadius: '14px', border: '1px solid #E5E1DA', display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E1DA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#1A1A1A' }}>
                    {user.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>{user.full_name}</p>
                </div>
                {totalOpen > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#1A1A1A', backgroundColor: '#FFFFFF', padding: '2px 8px', borderRadius: '10px', border: '1px solid #E5E1DA' }}>{totalOpen}</span>
                )}
              </div>

              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {userDaily.length === 0 && userOneOffPending.length === 0 && userOneOffDone.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#AAA', textAlign: 'center', padding: '20px 0' }}>No tasks</p>
                )}

                {userDaily.map(task => {
                  const done = isCompletedToday(task.id)
                  return (
                    <div key={task.id} onClick={() => toggleDailyCompletion(task)} style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E1DA', padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: done ? 0.6 : 1 }}>
                      <input type="checkbox" checked={done} onChange={() => toggleDailyCompletion(task)} onClick={e => e.stopPropagation()} style={{ width: '17px', height: '17px', cursor: 'pointer', marginTop: '1px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '9px', fontWeight: '700', color: '#7C3AED', backgroundColor: '#EDE9FE', padding: '1px 6px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Daily</span>
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: done ? '#AAA' : '#1A1A1A', margin: 0, textDecoration: done ? 'line-through' : 'none' }}>{task.title}</p>
                        {task.description && <p style={{ fontSize: '11px', color: '#AAA', margin: '3px 0 0 0' }}>{task.description}</p>}
                      </div>
                      {canCreateTasks && (
                        <button onClick={e => { e.stopPropagation(); setConfirmArchiveId(task.id) }} style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: '16px', flexShrink: 0, padding: 0 }}>×</button>
                      )}
                    </div>
                  )
                })}

                {userOneOffPending.map(task => (
                  <div key={task.id} onClick={() => toggleOneOffCompletion(task)} style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E1DA', padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <input type="checkbox" checked={task.completed} onChange={() => toggleOneOffCompletion(task)} onClick={e => e.stopPropagation()} style={{ width: '17px', height: '17px', cursor: 'pointer', marginTop: '1px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '700', color: '#C9A96E', backgroundColor: '#FBF3E3', padding: '1px 6px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Task</span>
                        {task.due_date && <span style={{ fontSize: '9px', fontWeight: '700', color: '#EF4444' }}>Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A', margin: 0 }}>{task.title}</p>
                      {task.description && <p style={{ fontSize: '11px', color: '#AAA', margin: '3px 0 0 0' }}>{task.description}</p>}
                    </div>
                    {canCreateTasks && (
                      <button onClick={e => { e.stopPropagation(); setConfirmArchiveId(task.id) }} style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: '16px', flexShrink: 0, padding: 0 }}>×</button>
                    )}
                  </div>
                ))}

                {userOneOffDone.map(task => (
                  <div key={task.id} onClick={() => toggleOneOffCompletion(task)} style={{ backgroundColor: '#FAFAF8', borderRadius: '10px', border: '1px solid #EBE8E3', padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: 0.55 }}>
                    <input type="checkbox" checked={task.completed} onChange={() => toggleOneOffCompletion(task)} onClick={e => e.stopPropagation()} style={{ width: '17px', height: '17px', cursor: 'pointer', marginTop: '1px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#AAA', margin: 0, textDecoration: 'line-through' }}>{task.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <ConfirmModal
        isOpen={!!confirmArchiveId}
        title="Remove Task"
        message="Are you sure you want to remove this task?"
        confirmLabel="Remove"
        onConfirm={() => confirmArchiveId && archiveTask(confirmArchiveId)}
        onCancel={() => setConfirmArchiveId(null)}
      />
    </div>
  )
}
