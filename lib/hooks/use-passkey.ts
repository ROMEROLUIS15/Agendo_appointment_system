'use client'

/**
 * usePasskey — React hook for WebAuthn passkey enrollment and authentication.
 *
 * Integrates with Supabase Auth MFA API (factorType: 'webauthn').
 * Handles the full browser ↔ Supabase ↔ authenticator round-trip.
 */

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  isPasskeySupported,
  serializeCredential,
  decodeCreationOptions,
  decodeAssertionOptions,
} from '@/lib/passkey/utils'
import type {
  PasskeyState,
  PasskeyFactor,
  SupabaseWebAuthnEnrollResponse,
  SupabaseWebAuthnChallengeResponse,
} from '@/types/passkey'

const INITIAL_STATE: PasskeyState = {
  status:      'idle',
  error:       null,
  factors:     [],
  isSupported: false,
}

export function usePasskey() {
  const supabase               = createClient()
  const [state, setState]      = useState<PasskeyState>(INITIAL_STATE)

  const setStatus = (status: PasskeyState['status'], error: string | null = null) =>
    setState(prev => ({ ...prev, status, error }))

  // ── Init: check support + load enrolled factors ───────────────────────────
  useEffect(() => {
    let mounted = true

    async function init() {
      const supported = await isPasskeySupported()
      if (!mounted) return
      setState(prev => ({ ...prev, isSupported: supported }))

      // Only load factors if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return

      await refreshFactors(mounted)
    }

    init()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Refresh enrolled passkeys ─────────────────────────────────────────────
  const refreshFactors = useCallback(async (mounted = true) => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error || !data || !mounted) return

      // Supabase returns totp[] and phone[]; webauthn factors may appear in either
      // depending on the SDK version. Filter by factor_type = 'webauthn'.
      type AnyFactors = Record<string, { factor_type: string; id: string }[]>
      const fd = data as AnyFactors
      const allFactors = [
        ...(fd['totp']     ?? []),
        ...(fd['phone']    ?? []),
        ...(fd['webauthn'] ?? []),
      ]

      const webauthnFactors = allFactors.filter(
        f => f.factor_type === 'webauthn'
      ) as PasskeyFactor[]

      if (mounted) {
        setState(prev => ({ ...prev, factors: webauthnFactors }))
      }
    } catch {
      // silently ignore — user may not have any factors yet
    }
  }, [supabase.auth.mfa])

  // ── Enrollment ────────────────────────────────────────────────────────────
  /**
   * Registers a new passkey for the authenticated user.
   * @param friendlyName  Human-readable label shown in settings (e.g. "iPhone de Luis")
   */
  const enroll = useCallback(async (friendlyName = 'Mi dispositivo'): Promise<boolean> => {
    setStatus('enrolling')

    try {
      // 1. Ask Supabase to start enrollment — returns WebAuthn creation options
      const { data: enrollData, error: enrollError } = await (
        supabase.auth.mfa.enroll as (
          p: { factorType: string; friendlyName: string }
        ) => Promise<{ data: SupabaseWebAuthnEnrollResponse | null; error: unknown }>
      )({ factorType: 'webauthn', friendlyName })

      if (enrollError || !enrollData?.webauthn?.creation_options) {
        const msg = enrollError instanceof Error
          ? enrollError.message
          : 'No se pudo iniciar el registro. Intenta de nuevo.'
        setStatus('error', msg)
        return false
      }

      // 2. Decode the creation options (base64url → ArrayBuffer)
      const creationOptions = decodeCreationOptions(enrollData.webauthn.creation_options)

      // 3. Prompt the authenticator (biometrics / device PIN)
      const credential = await navigator.credentials.create({ publicKey: creationOptions })
      if (!(credential instanceof PublicKeyCredential)) {
        setStatus('error', 'No se recibió respuesta del autenticador.')
        return false
      }

      // 4. Serialize and send back to Supabase for verification
      const serialized = serializeCredential(credential)

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollData.id,
        code:     JSON.stringify(serialized),
      })

      if (verifyError) {
        setStatus('error', 'No se pudo verificar la llave. Intenta de nuevo.')
        return false
      }

      await refreshFactors()
      setStatus('success')
      return true

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar la llave.'
      // User cancelled the biometric prompt
      if (msg.includes('cancelled') || msg.includes('AbortError') || msg.includes('NotAllowedError')) {
        setStatus('idle')
        return false
      }
      setStatus('error', msg)
      return false
    }
  }, [supabase.auth.mfa, refreshFactors])

  // ── Authentication ────────────────────────────────────────────────────────
  /**
   * Verifies an existing passkey to satisfy MFA or to authenticate.
   * @param factorId  The factor ID from the enrolled passkey (optional — uses first available)
   */
  const authenticate = useCallback(async (factorId?: string): Promise<boolean> => {
    setStatus('authenticating')

    try {
      // 1. Resolve the factor to use
      const fid = factorId ?? state.factors[0]?.id
      if (!fid) {
        setStatus('error', 'No hay llaves de acceso registradas.')
        return false
      }

      // 2. Get challenge from Supabase
      const { data: challengeData, error: challengeError } = await (
        supabase.auth.mfa.challenge as (
          p: { factorId: string }
        ) => Promise<{ data: SupabaseWebAuthnChallengeResponse | null; error: unknown }>
      )({ factorId: fid })

      if (challengeError || !challengeData?.webauthn?.request_options) {
        setStatus('error', 'No se pudo crear el desafío de autenticación.')
        return false
      }

      // 3. Decode assertion options (base64url → ArrayBuffer)
      const requestOptions = decodeAssertionOptions(challengeData.webauthn.request_options)

      // 4. Prompt the authenticator
      const assertion = await navigator.credentials.get({ publicKey: requestOptions })
      if (!(assertion instanceof PublicKeyCredential)) {
        setStatus('error', 'No se recibió respuesta del autenticador.')
        return false
      }

      // 5. Serialize and verify with Supabase
      const serialized = serializeCredential(assertion)

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId:    fid,
        challengeId: challengeData.id,
        code:        JSON.stringify(serialized),
      })

      if (verifyError) {
        setStatus('error', 'La verificación biométrica falló.')
        return false
      }

      setStatus('success')
      return true

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado en la autenticación.'
      if (msg.includes('cancelled') || msg.includes('AbortError') || msg.includes('NotAllowedError')) {
        setStatus('idle')
        return false
      }
      setStatus('error', msg)
      return false
    }
  }, [supabase.auth.mfa, state.factors])

  // ── Unenroll ─────────────────────────────────────────────────────────────
  const unenroll = useCallback(async (factorId: string): Promise<boolean> => {
    setStatus('enrolling')
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) {
        setStatus('error', 'No se pudo eliminar la llave de acceso.')
        return false
      }
      await refreshFactors()
      setStatus('idle')
      return true
    } catch {
      setStatus('error', 'Error al eliminar la llave de acceso.')
      return false
    }
  }, [supabase.auth.mfa, refreshFactors])

  const resetError = useCallback(() => setStatus('idle'), [])

  return {
    ...state,
    enroll,
    authenticate,
    unenroll,
    refreshFactors,
    resetError,
  }
}
