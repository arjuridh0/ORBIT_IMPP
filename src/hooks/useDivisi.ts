'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { DIVISI_COLORS, DIVISI_LABELS, type Divisi } from '@/lib/constants'

export interface DivisiInfo {
  key: Divisi
  label: string
  color: string
}

const DIVISI_KEYS = Object.keys(DIVISI_COLORS) as Divisi[]

export function useDivisi() {
  const [divisi, setDivisi] = useState<DivisiInfo[]>([])
  const [loading, setLoading] = useState(true)

  const refreshDivisi = useCallback(async () => {
    if (!supabase) {
      setDivisi(DIVISI_KEYS.map((k) => ({ key: k, label: DIVISI_LABELS[k], color: DIVISI_COLORS[k] })))
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('divisi').select('*').order('key')
    if (error || !data) {
      setDivisi(DIVISI_KEYS.map((k) => ({ key: k, label: DIVISI_LABELS[k], color: DIVISI_COLORS[k] })))
      setLoading(false)
      return
    }
    const rows = data.filter((d) => (DIVISI_KEYS as string[]).includes(d.key))
    setDivisi(
      DIVISI_KEYS.map((key) => {
        const row = rows.find((d) => d.key === key)
        return { key, label: row?.label ?? DIVISI_LABELS[key], color: row?.color ?? DIVISI_COLORS[key] }
      })
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshDivisi()
  }, [refreshDivisi])

  return { divisi, loading, refreshDivisi }
}