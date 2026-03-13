'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft, CalendarDays, AlertTriangle, Info,
  Loader2, CheckCircle2, AlertCircle, Save,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DualBookingBadge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { evaluateDoubleBooking } from '@/lib/appointments/validate-double-booking'
import type { Client, Service, User } from '@/types'

type DoubleBookingLevel = 'allowed' | 'warn' | 'blocked'

/** Convierte ISO string → valor para input[type=datetime-local] */
function toDatetimeLocal(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return (
    d.getFullYear()
    + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0')
    + 'T' + String(d.getHours()).padStart(2, '0')
    + ':' + String(d.getMinutes()).padStart(2, '0')
  )
}

interface Props { params: { id: string } }

export default function EditAppointmentPage({ params }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [businessId,  setBusinessId]  = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    client_id:        '',
    service_id:       '',
    assigned_user_id: '',
    start_at:         '',
    status:           'pending',
    notes:            '',
  })

  const [clients,  setClients]  = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users,    setUsers]    = useState<User[]>([])

  const [doubleBookingLevel, setDoubleBookingLevel] = useState<DoubleBookingLevel>('allowed')
  const [doubleBookingMsg,   setDoubleBookingMsg]   = useState('')
  const [confirmed,          setConfirmed]          = useState(false)

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: dbUser } = await supabase
        .from('users').select('business_id').eq('id', user.id).single()
      if (!dbUser?.business_id) { setLoadingData(false); return }

      const bId = dbUser.business_id
      setBusinessId(bId)

      const [clientsRes, servicesRes, usersRes, aptRes] = await Promise.all([
        supabase.from('clients').select('id, name, phone, email').eq('business_id', bId).is('deleted_at', null),
        supabase.from('services').select('id, name, duration_min, price').eq('business_id', bId).eq('is_active', true),
        supabase.from('users').select('id, name').eq('business_id', bId).eq('is_active', true),
        supabase.from('appointments')
          .select('id, client_id, service_id, assigned_user_id, start_at, status, notes')
          .eq('id', params.id)
          .eq('business_id', bId)
          .single(),
      ])

      if (clientsRes.data) setClients(clientsRes.data as Client[])
      if (servicesRes.data) setServices(servicesRes.data as Service[])
      if (usersRes.data) setUsers(usersRes.data as User[])

      if (!aptRes.data || aptRes.error) {
        router.push('/dashboard/appointments')
        return
      }

      const apt = aptRes.data
      setForm({
        client_id:        apt.client_id        ?? '',
        service_id:       apt.service_id       ?? '',
        assigned_user_id: apt.assigned_user_id ?? '',
        start_at:         toDatetimeLocal(apt.start_at),
        status:           apt.status           ?? 'pending',
        notes:            apt.notes            ?? '',
      })
      setLoadingData(false)
    }
    init()
  }, [])

  // ── Detección de doble agenda ─────────────────────────────────────────────
  useEffect(() => {
    async function check() {
      if (!form.client_id || !form.start_at) {
        setDoubleBookingLevel('allowed'); setDoubleBookingMsg(''); return
      }
      const dateStr = form.start_at.split('T')[0]
      const { data } = await supabase
        .from('appointments')
        .select('start_at, service:services(name)')
        .eq('client_id', form.client_id)
        .gte('start_at', `${dateStr}T00:00:00Z`)
        .lte('start_at', `${dateStr}T23:59:59Z`)
        .not('status', 'in', '("cancelled")')
        .neq('id', params.id) // excluir la cita que estamos editando

      const existingCount = data?.length ?? 0
      const existingSlots = (data ?? []).map((a: any) => ({
        time:    new Date(a.start_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        service: a.service?.name ?? 'Cita',
      }))
      const result = evaluateDoubleBooking({ existingCount, existingSlots })
      setDoubleBookingLevel(result.level)
      setDoubleBookingMsg(result.message)
      setConfirmed(false)
    }
    const t = setTimeout(check, 500)
    return () => clearTimeout(t)
  }, [form.client_id, form.start_at])

  const selectedService = services.find(s => s.id === form.service_id)

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || doubleBookingLevel === 'blocked') return
    if (doubleBookingLevel === 'warn' && !confirmed) return
    setSaving(true)

    const startObj = new Date(form.start_at)

    if (startObj < new Date()) {
      setMsg({ type: 'error', text: 'No puedes asignar citas con fecha y hora en el pasado.' })
      setSaving(false)
      return
    }

    const endObj   = new Date(startObj.getTime() + (selectedService?.duration_min ?? 30) * 60_000)

    const { error } = await supabase
      .from('appointments')
      .update({
        client_id:        form.client_id,
        service_id:       form.service_id,
        assigned_user_id: form.assigned_user_id || null,
        start_at:         startObj.toISOString(),
        end_at:           endObj.toISOString(),
        status:           form.status as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show',
        notes:            form.notes || null,
        is_dual_booking:  doubleBookingLevel === 'warn',
        updated_at:       new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('business_id', businessId)

    setSaving(false)
    if (error) {
      setMsg({ type: 'error', text: 'Error al actualizar: ' + error.message })
    } else {
      setMsg({ type: 'success', text: 'Cita actualizada correctamente' })
      setTimeout(() => { router.push('/dashboard/appointments'); router.refresh() }, 1200)
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div className="flex justify-center items-center py-20" style={{ color: '#909098' }}>
        <Loader2 size={32} className="animate-spin" />
        <span className="ml-3 font-medium">Cargando cita...</span>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Back */}
      <Link href="/dashboard/appointments" className="btn-ghost inline-flex text-sm gap-2" style={{ color: '#909098' }}>
        <ArrowLeft size={16} /> Volver a Agenda
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: '#F2F2F2', letterSpacing: '-0.025em' }}>
          Editar Cita
        </h1>
        <p className="text-sm" style={{ color: '#909098' }}>Modifica los datos de esta cita</p>
      </div>

      {/* Feedback */}
      {msg && (
        <div
          className="p-4 rounded-xl flex items-center gap-3 text-sm"
          style={msg.type === 'success'
            ? { background: 'rgba(48,209,88,0.08)',  border: '1px solid rgba(48,209,88,0.2)',  color: '#30D158' }
            : { background: 'rgba(255,59,48,0.08)',  border: '1px solid rgba(255,59,48,0.2)',  color: '#FF3B30' }
          }
        >
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,98,255,0.1)' }}>
              <CalendarDays size={18} style={{ color: '#0062FF' }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: '#F2F2F2' }}>
              Información de la cita
            </h2>
          </div>

          <div className="space-y-4">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#F2F2F2' }}>
                Cliente <span style={{ color: '#FF3B30' }}>*</span>
              </label>
              <select required value={form.client_id}
                onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                className="input-base">
                <option value="">Selecciona un cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Fecha y hora */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#F2F2F2' }}>
                Fecha y hora <span style={{ color: '#FF3B30' }}>*</span>
              </label>
              <input type="datetime-local" required value={form.start_at}
                onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))}
                className="input-base" />
            </div>

            {/* Doble agenda — warn */}
            {doubleBookingLevel === 'warn' && (
              <div className="flex flex-col sm:flex-row items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(255,214,10,0.06)', border: '1px solid rgba(255,214,10,0.25)' }}>
                <AlertTriangle size={18} style={{ color: '#FFD60A', flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold flex items-center gap-2" style={{ color: '#FFD60A' }}>
                    Doble agenda detectada <DualBookingBadge />
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,214,10,0.7)' }}>{doubleBookingMsg}</p>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
                      className="w-4 h-4 rounded" style={{ accentColor: '#FFD60A' }} />
                    <span className="text-xs font-medium" style={{ color: '#FFD60A' }}>
                      Confirmo que deseo mantener esta segunda cita el mismo día
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Doble agenda — blocked */}
            {doubleBookingLevel === 'blocked' && (
              <div className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.25)' }}>
                <AlertTriangle size={18} style={{ color: '#FF3B30', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#FF3B30' }}>Límite de doble agenda alcanzado</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,59,48,0.7)' }}>
                    Este cliente ya tiene 2 citas programadas para ese día.
                  </p>
                </div>
              </div>
            )}

            {/* Servicio */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#F2F2F2' }}>
                Servicio <span style={{ color: '#FF3B30' }}>*</span>
              </label>
              <select required value={form.service_id}
                onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}
                className="input-base">
                <option value="">Selecciona un servicio...</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} – {s.duration_min} min</option>
                ))}
              </select>
              {selectedService && (
                <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: '#606068' }}>
                  <Info size={12} />
                  Duración: {selectedService.duration_min} min · Precio: ${selectedService.price.toLocaleString('es-CO')}
                </p>
              )}
            </div>

            {/* Empleado */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#F2F2F2' }}>
                Empleado asignado
              </label>
              <select value={form.assigned_user_id}
                onChange={e => setForm(f => ({ ...f, assigned_user_id: e.target.value }))}
                className="input-base">
                <option value="">Sin asignar</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#F2F2F2' }}>
                Estado
              </label>
              <select value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="input-base">
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
                <option value="no_show">No asistió</option>
              </select>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#F2F2F2' }}>
                Notas (opcional)
              </label>
              <textarea rows={3} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Preferencias del cliente, instrucciones especiales..."
                className="input-base resize-none" />
            </div>
          </div>
        </Card>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pb-10">
          <Link href="/dashboard/appointments">
            <Button variant="secondary" type="button">Cancelar</Button>
          </Link>
          <Button
            type="submit"
            loading={saving}
            disabled={doubleBookingLevel === 'blocked' || (doubleBookingLevel === 'warn' && !confirmed)}
            leftIcon={<Save size={16} />}
          >
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  )
}
