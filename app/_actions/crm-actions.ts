'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export type ClientFormData = {
  first_name: string
  last_name: string
  date_of_birth?: string
  email?: string
  phone?: string
  city?: string
  state?: string
  zip?: string
  health_status?: 'excellent' | 'good' | 'fair' | 'poor'
  tobacco_user?: boolean
  health_notes?: string
  notes?: string
}

export type PolicyFormData = {
  client_id: string
  carrier: string
  product_type: string
  policy_number?: string
  face_amount?: number
  monthly_premium?: number
  annual_premium?: number
  date_written: string
  effective_date?: string
  status: string
  notes?: string
}

async function getAgentRecord(supabase: ReturnType<typeof createServerActionClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data: agent } = await supabase
    .from('agents')
    .select('id, agent_model')
    .eq('user_id', session.user.id)
    .single()

  if (!agent) throw new Error('Agent record not found')
  return agent
}

export async function createClient(formData: ClientFormData) {
  const supabase = createServerActionClient({ cookies })
  const agent = await getAgentRecord(supabase)

  const { data, error } = await supabase
    .from('crm_clients')
    .insert({
      ...formData,
      agent_id: agent.id,
      tobacco_user: formData.tobacco_user ?? false,
    })
    .select()
    .single()

  if (error) {
    console.error('createClient error:', error)
    return { error: error.message }
  }

  revalidatePath('/crm')
  revalidatePath('/crm/clients')
  return { data }
}

export async function updateClient(id: string, formData: Partial<ClientFormData>) {
  const supabase = createServerActionClient({ cookies })
  await getAgentRecord(supabase)

  const { data, error } = await supabase
    .from('crm_clients')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/crm')
  revalidatePath('/crm/clients')
  revalidatePath(`/crm/clients/${id}`)
  return { data }
}

export async function deleteClient(id: string) {
  const supabase = createServerActionClient({ cookies })
  await getAgentRecord(supabase)

  const { error } = await supabase
    .from('crm_clients')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/crm')
  revalidatePath('/crm/clients')
  return { success: true }
}

export async function createPolicy(formData: PolicyFormData) {
  const supabase = createServerActionClient({ cookies })
  const agent = await getAgentRecord(supabase)

  const { data, error } = await supabase
    .from('crm_policies')
    .insert({
      ...formData,
      agent_id: agent.id,
      face_amount: formData.face_amount || null,
      monthly_premium: formData.monthly_premium || null,
      annual_premium: formData.annual_premium || null,
    })
    .select()
    .single()

  if (error) {
    console.error('createPolicy error:', error)
    return { error: error.message }
  }

  revalidatePath('/crm')
  revalidatePath('/crm/clients')
  revalidatePath(`/crm/clients/${formData.client_id}`)
  return { data }
}

export async function updatePolicy(id: string, formData: Partial<PolicyFormData>) {
  const supabase = createServerActionClient({ cookies })
  await getAgentRecord(supabase)

  const { data, error } = await supabase
    .from('crm_policies')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/crm')
  revalidatePath('/crm/clients')
  return { data }
}

export async function deletePolicy(id: string) {
  const supabase = createServerActionClient({ cookies })
  await getAgentRecord(supabase)

  const { error } = await supabase
    .from('crm_policies')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/crm')
  return { success: true }
}
