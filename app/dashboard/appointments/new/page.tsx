'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, CalendarDays, AlertTriangle, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DualBookingBadge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'  // ✅ browser client
import { evaluateDoubleBooking } from '@/lib/appointments/validate-double-booking'
import type { Client, Service, User } from '@/types'

type DoubleBookingLevel = 'allowed' | 'warn' | 'blocked'

export default function NewAppointmentPage() {
  const router = useRouter()
  const supabase = createClient()

  // ✅ businessId comes from session, not hardcoded
  const [businessId, setBusinessId] = useState<string | null>(null)

  const [form, setForm] = useState({
    client_id:        '',
    service_id:       '',
    assigned_user_id: '',
    start_at:         '',
    notes:            '',
  })

  const [clients, setClients]   = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers]       = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [doubleBookingLevel, setDoubleBookingLevel] = useState<DoubleBookingLevel>('allowed')
  const [doubleBookingMsg, setDoubleBookingMsg]     = useState('')
  const [confirmed, setConfirmed]                   = useState(false)
  const [saving, setSaving] = useState(false)

  // ✅ Step 1: get business_id from session, then fetch referentials
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: dbUser } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single()

      if (!dbUser?.business_id) {
        setLoadingData(false)
        return
      }

      const bId = dbUser.business_id
      setBusinessId(bId)

      const [clientsRes, servicesRes, usersRes] = await Promise.all([
        supabase.from('clients').select('id, name, phone, email').eq('business_id', bId).is('deleted_at', null),
        supabase.from('services').select('id, name, duration_min, price').eq('business_id', bId).eq('is_active', true),
        supabase.from('users').select('id, name').eq('business_id', bId).eq('is_active', true),
      ])

      if (clientsRes.data) setClients(clientsRes.data as Client[])
      if (servicesRes.data) setServices(servicesRes.data as Service[])
      if (usersRes.data) setUsers(usersRes.data as User[])
      setLoadingData(false)
    }
    init()
  }, [])

  const selectedService = services.find((s) => s.id === form.service_id)

  // Double booking check
  useEffect(() => {
    async function checkDoubleBooking() {
      if (!form.client_id || !form.start_at) {
        setDoubleBookingLevel('allowed')
        setDoubleBookingMsg('')
        return
      }

      const dateStr = form.start_at.split('T')[0]
      const startOfDay = `${dateStr}T00:00:00Z`
      const endOfDay   = `${dateStr}T23:59:59Z`

      const { data } = await supabase
        .from('appointments')
        .select('start_at, service:services(name)')
        .eq('client_id', form.client_id)
        .gte('start_at', startOfDay)
        .lte('start_at', endOfDay)
        .not('status', 'in', '("cancelled")')

      const existingCount = data?.length || 0
      const existingSlots = (data || []).map((a: any) => ({
        time: new Date(a.start_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        service: a.service?.name || 'Cita',
      }))

      const result = evaluateDoubleBooking({ existingCount, existingSlots })
      setDoubleBookingLevel(result.level)
      setDoubleBookingMsg(result.message)
      setConfirmed(false)
    }

    const timeout = setTimeout(checkDoubleBooking, 500)
    return () => clearTimeout(timeout)
  }, [form.client_id, form.start_at])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId) return
    if (doubleBookingLevel === 'blocked') return
    if (doubleBookingLevel === 'warn' && !confirmed) return

    setSaving(true)

    const startObj = new Date(form.start_at)
    const duration = selectedService?.duration_min || 30
    const endObj   = new Date(startObj.getTime() + duration * 60000)

    const { error } = await supabase.from('appointments').insert({
      business_id:      businessId,  // ✅ real business_id from session
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
      alert('Error al crear la cita: ' + error.message)
    } else {
      alert('✅ Cita creada correctamente')
      router.push('/dashboard/appointments')
      router.refresh()
    }
  }

  if (loadingData) {
    return (
      <div className="flex justify-center items-center py-20 text-muted-foreground animate-fade-in">
        <Loader2 size={32} className="animate-spin" />
        <span className="ml-3 font-medium">Cargando formulario...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Link href="/dashboard/appointments" className="btn-ghost inline-flex text-sm gap-2 text-muted-foreground">
        <ArrowLeft size={16} /> Volver a Agenda
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nueva Cita</h1>
        <p className="text-muted-foreground text-sm">Completa los datos para agendar una cita</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <h2 className="text-base font-semibold text-foreground mb-4">Información de la cita</h2>
          <div className="space-y-4">

            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="client-select">
                Cliente *
              </label>
              <select
                id="client-select"
                required
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                className="input-base bg-card"
              >
                <option value="">Selecciona un cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Date & time */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="apt-datetime">
                Fecha y hora *
              </label>
              <input
                id="apt-datetime"
                type="datetime-local"
                required
                value={form.start_at}
                onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
                className="input-base"
              />
            </div>

            {/* Double booking alerts */}
            {doubleBookingLevel === 'warn' && (
              <div className="flex flex-col sm:flex-row items-start gap-3 p-4 rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 animate-fade-in">
                <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                    Doble agenda detectada <DualBookingBadge />
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">{doubleBookingMsg}</p>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="accent-brand-600 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                      Confirmo que deseo agregar una segunda cita el mismo día
                    </span>
                  </label>
                </div>
              </div>
            )}

            {doubleBookingLevel === 'blocked' && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-fade-in">
                <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">Límite de doble agenda alcanzado</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">Este cliente ya tiene 2 citas programadas para ese día.</p>
                </div>
              </div>
            )}

            {/* Service */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="service-select">
                Servicio *
              </label>
              <select
                id="service-select"
                required
                value={form.service_id}
                onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))}
                className="input-base bg-card"
              >
                <option value="">Selecciona un servicio...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.duration_min} min
                  </option>
                ))}
              </select>
              {selectedService && (
                <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1 animate-fade-in">
                  <Info size={12} />
                  Duración: {selectedService.duration_min} min · Precio: ${selectedService.price.toLocaleString('es-CO')}
                </p>
              )}
            </div>

            {/* Assigned user */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="staff-select">
                Empleado asignado
              </label>
              <select
                id="staff-select"
                value={form.assigned_user_id}
                onChange={(e) => setForm((f) => ({ ...f, assigned_user_id: e.target.value }))}
                className="input-base bg-card"
              >
                <option value="">Sin asignar</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="apt-notes">
                Notas (opcional)
              </label>
              <textarea
                id="apt-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
            disabled={doubleBookingLevel === 'blocked' || (doubleBookingLevel === 'warn' && !confirmed)}
            leftIcon={<CalendarDays size={16} />}
          >
            Agendar Cita
          </Button>
        </div>
      </form>
    </div>
  )
}
