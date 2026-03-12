import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType, SupabaseClient, User } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)

  // Usar siempre el dominio de producción para las redirects de respuesta.
  // Esto evita que el callback generado en producción redirija de vuelta a localhost.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // ── Flujo 1: PKCE (OAuth / emailRedirectTo moderno) ──────────────────
  const code = searchParams.get('code')
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      await ensureUserAndBusiness(supabase, data.user)
      return NextResponse.redirect(`${siteUrl}${next}`)
    }

    return NextResponse.redirect(`${siteUrl}/login?error=auth_failed`)
  }

  // ── Flujo 2: OTP / token_hash (confirmación de email clásica) ─────────
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error && data.user) {
      await ensureUserAndBusiness(supabase, data.user)
      return NextResponse.redirect(`${siteUrl}${next}`)
    }

    return NextResponse.redirect(`${siteUrl}/login?error=email_confirmation_failed`)
  }

  // Parámetros inválidos o faltantes
  return NextResponse.redirect(`${siteUrl}/login?error=auth_failed`)
}

// ── Helper: garantiza que exista el usuario y negocio en la BD ────────────────
async function ensureUserAndBusiness(
  supabase: SupabaseClient,
  user: User
) {
  const { data: dbUser } = await supabase
    .from('users')
    .select('id, business_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!dbUser) {
    // Usuario nuevo (OAuth por primera vez): crear negocio y perfil por defecto.
    const businessName = `${user.user_metadata?.full_name ?? 'Mi'} Business`

    const { data: business, error: bError } = await supabase
      .from('businesses')
      .insert({
        name: businessName,
        category: 'General',
        owner_id: user.id,
        plan: 'pro',
      })
      .select()
      .single()

    if (bError) {
      console.error('Error creating business for OAuth user:', bError)
      return
    }

    await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? 'Usuario',
      business_id: business.id,
      role: 'owner',
    })
  }
}
