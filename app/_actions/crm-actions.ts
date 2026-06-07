'use server'

import { createClient as createSupabase } from '@/app/lib/supabase-server'
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

async function getAgentRecord(supabase: Awaited<ReturnType<typeof createSupabase>>) {
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

export async function createCRMClient(formData: ClientFormData) {
  const supabase = await createSupabase()
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
    console.error('createCRMClient error:', error)
    return { error: error.message }
  }

  revalidatePath('/crm')
  revalidatePath('/crm/clients')
  return { data }
}

export async function updateCRMClient(id: string, formData: Partial<ClientFormData>) {
  const supabase = await createSupabase()
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

export async function deleteCRMClient(id: string) {
  const supabase = await createSupabase()
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

export async function createCRMPolicy(formData: PolicyFormData) {
  const supabase = await createSupabase()
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
    console.error('createCRMPolicy error:', error)
    return { error: error.message }
  }

  revalidatePath('/crm')
  revalidatePath('/crm/clients')
  revalidatePath(`/crm/clients/${formData.client_id}`)
  return { data }
}

export async function updateCRMPolicy(id: string, formData: Partial<PolicyFormData>) {
  const supabase = await createSupabase()
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

export async function deleteCRMPolicy(id: string) {
  const supabase = await createSupabase()
  await getAgentRecord(supabase)

  const { error } = await supabase
    .from('crm_policies')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/crm')
  return { success: true }
}
