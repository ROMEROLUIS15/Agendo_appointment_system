/**
 * Users Repository — Supabase queries for user/auth context.
 *
 * Centralizes the `getUser() → select business_id` pattern
 * that is currently duplicated in 8+ pages.
 *
 * Exposes:
 *  - getBusinessContext:  auth user → { userId, businessId, userName }
 *  - getUserProfile:      full user row
 *  - getBusinessMembers:  all active users in a business
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Client = SupabaseClient<Database>

export interface BusinessContext {
  userId: string
  businessId: string
  userName: string
}

/**
 * Resolves the authenticated user's business context.
 * Returns null if user is not authenticated or has no business.
 */
export async function getBusinessContext(
  supabase: Client
): Promise<BusinessContext | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: dbUser } = await supabase
    .from('users')
    .select('business_id, name')
    .eq('id', user.id)
    .single()

  if (!dbUser?.business_id) return null

  return {
    userId: user.id,
    businessId: dbUser.business_id,
    userName: dbUser.name?.split(' ')[0] ?? 'Usuario',
  }
}

/**
 * Returns the full user profile row.
 */
export async function getUserProfile(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, avatar_url, color, role, business_id')
    .eq('id', userId)
    .single()

  if (error) throw new Error(`Error fetching user profile: ${error.message}`)
  return data
}

/**
 * Returns all active users (employees) for a business.
 */
export async function getBusinessMembers(
  supabase: Client,
  businessId: string
) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, avatar_url, color, role, is_active')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(`Error fetching business members: ${error.message}`)
  return data ?? []
}

/**
 * Returns only the business_id for a given user.
 * Lightweight check used by setup flow to verify if user already has a business.
 */
export async function getUserBusinessId(
  supabase: Client,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', userId)
    .single()

  return data?.business_id ?? null
}

/**
 * Upserts a user row (insert or update on conflict with `id`).
 * Used during onboarding to link a user to their newly created business.
 */
export async function upsertUser(
  supabase: Client,
  data: {
    id: string
    name: string
    email: string
    business_id: string
    role: Database['public']['Enums']['user_role']
  }
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .upsert(data, { onConflict: 'id' })

  if (error) throw new Error(`Error upserting user: ${error.message}`)
}

/**
 * Updates a user's profile fields.
 * Only updates the fields provided — partial update.
 */
export async function updateUser(
  supabase: Client,
  userId: string,
  data: Partial<Pick<Database['public']['Tables']['users']['Update'], 'name' | 'phone' | 'avatar_url'>>
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update(data)
    .eq('id', userId)

  if (error) throw new Error(`Error updating user: ${error.message}`)
}
