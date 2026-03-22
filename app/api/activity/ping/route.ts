import { NextResponse } from 'next/server'

/**
 * POST /api/activity/ping
 *
 * Lightweight endpoint called by the client-side SessionTimeout component
 * whenever the user is active (scroll, click, keypress, etc.) — throttled to
 * once per minute on the client side.
 *
 * This route itself does nothing: the middleware intercepts the request,
 * verifies the session, and refreshes the cronix_last_activity cookie
 * automatically, keeping the server-side inactivity clock in sync with
 * real user behaviour even when the user stays on a single page.
 */
export async function POST() {
  return NextResponse.json({ ok: true })
}
