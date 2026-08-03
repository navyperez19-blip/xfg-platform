'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function TasksPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [completions, setCompletions] = useState<any[]>([])
  const [staffUsers, setStaffUsers] = useState<any[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filterAssignee, setFilterAssignee] = useState<string>('all')

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
    if (!confirm('Remove this task?')) return
    await supabase.from('admin_tasks').update({ is_active: false }).eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  if (loading) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#7A7A7A', fontSize: '14px' }}>Loading...</p>
      </div>
    </div>
  )

  const filteredTasks = filterAssignee === 'all' ? tasks : tasks.filter(t => t.assigned_to === filterAssignee)
  const dailyTasks = filteredTasks.filter(t => t.task_type === 'daily')
  const oneOffTasks = filteredTasks.filter(t => t.task_type === 'one_off' && !t.completed)
  const completedOneOff = filteredTasks.filter(t => t.task_type === 'one_off' && t.completed)

  const getUserName = (id: string) => staffUsers.find(u => u.id === id)?.full_name || 'Unknown'

  return (
    <div>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
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

        <div style={{ marginBottom: '20px' }}>
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            style={{ padding: '8px 14px', fontSize: '13px', border: '1px solid #E5E1DA', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF' }}
          >
            <option value="all">Everyone</option>
            {staffUsers.map(u => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>

        {/* Daily Recurring Tasks */}
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>📅 Daily Checklist</p>
          {dailyTasks.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#AAA' }}>No daily tasks assigned yet.</p>
          ) : (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
              {dailyTasks.map((task, i) => {
                const done = isCompletedToday(task.id)
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderTop: i > 0 ? '1px solid #F0EDE8' : 'none' }}>
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleDailyCompletion(task)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: done ? '#AAA' : '#1A1A1A', margin: 0, textDecoration: done ? 'line-through' : 'none' }}>{task.title}</p>
                      {task.description && <p style={{ fontSize: '12px', color: '#AAA', margin: '2px 0 0 0' }}>{task.description}</p>}
                      <p style={{ fontSize: '11px', color: '#C9A96E', margin: '4px 0 0 0', fontWeight: '600' }}>{getUserName(task.assigned_to)}</p>
                    </div>
                    {canCreateTasks && (
                      <button onClick={() => archiveTask(task.id)} style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: '18px' }}>×</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* One-Off Tasks */}
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#C9A96E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>📌 Assigned Tasks</p>
          {oneOffTasks.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#AAA' }}>No pending tasks.</p>
          ) : (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
              {oneOffTasks.map((task, i) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderTop: i > 0 ? '1px solid #F0EDE8' : 'none' }}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleOneOffCompletion(task)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A', margin: 0 }}>{task.title}</p>
                    {task.description && <p style={{ fontSize: '12px', color: '#AAA', margin: '2px 0 0 0' }}>{task.description}</p>}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <p style={{ fontSize: '11px', color: '#C9A96E', margin: 0, fontWeight: '600' }}>{getUserName(task.assigned_to)}</p>
                      {task.due_date && <p style={{ fontSize: '11px', color: '#EF4444', margin: 0, fontWeight: '600' }}>Due {new Date(task.due_date).toLocaleDateString()}</p>}
                    </div>
                  </div>
                  {canCreateTasks && (
                    <button onClick={() => archiveTask(task.id)} style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: '18px' }}>×</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed One-Off */}
        {completedOneOff.length > 0 && (
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>✓ Completed</p>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E1DA', overflow: 'hidden' }}>
              {completedOneOff.map((task, i) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderTop: i > 0 ? '1px solid #F0EDE8' : 'none' }}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleOneOffCompletion(task)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#AAA', margin: 0, textDecoration: 'line-through' }}>{task.title}</p>
                    <p style={{ fontSize: '11px', color: '#AAA', margin: '4px 0 0 0' }}>{getUserName(task.assigned_to)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
