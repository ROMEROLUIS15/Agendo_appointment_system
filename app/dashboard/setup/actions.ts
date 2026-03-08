'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createBusiness(prevState: any, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const category = formData.get('category') as string

  if (!name || !category) {
    return { error: 'Nombre y categoría son requeridos' }
  }

  // 1. Insertar el negocio
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .insert({
      name,
      category,
      owner_id: user.id,
      plan: 'pro', // Default plan for new businesses in this version
    })
    .select()
    .single()

  if (bizError) {
    console.error('Error creating business:', bizError)
    return { error: 'No se pudo crear el negocio. Intenta de nuevo.' }
  }

  // 2. Vincular el usuario al negocio como 'owner'
  const { error: userError } = await supabase
    .from('users')
    .update({
      business_id: business.id,
      role: 'owner'
    })
    .eq('id', user.id)

  if (userError) {
    console.error('Error updating user business:', userError)
    
    if (userError.code === '42P17') {
      return { 
        error: 'Error de base de datos: Recursión detectada en políticas RLS. ' +
        'Por favor, aplica el script de corrección en Supabase.' 
      }
    }
    
    return { error: 'Error vinculando el perfil al negocio: ' + userError.message }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
