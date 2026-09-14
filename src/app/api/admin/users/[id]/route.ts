import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const DIVISI = ['bph', 'kaderisasi', 'sosma', 'bakmi', 'dpw', 'inforsi', 'deplu']

async function requireAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { status: 401, error: 'Belum login', user: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { status: 403, error: 'Hanya admin yang boleh mengakses', user }
  return { user }
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.status) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local' },
      { status: 500 }
    )
  }

  const { id } = await params
  const body = await request.json()

  const full_name = body.full_name !== undefined ? String(body.full_name || '').trim() : null
  const role = body.role === 'admin' || body.role === 'editor' ? body.role : null
  const divisi = body.divisi !== undefined ? (DIVISI.includes(body.divisi) ? body.divisi : null) : null
  const jabatan = body.jabatan !== undefined ? String(body.jabatan || '').trim() : null

  const patch: Record<string, string> = {}
  if (full_name !== null) patch.full_name = full_name
  if (role !== null) patch.role = role
  if (divisi !== null) patch.divisi = divisi
  if (jabatan !== null) patch.jabatan = jabatan

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 })
  }

  const { data: existing } = await admin.from('profiles').select('id').eq('id', id).maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 404 })
  }

  const { error: updateErr } = await admin.from('profiles').update(patch).eq('id', id)
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 })
  }

  if (full_name !== null) {
    await admin.auth.admin.updateUserById(id, { user_metadata: { full_name } })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.status) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local' },
      { status: 500 }
    )
  }

  const { id } = await params

  if (auth.user!.id === id) {
    return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
  }

  const { data: target } = await admin.from('profiles').select('id, role').eq('id', id).maybeSingle()
  if (target?.role === 'admin') {
    return NextResponse.json({ error: 'Tidak bisa menghapus user dengan role admin' }, { status: 400 })
  }

  const { error: eventErr } = await admin.from('events').delete().eq('created_by', id)
  if (eventErr) {
    return NextResponse.json({ error: eventErr.message }, { status: 400 })
  }

  const { error: profileErr } = await admin.from('profiles').delete().eq('id', id)
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 400 })
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(id)
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}