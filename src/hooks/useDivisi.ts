'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface DivisiInfo {
  key: string
  label: string
  color: string
}

export function useDivisi() {
  const [divisi, setDivisi] = useState<DivisiInfo[]>([])
  const [loading, setLoading] = useState(true)

  const refreshDivisi = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    const { data } = await supabase.from('divisi').select('key, label, color').order('sort_order').order('key')
    setDivisi((data as DivisiInfo[] | null) || [])
    setLoading(false)
  }, [])

  useEffect(() => { refreshDivisi() }, [refreshDivisi])

  return { divisi, loading, refreshDivisi }
}