'use client'

import type { Event } from '@/lib/supabase/types'
import { DEFAULT_COLOR } from '@/lib/divisi'
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

  const tomorrowStart = new Date()
  tomorrowStart.setHours(24, 0, 0, 0)
  const mendatang = stats.upcoming.filter(
    (e) => new Date(e.start_date) >= tomorrowStart && inDivisiFilter(divisi, e.color, divisiFilter)
  )

  if (mendatang.length === 0) return null

  return (
    <section className="bg-white rounded-xl card-soft-hover p-3 lg:p-4">
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 lg:mb-3 flex items-center gap-2">
        <span className="text-blue-600"><Icon name="calendar" /></span>
        Mendatang
      </h3>
      <div className="space-y-1">
        {mendatang.map((event) => {
          const color = event.color || DEFAULT_COLOR
          const sDay = event.start_date.slice(0, 10)
          const eDay = event.end_date ? event.end_date.slice(0, 10) : ''
          const isMulti = !!(eDay && sDay !== eDay)
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
                <p className="text-xs text-gray-500 tabular-nums truncate">
                  {isMulti ? (
                    <span className="text-blue-600 font-medium">Multi-hari ({dayNum(event.start_date)}–{dayNum(event.end_date!)} {monthShort(event.end_date!)})</span>
                  ) : (
                    event.is_tbd ? 'Jam TBD' : formatTime(event.start_date)
                  )}
                  {event.location ? ` • ${event.location}` : ''}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}