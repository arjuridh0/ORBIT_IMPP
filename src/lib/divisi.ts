import { DEFAULT_COLOR } from '@/lib/constants'
import type { DivisiInfo } from '@/hooks/useDivisi'
import type { Event } from '@/lib/supabase/types'

export function findDivisiByColor(items: DivisiInfo[], color: string | null) {
  const c = (color || DEFAULT_COLOR).toLowerCase()
  return items.find((d) => d.color.toLowerCase() === c)
}

export function inDivisiFilter(items: DivisiInfo[], color: string | null, filter: string[] | null) {
  if (!filter) return true
  const d = findDivisiByColor(items, color)
  return !!d && filter.includes(d.key)
}

export function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function dayNum(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric' })
}

export function monthShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { month: 'short' })
}

export function openEventDetail(e: Event) {
  window.dispatchEvent(new CustomEvent('open-event-detail', { detail: e }))
}