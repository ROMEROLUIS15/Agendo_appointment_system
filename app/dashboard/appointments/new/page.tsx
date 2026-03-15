'use client'

import { useState, useEffect, Suspense } from 'react'
import { ArrowLeft, CalendarDays, AlertTriangle, Info, Loader2, CheckCircle2, AlertCircle, UserPlus, Lock, Clock } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DualBookingBadge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { evaluateDoubleBooking } from '@/lib/appointments/validate-double-booking'
import type { Client, Service, User } from '@/types'

type DoubleBookingLevel = 'allowed' | 'warn' | 'blocked'

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns the local day boundaries as ISO strings for Supabase range queries.
 * Fixes timezone bug: datetime-local input values are in local time,
 * so we must query using local midnight boundaries, not UTC midnight.
 */
function getLocalDayBoundaries(localDatetimeStr: string): { start: string; end: string } {
  const dateStr  = localDatetimeStr.split('T')[0]
  const dayStart = new Date(`${dateStr}T00:00:00`)
  const dayEnd   = new Date(`${dateStr}T23:59:59.999`)
  return { start: dayStart.toISOString(), end: dayEnd.toISOString() }
}

/**
 * Returns the minimum allowed datetime-local string (current time, rounded
 * DOWN to the current minute). Used as the `min` attribute on time inputs.
 */
