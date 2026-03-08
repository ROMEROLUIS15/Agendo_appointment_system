'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Scissors, AlertCircle } from 'lucide-react'
import { register } from './actions'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const res = await register(formData)
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md card-base p-8">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center text-white">
            <Scissors size={20} className="rotate-45" />
          </div>
          <span className="text-2xl font-bold text-foreground">Agendo</span>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">Crea tu cuenta</h1>
        <p className="text-muted-foreground text-center mb-8 text-sm">Empieza a gestionar tu negocio hoy mismo</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2 border border-red-100">
              <AlertCircle size={14} />
              <p>{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <input name="firstName" placeholder="Nombre" className="input-base" required />
            <input name="lastName" placeholder="Apellido" className="input-base" required />
          </div>
          
          <input name="bizName" placeholder="Nombre del Negocio" className="input-base" required />
          <input name="email" type="email" placeholder="Email" className="input-base" required />
          <input name="password" type="password" placeholder="Contraseña" className="input-base" required />

          <button disabled={isPending} type="submit" className="btn-primary w-full py-3 mt-4">
            {isPending ? 'Procesando...' : 'Crear cuenta gratis'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          ¿Ya tienes cuenta? <Link href="/login" className="text-brand-600 font-semibold">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
