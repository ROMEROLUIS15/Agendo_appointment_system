/**
 * Business Use Case — Pure business logic for business settings.
 *
 * NO framework dependencies.
 *
 * Exposes:
 *  - parseWorkingHours:       raw JSON settings → typed DayHours array
 *  - buildWorkingHoursPayload: DayHours back to settings JSON shape
 */

import type { BusinessSettingsJson } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────

export interface DayHours {
  open:   string
  close:  string
  active: boolean
}

const DEFAULT_DAY: DayHours = { open: '09:00', close: '18:00', active: false }

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type DayKey = typeof DAY_KEYS[number]

// ── Parse working hours from raw settings ─────────────────────────────────

/**
 * Parses the raw `settings.workingHours` JSON into typed DayHours records.
 * Handles missing keys, malformed data, and null settings gracefully.
 *
 * Pure function — no side effects.
 */
export function parseWorkingHours(
  rawSettings: unknown
): Record<DayKey, DayHours> {
  const settings = rawSettings as BusinessSettingsJson | null
  const wh = settings?.workingHours ?? {}

  const result = {} as Record<DayKey, DayHours>
  for (const key of DAY_KEYS) {
    const val = wh[key]
    if (Array.isArray(val) && val.length === 2) {
      result[key] = {
        open:   String(val[0] ?? '09:00'),
        close:  String(val[1] ?? '18:00'),
        active: true,
      }
    } else {
      result[key] = { ...DEFAULT_DAY }
    }
  }

  return result
}

// ── Build payload from DayHours back to settings shape ────────────────────

/**
 * Converts typed DayHours records back to the JSON shape for Supabase.
 * Active days become `[open, close]`, inactive become `null`.
 *
 * Pure function — no side effects.
 */
export function buildWorkingHoursPayload(
  hours: Record<DayKey, DayHours>
): Record<string, [string, string] | null> {
  const result: Record<string, [string, string] | null> = {}
  for (const key of DAY_KEYS) {
    const h = hours[key]
    result[key] = h?.active ? [h.open, h.close] : null
  }
  return result
}

/**
 * Returns the default working hours template.
 */
export function getDefaultWorkingHours(): Record<DayKey, DayHours> {
  const result = {} as Record<DayKey, DayHours>
  for (const key of DAY_KEYS) {
    result[key] = { ...DEFAULT_DAY }
  }
  return result
}
