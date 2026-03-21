'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as financesRepo from '@/lib/repositories/finances.repo'

// ── Zod schema for payment registration ───────────────────────────────────
const RegisterPaymentSchema = z.object({
  business_id:     z.string().uuid('ID de negocio inválido'),
  client_id:       z.string().uuid('ID de cliente inválido'),
  amount:          z.number().positive('El monto debe ser mayor a cero.'),
  method:          z.enum(['cash', 'card', 'transfer', 'qr', 'other']),
  notes:           z.string().max(200).optional(),
  appointment_id:  z.string().uuid().optional(),
})

type RegisterPaymentInput = z.infer<typeof RegisterPaymentSchema>

// ── Actions ────────────────────────────────────────────────────────────────

/**
 * Registers a client payment (full payment or partial abono).
 * Inserts a transaction and decrements the client's outstanding debt.
 */
export async function registerClientPayment(
  formData: RegisterPaymentInput
): Promise<{ success: true }> {
  // 1. Validate with Zod
  const parsed = RegisterPaymentSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Datos inválidos'
    throw new Error(firstError)
  }

  const validData = parsed.data
  const supabase = await createClient()

  // 2. Auth guard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado.')

  // 3. Create transaction via repo
  await financesRepo.createTransaction(supabase, {
    business_id:     validData.business_id,
    amount:          validData.amount,
    net_amount:      validData.amount,
    method:          validData.method,
    notes:           validData.notes ?? null,
    appointment_id:  validData.appointment_id ?? null,
  })

  revalidatePath(`/dashboard/clients/${validData.client_id}`)
  revalidatePath('/dashboard/finances')

  return { success: true }
}
