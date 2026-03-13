'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Tables } from '@/types/database.types'
import { SessionTimeout } from '@/components/session-timeout'

// ── Types ─────────────────────────────────────────────────────────────────────
interface DashboardLayoutProps { children: React.ReactNode }

type UserProfile     = Pick<Tables<'users'>,     'name' | 'role' | 'business_id' | 'avatar_url' | 'color'>
type BusinessProfile = Pick<Tables<'businesses'>, 'name' | 'category'>

// ── Page title map ────────────────────────────────────────────────────────────
/**
 * Maps a pathname to a human-readable title + optional subtitle.
 * Checked in order — first match wins.
 */
const PAGE_TITLES: Array<{
  match: (p: string) => boolean
  title: string
  subtitle?: string
}> = [
  { match: p => p === '/dashboard',                    title: 'Dashboard',           subtitle: 'Resumen general'      },
  { match: p => p.includes('/appointments/new'),       title: 'Nueva Cita',          subtitle: 'Agenda'               },
  { match: p => /\/appointments\/.+\/edit/.test(p),    title: 'Editar Cita',         subtitle: 'Agenda'               },
  { match: p => p.includes('/appointments'),           title: 'Agenda',              subtitle: 'Gestión de citas'     },
  { match: p => p.includes('/clients/new'),            title: 'Nuevo Cliente',       subtitle: 'Clientes'             },
  { match: p => /\/clients\/.+\/edit/.test(p),         title: 'Editar Cliente',      subtitle: 'Clientes'             },
  { match: p => /\/clients\/.+/.test(p),               title: 'Perfil del Cliente',  subtitle: 'Clientes'             },
  { match: p => p.includes('/clients'),                title: 'Clientes',            subtitle: 'Base de datos'        },
  { match: p => p.includes('/services'),               title: 'Servicios',           subtitle: 'Catálogo'             },
  { match: p => p.includes('/settings'),               title: 'Configuración',       subtitle: 'Preferencias'         },
  { match: p => p.includes('/profile'),                title: 'Mi Perfil',           subtitle: 'Cuenta'               },
  { match: p => p.includes('/finances'),               title: 'Finanzas',            subtitle: 'Reportes financieros' },
  { match: p => p.includes('/reports'),                title: 'Reportes',            subtitle: 'Estadísticas'         },
  { match: p => p.includes('/setup'),                  title: 'Configuración Inicial', subtitle: 'Bienvenido'         },
]

function getPageMeta(pathname: string): { title: string; subtitle?: string } {
  for (const entry of PAGE_TITLES) {
    if (entry.match(pathname)) return { title: entry.title, subtitle: entry.subtitle }
  }
  return { title: 'Dashboard' }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user,        setUser]        = useState<UserProfile     | null>(null)
  const [business,    setBusiness]    = useState<BusinessProfile | null>(null)

  const supabase = createClient()
  const router   = useRouter()
  const pathname = usePathname()

  const { title, subtitle } = getPageMeta(pathname ?? '')

  useEffect(() => {
    async function loadSession() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const { data: dbUser } = await supabase
        .from('users')
        .select('name, role, business_id, avatar_url, color')
        .eq('id', authUser.id)
        .single()

      if (dbUser) {
        setUser(dbUser as UserProfile)
        if (dbUser.business_id) {
          const { data: biz } = await supabase
            .from('businesses')
            .select('name, category')
            .eq('id', dbUser.business_id)
            .single()
          if (biz) setBusiness(biz as BusinessProfile)
        }
      }
    }

    loadSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadSession())
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0F0F12' }}>
      <SessionTimeout />

      {/* Sidebar — desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar open={true} user={user} business={business} />
      </div>

      {/* Sidebar — mobile overlay */}
      <div className="lg:hidden">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          business={business}
        />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(prev => !prev)}
          user={user}
        />
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#0F0F12' }}>
          <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
