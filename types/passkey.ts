/**
 * Passkey / WebAuthn type definitions for Cronix.
 *
 * Supabase exposes WebAuthn as an MFA factor type.
 * These types augment the official @supabase/supabase-js types where
 * the 'webauthn' factorType is not yet reflected in the shipped typings.
 */

// ── Enrollment ────────────────────────────────────────────────────────────────

export interface WebAuthnCreationOptions {
  /** Standard WebAuthn PublicKeyCredentialCreationOptions from Supabase */
  rp:                   PublicKeyCredentialRpEntity
  user:                 { id: string; name: string; displayName: string }
  challenge:            string            // base64url-encoded
  pubKeyCredParams:     PublicKeyCredentialParameters[]
  timeout?:             number
  excludeCredentials?:  PublicKeyCredentialDescriptorJSON[]
  authenticatorSelection?: AuthenticatorSelectionCriteria
  attestation?:         AttestationConveyancePreference
}

export interface WebAuthnAssertionOptions {
  /** Standard WebAuthn PublicKeyCredentialRequestOptions from Supabase */
  challenge:          string              // base64url-encoded
  timeout?:           number
  rpId?:              string
  allowCredentials?:  PublicKeyCredentialDescriptorJSON[]
  userVerification?:  UserVerificationRequirement
}

export interface PublicKeyCredentialDescriptorJSON {
  id:          string                     // base64url-encoded
  type:        'public-key'
  transports?: AuthenticatorTransport[]
}

// ── Supabase MFA WebAuthn response shapes ─────────────────────────────────────

export interface SupabaseWebAuthnEnrollResponse {
  id:            string
  type:          'webauthn'
  friendly_name: string
  webauthn: {
    creation_options: WebAuthnCreationOptions
  }
}

export interface SupabaseWebAuthnChallengeResponse {
  id:         string                      // challengeId
  expires_at: number
  webauthn: {
    request_options: WebAuthnAssertionOptions
  }
}

// ── Factor ────────────────────────────────────────────────────────────────────

export interface PasskeyFactor {
  id:            string
  friendly_name: string
  factor_type:   'webauthn'
  status:        'verified' | 'unverified'
  created_at:    string
  updated_at:    string
}

// ── Hook state ────────────────────────────────────────────────────────────────

export type PasskeyStatus =
  | 'idle'
  | 'enrolling'
  | 'authenticating'
  | 'success'
  | 'error'

export interface PasskeyState {
  status:      PasskeyStatus
  error:       string | null
  factors:     PasskeyFactor[]
  isSupported: boolean
}

// ── Serialized credential for Supabase verify() ───────────────────────────────

export interface SerializedCredential {
  id:                   string
  rawId:                string
  type:                 string
  response: {
    clientDataJSON:     string
    attestationObject?: string    // registration only
    authenticatorData?: string    // authentication only
    signature?:         string    // authentication only
    userHandle?:        string    // authentication only
  }
  clientExtensionResults?: Record<string, unknown>
}
