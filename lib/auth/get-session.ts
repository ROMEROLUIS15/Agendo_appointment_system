import { createClient } from '@/lib/supabase/server'

export async function getSession() {
  try {
    const supabase = await createClient()

    // 1. CAMBIO DE SEGURIDAD: Usamos getUser() en lugar de getSession()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null // Si no hay usuario real autenticado, devuelve null
    }

    // 2. Buscamos los datos del usuario logueado en nuestra tabla 'users'
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id) // Filtra exactamente por el ID del que inició sesión
      .maybeSingle()

    if (dbError) {
      console.error('Error fetching dbUser in getSession:', dbError.message)
      // Si hay error de base de datos (como recursión de RLS), devolvemos el usuario de auth sin dbUser
      return { ...user, dbUser: null, business_id: null, error: dbError.message }
    }

    if (!dbUser) {
      return { ...user, dbUser: null, business_id: null }
    }

    return {
      ...user,
      dbUser,
      business_id: dbUser.business_id
    }
  } catch (e) {
    console.error('Critical failure in getSession:', e)
    return null
  }
}
