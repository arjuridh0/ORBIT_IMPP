import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const ELEVATED_ROLES = ['admin', 'ketua', 'superadmin']

async function requireElevated() {
  const supabase = await getSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { status: 401 as const, error: 'Belum login', user: null, callerRole: '' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id')
    .eq('id', user.id)
    .single()

  if (!ELEVATED_ROLES.includes(profile?.role || '')) {
    return { status: 403 as const, error: 'Akses ditolak', user, callerRole: profile?.role || '' }
  }
  return { user, callerRole: profile?.role || '', status: undefined, error: undefined }
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireElevated()
  if (auth.status) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset' }, { status: 500 })

  const { id } = await params
  const body = await request.json()

  const allowedRoles = ['admin', 'editor', 'ketua']
  const full_name = body.full_name !== undefined ? String(body.full_name || '').trim() : null
  const role = allowedRoles.includes(body.role) ? body.role : null
  const divisiInput = body.divisi !== undefined ? String(body.divisi || '').trim() : ''
  let divisi: string | null = null
  if (body.divisi !== undefined) {
    const { data: divisiRows } = await admin.from('divisi').select('key')
    const validKeys = (divisiRows || []).map((d: { key: string }) => d.key)
    divisi = validKeys.includes(divisiInput) ? divisiInput : null
  }
  const jabatan = body.jabatan !== undefined ? String(body.jabatan || '').trim() : null

  const patch: Record<string, string> = {}
  if (full_name !== null) patch.full_name = full_name
  if (role !== null) patch.role = role
  if (divisi !== null) patch.divisi = divisi
  if (jabatan !== null) patch.jabatan = jabatan

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 })

  const { data: existing } = await admin.from('profiles').select('id').eq('id', id).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 404 })

  const { error: updateErr } = await admin.from('profiles').update(patch).eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

  if (full_name !== null) await admin.auth.admin.updateUserById(id, { user_metadata: { full_name } })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireElevated()
  if (auth.status) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset' }, { status: 500 })

  const { id } = await params
  const callerRole = auth.callerRole

  if (auth.user!.id === id) return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })

  const { data: target } = await admin.from('profiles').select('id, role').eq('id', id).maybeSingle()
  if (!target) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  // Hierarchy: superadmin > ketua > admin > editor
  if (target.role === 'superadmin' && callerRole !== 'superadmin') {
    return NextResponse.json({ error: 'Tidak bisa menghapus superadmin' }, { status: 403 })
  }
  if (target.role === 'ketua' && callerRole === 'admin') {
    return NextResponse.json({ error: 'Admin tidak bisa menghapus ketua' }, { status: 403 })
  }
  if (target.role === 'admin' && callerRole === 'admin') {
    return NextResponse.json({ error: 'Admin tidak bisa menghapus admin lain' }, { status: 403 })
  }

  await admin.from('events').delete().eq('created_by', id)
  const { error: profileErr } = await admin.from('profiles').delete().eq('id', id)
  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 })

  const { error: authErr } = await admin.auth.admin.deleteUser(id)
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}