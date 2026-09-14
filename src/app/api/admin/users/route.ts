import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const DIVISI = ['bph', 'kaderisasi', 'sosma', 'bakmi', 'dpw', 'inforsi', 'deplu']

async function requireAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 401, error: 'Belum login' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { status: 403, error: 'Hanya admin yang boleh mengakses' }
  return null
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local' },
      { status: 500 }
    )
  }

  const { data: { users }, error: usersErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 })

  const { data: profiles } = await admin.from('profiles').select('id, full_name, role, jabatan, divisi, avatar_url')
  const byId = new Map((profiles || []).map((p) => [p.id, p]))

  const merged = (users || []).map((u) => {
    const p = byId.get(u.id)
    return {
      id: u.id,
      email: u.email || '',
      full_name: p?.full_name || (u.user_metadata?.full_name as string) || '-',
      role: p?.role || '-',
      jabatan: p?.jabatan || null,
      divisi: p?.divisi || '-',
      avatar_url: p?.avatar_url || null,
    }
  })

  return NextResponse.json({ users: merged })
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local' },
      { status: 500 }
    )
  }

  const body = await request.json()
  const full_name = String(body.full_name || '').trim()
  const email = String(body.email || '').trim()
  const password = String(body.password || '')
  const role = body.role === 'admin' ? 'admin' : 'editor'
  const divisi = DIVISI.includes(body.divisi) ? body.divisi : null
  const jabatan = body.jabatan ? String(body.jabatan).trim() : null

  if (!full_name || !email || !password) {
    return NextResponse.json({ error: 'Nama, email, dan password wajib diisi' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
  }
  if (!divisi) {
    return NextResponse.json({ error: 'Divisi tidak valid' }, { status: 400 })
  }

  const { data: { user }, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })
  if (error || !user) {
    return NextResponse.json({ error: error?.message || 'Gagal membuat user' }, { status: 400 })
  }

  const { error: profileErr } = await admin
    .from('profiles')
    .insert({ id: user.id, full_name, role, jabatan, divisi })

  if (profileErr) {
    await admin.auth.admin.deleteUser(user.id)
    return NextResponse.json({ error: profileErr.message }, { status: 400 })
  }

  return NextResponse.json({ user: { id: user.id, email, full_name, role, jabatan, divisi } })
}
