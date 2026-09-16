import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/* ── helpers ─────────────────────────── */

/** VAPID setup (idempotent) */
function setupVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@orbit-impp.id',
    pub,
    priv
  )
  return true
}

/** Service client (bypass RLS) */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Hitung batas awal & akhir hari ini dalam WIB (UTC+7),
 * dikembalikan sebagai Date object (UTC).
 *
 * Menggunakan Intl.DateTimeFormat('en-CA') menghasilkan "yyyy-MM-dd",
 * lalu parser ISO dengan offset +07:00 menghasilkan UTC yang tepat.
 */
function todayBoundsWIB(now = new Date()): { start: Date; end: Date } {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now) // "2026-09-16"

  return {
    start: new Date(`${dateStr}T00:00:00+07:00`),
    end: new Date(`${dateStr}T23:59:59.999+07:00`),
  }
}

/**
 * Format tanggal WIB untuk title notif: "Jumat, 16 Sep 2026"
 */
function todayTitleWIB(now = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now)
}

/**
 * Format jam WIB dari string timestamptz: "07:00"
 * Jika null → null
 */
function formatHourWIB(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  })
}

/* ── route ───────────────────────────── */

export async function GET(request: NextRequest) {
  // 1. Auth — hanya terima Authorization: Bearer <secret> atau x-cron-secret
  const auth = request.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const secret = bearer || request.headers.get('x-cron-secret') || ''
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Setup VAPID
  if (!setupVapid()) {
    return NextResponse.json({ error: 'VAPID keys belum dikonfigurasi' }, { status: 500 })
  }

  // 3. Service client
  const service = getServiceClient()
  if (!service) {
    return NextResponse.json({ error: 'Service key missing' }, { status: 500 })
  }

  // 4. Batas hari ini (WIB → UTC)
  const now = new Date()
  const { start: todayStart, end: todayEnd } = todayBoundsWIB(now)
  const todayDateStr = todayStart.toISOString().slice(0, 10) // "2026-09-16" untuk tag/title

  // 5. Query events yang aktif hari ini
  //    "mulai hari ini" ATAU "multi-hari yang sedang berlangsung"
  //    Konsisten dengan pola useEvents.ts:219
  const { data: events, error: evErr } = await service
    .from('events')
    .select('id, title, start_date, end_date, is_tbd, location')
    .or(
      `and(start_date.gte.${todayStart.toISOString()},start_date.lte.${todayEnd.toISOString()}),and(start_date.lte.${todayEnd.toISOString()},end_date.gte.${todayStart.toISOString()})`
    )
    .order('start_date', { ascending: true })

  if (evErr || !events) {
    return NextResponse.json({ error: evErr?.message || 'Query events gagal' }, { status: 500 })
  }
  if (events.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0 })
  }

  // 6. Anti-duplikat: event yang SUDAH terkirim HARI INI
  const eventIds = events.map((e) => e.id)
  const { data: alreadySent } = await service
    .from('reminder_log')
    .select('event_id')
    .in('event_id', eventIds)
    .gte('sent_at', todayStart.toISOString())
    .lte('sent_at', todayEnd.toISOString())

  const sentTodaySet = new Set((alreadySent || []).map((r) => r.event_id))
  const toSend = events.filter((e) => !sentTodaySet.has(e.id))

  if (toSend.length === 0) {
    return NextResponse.json({ ok: true, checked: events.length, sent: 0 })
  }

  // 7. Susun body notif — max 4 baris + "dan N lainnya"
  const MAX_LINES = 4
  const lines = toSend.slice(0, MAX_LINES).map((e) => {
    const segs = [e.title]
    if (e.is_tbd) {
      segs.push('TBD')
    } else {
      const h = formatHourWIB(e.start_date)
      if (h) segs.push(h)
    }
    if (e.location) segs.push(e.location)
    return segs.join(' — ')
  })
  const remaining = toSend.length - MAX_LINES
  if (remaining > 0) lines.push(`dan ${remaining} agenda lainnya.`)

  // 8. Kirim ke semua subscriber
  const { data: subs } = await service.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, checked: events.length, sent: 0 })
  }

  // Title dengan format: "Agenda Hari Ini (Jumat, 16 Sep 2026)"
  const title = `Agenda Hari Ini (${todayTitleWIB(now)})`
  const payload = JSON.stringify({
    title,
    body: lines.join('\n'),
    url: '/',
    tag: `agenda-harian-${todayDateStr}`,
  })

  let sent = 0
  const expired: string[] = []

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'statusCode' in err &&
          (err as { statusCode: number }).statusCode === 410
        ) {
          expired.push(sub.endpoint)
        }
      }
    })
  )

  // 9. Catat ke reminder_log (anti-duplikat untuk hari ini)
  const logRows = toSend.map((e) => ({ event_id: e.id }))
  if (logRows.length > 0) {
    await service.from('reminder_log').insert(logRows)
  }

  // 10. Bersihkan expired subscriptions
  if (expired.length > 0) {
    await service.from('push_subscriptions').delete().in('endpoint', expired)
  }

  return NextResponse.json({
    ok: true,
    checked: events.length,
    sent,
    cleaned: expired.length,
  })
}
