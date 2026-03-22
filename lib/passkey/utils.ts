/**
 * WebAuthn utility functions.
 *
 * All ArrayBuffer ↔ base64url conversions needed to serialize/deserialize
 * WebAuthn credentials for Supabase's MFA verify() endpoint.
 */

import type {
  SerializedCredential,
  WebAuthnCreationOptions,
  WebAuthnAssertionOptions,
} from '@/types/passkey'

// ── Browser support ───────────────────────────────────────────────────────────

/**
 * Returns true when the current environment supports WebAuthn passkeys.
 * Checks for PublicKeyCredential AND user-verifying platform authenticator.
 */
export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential)   return false

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

// ── Encoding helpers ──────────────────────────────────────────────────────────

export function bufferToBase64url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(base64url.length + (4 - (base64url.length % 4)) % 4, '=')
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const bytes  = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return buffer
}

// ── Credential serialization ──────────────────────────────────────────────────

/**
 * Converts a PublicKeyCredential (from navigator.credentials.create or .get)
 * into a plain JSON-serializable object that Supabase's mfa.verify() accepts.
 */
export function serializeCredential(credential: PublicKeyCredential): SerializedCredential {
  const response = credential.response

  const serialized: SerializedCredential = {
    id:    credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type:  credential.type,
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
    },
    clientExtensionResults: credential.getClientExtensionResults() as Record<string, unknown>,
  }

  // Registration response
  if (response instanceof AuthenticatorAttestationResponse) {
    serialized.response.attestationObject = bufferToBase64url(response.attestationObject)
  }

  // Authentication response
  if (response instanceof AuthenticatorAssertionResponse) {
    serialized.response.authenticatorData = bufferToBase64url(response.authenticatorData)
    serialized.response.signature         = bufferToBase64url(response.signature)
    if (response.userHandle) {
      serialized.response.userHandle = bufferToBase64url(response.userHandle)
    }
  }

  return serialized
}

// ── Creation options decoder ──────────────────────────────────────────────────

/**
 * Converts Supabase's WebAuthn creation options (base64url strings)
 * into the ArrayBuffer-based format that navigator.credentials.create() expects.
 */
export function decodeCreationOptions(
  opts: WebAuthnCreationOptions
): PublicKeyCredentialCreationOptions {
  return {
    rp:   opts.rp,
    user: {
      id:          base64urlToBuffer(opts.user.id),
      name:        opts.user.name,
      displayName: opts.user.displayName,
    },
    challenge:    base64urlToBuffer(opts.challenge),
    pubKeyCredParams: opts.pubKeyCredParams,
    timeout:          opts.timeout,
    excludeCredentials: opts.excludeCredentials?.map(c => ({
      id:         base64urlToBuffer(c.id),
      type:       c.type,
      transports: c.transports,
    })),
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      requireResidentKey:      true,
      residentKey:             'required',
      userVerification:        'required',
      ...opts.authenticatorSelection,
    },
    attestation: opts.attestation ?? 'none',
  }
}

// ── Request options decoder ───────────────────────────────────────────────────

/**
 * Converts Supabase's WebAuthn assertion options (base64url strings)
 * into the ArrayBuffer-based format that navigator.credentials.get() expects.
 */
export function decodeAssertionOptions(
  opts: WebAuthnAssertionOptions
): PublicKeyCredentialRequestOptions {
  return {
    challenge:       base64urlToBuffer(opts.challenge),
    timeout:         opts.timeout,
    rpId:            opts.rpId,
    allowCredentials: opts.allowCredentials?.map(c => ({
      id:         base64urlToBuffer(c.id),
      type:       c.type,
      transports: c.transports,
    })) ?? [],                            // empty = discoverable credential
    userVerification: opts.userVerification ?? 'required',
  }
}
