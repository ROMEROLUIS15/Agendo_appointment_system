'use client'

/**
 * PasskeyRegister — Dashboard component for managing WebAuthn passkeys.
 *
 * Shows enrolled passkeys, allows registering new ones, and unenrolling.
 * Designed for the profile/settings page. Fully responsive.
 */

import { useState } from 'react'
import { Fingerprint, Trash2, Plus, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { usePasskey } from '@/lib/hooks/use-passkey'

export function PasskeyRegister() {
  const {
    status,
    error,
    factors,
    isSupported,
    enroll,
    unenroll,
    resetError,
  } = usePasskey()

  const [deviceName, setDeviceName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  if (!isSupported) {
    return (
      <div
        className="flex items-start gap-3 rounded-xl p-4"
        style={{
          background: 'rgba(255,59,48,0.06)',
          border:     '1px solid rgba(255,59,48,0.15)',
        }}
      >
        <AlertCircle size={18} style={{ color: '#FF3B30', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#F2F2F2' }}>
            Passkeys no disponibles
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#909098' }}>
            Tu navegador o dispositivo no soporta autenticación biométrica.
            Prueba con Chrome, Safari o Edge en un dispositivo con huella dactilar o Face ID.
          </p>
        </div>
      </div>
    )
  }

  const isLoading = status === 'enrolling'

  async function handleEnroll() {
    resetError()
    const name = deviceName.trim() || 'Mi dispositivo'
    const ok   = await enroll(name)
    if (ok) setDeviceName('')
  }

  async function handleUnenroll(factorId: string) {
    setPendingDelete(factorId)
    await unenroll(factorId)
    setPendingDelete(null)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(0,98,255,0.12)', border: '1px solid rgba(0,98,255,0.2)' }}
        >
          <Fingerprint size={18} style={{ color: '#4D83FF' }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: '#F2F2F2' }}>
            Llaves de acceso (Passkeys)
          </p>
          <p className="text-xs" style={{ color: '#909098' }}>
            Inicia sesión con tu huella o Face ID sin necesidad de contraseña
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="flex items-start gap-2.5 rounded-xl p-3 animate-fade-in"
          style={{
            background: 'rgba(255,59,48,0.08)',
            border:     '1px solid rgba(255,59,48,0.2)',
          }}
        >
          <AlertCircle size={15} style={{ color: '#FF6B6B', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs font-medium" style={{ color: '#FF6B6B' }}>{error}</p>
        </div>
      )}

      {/* Enrolled passkeys */}
      {factors.length > 0 && (
        <div className="space-y-2">
          {factors.map(factor => (
            <div
              key={factor.id}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
              style={{
                background: 'rgba(0,98,255,0.05)',
                border:     '1px solid rgba(0,98,255,0.12)',
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck size={16} style={{ color: '#4D83FF', flexShrink: 0 }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#F2F2F2' }}>
                    {factor.friendly_name || 'Dispositivo'}
                  </p>
                  <p className="text-xs" style={{ color: '#909098' }}>
                    Registrado el {formatDate(factor.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleUnenroll(factor.id)}
                disabled={pendingDelete === factor.id}
                className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                aria-label="Eliminar llave"
              >
                {pendingDelete === factor.id
                  ? <Loader2 size={14} className="animate-spin" style={{ color: '#909098' }} />
                  : <Trash2 size={14} style={{ color: '#FF3B30' }} />
                }
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Register new passkey */}
      <div className="space-y-2">
        <input
          type="text"
          value={deviceName}
          onChange={e => setDeviceName(e.target.value)}
          placeholder='Nombre del dispositivo (ej: "iPhone de Luis")'
          maxLength={40}
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{
            background: '#13131A',
            border:     '1px solid #22222E',
            color:      '#F2F2F2',
          }}
          onKeyDown={e => { if (e.key === 'Enter') handleEnroll() }}
        />

        <button
          onClick={handleEnroll}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          style={{
            background: isLoading
              ? 'rgba(0,98,255,0.3)'
              : 'linear-gradient(135deg, #0062FF 0%, #0041AB 100%)',
            color:     '#fff',
            boxShadow: isLoading ? 'none' : '0 0 20px rgba(0,98,255,0.25)',
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Esperando autenticación...
            </>
          ) : (
            <>
              <Plus size={15} />
              {factors.length > 0 ? 'Agregar otro dispositivo' : 'Registrar huella / Face ID'}
            </>
          )}
        </button>
      </div>

    </div>
  )
}
