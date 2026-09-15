import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from('members')
    .select('id, full_name, divisi, koor_id')
    .order('full_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('role, divisi, id')
    .eq('id', user.id)
    .single()

  const allowed = ['admin', 'ketua', 'superadmin', 'editor']
  if (!allowed.includes(caller?.role || '')) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await request.json()
  const full_name = String(body.full_name || '').trim()
  const divisi = String(body.divisi || '').trim()
  const koor_id = body.koor_id || null

  if (!full_name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
  if (!divisi) return NextResponse.json({ error: 'Divisi wajib diisi' }, { status: 400 })

  if (caller?.role === 'editor' && caller.divisi !== divisi) {
    return NextResponse.json({ error: 'Koor hanya bisa menambah anggota divisinya sendiri' }, { status: 403 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service key not set' }, { status: 500 })

  const { data, error } = await admin
    .from('members')
    .insert({ full_name, divisi, koor_id, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ member: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 })

const { data: caller } = await supabase
    .from('profiles')
    .select('role, divisi, id')
    .eq('id', user.id)
    .single()

  const body = await request.json()
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service key not set' }, { status: 500 })

  const { data: target } = await admin.from('members').select('created_by, divisi').eq('id', id).single()
  if (!target) return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 })

  const elevated = ['admin', 'ketua', 'superadmin']
  const canDelete =
    elevated.includes(caller?.role || '') ||
    caller?.divisi === target.divisi ||
    target.created_by === user.id

  if (!canDelete) {
    return NextResponse.json({ error: 'Tidak punya izin menghapus anggota ini' }, { status: 403 })
  }

  const { error } = await admin.from('members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
