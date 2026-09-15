import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// POST: simpan subscription (siapapun yang install PWA bisa subscribe)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { endpoint, keys } = body

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Data subscription tidak lengkap' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service key missing' }, { status: 500 })

  const { error } = await admin.from('push_subscriptions').upsert(
    { endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: 'endpoint' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE: hapus subscription (unsubscribe)
export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const { endpoint } = body

  if (!endpoint) return NextResponse.json({ error: 'Endpoint wajib diisi' }, { status: 400 })

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service key missing' }, { status: 500 })

  await admin.from('push_subscriptions').delete().eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
