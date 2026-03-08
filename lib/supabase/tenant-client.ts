import { createClient as createBaseClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type PublicSchema = Database['public']
type TableName = keyof PublicSchema['Tables']

// Tables that have a business_id column
type TenantTable = {
  [K in TableName]: PublicSchema['Tables'][K]['Row'] extends { business_id: string | null } ? K : never
}[TableName]

/**
 * Tenant-aware Supabase Client
 * Automatically applies business_id filtering to all queries based on the current session.
 */
export async function createTenantClient() {
  const supabase = await createBaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('No authenticated user found for tenant client context.')
  }

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
    from: <T extends TenantTable>(table: T) => {
      // @ts-ignore - Postgrest filtering can be tricky with generics, but we know it's safe because of TenantTable constraint
      return supabase.from(table).eq('business_id', businessId)
    }
  }
}
