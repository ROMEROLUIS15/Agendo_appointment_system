import { describe, it, expect } from 'vitest'
import {
  parseWorkingHours,
  buildWorkingHoursPayload,
  getDefaultWorkingHours,
} from '@/lib/use-cases/business.use-case'
import type { DayKey } from '@/lib/use-cases/business.use-case'

// ── parseWorkingHours ─────────────────────────────────────────────────────

describe('parseWorkingHours', () => {
  it('debe retornar defaults cuando settings es null', () => {
    const result = parseWorkingHours(null)
    const keys: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

    for (const key of keys) {
      expect(result[key].active).toBe(false)
      expect(result[key].open).toBe('09:00')
      expect(result[key].close).toBe('18:00')
    }
  })

  it('debe parsear working hours válidos correctamente', () => {
    const result = parseWorkingHours({
      workingHours: {
        mon: ['08:00', '17:00'],
        tue: ['09:00', '18:00'],
        wed: null,
        thu: ['10:00', '19:00'],
        fri: ['08:30', '16:30'],
        sat: null,
        sun: null,
      },
    })

    expect(result.mon).toEqual({ open: '08:00', close: '17:00', active: true })
    expect(result.tue).toEqual({ open: '09:00', close: '18:00', active: true })
    expect(result.wed.active).toBe(false)
    expect(result.thu).toEqual({ open: '10:00', close: '19:00', active: true })
    expect(result.fri).toEqual({ open: '08:30', close: '16:30', active: true })
    expect(result.sat.active).toBe(false)
    expect(result.sun.active).toBe(false)
  })

  it('debe manejar settings parciales (faltan keys)', () => {
    const result = parseWorkingHours({
      workingHours: {
        mon: ['08:00', '17:00'],
        // Rest of days missing
      },
    })

    expect(result.mon.active).toBe(true)
    expect(result.tue.active).toBe(false)
    expect(result.wed.active).toBe(false)
  })
})

// ── buildWorkingHoursPayload ──────────────────────────────────────────────

describe('buildWorkingHoursPayload', () => {
  it('debe convertir DayHours activos a tuplas y inactivos a null', () => {
    const hours = getDefaultWorkingHours()
    hours.mon = { open: '08:00', close: '17:00', active: true }
    hours.tue = { open: '09:00', close: '18:00', active: true }

    const payload = buildWorkingHoursPayload(hours)

    expect(payload.mon).toEqual(['08:00', '17:00'])
    expect(payload.tue).toEqual(['09:00', '18:00'])
    expect(payload.wed).toBeNull()
    expect(payload.thu).toBeNull()
    expect(payload.fri).toBeNull()
    expect(payload.sat).toBeNull()
    expect(payload.sun).toBeNull()
  })

  it('debe retornar todos null cuando ningún día está activo', () => {
    const hours = getDefaultWorkingHours()
    const payload = buildWorkingHoursPayload(hours)

    const keys: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    for (const key of keys) {
      expect(payload[key]).toBeNull()
    }
  })
})

// ── getDefaultWorkingHours ────────────────────────────────────────────────

describe('getDefaultWorkingHours', () => {
  it('debe retornar 7 días con defaults correctos', () => {
    const result = getDefaultWorkingHours()
    const keys = Object.keys(result)
    expect(keys).toHaveLength(7)

    for (const key of keys) {
      const day = result[key as DayKey]
      expect(day.open).toBe('09:00')
      expect(day.close).toBe('18:00')
      expect(day.active).toBe(false)
    }
  })
})
