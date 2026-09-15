'use client'

import { useEffect, useRef, useState } from 'react'
import { useDivisi } from '@/hooks/useDivisi'
import { Icon } from '@/components/icons'

interface DivisiFilterProps {
  divisiFilter: string[] | null
  onFilterChange: (filter: string[] | null) => void
}

export default function DivisiFilter({ divisiFilter, onFilterChange }: DivisiFilterProps) {
  const { divisi } = useDivisi()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const toggle = (key: string) => {
    if (!divisiFilter) { onFilterChange([key]); return }
    if (divisiFilter.includes(key)) {
      onFilterChange(divisiFilter.length === 1 ? null : divisiFilter.filter((k) => k !== key))
    } else {
      onFilterChange([...divisiFilter, key])
    }
  }

  const active = (key: string) => divisiFilter?.includes(key) ?? false
  const selected = divisiFilter ?? []
  const selectedLabel = selected.length === 1
    ? (divisi.find((d) => d.key === selected[0])?.label ?? 'Divisi')
    : `${selected.length} divisi`

  return (
    <section className={`bg-white rounded-xl card-soft-hover p-3 lg:p-4 ${open ? 'relative z-50' : ''}`}>
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
      <p className="hidden md:block text-[10px] text-gray-400 mb-2">Klik divisi untuk filter kalender</p>

      <div className="hidden md:grid grid-cols-2 gap-1">
        {divisi.map((d) => {
          const isActive = active(d.key)
          const dimmed = !!divisiFilter && !isActive
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => toggle(d.key)}
              aria-pressed={isActive}
              className={`flex items-center gap-1.5 px-2.5 py-2 min-h-[38px] rounded-full text-left transition-all duration-200 ${
                isActive ? 'bg-blue-50 chip-inset scale-[1.02]' : 'hover:bg-gray-50 hover:scale-[1.02]'
              } ${dimmed ? 'opacity-35' : ''}`}
            >
              <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-xs font-medium text-gray-700 truncate">{d.label}</span>
            </button>
          )
        })}
      </div>

      <div ref={boxRef} className="relative md:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 transition hover:border-gray-400 active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected.length > 0 ? (
              <>
                <span className="flex gap-1 flex-shrink-0">
                  {selected.map((k) => {
                    const d = divisi.find((x) => x.key === k)
                    return d ? <span key={k} className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /> : null
                  })}
                </span>
                <span className="text-sm font-medium text-gray-700 truncate">{selectedLabel}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">Semua divisi</span>
              </>
            )}
          </span>
          <span className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            <Icon name="chevron" />
          </span>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
            {divisi.map((d) => {
              const isActive = active(d.key)
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggle(d.key)}
                  aria-pressed={isActive}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-gray-50 transition"
                >
                  <span
                    className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-white"
                    style={isActive ? { backgroundColor: d.color, borderColor: d.color } : { borderColor: '#d1d5db' }}
                  >
                    {isActive && (
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-sm font-medium text-gray-700 truncate">{d.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}