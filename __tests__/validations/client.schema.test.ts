import { describe, it, expect } from 'vitest'
import { CreateClientSchema, UpdateClientSchema } from '@/lib/validations/client.schema'

describe('CreateClientSchema', () => {
  const validInput = {
    business_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'María García',
    phone: '+573001234567',
  }

  it('debe aceptar input válido', () => {
    const result = CreateClientSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('debe rechazar nombre menor a 2 caracteres', () => {
    const result = CreateClientSchema.safeParse({ ...validInput, name: 'M' })
    expect(result.success).toBe(false)
  })

  it('debe rechazar teléfono con formato inválido', () => {
    const result = CreateClientSchema.safeParse({ ...validInput, phone: 'abc' })
    expect(result.success).toBe(false)
  })

  it('debe aceptar email válido opcional', () => {
    const result = CreateClientSchema.safeParse({ ...validInput, email: 'maria@test.com' })
    expect(result.success).toBe(true)
  })

  it('debe aceptar email vacío', () => {
    const result = CreateClientSchema.safeParse({ ...validInput, email: '' })
    expect(result.success).toBe(true)
  })

  it('debe rechazar más de 10 tags', () => {
    const result = CreateClientSchema.safeParse({
      ...validInput,
      tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
    })
    expect(result.success).toBe(false)
  })

  it('debe aceptar phone vacío', () => {
    const result = CreateClientSchema.safeParse({ ...validInput, phone: '' })
    expect(result.success).toBe(true)
  })
})

describe('UpdateClientSchema', () => {
  it('debe aceptar actualización parcial', () => {
    const result = UpdateClientSchema.safeParse({ name: 'Nuevo Nombre' })
    expect(result.success).toBe(true)
  })

  it('debe rechazar nombre inválido en update parcial', () => {
    const result = UpdateClientSchema.safeParse({ name: 'X' })
    expect(result.success).toBe(false)
  })
})
