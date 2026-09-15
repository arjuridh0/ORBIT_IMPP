import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { DIVISI_COLORS, type Divisi } from '@/lib/constants'

const DIVISI = Object.keys(DIVISI_COLORS) as Divisi[]

async function canManageDivisi(key: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { status: 401, error: 'Belum login' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, divisi')
    .eq('id', user.id)
    .single()

  if (!profile) return { status: 403, error: 'Profil tidak ditemukan' }
  if (['admin', 'ketua', 'superadmin'].includes(profile.role) || profile.divisi === key) return { ok: true }
  return { status: 403, error: 'Kamu tidak memiliki akses untuk mengubah divisi ini' }
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  const service = getServiceClient()
  if (!service) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local' },
      { status: 500 }
    )
  }

  const body = await request.json()
  const key = String(body.key || '')
  const color = String(body.color || '')

  if (!(DIVISI as string[]).includes(key)) {
    return NextResponse.json({ error: 'Divisi tidak valid' }, { status: 400 })
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return NextResponse.json({ error: 'Format warna tidak valid' }, { status: 400 })
  }

  const access = await canManageDivisi(key)
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const { error: divisiErr } = await service.from('divisi').update({ color }).eq('key', key)
  if (divisiErr) {
    return NextResponse.json({ error: divisiErr.message }, { status: 400 })
  }

  const { data: updated, error: eventErr } = await service
    .from('events')
    .update({ color })
    .eq('color', DIVISI_COLORS[key as Divisi])
    .select('id')

  if (eventErr) {
    return NextResponse.json({ error: eventErr.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, updatedEvents: updated?.length ?? 0 })
}