'use client'

/**
 * PasskeyLoginButton — "Iniciar sesión con biometría" for the login screen.
 *
 * Flow:
 *  1. User clicks the button.
 *  2. Hook checks if user has enrolled WebAuthn factors via Supabase MFA.
 *  3. Browser shows the native biometric prompt (fingerprint / Face ID).
 *  4. On success, Supabase MFA is satisfied and the user is redirected.
 *
 * Visibility: only rendered when the browser supports platform authenticators.
 * On iOS Safari, Android Chrome, and desktop Chrome/Safari/Edge this shows
 * natively. Falls back to a "not supported" state otherwise.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Fingerprint, Loader2 } from 'lucide-react'
import { isPasskeySupported } from '@/lib/passkey/utils'
import { createClient } from '@/lib/supabase/client'
import type {
  SupabaseWebAuthnChallengeResponse,
  PasskeyFactor,
} from '@/types/passkey'
import {
  serializeCredential,
  decodeAssertionOptions,
} from '@/lib/passkey/utils'

type ButtonStatus = 'idle' | 'checking' | 'authenticating' | 'error'

export function PasskeyLoginButton() {
  const router   = useRouter()
  const supabase = createClient()

  const [supported, setSupported] = useState(false)
  const [status,    setStatus]    = useState<ButtonStatus>('idle')
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    isPasskeySupported().then(setSupported)
  }, [])

  if (!supported) return null

  async function handleLogin() {
    setStatus('checking')
    setError(null)

    try {
      // 1. List the current user's MFA factors to find a webauthn one.
      //    If the user is not signed in yet, listFactors returns empty.
      //    For a discoverable-credential login, we can still prompt and let
      //    the browser pick the credential (allowCredentials = []).
      const { data: factorsData } = await supabase.auth.mfa.listFactors()

      type AnyFactors = Record<string, { factor_type: string; id: string }[]>
      const fd = factorsData as AnyFactors | null
      const allFactors: PasskeyFactor[] = [
        ...(fd?.['totp']     ?? []),
        ...(fd?.['phone']    ?? []),
        ...(fd?.['webauthn'] ?? []),
      ].filter(f => f.factor_type === 'webauthn') as PasskeyFactor[]

      const factorId = allFactors[0]?.id

      if (!factorId) {
        // No enrolled passkeys — guide user to set one up
        setError('No tienes llaves registradas. Regístralas desde Configuración una vez que hayas iniciado sesión.')
        setStatus('error')
        return
      }

      // 2. Create a challenge
      setStatus('authenticating')

      const { data: challengeData, error: challengeError } = await (
        supabase.auth.mfa.challenge as (
          p: { factorId: string }
        ) => Promise<{ data: SupabaseWebAuthnChallengeResponse | null; error: unknown }>
      )({ factorId })

      if (challengeError || !challengeData?.webauthn?.request_options) {
        setError('No se pudo iniciar el desafío biométrico.')
        setStatus('error')
        return
      }

      // 3. Decode assertion options and prompt the authenticator
      const requestOptions = decodeAssertionOptions(challengeData.webauthn.request_options)
      const assertion      = await navigator.credentials.get({ publicKey: requestOptions })

      if (!(assertion instanceof PublicKeyCredential)) {
        setError('No se recibió respuesta del autenticador.')
        setStatus('error')
        return
      }

      // 4. Verify with Supabase
      const serialized = serializeCredential(assertion)

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code:        JSON.stringify(serialized),
      })

      if (verifyError) {
        setError('Verificación biométrica fallida. Intenta con tu contraseña.')
        setStatus('error')
        return
      }

      // 5. Redirect to dashboard
      router.push('/dashboard')
      router.refresh()

    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('NotAllowedError') || msg.includes('cancelled') || msg.includes('AbortError')) {
        setStatus('idle')
        return
      }
      setError('Error de autenticación biométrica. Intenta con tu contraseña.')
      setStatus('error')
    }
  }

  const isLoading = status === 'checking' || status === 'authenticating'

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] hover:brightness-125 disabled:opacity-50"
        style={{
          padding:    '0.875rem',
          background: '#13131A',
          color:      '#D0D0DC',
          border:     '1px solid #22222E',
          cursor:     isLoading ? 'default' : 'pointer',
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" style={{ color: '#4D83FF' }} />
            {status === 'checking' ? 'Verificando...' : 'Esperando biometría...'}
          </>
        ) : (
          <>
            <Fingerprint size={16} style={{ color: '#4D83FF' }} />
            Iniciar sesión con biometría
          </>
        )}
      </button>

      {status === 'error' && error && (
        <p
          className="text-center text-xs px-2 animate-fade-in"
          style={{ color: '#FF6B6B', lineHeight: 1.5 }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
