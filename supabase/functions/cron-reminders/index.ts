/**
 * Supabase Edge Function — cron-reminders
 *
 * Processes pending WhatsApp appointment reminders.
 * This is the Edge Function equivalent of app/api/cron/send-reminders/route.ts.
 *
 * Security: Authorization: Bearer <CRON_SECRET>
 *
 * Can be triggered by:
 *  - Vercel Cron (update vercel.json path to this function's URL)
 *  - Supabase pg_cron via: SELECT net.http_get(url, headers) or pg_cron + http
 *  - Any HTTP client with the correct Bearer token
 *
 * Required Supabase Secrets:
 *   CRON_SECRET               — shared with Vercel / pg_cron trigger
 *   SUPABASE_URL              — auto-injected by Supabase runtime
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase runtime
 *
 * Deploy:
 *   npx supabase functions deploy cron-reminders
 */

// @deno-types="npm:@supabase/supabase-js@2/dist/module/index.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

// ── CORS headers ─────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface BizSettings {
  notifications?: { whatsapp?: boolean }
}

interface ReminderRow {
  id:             string
  appointment_id: string
  business_id:    string
  businesses:     { name: string; settings: BizSettings | null } | null
  appointments:   {
    start_at: string
    clients:  { name: string; phone: string | null } | null
  } | null
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // ── Auth: Bearer CRON_SECRET ────────────────────────────────────────────
  const cronSecret = Deno.env.get('CRON_SECRET')
  const authHeader = req.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Admin Supabase client (bypasses RLS for cross-tenant queries) ────────
  const supabaseUrl     = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // ── Fetch pending reminders due now ─────────────────────────────────────
  const now = new Date().toISOString()

  const { data: reminders, error: fetchErr } = await supabase
    .from('appointment_reminders')
    .select(`
      id,
      appointment_id,
      business_id,
      businesses ( name, settings ),
      appointments (
        start_at,
        clients ( name, phone )
      )
    `)
    .eq('status', 'pending')
    .lte('remind_at', now)
    .limit(100)

  if (fetchErr) {
    console.error('[cron-reminders] fetch error:', fetchErr.message)
    return json({ error: fetchErr.message }, 500)
  }

  if (!reminders || reminders.length === 0) {
    return json({ ok: true, processed: 0, sent: 0, failed: 0, skipped: 0 })
  }

  const results = { sent: 0, failed: 0, skipped: 0 }

  // Accumulate sent clients per business for the consolidated push at the end
  // Map<business_id, { name, time }[]>
  const sentByBusiness = new Map<string, { clientName: string; time: string }[]>()

  // ── Process each reminder ────────────────────────────────────────────────
  for (const raw of reminders) {
    const reminder = raw as unknown as ReminderRow
    const apt      = reminder.appointments

    if (!apt) {
      results.skipped++
      continue
    }

    // Skip if business explicitly disabled WhatsApp notifications
    const bizSettings = reminder.businesses?.settings
    if (bizSettings?.notifications?.whatsapp === false) {
      results.skipped++
      continue
    }

    const client = apt.clients
    if (!client?.phone) {
      await supabase
        .from('appointment_reminders')
        .update({ status: 'failed', error_message: 'Client has no phone number' })
        .eq('id', reminder.id)
      results.skipped++
      continue
    }

    // Format date/time for the template message
    const startDate    = new Date(apt.start_at)
    const businessName = reminder.businesses?.name ?? 'tu negocio'

    const date = startDate.toLocaleDateString('es-CO', {
      weekday: 'long',
      day:     'numeric',
      month:   'long',
      year:    'numeric',
    })
    const time = startDate.toLocaleTimeString('es-CO', {
      hour:   '2-digit',
      minute: '2-digit',
    })

    // ── Delegate to whatsapp-service Edge Function ───────────────────────
    const whatsappUrl = `${supabaseUrl}/functions/v1/whatsapp-service`

    try {
      const res = await fetch(whatsappUrl, {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-internal-secret': cronSecret,
        },
        body: JSON.stringify({
          to:           client.phone,
          clientName:   client.name,
          businessName,
          date,
          time,
        }),
      })

      const data = await res.json().catch(() => ({ success: false })) as {
        success?: boolean
        error?:   string
      }

      if (data.success) {
        await supabase
          .from('appointment_reminders')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', reminder.id)
        results.sent++

        // Accumulate for consolidated push at end of run
        const prev = sentByBusiness.get(reminder.business_id) ?? []
        prev.push({ clientName: client.name, time })
        sentByBusiness.set(reminder.business_id, prev)

      } else {
        const errMsg = data.error ?? `HTTP ${res.status}`
        await supabase
          .from('appointment_reminders')
          .update({ status: 'failed', error_message: errMsg })
          .eq('id', reminder.id)
        results.failed++
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Fetch error'
      await supabase
        .from('appointment_reminders')
        .update({ status: 'failed', error_message: errMsg })
        .eq('id', reminder.id)
      results.failed++
    }
  }

  // ── Send one consolidated push per business ─────────────────────────────
  const pushUrl = `${supabaseUrl}/functions/v1/push-notify`
  for (const [businessId, clients] of sentByBusiness) {
    const count = clients.length
    const title = `⏰ ${count} recordatorio${count > 1 ? 's' : ''} enviado${count > 1 ? 's' : ''}`

    // List up to 4 clients with name · time, then "+N más" if overflow
    const MAX_LISTED = 4
    const listed = clients.slice(0, MAX_LISTED)
      .map(c => `${c.clientName} · ${c.time}`)
      .join('\n')
    const overflow = count > MAX_LISTED ? `\n+${count - MAX_LISTED} más` : ''
    const body = listed + overflow

    fetch(pushUrl, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-internal-secret': cronSecret,
      },
      body: JSON.stringify({
        business_id: businessId,
        title,
        body,
        url: '/dashboard',
      }),
    }).catch(() => null)
  }

  return json({
    ok:        true,
    processed: reminders.length,
    ...results,
  })
})
