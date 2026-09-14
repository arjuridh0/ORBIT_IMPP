'use client'

import type { Event } from '@/lib/supabase/types'
import { DIVISI_COLORS, DIVISI_LABELS, DEFAULT_COLOR, type Divisi } from '@/lib/constants'
import { useDivisi } from '@/hooks/useDivisi'
import { Icon } from '@/components/icons'
import { formatTime, inDivisiFilter, openEventDetail } from '@/lib/divisi'

interface TodayStatsBoardProps {
  stats: {
    todayEvents: Event[]
    thisMonth: number
    upcoming: Event[]
  }
  divisiFilter: string[] | null
}

export default function TodayStatsBoard({ stats, divisiFilter }: TodayStatsBoardProps) {
  const { divisi } = useDivisi()
  const items = divisi.length > 0
    ? divisi
    : (Object.keys(DIVISI_COLORS) as Divisi[]).map((k) => ({ key: k, label: DIVISI_LABELS[k], color: DIVISI_COLORS[k] }))

  const todayList = stats.todayEvents.filter((e) => inDivisiFilter(items, e.color, divisiFilter))

  return (
    <section className="rounded-xl card-soft stats-gradient">
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
                  onClick={() => openEventDetail(event)}
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
      </div>
    </section>
  )
}