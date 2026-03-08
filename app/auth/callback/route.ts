import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // 1. Verificar si el usuario ya existe en nuestra tabla 'users'
      // Si el usuario es nuevo (OAuth por primera vez), necesitamos crear su registro de 'users' y 'businesses'
      // Sin embargo, en un flujo SaaS típico, a veces obligamos a elegir un plan/negocio después del login OAuth.
      // Por simplicidad en este paso, verificaremos existencia.
      
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, business_id')
        .eq('id', data.user.id)
        .maybeSingle()
        
      if (!dbUser) {
        // First time OAuth user: Create a default business and user profile
        const businessName = `${data.user.user_metadata.full_name || 'Mi'}'s Business`
        
        const { data: business, error: bError } = await supabase
          .from('businesses')
          .insert({ 
            name: businessName,
            category: 'Beauty & Wellness', // Common default for this app
            owner_id: data.user.id 
          })
          .select()
          .single()
          
        if (bError) return NextResponse.redirect(`${origin}/login?error=Failed to initialize business`)

        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata.full_name || 'Usuario Google',
          business_id: business.id,
          role: 'owner'
        })
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si algo falla, volver al login
  return NextResponse.redirect(`${origin}/login?error=Authentication failed`)
}
