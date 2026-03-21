import { createClient as createBaseClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type PublicSchema = Database['public']
type TableName    = keyof PublicSchema['Tables']

// Tables that have a business_id column
type TenantTable = {
  [K in TableName]: PublicSchema['Tables'][K]['Row'] extends { business_id: string | null }
    ? K
    : never
}[TableName]

/**
 * Tenant-aware Supabase client.
 * Automatically applies business_id filtering to all queries
 * based on the authenticated user's business.
 *
 * Usage: const db = await createTenantClient()
 *        const { data } = await db.from('clients').select('*')
 *        → automatically scoped to the user's business_id
 */
export async function createTenantClient() {
  const supabase = await createBaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user found for tenant client context.')

  // Fix: use .single() so dbUser is an object, not an array
  const { data: dbUser, error } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single()

  if (error || !dbUser?.business_id) {
    throw new Error('User is not associated with any business.')
  }

  const businessId = dbUser.business_id

  return {
    ...supabase,
    // Override .from() to auto-apply business_id filter on tenant tables
    from: <T extends TenantTable>(table: T) => {
      // eslint-disable-next-line
      // @ts-ignore — Postgrest generic typing limitation, safe due to TenantTable constraint
      return supabase.from(table).eq('business_id', businessId)
    },
  }
}