/**
 * Finances Use Case — Pure business logic for financial calculations.
 *
 * NO framework dependencies.
 *
 * Exposes:
 *  - calculateClientDebt:     compute total debt from appointment + transaction data
 *  - calculateAppointmentDebt: compute debt for a single appointment
 */

interface AppointmentWithPayment {
  start_at: string
  status: string | null
  service: { price: number } | null
  transactions: Array<{ net_amount: number }>
}

/**
 * Calculates total unpaid debt for a client from their appointment history.
 * Only counts past appointments that are not cancelled/no_show.
 *
 * Pure function — no side effects, no DB calls.
 */
export function calculateClientDebt(
  appointments: AppointmentWithPayment[]
): number {
  const now = new Date()
  let totalDebt = 0

  for (const apt of appointments) {
    if (apt.status === 'cancelled' || apt.status === 'no_show') continue

    const isPast = new Date(apt.start_at) < now
    if (!isPast) continue

    const debt = calculateAppointmentDebt(apt)
    if (debt > 0) totalDebt += debt
  }

  return totalDebt
}

/**
 * Calculates remaining debt for a single appointment.
 * Returns positive number if client owes money, 0 if paid.
 */
export function calculateAppointmentDebt(apt: AppointmentWithPayment): number {
  const price = apt.service?.price ?? 0
  const paid  = apt.transactions?.reduce(
    (sum, t) => sum + (t.net_amount ?? 0),
    0,
  ) ?? 0

  return Math.max(0, price - paid)
}
