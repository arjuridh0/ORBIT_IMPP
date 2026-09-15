import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function setupVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@orbit-impp.id'
  if (!pub || !priv) return false
  webpush.setVapidDetails(subject, pub, priv)
  return true
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// GET: dipanggil Vercel Cron setiap */15 menit
export async function GET(request: NextRequest) {
  // Auth cron via secret header (Vercel Cron otomatis kirim Authorization: Bearer <CRON_SECRET>)
  const auth = request.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const secret = bearer || request.headers.get('x-cron-secret') || ''
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!setupVapid()) {
    return NextResponse.json({ error: 'VAPID keys belum dikonfigurasi' }, { status: 500 })
  }

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'Service key missing' }, { status: 500 })

  const now = new Date()
  const windowEnd = new Date(now.getTime() + 15 * 60 * 1000) // 15 menit ke depan

  // Ambil events yang remindernya jatuh dalam 15 menit ke depan
  // reminder jatuh = start_date - reminder_offset_minutes * 60 detik
  const { data: events } = await service
    .from('events')
    .select('id, title, start_date, reminder_offset_minutes, location')
    .not('reminder_offset_minutes', 'is', null)
    .gte('start_date', now.toISOString())

  if (!events || events.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0 })
  }

  // Filter: reminder jatuh dalam window sekarang sampai +15 menit
  const due = events.filter((e) => {
    const startMs = new Date(e.start_date).getTime()
    const reminderMs = e.reminder_offset_minutes * 60 * 1000
    const triggerTime = startMs - reminderMs
    return triggerTime >= now.getTime() && triggerTime < windowEnd.getTime()
  })

  if (due.length === 0) return NextResponse.json({ ok: true, checked: events.length, sent: 0 })

  // Cek reminder_log untuk hindari duplikat
  const dueIds = due.map((e) => e.id)
  const { data: alreadySent } = await service
    .from('reminder_log')
    .select('event_id')
    .in('event_id', dueIds)
  const sentSet = new Set((alreadySent || []).map((r) => r.event_id))
  const toSend = due.filter((e) => !sentSet.has(e.id))

  if (toSend.length === 0) return NextResponse.json({ ok: true, checked: events.length, sent: 0 })

  // Ambil semua subscriber
  const { data: subs } = await service.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) return NextResponse.json({ ok: true, checked: events.length, sent: 0 })

  let sent = 0
  const expired: string[] = []
  const logRows: { event_id: string }[] = []

  for (const event of toSend) {
    const startTime = new Date(event.start_date).toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta',
    })
    const payload = JSON.stringify({
      title: `⏰ ${event.title}`,
      body: `Dimulai pukul ${startTime}${event.location ? ` di ${event.location}` : ''}`,
      url: '/',
      tag: `reminder-${event.id}`,
    })

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          expired.push(sub.endpoint)
        }
      }
    }))

    logRows.push({ event_id: event.id })
  }

  // Catat ke reminder_log (anti-duplikat)
  if (logRows.length > 0) await service.from('reminder_log').insert(logRows)
  // Bersihkan expired subscriptions
  if (expired.length > 0) await service.from('push_subscriptions').delete().in('endpoint', expired)

  return NextResponse.json({ ok: true, checked: events.length, sent, cleaned: expired.length })
}
