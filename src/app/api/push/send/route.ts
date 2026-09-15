import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getSupabaseServerClient } from '@/lib/supabase/server'
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

// POST: kirim push manual ke semua subscriber (admin only)
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'ketua', 'superadmin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Hanya admin yang bisa broadcast notifikasi' }, { status: 403 })
  }

  if (!setupVapid()) {
    return NextResponse.json({ error: 'VAPID keys belum dikonfigurasi di .env.local' }, { status: 500 })
  }

  const body = await request.json()
  const title = String(body.title || 'ORBIT IMPP').trim()
  const notifBody = String(body.body || '').trim()
  const url = String(body.url || '/').trim()

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'Service key missing' }, { status: 500 })

  const { data: subs } = await service.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Tidak ada subscriber aktif' })
  }

  let sent = 0
  let failed = 0
  const expired: string[] = []

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body: notifBody, url, tag: `orbit-broadcast-${Date.now()}` })
      )
      sent++
    } catch (err: unknown) {
      failed++
      // 410 Gone = subscription expired, hapus dari DB
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        expired.push(sub.endpoint)
      }
    }
  }))

  // Bersihkan subscription yang expired
  if (expired.length > 0) {
    await service.from('push_subscriptions').delete().in('endpoint', expired)
  }

  return NextResponse.json({ ok: true, sent, failed, cleaned: expired.length })
}