function getNowLocalMin(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`
  )
}

/**
 * Formats a YYYY-MM-DD string to a human-readable "Lunes, 15 de Marzo 2026"
 * using the browser locale (es).
 */
function formatDateLabel(dateStr: string): string {
  // Parse as local midnight to avoid timezone rollback to previous day
  const parts = dateStr.split('-')
  const y = parseInt(parts[0] ?? '2000', 10)
  const m = parseInt(parts[1] ?? '1',    10)
  const d = parseInt(parts[2] ?? '1',    10)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ── Inner Component (uses useSearchParams — must be inside <Suspense>) ─────────

function NewAppointmentForm() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const supabase    = createClient()

  // ?date=YYYY-MM-DD passed from the calendar day panel
  const calendarDate = searchParams.get('date') // e.g. "2026-03-15" | null
  const isDateLocked = Boolean(calendarDate)

  // ── State ────────────────────────────────────────────────────────────────────
  const [businessId,         setBusinessId]         = useState<string | null>(null)
  const [form,               setForm]               = useState({
    client_id: '', service_id: '', assigned_user_id: '',
    /*
      When date is locked (from calendar):  start_at = "YYYY-MM-DDTHH:mm"
      We split the input into two fields:
        - date part is pre-filled from calendarDate (read-only)
        - time part is what the user enters (type="time")
      When no date lock: single datetime-local input.
    */
    start_at: calendarDate ? `${calendarDate}T` : '',  // will be completed with time
    time: '',   // used only in date-locked mode
    notes: '',
  })
  const [clients,            setClients]            = useState<Client[]>([])
  const [services,           setServices]           = useState<Service[]>([])
  const [users,              setUsers]              = useState<User[]>([])
  const [loadingData,        setLoadingData]        = useState(true)
  const [doubleBookingLevel, setDoubleBookingLevel] = useState<DoubleBookingLevel>('allowed')
  const [doubleBookingMsg,   setDoubleBookingMsg]   = useState('')
  const [confirmed,          setConfirmed]          = useState(false)
  const [saving,             setSaving]             = useState(false)
  const [msg,                setMsg]                = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pastError,          setPastError]          = useState(false)

  // Minimum allowed datetime string — re-computed fresh on each check
  const minDatetime = getNowLocalMin()

  // ── Data load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: dbUser } = await supabase
        .from('users').select('business_id').eq('id', user.id).single()
      if (!dbUser?.business_id) { setLoadingData(false); return }
      const bId = dbUser.business_id
      setBusinessId(bId)
      const [clientsRes, servicesRes, usersRes] = await Promise.all([
        supabase.from('clients').select('id, name, phone, email').eq('business_id', bId).is('deleted_at', null),
        supabase.from('services').select('id, name, duration_min, price').eq('business_id', bId).eq('is_active', true),
        supabase.from('users').select('id, name').eq('business_id', bId).eq('is_active', true),
      ])
      if (clientsRes.data)  setClients(clientsRes.data as Client[])
      if (servicesRes.data) setServices(servicesRes.data as Service[])
      if (usersRes.data)    setUsers(usersRes.data as User[])
      setLoadingData(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Derived: combined start_at for validation & DB ──────────────────────────
  /**
   * The resolved start_at string in "YYYY-MM-DDTHH:mm" format.
   * - Date-locked mode: combines calendarDate + form.time
   * - Free mode: uses form.start_at directly
   */
  const resolvedStartAt: string = isDateLocked
    ? (calendarDate && form.time ? `${calendarDate}T${form.time}` : '')
    : form.start_at

  const selectedService = services.find(s => s.id === form.service_id)

  // ── Past-time validation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!resolvedStartAt || resolvedStartAt.endsWith('T')) {
      setPastError(false)
      return
    }
    const chosen = new Date(resolvedStartAt)
    const now    = new Date()
    setPastError(chosen <= now)
  }, [resolvedStartAt])

  // ── Double-booking check ─────────────────────────────────────────────────────
  useEffect(() => {
    async function checkDoubleBooking() {
      if (!form.client_id || !resolvedStartAt || resolvedStartAt.endsWith('T')) {
        setDoubleBookingLevel('allowed'); setDoubleBookingMsg(''); return
      }
      const { start, end } = getLocalDayBoundaries(resolvedStartAt)
      const { data } = await supabase
        .from('appointments')
        .select('start_at, service:services(name)')
        .eq('client_id', form.client_id)
        .gte('start_at', start)
        .lte('start_at', end)
        .not('status', 'in', '("cancelled")')
      const existingCount = data?.length || 0
      const existingSlots = (data || []).map((a: any) => ({
        time:    new Date(a.start_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        service: a.service?.name || 'Cita',
      }))
      const result = evaluateDoubleBooking({ existingCount, existingSlots })
      setDoubleBookingLevel(result.level)
      setDoubleBookingMsg(result.message)
      setConfirmed(false)
    }
    const t = setTimeout(checkDoubleBooking, 500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.client_id, resolvedStartAt])

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || doubleBookingLevel === 'blocked') return
    if (doubleBookingLevel === 'warn' && !confirmed) return

    // Server-side past guard (belt + suspenders)
    if (!resolvedStartAt || resolvedStartAt.endsWith('T')) return
    const startObj = new Date(resolvedStartAt)
    if (startObj <= new Date()) {
      setPastError(true)
      return
    }

    setSaving(true)
    const endObj = new Date(startObj.getTime() + (selectedService?.duration_min || 30) * 60000)
    const { error } = await supabase.from('appointments').insert({
      business_id:      businessId,
      client_id:        form.client_id,
      service_id:       form.service_id,
      assigned_user_id: form.assigned_user_id || null,
      start_at:         startObj.toISOString(),
      end_at:           endObj.toISOString(),
      notes:            form.notes || null,
      status:           'pending',
      is_dual_booking:  doubleBookingLevel === 'warn',
    })
    setSaving(false)
    if (error) {
      setMsg({ type: 'error', text: 'Error al crear la cita: ' + error.message })
    } else {
      setMsg({ type: 'success', text: 'Cita creada correctamente' })
      setTimeout(() => { router.push('/dashboard/appointments'); router.refresh() }, 1200)
    }
  }

  if (loadingData) {
    return (
      <div className="flex justify-center items-center py-20 text-muted-foreground">
        <Loader2 size={32} className="animate-spin" />
        <span className="ml-3 font-medium">Cargando formulario...</span>
      </div>
    )
  }

  const canSubmit =
    !pastError &&
    resolvedStartAt !== '' &&
    !resolvedStartAt.endsWith('T') &&
    doubleBookingLevel !== 'blocked' &&
    !(doubleBookingLevel === 'warn' && !confirmed)

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl w-full overflow-x-hidden">

      {/* Navigation row */}
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <Link href="/dashboard/appointments" className="flex-1 sm:flex-initial">
          <Button variant="primary" size="sm" leftIcon={<ArrowLeft size={16} />} className="w-full h-10 rounded-xl px-4">
            Agenda
          </Button>
        </Link>
        <Link href="/dashboard/clients/new" className="flex-1 sm:flex-initial">
          <Button variant="primary" size="sm" leftIcon={<UserPlus size={15} />} className="w-full h-10 rounded-xl px-4">
            Nuevo Cliente
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nueva Cita</h1>
        <p className="text-muted-foreground text-sm">Completa los datos para agendar una cita</p>
      </div>

      {msg && (
        <div
          className="flex items-center gap-3 text-sm p-4 rounded-xl"
          style={msg.type === 'success'
            ? { background: 'rgba(48,209,88,0.1)',  border: '1px solid rgba(48,209,88,0.2)',  color: '#30D158' }
            : { background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)',  color: '#FF6B6B' }
          }
        >
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="overflow-hidden">
          <h2 className="text-base font-semibold text-foreground mb-4">Información de la cita</h2>
          <div className="space-y-4">

            {/* Client */}
            <div className="w-full max-w-full overflow-hidden">
              <label className="block text-sm font-medium text-foreground mb-1.5">Cliente *</label>
              <select
                required
                value={form.client_id}
                onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                className="input-base bg-card w-full max-w-full truncate"
              >
                <option value="">Selecciona un cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* ── DATE / TIME FIELD ──────────────────────────────────────────── */}
            {isDateLocked ? (
              /*
                DATE LOCKED MODE (came from calendar):
                Show the date as a read-only display and only allow
                selecting the TIME — the client already chose the day.
              */
              <div className="space-y-3">
                {/* Locked date display */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Fecha <span className="text-xs font-normal text-muted-foreground">(seleccionada desde el calendario)</span>
                  </label>
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: 'rgba(0,98,255,0.06)',
                      border: '1px solid rgba(0,98,255,0.2)',
                    }}
                  >
                    <CalendarDays size={16} style={{ color: '#0062FF', flexShrink: 0 }} />
                    <span className="text-sm font-semibold capitalize" style={{ color: '#F2F2F2' }}>
                      {calendarDate ? formatDateLabel(calendarDate) : ''}
                    </span>
                    <Lock size={13} className="ml-auto flex-shrink-0" style={{ color: '#4A4A5A' }} />
                  </div>
                  <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: '#6A6A7A' }}>
                    <Lock size={10} /> La fecha está fijada. Solo elige la hora.
                  </p>
                </div>

                {/* Time-only picker */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <Clock size={14} className="inline mr-1" />
                    Hora de la cita *
                  </label>
                  <input
                    type="time"
                    required
                    value={form.time}
                    min={
                      // If the locked date is today, restrict to future times
                      calendarDate === getNowLocalMin().split('T')[0]
                        ? getNowLocalMin().split('T')[1]
                        : '00:00'
                    }
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="input-base"
                    style={{ maxWidth: '180px' }}
                  />
                </div>
              </div>
            ) : (
              /*
                FREE MODE (navigated directly, no calendar date):
                Single datetime-local picker with min=now to block past times.
              */
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Fecha y hora *</label>
                <input
                  type="datetime-local"
                  required
                  value={form.start_at}
                  min={minDatetime}
                  onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))}
                  className="input-base"
                />
              </div>
            )}

            {/* Past time error */}
            {pastError && (
              <div
                className="flex items-start gap-3 p-3 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)', color: '#FF6B6B' }}
              >
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                No se pueden agendar citas en una fecha u hora que ya pasó. Por favor elige una hora futura.
              </div>
            )}

            {/* Double-booking warnings */}
            {doubleBookingLevel === 'warn' && (
              <div className="flex flex-col sm:flex-row items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.25)' }}>
                <AlertTriangle size={18} style={{ color: '#FFD60A', flexShrink: 0, marginTop: '2px' }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold flex items-center gap-2" style={{ color: '#FFD60A' }}>
                    Doble agenda detectada <DualBookingBadge />
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,214,10,0.75)' }}>{doubleBookingMsg}</p>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input type="checkbox" checked={confirmed}
                      onChange={e => setConfirmed(e.target.checked)}
                      className="accent-brand-600 w-4 h-4 rounded" />
                    <span className="text-xs font-medium" style={{ color: '#FFD60A' }}>
                      Confirmo que deseo agregar una segunda cita el mismo día
                    </span>
                  </label>
                </div>
              </div>
            )}

            {doubleBookingLevel === 'blocked' && (
              <div className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)' }}>
                <AlertTriangle size={18} style={{ color: '#FF3B30', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#FF3B30' }}>Límite de doble agenda alcanzado</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,59,48,0.75)' }}>
                    Este cliente ya tiene 2 citas programadas para ese día.
                  </p>
                </div>
              </div>
            )}

            {/* Service */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Servicio *</label>
              <select
                required
                value={form.service_id}
                onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}
                className="input-base bg-card"
              >
                <option value="">Selecciona un servicio...</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} – {s.duration_min} min</option>
                ))}
              </select>
              {selectedService && (
                <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                  <Info size={12} />
                  Duración: {selectedService.duration_min} min · Precio: ${selectedService.price.toLocaleString('es-CO')}
                </p>
              )}
            </div>

            {/* Staff */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Empleado asignado</label>
              <select
                value={form.assigned_user_id}
                onChange={e => setForm(f => ({ ...f, assigned_user_id: e.target.value }))}
                className="input-base bg-card"
              >
                <option value="">Sin asignar</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Notas (opcional)</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Preferencias del cliente, instrucciones especiales..."
                className="input-base resize-none"
              />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-10">
          <Link href="/dashboard/appointments">
            <Button variant="secondary" type="button">Cancelar</Button>
          </Link>
          <Button
            type="submit"
            loading={saving}
            disabled={!canSubmit}
            leftIcon={<CalendarDays size={16} />}
          >
            Agendar Cita
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── Page export — wraps form in Suspense (required for useSearchParams) ─────────
export default function NewAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-20 text-muted-foreground">
        <Loader2 size={32} className="animate-spin" />
        <span className="ml-3 font-medium">Cargando formulario...</span>
      </div>
    }>
      <NewAppointmentForm />
    </Suspense>
  )
}