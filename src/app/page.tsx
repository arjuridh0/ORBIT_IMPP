'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Calendar from '@/components/Calendar'
import TodayStatsBoard from '@/components/TodayStatsBoard'
import DivisiFilter from '@/components/DivisiFilter'
import UpcomingList from '@/components/UpcomingList'
import { useEvents } from '@/hooks/useEvents'
import { supabase } from '@/lib/supabase/client'
import { Icon } from '@/components/icons'

export default function Home() {
  const eventsHook = useEvents()
  const { stats, updateStats } = eventsHook
  const [divisiFilter, setDivisiFilter] = useState<string[] | null>(null)

  useEffect(() => {
    updateStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {!supabase && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-amber-500 mt-0.5 flex-shrink-0"><Icon name="warning" /></span>
            <div>
              <p className="text-sm font-bold text-amber-800">Supabase belum dikonfigurasi</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Buat file <code className="bg-amber-100 px-1 rounded">.env.local</code> dengan isi{' '}
                <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> dan{' '}
                <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
                Lihat <code className="bg-amber-100 px-1 rounded">.env.example</code> untuk template.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8 items-start">
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:flex lg:flex-col lg:col-span-3 gap-6">
            <TodayStatsBoard stats={stats} divisiFilter={divisiFilter} />
            <UpcomingList stats={stats} divisiFilter={divisiFilter} />
            <DivisiFilter divisiFilter={divisiFilter} onFilterChange={setDivisiFilter} />
          </aside>

          {/* Mobile Top: Stats, Upcoming & Filter before calendar */}
          <div className="lg:hidden space-y-4">
            <TodayStatsBoard stats={stats} divisiFilter={divisiFilter} />
            <UpcomingList stats={stats} divisiFilter={divisiFilter} />
            <DivisiFilter divisiFilter={divisiFilter} onFilterChange={setDivisiFilter} />
          </div>

          {/* Main Calendar Area */}
          <div className="lg:col-span-9">
            <Calendar useEventsHook={eventsHook} divisiFilter={divisiFilter} />
          </div>
        </div>
      </main>
    </div>
  )
}

