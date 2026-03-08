'use client'

import { useState, useTransition, useEffect } from 'react'
import Image from 'next/image'
import { User, Mail, Phone, Lock, Camera, Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from './actions'
import { PasswordInput } from '@/components/ui/password-input'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        setUser({ ...authUser, ...dbUser })
      }
      setLoading(false)
    }
    loadUser()
  }, [supabase])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const res = await updateProfile(formData)
      if (res?.error) setError(res.error)
      else if (res?.success) setSuccess(res.success)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground text-sm">Gestiona tu información personal y seguridad</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100">
            <AlertCircle size={18} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3 border border-green-100">
            <CheckCircle2 size={18} />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        <Card>
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-3xl font-bold border-4 border-background shadow-sm overflow-hidden">
                {user?.avatar_url ? (
                  <Image 
                    src={user.avatar_url} 
                    alt={user.name} 
                    width={96} 
                    height={96} 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  user?.name?.substring(0, 2).toUpperCase() || 'U'
                )}
              </div>
              <button type="button" className="absolute bottom-0 right-0 p-1.5 bg-brand-600 text-white rounded-full border-2 border-background shadow-sm hover:bg-brand-700 transition-colors">
                <Camera size={14} />
              </button>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Nombre completo</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input name="name" defaultValue={user?.name} className="input-base pl-10" placeholder="Tu nombre" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Teléfono</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input name="phone" defaultValue={user?.phone} className="input-base pl-10" placeholder="+123456789" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Correo electrónico</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input name="email" defaultValue={user?.email} className="input-base pl-10" placeholder="tu@email.com" required />
                </div>
                <p className="text-[10px] text-muted-foreground ml-1 italic">Si cambias el email, deberás confirmarlo por correo.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Seguridad">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">Deja en blanco si no deseas cambiar tu contraseña.</p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Nueva Contraseña</label>
              <PasswordInput name="password" placeholder="••••••••" />
            </div>
          </div>
        </Card>

        <div className="flex justify-end pt-2">
          <Button disabled={isPending} type="submit" className="px-8 flex items-center gap-2">
            <Save size={18} />
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
