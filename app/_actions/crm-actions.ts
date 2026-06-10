'use client'

import { supabase } from '@/app/lib/supabase'

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


export async function createCRMClient(formData: ClientFormData, agentId?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  let resolvedAgentId = agentId

  if (!resolvedAgentId) {
    const { data: agentRecord } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .single()

    resolvedAgentId = agentRecord?.id
  }

  if (!resolvedAgentId) {
    return { error: 'No agent record found. Admins must select an agent to add clients for.' }
  }

  const { data, error } = await supabase
    .from('crm_clients')
    .insert({
      ...formData,
      agent_id: resolvedAgentId,
      tobacco_user: formData.tobacco_user ?? false,
      date_of_birth: formData.date_of_birth || null,
      email: formData.email || null,
      phone: formData.phone || null,
      health_status: formData.health_status || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function createCRMPolicy(formData: PolicyFormData, agentId?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  let resolvedAgentId = agentId

  if (!resolvedAgentId) {
    const { data: agentRecord } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .single()

    resolvedAgentId = agentRecord?.id
  }

  if (!resolvedAgentId) {
    return { error: 'No agent record found.' }
  }

  const { data, error } = await supabase
    .from('crm_policies')
    .insert({
      ...formData,
      agent_id: resolvedAgentId,
      face_amount: formData.face_amount || null,
      monthly_premium: formData.monthly_premium || null,
      annual_premium: formData.annual_premium || null,
      effective_date: formData.effective_date || null,
      policy_number: formData.policy_number || null,
      notes: formData.notes || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}
