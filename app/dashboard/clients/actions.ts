'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function registerClientPayment(formData: {
  business_id: string
  client_id: string
  amount: number
  method: string
  notes?: string
  appointment_id?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase.from('transactions').insert({
    business_id: formData.business_id,
    amount: formData.amount,
    net_amount: formData.amount,
    method: formData.method as any,
    notes: formData.notes || null,
    appointment_id: formData.appointment_id || null,
    paid_at: new Date().toISOString()
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/clients/${formData.client_id}`)
  revalidatePath('/dashboard/finances')
  return { success: true }
}
