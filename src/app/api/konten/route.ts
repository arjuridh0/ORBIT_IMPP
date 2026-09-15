import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase.from('konten').select('key, value').order('key')
  const konten: Record<string, string> = {}
  ;(data || []).forEach((k) => {
    konten[k.key] = k.value
  })
  return NextResponse.json({ konten })
}

export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'ketua', 'superadmin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Hanya admin' }, { status: 403 })
  }

  const body = await request.json()
  const validPairs = Object.entries(body.konten || {}).filter(
    (pair): pair is [string, string] => typeof pair[0] === 'string' && typeof pair[1] === 'string'
  )

  for (const [key, value] of validPairs) {
    const { error } = await supabase.from('konten').update({ value }).eq('key', key)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}