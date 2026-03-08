'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 1. Actualizar tabla 'users'
  const { error: userError } = await supabase
    .from('users')
    .update({ name, phone, email })
    .eq('id', user.id)

  if (userError) return { error: userError.message }

  // 2. Si hay password, actualizar Auth
  if (password) {
    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) return { error: authError.message }
  }

  // 3. Si el email cambió, actualizar Auth (Supabase enviará confirmación)
  if (email !== user.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email })
    if (emailError) return { error: emailError.message }
  }

  revalidatePath('/dashboard/profile')
  return { success: 'Perfil actualizado correctamente' }
}

export async function updateAvatar(url: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('users')
    .update({ avatar_url: url })
    .eq('id', user.id)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/profile')
  return { success: 'Imagen actualizada' }
}
