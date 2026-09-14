'use client'

import type { Event } from '@/lib/supabase/types'
import { DIVISI_COLORS, DIVISI_LABELS, DEFAULT_COLOR, type Divisi } from '@/lib/constants'
import { useDivisi } from '@/hooks/useDivisi'
import { Icon } from '@/components/icons'

interface SidebarProps {
  stats: {
    todayEvents: Event[]
    thisMonth: number
    upcoming: Event[]
  }
  divisiFilter: string[] | null
  onFilterChange: (filter: string[] | null) => void
}

function dayNum(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric' })
}

function monthShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { month: 'short' })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function Sidebar({ stats, divisiFilter, onFilterChange }: SidebarProps) {
  const { divisi } = useDivisi()
  const items = divisi.length > 0
    ? divisi
    : (Object.keys(DIVISI_COLORS) as Divisi[]).map((k) => ({ key: k, label: DIVISI_LABELS[k], color: DIVISI_COLORS[k] }))

  const colorToDivisi = (color: string | null) => {
    const c = (color || DEFAULT_COLOR).toLowerCase()
    return items.find((d) => d.color.toLowerCase() === c)?.key
  }

  const matchesFilter = (color: string | null) => {
    if (!divisiFilter) return true
    const d = colorToDivisi(color)
    return !!d && divisiFilter.includes(d)
  }

  const todayList = stats.todayEvents.filter((e) => matchesFilter(e.color))

  const tomorrowStart = new Date()
  tomorrowStart.setHours(24, 0, 0, 0)
  const mendatang = stats.upcoming.filter(
    (e) => new Date(e.start_date) >= tomorrowStart && matchesFilter(e.color)
  )

  const toggleDivisi = (key: string) => {
    if (!divisiFilter) {
      onFilterChange([key])
      return
    }
    if (divisiFilter.includes(key)) {
      onFilterChange(divisiFilter.length === 1 ? null : divisiFilter.filter((k) => k !== key))
    } else {
      onFilterChange([...divisiFilter, key])
    }
  }

  const openEvent = (e: Event) => {
    window.dispatchEvent(new CustomEvent('open-event-detail', { detail: e }))
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl card-soft stats-gradient">
        {/* Stats — angka lebih kecil di mobile, normal di desktop */}
        <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
          <div className="py-3 lg:py-4 text-center">
            <p className="text-xl lg:text-2xl font-extrabold text-gray-900 tabular-nums leading-none">{todayList.length}</p>
            <p className="text-[10px] lg:text-[11px] font-medium text-gray-500 mt-1 lg:mt-1.5">Kegiatan hari ini</p>
          </div>
          <div className="py-3 lg:py-4 text-center">
            <p className="text-xl lg:text-2xl font-extrabold text-gray-900 tabular-nums leading-none">{stats.thisMonth}</p>
            <p className="text-[10px] lg:text-[11px] font-medium text-gray-500 mt-1 lg:mt-1.5">Bulan ini</p>
          </div>
        </div>

        <div className={`p-3 lg:p-4 ${todayList.length > 0 ? 'section-accent' : ''}`}>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 lg:mb-3 flex items-center gap-2">
            <span className="text-blue-600"><Icon name="clock" /></span>
            Hari Ini
          </h3>

          {todayList.length > 0 ? (
            <div className="space-y-0.5">
              {todayList.map((event) => {
                const color = event.color || DEFAULT_COLOR
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openEvent(event)}
                    className="w-full flex items-center gap-2 p-2 -mx-2 rounded-lg hover:bg-blue-50/50 transition-all duration-200 hover:scale-[1.01] text-left"
                  >
                    <span className="text-xs font-bold tabular-nums w-10 flex-shrink-0" style={{ color }}>
                      {event.is_tbd ? 'TBD' : formatTime(event.start_date)}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 truncate">{event.title}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-4 lg:py-5">
              <svg viewBox="0 0 48 48" className="w-8 h-8 lg:w-10 lg:h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="10" width="36" height="32" rx="4" />
                <path d="M6 18h36" />
                <path d="M16 6v8" />
                <path d="M32 6v8" />
                <circle cx="24" cy="30" r="4" strokeDasharray="3 2" />
              </svg>
              <p className="text-xs text-gray-400">Tidak ada kegiatan hari ini</p>
            </div>
          )}

          {mendatang.length > 0 && (
            <>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mt-4 mb-2 lg:mt-5 lg:mb-3 flex items-center gap-2">
                <span className="text-blue-600"><Icon name="calendar" /></span>
                Mendatang
              </h3>
              <div className="space-y-1">
                {mendatang.map((event) => {
                  const color = event.color || DEFAULT_COLOR
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openEvent(event)}
                      className="w-full flex items-center gap-2 p-2 -mx-2 rounded-lg hover:bg-blue-50/50 transition-all duration-200 hover:scale-[1.01] text-left"
                    >
                      <div
                        className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 leading-none border"
                        style={{ backgroundColor: `${color}14`, borderColor: `${color}33` }}
                      >
                        <span className="text-[8px] lg:text-[9px] font-semibold uppercase" style={{ color }}>{monthShort(event.start_date)}</span>
                        <span className="text-xs lg:text-sm font-bold text-gray-900 tabular-nums mt-0.5">{dayNum(event.start_date)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                        <p className="text-xs text-gray-500 tabular-nums">
                          {event.is_tbd ? 'Jam TBD' : formatTime(event.start_date)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl card-soft-hover p-3 lg:p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <span className="text-blue-600"><Icon name="palette" /></span>
            Divisi
          </h3>
          {divisiFilter && (
            <button
              type="button"
              onClick={() => onFilterChange(null)}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              Reset
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mb-2">Klik divisi untuk filter kalender</p>
        <div className="grid grid-cols-2 gap-1">
          {items.map((d) => {
            const key = d.key
            const active = divisiFilter?.includes(key) ?? false
            const dimmed = !!divisiFilter && !active
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleDivisi(key)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 px-2.5 py-2 min-h-[38px] rounded-full text-left transition-all duration-200 ${
                  active ? 'bg-blue-50 chip-inset scale-[1.02]' : 'hover:bg-gray-50 hover:scale-[1.02]'
                } ${dimmed ? 'opacity-35' : ''}`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-xs font-medium text-gray-700 truncate">{d.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      <p className="text-xs text-gray-400 leading-relaxed px-1 hidden lg:block">
        Klik tanggal untuk menambah kegiatan, klik kegiatan untuk detail, tarik kegiatan untuk pindah jadwal.
      </p>
    </div>
  )
}

