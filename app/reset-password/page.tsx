'use client'

import { useState, useTransition, useEffect } from 'react'
import { Scissors, AlertCircle, CheckCircle2 } from 'lucide-react'
import { resetPassword } from './actions'
import { resetPasswordSchema } from '@/lib/validations/auth'
import { PasswordInput } from '@/components/ui/password-input'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isVerifying, setIsVerifying] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // En un flujo real de Supabase, el usuario es autenticado automáticamente al seguir el link de reset
        // Si no hay usuario, el link podría ser inválido o haber expirado
        setError('El enlace de recuperación es inválido o ha expirado.')
      }
      setIsVerifying(false)
    }
    checkSession()
  }, [supabase])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())
    
    const result = resetPasswordSchema.safeParse(data)
    if (!result.success) {
      setError(result.error?.errors?.[0]?.message || 'Contraseña inválida')
      return
    }
    
    startTransition(async () => {
      const res = await resetPassword(formData)
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    )
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

        <h1 className="text-2xl font-bold text-center mb-2">Nueva contraseña</h1>
        <p className="text-muted-foreground text-center mb-8 text-sm">Crea una contraseña segura para tu cuenta</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2 border border-red-100 font-medium">
              <AlertCircle size={14} />
              <p>{error}</p>
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground ml-1">Nueva contraseña</label>
            <PasswordInput name="password" placeholder="••••••••" required />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground ml-1">Confirmar nueva contraseña</label>
            <PasswordInput name="confirmPassword" placeholder="••••••••" required />
          </div>

          <button disabled={isPending || !!error && error.includes('enlace')} type="submit" className="btn-primary w-full py-3 mt-4 font-semibold">
            {isPending ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
