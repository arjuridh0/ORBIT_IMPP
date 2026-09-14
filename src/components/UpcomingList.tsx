'use client'

import type { Event } from '@/lib/supabase/types'
import { DIVISI_COLORS, DIVISI_LABELS, DEFAULT_COLOR, type Divisi } from '@/lib/constants'
import { useDivisi } from '@/hooks/useDivisi'
import { Icon } from '@/components/icons'
import { dayNum, formatTime, inDivisiFilter, monthShort, openEventDetail } from '@/lib/divisi'

interface UpcomingListProps {
  stats: {
    todayEvents: Event[]
    thisMonth: number
    upcoming: Event[]
  }
  divisiFilter: string[] | null
}

export default function UpcomingList({ stats, divisiFilter }: UpcomingListProps) {
  const { divisi } = useDivisi()
  const items = divisi.length > 0
    ? divisi
    : (Object.keys(DIVISI_COLORS) as Divisi[]).map((k) => ({ key: k, label: DIVISI_LABELS[k], color: DIVISI_COLORS[k] }))

  const tomorrowStart = new Date()
  tomorrowStart.setHours(24, 0, 0, 0)
  const mendatang = stats.upcoming.filter(
    (e) => new Date(e.start_date) >= tomorrowStart && inDivisiFilter(items, e.color, divisiFilter)
  )

  return (
    <div className="flex flex-col gap-4">
      {mendatang.length > 0 && (
        <section className="bg-white rounded-xl card-soft-hover p-3 lg:p-4">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 lg:mb-3 flex items-center gap-2">
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
                  onClick={() => openEventDetail(event)}
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
        </section>
      )}

      <p className="text-xs text-gray-400 leading-relaxed px-1 hidden lg:block">
        Klik tanggal untuk menambah kegiatan, klik kegiatan untuk detail, tarik kegiatan untuk pindah jadwal.
      </p>
    </div>
  )
}