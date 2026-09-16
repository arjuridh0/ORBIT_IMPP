import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { processAvatar } from '@/lib/avatar'

async function requireAdminOrSelf(targetId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { status: 401, error: 'Belum login', user: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id')
    .eq('id', user.id)
    .single()

  const isAdmin = !!profile && ['admin', 'ketua', 'superadmin'].includes(profile.role)
  const isSelf = user.id === targetId

  if (!isAdmin && !isSelf) {
    return { status: 403, error: 'Tidak memiliki izin untuk mengubah foto ini', user }
  }

  return { user, isAdmin, isSelf }
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdminOrSelf(id)
  if (auth.status) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local' },
      { status: 500 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'File gambar wajib diunggah' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maksimal 5MB' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Format file tidak didukung (harus gambar)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const path = `${id}/${Date.now()}.webp`

    const { error: uploadErr } = await admin.storage.from('avatars').upload(path, await processAvatar(buffer), {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '3600',
    })

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    const { data: publicData } = admin.storage.from('avatars').getPublicUrl(path)
    const avatar_url = publicData.publicUrl

    const { error: profileErr } = await admin
      .from('profiles')
      .update({ avatar_url })
      .eq('id', id)

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, avatar_url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdminOrSelf(id)
  if (auth.status) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local' },
      { status: 500 }
    )
  }

  try {
    const { data: files } = await admin.storage.from('avatars').list(id)
    if (files && files.length > 0) {
      await admin.storage.from('avatars').remove(files.map((f) => `${id}/${f.name}`))
    }
  } catch (storageErr) {
    console.warn('Storage cleanup warning:', storageErr)
  }

  const { error: profileErr } = await admin
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', id)

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, avatar_url: null })
}
