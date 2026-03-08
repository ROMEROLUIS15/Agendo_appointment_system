'use server'

import { createClient } from '@/lib/supabase/server'
import { forgotPasswordSchema } from '@/lib/validations/auth'
import { headers } from 'next/headers'

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string
  
  const result = forgotPasswordSchema.safeParse({ email })
  if (!result.success) {
    return { error: result.error?.errors?.[0]?.message || 'Email inválido' }
  }

  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Se ha enviado un enlace de recuperación a tu correo.' }
}
