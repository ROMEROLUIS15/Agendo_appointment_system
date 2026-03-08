'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Scissors, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { forgotPassword } from './actions'
import { forgotPasswordSchema } from '@/lib/validations/auth'
import { cn } from '@/lib/utils'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    
    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setError(result.error?.errors?.[0]?.message || 'Email inválido')
      return
    }
    
    startTransition(async () => {
      const res = await forgotPassword(formData)
      if (res?.error) {
        setError(res.error)
      } else if (res?.success) {
        setSuccess(res.success)
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

        <h1 className="text-2xl font-bold text-center mb-2">Recuperar contraseña</h1>
        <p className="text-muted-foreground text-center mb-8 text-sm">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu cuenta
        </p>

        {success ? (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 text-green-700 rounded-xl flex flex-col items-center gap-3 text-center border border-green-100">
              <CheckCircle2 size={32} className="text-green-600" />
              <p className="text-sm font-medium">{success}</p>
            </div>
            <Link href="/login" className="btn-secondary w-full py-3 flex items-center justify-center gap-2 font-medium">
              <ArrowLeft size={16} />
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2 border border-red-100 font-medium">
                <AlertCircle size={14} />
                <p>{error}</p>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground ml-1">Correo electrónico</label>
              <input 
                name="email" 
                type="email" 
                placeholder="tu@email.com" 
                className="input-base" 
                required 
              />
            </div>

            <button disabled={isPending} type="submit" className="btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2 font-semibold">
              {isPending ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>

            <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-brand-600 font-medium pt-2 transition-colors">
              <ArrowLeft size={16} />
              Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
