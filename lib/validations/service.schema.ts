import { z } from 'zod'

export const CreateServiceSchema = z.object({
  business_id:   z.string().uuid(),
  name:          z.string().min(1, 'El nombre es obligatorio').max(100),
  description:   z.string().max(500).optional(),
  duration_min:  z.number().int().positive('La duración debe ser mayor a 0'),
  price:         z.number().min(0, 'El precio no puede ser negativo'),
  color:         z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido').optional(),
  category:      z.string().max(50).optional(),
  is_active:     z.boolean().default(true),
})

export const UpdateServiceSchema = CreateServiceSchema.partial().omit({ business_id: true })

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>
