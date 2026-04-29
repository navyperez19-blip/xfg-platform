import { supabase } from './supabase'

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export function canMoveStage(role: string, stage: string): boolean {
  const stageOwners: Record<string, string[]> = {
    new_lead: ['finley', 'executive', 'superadmin'],
    contacted: ['finley', 'executive', 'superadmin'],
    licensing: ['finley', 'executive', 'superadmin'],
    onboarding: ['executive', 'superadmin'],
    contracting: ['joe', 'executive', 'superadmin'],
    system_setup: ['joe', 'executive', 'superadmin'],
    training: ['jesse', 'executive', 'superadmin'],
    activation: ['noah', 'executive', 'superadmin'],
    active: ['noah', 'executive', 'superadmin'],
  }
  return stageOwners[stage]?.includes(role) || false
}

export function canCreateAgent(role: string): boolean {
  return ['finley', 'executive', 'superadmin'].includes(role)
}

export function canAddNotes(role: string): boolean {
  return ['finley', 'joe', 'jesse', 'noah', 'executive', 'superadmin'].includes(role)
}

export function canLockAgent(role: string): boolean {
  return ['finley', 'executive', 'superadmin'].includes(role)
}

export function canOverride(role: string): boolean {
  return ['executive', 'superadmin'].includes(role)
}
