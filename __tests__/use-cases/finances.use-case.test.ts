import { describe, it, expect } from 'vitest'
import {
  calculateClientDebt,
  calculateAppointmentDebt,
} from '@/lib/use-cases/finances.use-case'

// ── calculateAppointmentDebt ──────────────────────────────────────────────

describe('calculateAppointmentDebt', () => {
  it('debe retornar el precio completo si no hay transacciones', () => {
    const debt = calculateAppointmentDebt({
      start_at: '2026-01-01T10:00:00Z',
      status: 'completed',
      service: { price: 100 },
      transactions: [],
    })
    expect(debt).toBe(100)
  })

  it('debe retornar la deuda parcial si hay pago parcial', () => {
    const debt = calculateAppointmentDebt({
      start_at: '2026-01-01T10:00:00Z',
      status: 'completed',
      service: { price: 100 },
      transactions: [{ net_amount: 60 }],
    })
    expect(debt).toBe(40)
  })

  it('debe retornar 0 si el pago cubre o excede el precio', () => {
    const debt = calculateAppointmentDebt({
      start_at: '2026-01-01T10:00:00Z',
      status: 'completed',
      service: { price: 100 },
      transactions: [{ net_amount: 100 }],
    })
    expect(debt).toBe(0)
  })

  it('debe retornar 0 si se paga de más (overpaid)', () => {
    const debt = calculateAppointmentDebt({
      start_at: '2026-01-01T10:00:00Z',
      status: 'completed',
      service: { price: 100 },
      transactions: [{ net_amount: 150 }],
    })
    expect(debt).toBe(0)
  })

  it('debe retornar 0 si service es null', () => {
    const debt = calculateAppointmentDebt({
      start_at: '2026-01-01T10:00:00Z',
      status: 'completed',
      service: null,
      transactions: [],
    })
    expect(debt).toBe(0)
  })
})

// ── calculateClientDebt ───────────────────────────────────────────────────

describe('calculateClientDebt', () => {
  it('debe retornar 0 cuando no hay citas', () => {
    expect(calculateClientDebt([])).toBe(0)
  })

  it('debe sumar deudas de citas pasadas no canceladas', () => {
    const debt = calculateClientDebt([
      {
        start_at: '2020-01-01T10:00:00Z',
        status: 'completed',
        service: { price: 100 },
        transactions: [{ net_amount: 40 }],
      },
      {
        start_at: '2020-02-01T10:00:00Z',
        status: 'completed',
        service: { price: 200 },
        transactions: [],
      },
    ])
    expect(debt).toBe(260) // (100-40) + 200
  })

  it('debe excluir citas canceladas y no_show', () => {
    const debt = calculateClientDebt([
      {
        start_at: '2020-01-01T10:00:00Z',
        status: 'cancelled',
        service: { price: 500 },
        transactions: [],
      },
      {
        start_at: '2020-02-01T10:00:00Z',
        status: 'no_show',
        service: { price: 300 },
        transactions: [],
      },
    ])
    expect(debt).toBe(0)
  })

  it('debe excluir citas futuras', () => {
    const debt = calculateClientDebt([
      {
        start_at: '2099-01-01T10:00:00Z',
        status: 'pending',
        service: { price: 100 },
        transactions: [],
      },
    ])
    expect(debt).toBe(0)
  })

  it('debe retornar 0 cuando todas las citas están pagadas', () => {
    const debt = calculateClientDebt([
      {
        start_at: '2020-01-01T10:00:00Z',
        status: 'completed',
        service: { price: 100 },
        transactions: [{ net_amount: 100 }],
      },
    ])
    expect(debt).toBe(0)
  })
})
