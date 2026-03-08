'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { registerSchema } from '@/lib/validations/auth'

export async function register(formData: FormData) {
  const data = Object.fromEntries(formData.entries())
  
  // 0. Validar datos en el servidor
  const result = registerSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error?.errors?.[0]?.message || 'Datos de registro inválidos' }
  }

  const { firstName, lastName, bizName, email, password } = result.data

  // Inicializamos el cliente con await para manejar las cookies correctamente
  const supabase = await createClient()

  // 1. Crear el usuario en el sistema de Autenticación de Supabase
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `${firstName} ${lastName}`.trim(),
      }
    }
  })

  if (authError) {
    return { error: authError.message }
  }

  const user = authData.user
  if (!user) {
    return { error: 'No se pudo crear el usuario en el sistema de autenticación.' }
  }

  // 2. Crear el negocio en la tabla 'businesses' (usando el ID del usuario)
  const { data: bizData, error: bizError } = await supabase
    .from('businesses')
    .insert({
      name: bizName,
      owner_id: user.id,
      category: 'General',
    })
    .select()
    .maybeSingle()

  if (bizError) {
    return { error: 'Error al crear el negocio: ' + bizError.message }
  }

  if (!bizData) {
    return { error: 'No se pudo obtener la información del negocio creado.' }
  }

  // 3. Crear el perfil de usuario en nuestra tabla pública 'users'
  const { error: userError } = await supabase
    .from('users')
    .insert({
      id: user.id,
      name: `${firstName} ${lastName}`.trim(),
      email: email,
      business_id: bizData.id,
      role: 'owner', // Verifica que 'owner' sea un valor permitido en tu base de datos
    })

  if (userError) {
    return { error: 'Error al crear el perfil de usuario: ' + userError.message }
  }

  // Si todo sale bien, mandamos al usuario al panel de control
  redirect('/dashboard')
}
