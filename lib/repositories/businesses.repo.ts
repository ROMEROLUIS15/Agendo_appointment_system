/**
 * Businesses Repository — Supabase queries for the businesses table.
 *
 * Exposes:
 *  - createBusiness:  insert a new business row and return it
 *
 * Does NOT expose:
 *  - Read queries (handled by useBusinessContext in users.repo)
 *  - Settings updates (handled by settings page directly — future migration)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Client = SupabaseClient<Database>
type BusinessInsert = Database['public']['Tables']['businesses']['Insert']
type BusinessRow = Database['public']['Tables']['businesses']['Row']

/**
 * Creates a new business and returns the created row.
 * Throws on error to let the caller handle presentation.
 */
export async function createBusiness(
  supabase: Client,
  data: Pick<BusinessInsert, 'name' | 'category' | 'owner_id' | 'plan'>
): Promise<BusinessRow> {
  const { data: business, error } = await supabase
    .from('businesses')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(`Error creating business: ${error.message}`)
  return business
}
