import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { status: 401, error: 'Belum login' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, divisi')
    .eq('id', user.id)
    .single()

  if (!profile) return { status: 403, error: 'Profil tidak ditemukan' }
  return { ok: true, role: profile.role, divisi: profile.divisi }
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export const dynamic = 'force-dynamic'

// GET: list semua divisi (publik, via RLS divisi read using true)
export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from('divisi').select('*').order('sort_order').order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ divisi: data })
}

// PATCH: ubah label atau warna divisi
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'Service key missing' }, { status: 500 })

  const body = await request.json()
  const key = String(body.key || '').trim()
  const label = body.label ? String(body.label).trim() : undefined
  const color = body.color ? String(body.color).trim() : undefined

  if (!key) return NextResponse.json({ error: 'Key divisi wajib diisi' }, { status: 400 })
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return NextResponse.json({ error: 'Format warna tidak valid' }, { status: 400 })
  }

  // Cek apakah user boleh edit divisi ini
  const isElevated = ['admin', 'ketua', 'superadmin'].includes(auth.role || '')
  if (!isElevated && auth.divisi !== key) {
    return NextResponse.json({ error: 'Tidak punya akses untuk divisi ini' }, { status: 403 })
  }

  // Ambil warna lama (untuk update event colors)
  const { data: existing } = await service.from('divisi').select('color').eq('key', key).single()
  const oldColor = existing?.color

  const updates: Record<string, string> = {}
  if (label) updates.label = label
  if (color) updates.color = color

  const { error: divisiErr } = await service.from('divisi').update(updates).eq('key', key)
  if (divisiErr) return NextResponse.json({ error: divisiErr.message }, { status: 400 })

  // Jika warna berubah, update semua event yang pakai warna lama
  let updatedEvents = 0
  if (color && oldColor && color !== oldColor) {
    const { data: updated } = await service.from('events').update({ color }).eq('color', oldColor).select('id')
    updatedEvents = updated?.length ?? 0
  }

  return NextResponse.json({ ok: true, updatedEvents })
}

// POST: tambah divisi baru (admin only)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!['admin', 'ketua', 'superadmin'].includes(auth.role || '')) {
    return NextResponse.json({ error: 'Hanya admin yang bisa menambah divisi' }, { status: 403 })
  }

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'Service key missing' }, { status: 500 })

  const body = await request.json()
  const key = String(body.key || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  const label = String(body.label || '').trim()
  const color = String(body.color || '#64748b').trim()

  if (!key || !label) return NextResponse.json({ error: 'Key dan label wajib diisi' }, { status: 400 })
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return NextResponse.json({ error: 'Format warna tidak valid' }, { status: 400 })

  // Hitung sort_order berikutnya
  const { count } = await service.from('divisi').select('key', { count: 'exact', head: true })
  const sortOrder = (count ?? 0) + 1

  const { error } = await service.from('divisi').insert({ key, label, color, sort_order: sortOrder })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Key divisi sudah ada' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, divisi: { key, label, color } })
}

// DELETE: hapus divisi (admin only, tidak boleh ada anggota)
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!['admin', 'ketua', 'superadmin'].includes(auth.role || '')) {
    return NextResponse.json({ error: 'Hanya admin yang bisa menghapus divisi' }, { status: 403 })
  }

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'Service key missing' }, { status: 500 })

  const body = await request.json()
  const key = String(body.key || '').trim()
  if (!key) return NextResponse.json({ error: 'Key wajib diisi' }, { status: 400 })

  // Cek apakah ada profiles yang masih di divisi ini
  const { count: profileCount } = await service
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('divisi', key)

  if ((profileCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Masih ada ${profileCount} anggota di divisi ini. Pindahkan atau hapus akun mereka dulu.` },
      { status: 409 }
    )
  }

  const { error } = await service.from('divisi').delete().eq('key', key)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}