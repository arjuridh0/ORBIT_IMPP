'use client'

import { useRef, useEffect } from 'react'
import Swal from 'sweetalert2'
import type { Event } from '@/lib/supabase/types'
import { DEFAULT_COLOR, findDivisiByColor } from '@/lib/divisi'
import { REMINDER_OPTIONS } from '@/lib/constants'
import { useDivisi } from '@/hooks/useDivisi'
import { iconString } from '@/components/icons'
import { useAuth } from '@/components/AuthProvider'
import type { useEvents } from '@/hooks/useEvents'
import {
  generateGoogleCalendarUrl,
  downloadIcsFile,
  generateWhatsAppBroadcast,
  copyToClipboard,
} from '@/lib/calendar-export'

function icon(name: string, cls = 'w-4 h-4') {
  return `<span style="display:inline-flex;vertical-align:-3px">${iconString(name, cls)}</span>`
}

// ===================================
// TYPES
// ===================================

declare global {
  interface Window {
    FullCalendar: any
  }
}

interface CalendarProps {
  useEventsHook: ReturnType<typeof useEvents>
  divisiFilter: string[] | null
}

// ===================================
// HELPERS
// ===================================

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function reminderSelectHtml(currentValue?: number | null) {
  return REMINDER_OPTIONS.map(o => {
    const val = o.value ?? ''
    const selected = (o.value ?? null) === (currentValue ?? null) ? 'selected' : ''
    return `<option value="${val}" ${selected}>${o.label}</option>`
  }).join('')
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function calculateRecurringDates(
  startDateStr: string,
  pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly',
  mode: 'count' | 'until',
  countVal: number,
  untilDateStr: string
): Date[] {
  const result: Date[] = []
  if (!startDateStr) return result
  const [sy, sm, sd] = startDateStr.split('-').map(Number)
  const base = new Date(sy, sm - 1, sd)
  const maxIterations = 52

  if (mode === 'count') {
    const total = Math.min(Math.max(countVal || 2, 2), maxIterations)
    for (let i = 0; i < total; i++) {
      const d = new Date(base)
      if (pattern === 'daily') d.setDate(d.getDate() + i)
      else if (pattern === 'weekly') d.setDate(d.getDate() + i * 7)
      else if (pattern === 'biweekly') d.setDate(d.getDate() + i * 14)
      else if (pattern === 'monthly') d.setMonth(d.getMonth() + i)
      result.push(d)
    }
  } else {
    if (!untilDateStr) return [base]
    const [uy, um, ud] = untilDateStr.split('-').map(Number)
    const until = new Date(uy, um - 1, ud, 23, 59, 59)
    let current = new Date(base)
    let iter = 0
    while (current <= until && iter < maxIterations) {
      result.push(new Date(current))
      iter++
      if (pattern === 'daily') current.setDate(current.getDate() + 1)
      else if (pattern === 'weekly') current.setDate(current.getDate() + 7)
      else if (pattern === 'biweekly') current.setDate(current.getDate() + 14)
      else if (pattern === 'monthly') current.setMonth(current.getMonth() + 1)
    }
  }
  return result
}

// ===================================
// COMPONENT
// ===================================

export default function Calendar({ useEventsHook, divisiFilter }: CalendarProps) {
  const calendarElRef = useRef<HTMLDivElement>(null)
  const calendarInstanceRef = useRef<any>(null)

  const { profile, canEditEvent } = useAuth()
  const { divisi } = useDivisi()

  const {
    fetchEvents, addEvent, addEvents,
    updateEvent, updateEventGroup,
    deleteEvent, deleteEventGroup, updateStats,
  } = useEventsHook

  // Stable refs so FullCalendar callbacks always use current versions
  const fetchEventsRef = useRef(fetchEvents)
  const addEventRef = useRef(addEvent)
  const addEventsRef = useRef(addEvents)
  const updateEventRef = useRef(updateEvent)
  const updateEventGroupRef = useRef(updateEventGroup)
  const deleteEventRef = useRef(deleteEvent)
  const deleteEventGroupRef = useRef(deleteEventGroup)
  const updateStatsRef = useRef(updateStats)
  const profileRef = useRef(profile)
  const canEditRef = useRef(canEditEvent)
  const divisiFilterRef = useRef(divisiFilter)
  const divisiRef = useRef(divisi)

  useEffect(() => {
    fetchEventsRef.current = fetchEvents
    addEventRef.current = addEvent
    addEventsRef.current = addEvents
    updateEventRef.current = updateEvent
    updateEventGroupRef.current = updateEventGroup
    deleteEventRef.current = deleteEvent
    deleteEventGroupRef.current = deleteEventGroup
    updateStatsRef.current = updateStats
    profileRef.current = profile
    canEditRef.current = canEditEvent
    divisiFilterRef.current = divisiFilter
    divisiRef.current = divisi
  })

  useEffect(() => {
    if (calendarInstanceRef.current) calendarInstanceRef.current.refetchEvents()
  }, [profile])

  useEffect(() => {
    divisiFilterRef.current = divisiFilter
    calendarInstanceRef.current?.refetchEvents()
  }, [divisiFilter])

  // ==============================
  // REFETCH HELPER
  // ==============================

  function refetchAndUpdateStats() {
    const cal = calendarInstanceRef.current
    if (cal) cal.refetchEvents()
    updateStatsRef.current()
  }

  // ==============================
  // MODAL: TAMBAH KEGIATAN
  // ==============================

  function showAddEventModal(dateStr: string) {
    const [baseY, baseM, baseD] = dateStr.split('-').map(Number)
    const defaultEndObj = new Date(baseY, baseM - 1, baseD + 2)
    const defaultEndDate = toLocalDateStr(defaultEndObj)
    const defaultUntilObj = new Date(baseY, baseM - 1, baseD + 28)
    const defaultUntilDate = toLocalDateStr(defaultUntilObj)

    Swal.fire({
      title: 'Tambah Kegiatan',
      html: `
        <div class="text-left space-y-3">
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-sm font-medium text-gray-700">Tanggal <span class="text-red-500">*</span></label>
              <label id="lbl-multiday-toggle" class="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold cursor-pointer hover:text-blue-700 select-none">
                <input type="checkbox" id="add-is-multiday" class="w-3.5 h-3.5 accent-blue-600 rounded">
                <span>Rentang multi-hari</span>
              </label>
            </div>
            <div id="add-single-date-box">
              <input type="date" id="add-date" class="ds-input" value="${dateStr}">
            </div>
            <div id="add-multiday-box" class="hidden space-y-2">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-medium text-gray-500 mb-1">Tanggal Mulai</label>
                  <input type="date" id="add-start-date" class="ds-input" value="${dateStr}">
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-gray-500 mb-1">Tanggal Selesai</label>
                  <input type="date" id="add-end-date" class="ds-input" value="${defaultEndDate}">
                </div>
              </div>
              <p id="add-multiday-duration" class="text-xs font-semibold text-blue-700 bg-blue-50 py-1.5 px-3 rounded-lg border border-blue-100 flex items-center gap-1.5">
                ${icon('calendar', 'w-3.5 h-3.5 text-blue-600')} <span id="add-duration-text">Durasi: 3 hari</span>
              </p>
            </div>
          </div>
          <div id="add-time-fields" class="grid grid-cols-2 gap-3">
            <div>
              <label id="lbl-add-start" class="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
              <input type="time" id="add-start" class="ds-input" value="08:00">
            </div>
            <div>
              <label id="lbl-add-end" class="block text-sm font-medium text-gray-700 mb-1">Jam Selesai</label>
              <input type="time" id="add-end" class="ds-input" value="10:00">
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="add-tbd" class="w-4 h-4 accent-blue-600">
            <label for="add-tbd" class="text-sm font-medium text-gray-700">Jam TBD (belum ditentukan)</label>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Judul Kegiatan <span class="text-red-500">*</span></label>
            <input type="text" id="add-title" class="ds-input" placeholder="Contoh: Rapat Koordinasi, Makrab, Baksos...">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Lokasi <span class="text-gray-400 font-normal">(opsional)</span></label>
            <div class="space-y-2">
              <select id="add-loc-type" class="ds-input">
                <option value="">-- Pilih Tipe Lokasi (Opsional) --</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
              <div id="add-loc-offline-box" class="hidden">
                <input type="text" id="add-loc-venue" class="ds-input" placeholder="Nama tempat / ruangan (cth: Aula Kampus, Sekretariat IMPP)">
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi <span class="text-gray-400">(opsional)</span></label>
            <textarea id="add-desc" rows="2" class="ds-input" placeholder="Catatan atau detail kegiatan..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Pengingat</label>
            <select id="add-reminder" class="ds-input">${reminderSelectHtml()}</select>
          </div>
          <div id="box-recurring-toggle" class="flex items-center gap-2 pt-1">
            <input type="checkbox" id="add-recurring" class="w-4 h-4 accent-blue-600">
            <label for="add-recurring" class="text-sm font-medium text-gray-700">Kegiatan berulang (rutinan)</label>
          </div>
          <div id="add-recurring-fields" class="hidden space-y-3 border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50/50">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Pola Pengulangan</label>
              <select id="add-pattern" class="ds-input">
                <option value="weekly">Mingguan (Tiap Pekan)</option>
                <option value="biweekly">2 Pekan Sekali</option>
                <option value="monthly">Bulanan</option>
                <option value="daily">Harian</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Batas Pengulangan</label>
              <div class="grid grid-cols-2 gap-2 mb-2">
                <label class="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer bg-white text-xs font-medium text-gray-700">
                  <input type="radio" name="add-rec-mode" id="add-rec-mode-count" value="count" checked class="accent-blue-600">
                  <span>Jumlah Sesi</span>
                </label>
                <label class="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer bg-white text-xs font-medium text-gray-700">
                  <input type="radio" name="add-rec-mode" id="add-rec-mode-until" value="until" class="accent-blue-600">
                  <span>Sampai Tanggal</span>
                </label>
              </div>
              <div id="add-box-count">
                <input type="number" id="add-count" min="2" max="52" value="4" class="ds-input" placeholder="Jumlah kali (cth: 4)">
              </div>
              <div id="add-box-until" class="hidden">
                <input type="date" id="add-until-date" class="ds-input" value="${defaultUntilDate}">
              </div>
            </div>

            <!-- LIVE PREVIEW BOX -->
            <div id="add-rec-preview-box" class="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-xs">
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-bold text-blue-900" id="add-rec-preview-title">Preview Jadwal (4 Sesi):</span>
                <span class="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Otomatis Dibuat</span>
              </div>
              <div id="add-rec-preview-list" class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
              </div>
            </div>
          </div>
        </div>
      `,
      width: '520px',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      focusConfirm: false,
      didOpen: () => {
        const tbd = document.getElementById('add-tbd') as HTMLInputElement
        const timeFields = document.getElementById('add-time-fields')!
        tbd.addEventListener('change', () => {
          timeFields.style.display = tbd.checked ? 'none' : ''
        })

        // Lokasi dynamic toggle
        const locType = document.getElementById('add-loc-type') as HTMLSelectElement
        const offlineBox = document.getElementById('add-loc-offline-box')!
        locType?.addEventListener('change', () => {
          offlineBox.classList.toggle('hidden', locType.value !== 'offline')
          if (locType.value === 'offline') {
            document.getElementById('add-loc-venue')?.focus()
          }
        })

        // Multi-day duration calculation & toggle
        const isMulti = document.getElementById('add-is-multiday') as HTMLInputElement
        const singleDateBox = document.getElementById('add-single-date-box')!
        const multiDateBox = document.getElementById('add-multiday-box')!
        const boxRecToggle = document.getElementById('box-recurring-toggle')!
        const lblStart = document.getElementById('lbl-add-start')!
        const lblEnd = document.getElementById('lbl-add-end')!

        function updateMultiDayDuration() {
          const sDate = (document.getElementById('add-start-date') as HTMLInputElement).value
          const eDate = (document.getElementById('add-end-date') as HTMLInputElement).value
          const durEl = document.getElementById('add-duration-text')
          if (!sDate || !eDate || !durEl) return
          const [sy, sm, sd] = sDate.split('-').map(Number)
          const [ey, em, ed] = eDate.split('-').map(Number)
          const sObj = new Date(sy, sm - 1, sd)
          const eObj = new Date(ey, em - 1, ed)
          const diffDays = Math.round((eObj.getTime() - sObj.getTime()) / 86400000) + 1
          if (diffDays <= 0) {
            durEl.textContent = 'Tanggal selesai harus setelah tanggal mulai!'
            durEl.className = 'text-red-600 font-semibold'
          } else {
            durEl.textContent = `Durasi: ${diffDays} hari (${sObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${eObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`
            durEl.className = 'text-blue-700 font-semibold'
          }
        }

        isMulti.addEventListener('change', () => {
          const checked = isMulti.checked
          singleDateBox.classList.toggle('hidden', checked)
          multiDateBox.classList.toggle('hidden', !checked)
          boxRecToggle.classList.toggle('hidden', checked)
          if (checked) {
            lblStart.textContent = 'Jam Mulai (Hari 1)'
            lblEnd.textContent = 'Jam Selesai (Hari Terakhir)'
            const sInp = document.getElementById('add-start-date') as HTMLInputElement
            const dInp = document.getElementById('add-date') as HTMLInputElement
            if (sInp && dInp) sInp.value = dInp.value
            updateMultiDayDuration()
          } else {
            lblStart.textContent = 'Jam Mulai'
            lblEnd.textContent = 'Jam Selesai'
          }
        })

        document.getElementById('add-start-date')?.addEventListener('input', updateMultiDayDuration)
        document.getElementById('add-end-date')?.addEventListener('input', updateMultiDayDuration)

        // Recurring Live Preview & mode toggle
        const rec = document.getElementById('add-recurring') as HTMLInputElement
        const recFields = document.getElementById('add-recurring-fields')!
        const lblMultiToggle = document.getElementById('lbl-multiday-toggle')!
        const boxCount = document.getElementById('add-box-count')!
        const boxUntil = document.getElementById('add-box-until')!
        const radCount = document.getElementById('add-rec-mode-count') as HTMLInputElement
        const radUntil = document.getElementById('add-rec-mode-until') as HTMLInputElement

        function updateRecPreview() {
          const sDate = (document.getElementById('add-date') as HTMLInputElement).value
          const pat = (document.getElementById('add-pattern') as HTMLSelectElement).value as 'daily' | 'weekly' | 'biweekly' | 'monthly'
          const isCount = radCount.checked
          const count = parseInt((document.getElementById('add-count') as HTMLInputElement).value, 10) || 4
          const untilDate = (document.getElementById('add-until-date') as HTMLInputElement).value

          const dates = calculateRecurringDates(sDate, pat, isCount ? 'count' : 'until', count, untilDate)
          const titleEl = document.getElementById('add-rec-preview-title')
          const listEl = document.getElementById('add-rec-preview-list')
          if (titleEl) titleEl.textContent = `Preview Jadwal (${dates.length} Sesi):`
          if (listEl) {
            if (dates.length === 0) {
              listEl.innerHTML = '<span class="text-gray-400 italic">Tidak ada jadwal yang cocok</span>'
            } else {
              listEl.innerHTML = dates.map((d, idx) => {
                const str = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
                return `<span class="px-2 py-0.5 bg-white border border-blue-200 text-blue-800 rounded-md font-medium text-[11px] shadow-2xs">${idx + 1}. ${str}</span>`
              }).join('')
            }
          }
        }

        rec.addEventListener('change', () => {
          recFields.classList.toggle('hidden', !rec.checked)
          lblMultiToggle.classList.toggle('hidden', rec.checked)
          if (rec.checked) updateRecPreview()
        })

        radCount.addEventListener('change', () => {
          boxCount.classList.remove('hidden')
          boxUntil.classList.add('hidden')
          updateRecPreview()
        })
        radUntil.addEventListener('change', () => {
          boxCount.classList.add('hidden')
          boxUntil.classList.remove('hidden')
          updateRecPreview()
        })

        document.getElementById('add-date')?.addEventListener('input', () => {
          if (rec.checked) updateRecPreview()
        })
        document.getElementById('add-pattern')?.addEventListener('change', updateRecPreview)
        document.getElementById('add-count')?.addEventListener('input', updateRecPreview)
        document.getElementById('add-until-date')?.addEventListener('input', updateRecPreview)
      },
      preConfirm: () => {
        const title = (document.getElementById('add-title') as HTMLInputElement).value.trim()
        const isMultiDay = (document.getElementById('add-is-multiday') as HTMLInputElement).checked
        let date = (document.getElementById('add-date') as HTMLInputElement).value
        let multiEndDate: string | null = null

        if (isMultiDay) {
          date = (document.getElementById('add-start-date') as HTMLInputElement).value
          multiEndDate = (document.getElementById('add-end-date') as HTMLInputElement).value
          if (!date || !multiEndDate) {
            Swal.showValidationMessage('Tanggal mulai dan tanggal selesai wajib diisi!')
            return false
          }
          if (multiEndDate < date) {
            Swal.showValidationMessage('Tanggal selesai tidak boleh sebelum tanggal mulai!')
            return false
          }
        } else {
          if (!date) { Swal.showValidationMessage('Tanggal wajib diisi!'); return false }
        }

        const startTime = (document.getElementById('add-start') as HTMLInputElement).value
        const endTime = (document.getElementById('add-end') as HTMLInputElement).value
        const desc = (document.getElementById('add-desc') as HTMLTextAreaElement).value.trim()
        const isTbd = (document.getElementById('add-tbd') as HTMLInputElement).checked
        const reminderVal = (document.getElementById('add-reminder') as HTMLSelectElement).value

        const locType = (document.getElementById('add-loc-type') as HTMLSelectElement).value
        let location: string | null = null
        if (locType === 'offline') {
          const venue = (document.getElementById('add-loc-venue') as HTMLInputElement).value.trim()
          location = venue || 'Offline'
        } else if (locType === 'online') {
          location = 'Online'
        }

        if (!title) { Swal.showValidationMessage('Judul kegiatan wajib diisi!'); return false }
        if (!isTbd && startTime && endTime && !isMultiDay && startTime >= endTime) {
          Swal.showValidationMessage('Jam selesai harus lebih dari jam mulai!'); return false
        }

        const recurring = (document.getElementById('add-recurring') as HTMLInputElement).checked
        let recurrenceDates: Date[] | null = null
        if (recurring && !isMultiDay) {
          const pattern = (document.getElementById('add-pattern') as HTMLSelectElement).value as 'daily' | 'weekly' | 'biweekly' | 'monthly'
          const isCount = (document.getElementById('add-rec-mode-count') as HTMLInputElement).checked
          const count = parseInt((document.getElementById('add-count') as HTMLInputElement).value, 10) || 4
          const untilDate = (document.getElementById('add-until-date') as HTMLInputElement).value
          recurrenceDates = calculateRecurringDates(date, pattern, isCount ? 'count' : 'until', count, untilDate)
          if (recurrenceDates.length === 0) {
            Swal.showValidationMessage('Tidak ada tanggal pengulangan yang valid!')
            return false
          }
        }

        return {
          title, date, multiEndDate, isMultiDay,
          startTime, endTime, desc, location, isTbd,
          recurrenceDates,
          reminder: reminderVal === '' ? null : parseInt(reminderVal)
        }
      },
    }).then(async (result) => {
      if (!result.isConfirmed || !result.value) return
      const {
        title, date, multiEndDate, isMultiDay,
        startTime, endTime, desc, location, isTbd,
        recurrenceDates, reminder
      } = result.value

      const buildPayload = (d: string) => ({
        title,
        description: desc || null,
        location: location || null,
        start_date: isTbd ? `${d}T00:00:00` : `${d}T${startTime || '00:00'}:00`,
        end_date: isTbd ? null : (endTime ? `${d}T${endTime}:00` : null),
        is_tbd: isTbd,
        color: (() => {
          const dv = profileRef.current?.divisi
          return divisiRef.current.find((d) => d.key === dv)?.color ?? DEFAULT_COLOR
        })(),
        created_by: profileRef.current?.id ?? null,
        reminder_offset_minutes: reminder,
      })

      Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })

      let res
      if (isMultiDay && multiEndDate) {
        const payload = {
          title,
          description: desc || null,
          location: location || null,
          start_date: isTbd ? `${date}T00:00:00` : `${date}T${startTime || '00:00'}:00`,
          end_date: isTbd ? `${multiEndDate}T23:59:59` : `${multiEndDate}T${endTime || '23:59'}:00`,
          is_tbd: isTbd,
          color: (() => {
            const dv = profileRef.current?.divisi
            return divisiRef.current.find((d) => d.key === dv)?.color ?? DEFAULT_COLOR
          })(),
          created_by: profileRef.current?.id ?? null,
          reminder_offset_minutes: reminder,
        }
        res = await addEventRef.current(payload)
      } else if (recurrenceDates && recurrenceDates.length > 0) {
        const dateStrings = recurrenceDates.map((d: Date) => toLocalDateStr(d))
        res = await addEventsRef.current(dateStrings.map(buildPayload))
      } else {
        res = await addEventRef.current(buildPayload(date))
      }

      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Kegiatan berhasil disimpan.', confirmButtonColor: '#2563eb', timer: 2000, showConfirmButton: false })
        refetchAndUpdateStats()
      } else {
        Swal.fire('Gagal!', res.message || 'Gagal menyimpan.', 'error')
      }
    })
  }

  // ==============================
  // MODAL: DETAIL KEGIATAN
  // ==============================

  function showEventDetail(event: any) {
    const raw: Event = event.extendedProps?.raw
    const isTbd = raw?.is_tbd || !event.end
    const startTime = event.start?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) || '??:??'
    const endTime = event.end?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) || '??:??'

    const sDate = event.start || (raw?.start_date ? new Date(raw.start_date) : new Date())
    const eDate = raw?.end_date ? new Date(raw.end_date) : event.end
    const rawStartDay = raw?.start_date ? raw.start_date.slice(0, 10) : toLocalDateStr(sDate)
    const rawEndDay = raw?.end_date ? raw.end_date.slice(0, 10) : (eDate ? toLocalDateStr(eDate) : '')
    const isMultiDay = !!(rawStartDay && rawEndDay && rawStartDay !== rawEndDay)

    let dateFormatted = sDate ? sDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'
    let timeText = isTbd ? 'Jam belum ditentukan' : `${startTime} – ${endTime} WIB`

    if (isMultiDay && eDate) {
      const [sy, sm, sd] = rawStartDay.split('-').map(Number)
      const [ey, em, ed] = rawEndDay.split('-').map(Number)
      const d1 = new Date(sy, sm - 1, sd)
      const d2 = new Date(ey, em - 1, ed)
      const diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1
      const sFmt = d1.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
      const eFmt = d2.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      dateFormatted = `${sFmt} – ${eFmt} (${diffDays} hari)`
      if (isTbd) {
        timeText = 'Jam belum ditentukan'
      } else {
        timeText = `Mulai ${startTime} WIB – Selesai ${endTime} WIB`
      }
    }

    const desc = raw?.description || event.extendedProps?.description || ''
    const color = raw?.color || DEFAULT_COLOR

    // Resolusi nama divisi
    const divisiInfo = findDivisiByColor(divisiRef.current, color)
    const divisiLabel = divisiInfo?.label

    const exportData = {
      id: raw?.id || event.id,
      title: event.title,
      start: sDate,
      end: eDate,
      isTbd,
      description: desc,
      location: raw?.location || undefined,
      divisiName: divisiLabel,
    }

    const gcalUrl = generateGoogleCalendarUrl(exportData)
    const waBroadcastText = generateWhatsAppBroadcast(exportData)

    Swal.fire({
      html: `
        <div class="text-left">
          <div style="background:${color}" class="-mx-6 -mt-5 px-6 py-4 mb-4 rounded-t-xl shadow-sm">
            <h3 class="text-xl font-bold text-white leading-tight">${escapeHtml(event.title)}</h3>
          </div>
          <div class="space-y-3 px-1">
            <div class="flex items-center gap-3 text-sm">
              <span class="text-blue-500 w-5 flex-shrink-0 flex justify-center">${icon('calendar')}</span>
              <span class="text-gray-700 font-medium">${dateFormatted}</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <span class="text-blue-500 w-5 flex-shrink-0 flex justify-center">${icon('clock')}</span>
              <span class="text-gray-700">${timeText}</span>
            </div>
            ${raw?.location ? `
              <div class="flex items-center gap-3 text-sm">
                <span class="text-blue-500 w-5 flex-shrink-0 flex justify-center">${icon('pin')}</span>
                <span class="text-gray-700 font-medium">${escapeHtml(raw.location)}</span>
              </div>
            ` : ''}
            ${divisiLabel ? `
              <div class="flex items-center gap-3 text-sm">
                <span class="w-5 flex-shrink-0 flex justify-center">
                  <span class="w-3 h-3 rounded-full ring-2 ring-white shadow-xs" style="background:${color}"></span>
                </span>
                <span class="text-gray-700 font-medium">Divisi ${escapeHtml(divisiLabel)}</span>
              </div>
            ` : ''}
            ${desc ? `
              <div class="flex items-start gap-3 text-sm">
                <span class="text-blue-500 w-5 flex-shrink-0 flex justify-center mt-0.5">${icon('note')}</span>
                <span class="text-gray-600 whitespace-pre-wrap leading-relaxed">${escapeHtml(desc)}</span>
              </div>
            ` : ''}
          </div>

          <!-- Bagikan & Ekspor Kalender -->
          <div class="mt-5 pt-3.5 border-t border-gray-100">
            <div class="flex items-center justify-between mb-2 px-0.5">
              <span class="text-[11px] font-bold uppercase tracking-wider text-gray-400">Simpan & Bagikan</span>
              <span class="text-[10px] text-gray-400">Google Cal • .ics • WA</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer"
                class="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-blue-50/70 hover:bg-blue-100 text-blue-700 transition-colors border border-blue-100/90 text-center group cursor-pointer"
                title="Tambahkan ke Google Calendar">
                <span class="w-5 h-5 flex items-center justify-center mb-1 text-blue-600 group-hover:scale-110 transition-transform">${icon('calendar')}</span>
                <span class="text-[11px] font-bold leading-tight">Google Cal</span>
              </a>
              <button type="button" id="btn-download-ics"
                class="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200/80 text-center group cursor-pointer"
                title="Unduh file kalender .ics (Apple / Outlook / Android)">
                <span class="w-5 h-5 flex items-center justify-center mb-1 text-slate-600 group-hover:scale-110 transition-transform">${icon('download')}</span>
                <span class="text-[11px] font-bold leading-tight">File .ics</span>
              </button>
              <button type="button" id="btn-copy-wa"
                class="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 transition-colors border border-emerald-200/80 text-center group cursor-pointer"
                title="Salin teks broadcast format WhatsApp">
                <span class="w-5 h-5 flex items-center justify-center mb-1 text-emerald-600 group-hover:scale-110 transition-transform">${icon('whatsapp')}</span>
                <span class="text-[11px] font-bold leading-tight" id="lbl-copy-wa">Salin WA</span>
              </button>
            </div>
          </div>

          ${canEditRef.current(raw?.created_by ?? null) ? `
          <div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button id="btn-edit-event" class="btn btn-primary btn-sm flex-1">
              ${icon('pencil')} Edit
            </button>
            <button id="btn-delete-event" class="btn btn-danger btn-sm flex-1">
              ${icon('trash')} Hapus
            </button>
          </div>
          ` : ''}
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      width: '480px',
      didOpen: () => {
        // Download .ics handler
        document.getElementById('btn-download-ics')?.addEventListener('click', () => {
          downloadIcsFile(exportData)
        })

        // Copy WhatsApp Broadcast handler
        document.getElementById('btn-copy-wa')?.addEventListener('click', async () => {
          const success = await copyToClipboard(waBroadcastText)
          const lbl = document.getElementById('lbl-copy-wa')
          if (lbl) {
            lbl.textContent = success ? '✓ Tersalin!' : 'Gagal'
            setTimeout(() => {
              if (lbl) lbl.textContent = 'Salin WA'
            }, 2500)
          }
          if (success) {
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 2500,
              timerProgressBar: true,
            })
            Toast.fire({
              icon: 'success',
              title: 'Format pesan WhatsApp berhasil disalin!',
            })
          }
        })

        document.getElementById('btn-edit-event')?.addEventListener('click', () => {
          Swal.close()
          const groupId = raw?.group_id
          const groupSize = getGroupSize(groupId)
          if (groupId && groupSize > 1) {
            setTimeout(async () => {
              const choice = await confirmGroupAction({ groupSize, action: 'Ubah' })
              if (choice === 'all') showEditEventModal(event, true)
              else if (choice === 'one') showEditEventModal(event, false)
            }, 300)
          } else {
            setTimeout(() => showEditEventModal(event, false), 300)
          }
        })
        document.getElementById('btn-delete-event')?.addEventListener('click', () => {
          Swal.close()
          const groupId = raw?.group_id
          const groupSize = getGroupSize(groupId)
          if (groupId && groupSize > 1) {
            setTimeout(async () => {
              const choice = await confirmGroupAction({ groupSize, action: 'Hapus' })
              if (choice === 'all') handleDeleteEvent(event, true)
              else if (choice === 'one') handleDeleteEvent(event, false)
            }, 300)
          } else {
            setTimeout(() => handleDeleteEvent(event, false), 300)
          }
        })
      },
    })
  }

  // ==============================
  // MODAL: EDIT KEGIATAN
  // ==============================

  function showEditEventModal(event: any, applyToGroup = false) {
    const raw: Event = event.extendedProps?.raw
    const isTbd = raw?.is_tbd || false

    const sDateObj = event.start || (raw?.start_date ? new Date(raw.start_date) : null)
    const eDateObj = event.end || (raw?.end_date ? new Date(raw.end_date) : null)

    const rawStartDay = raw?.start_date ? raw.start_date.slice(0, 10) : (sDateObj ? toLocalDateStr(sDateObj) : '')
    const rawEndDay = raw?.end_date ? raw.end_date.slice(0, 10) : ''
    const isMultiDayInitial = !!(rawStartDay && rawEndDay && rawStartDay !== rawEndDay)

    const startT = isTbd ? '' : (sDateObj ? pad(sDateObj.getHours()) + ':' + pad(sDateObj.getMinutes()) : '08:00')
    const endT = isTbd ? '' : (eDateObj ? pad(eDateObj.getHours()) + ':' + pad(eDateObj.getMinutes()) : '10:00')
    const desc = raw?.description || ''

    const currentLoc = raw?.location || ''
    const isOnline = currentLoc.toLowerCase().startsWith('online')
    const isOffline = !!currentLoc && !isOnline
    const initialType = isOnline ? 'online' : (isOffline ? 'offline' : '')
    const initialVenue = isOffline ? (currentLoc === 'Offline' ? '' : currentLoc) : ''

    Swal.fire({
      title: 'Edit Kegiatan' + (applyToGroup ? ' <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Semua dalam grup</span>' : ''),
      html: `
        <div class="text-left space-y-3">
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-sm font-medium text-gray-700">Tanggal</label>
              <label class="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold cursor-pointer select-none">
                <input type="checkbox" id="edit-is-multiday" class="w-3.5 h-3.5 accent-blue-600 rounded" ${isMultiDayInitial ? 'checked' : ''}>
                <span>Rentang multi-hari</span>
              </label>
            </div>
            <div id="edit-single-date-box" class="${isMultiDayInitial ? 'hidden' : ''}">
              <input type="date" id="edit-date" class="ds-input" value="${rawStartDay}">
            </div>
            <div id="edit-multiday-box" class="${isMultiDayInitial ? '' : 'hidden'} space-y-2">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-medium text-gray-500 mb-1">Tanggal Mulai</label>
                  <input type="date" id="edit-start-date" class="ds-input" value="${rawStartDay}">
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-gray-500 mb-1">Tanggal Selesai</label>
                  <input type="date" id="edit-end-date" class="ds-input" value="${rawEndDay || rawStartDay}">
                </div>
              </div>
              <p id="edit-multiday-duration" class="text-xs font-semibold text-blue-700 bg-blue-50 py-1.5 px-3 rounded-lg border border-blue-100 flex items-center gap-1.5">
                ${icon('calendar', 'w-3.5 h-3.5 text-blue-600')} <span id="edit-duration-text">Durasi: 1 hari</span>
              </p>
            </div>
          </div>
          <div id="edit-time-fields" style="${isTbd ? 'display:none' : ''}" class="grid grid-cols-2 gap-3">
            <div>
              <label id="lbl-edit-start" class="block text-sm font-medium text-gray-700 mb-1">${isMultiDayInitial ? 'Jam Mulai (Hari 1)' : 'Jam Mulai'}</label>
              <input type="time" id="edit-start" class="ds-input" value="${startT}">
            </div>
            <div>
              <label id="lbl-edit-end" class="block text-sm font-medium text-gray-700 mb-1">${isMultiDayInitial ? 'Jam Selesai (Hari Terakhir)' : 'Jam Selesai'}</label>
              <input type="time" id="edit-end" class="ds-input" value="${endT}">
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="edit-tbd" class="w-4 h-4 accent-blue-600" ${isTbd ? 'checked' : ''}>
            <label for="edit-tbd" class="text-sm font-medium text-gray-700">Jam TBD</label>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Judul Kegiatan <span class="text-red-500">*</span></label>
            <input type="text" id="edit-title" class="ds-input" value="${escapeHtml(event.title)}">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Lokasi <span class="text-gray-400 font-normal">(opsional)</span></label>
            <div class="space-y-2">
              <select id="edit-loc-type" class="ds-input">
                <option value="" ${!initialType ? 'selected' : ''}>-- Pilih Tipe Lokasi (Opsional) --</option>
                <option value="online" ${initialType === 'online' ? 'selected' : ''}>Online</option>
                <option value="offline" ${initialType === 'offline' ? 'selected' : ''}>Offline</option>
              </select>
              <div id="edit-loc-offline-box" class="${initialType === 'offline' ? '' : 'hidden'}">
                <input type="text" id="edit-loc-venue" class="ds-input" value="${escapeHtml(initialVenue)}" placeholder="Nama tempat / ruangan (cth: Aula Kampus, Sekretariat IMPP)">
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea id="edit-desc" rows="2" class="ds-input">${escapeHtml(desc)}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Pengingat</label>
            <select id="edit-reminder" class="ds-input">${reminderSelectHtml(raw?.reminder_offset_minutes)}</select>
          </div>
        </div>
      `,
      width: '520px',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Simpan Perubahan',
      cancelButtonText: 'Batal',
      didOpen: () => {
        const tbd = document.getElementById('edit-tbd') as HTMLInputElement
        const timeFields = document.getElementById('edit-time-fields')!
        tbd.addEventListener('change', () => {
          timeFields.style.display = tbd.checked ? 'none' : ''
        })

        const editLocType = document.getElementById('edit-loc-type') as HTMLSelectElement
        const editOfflineBox = document.getElementById('edit-loc-offline-box')!
        editLocType?.addEventListener('change', () => {
          editOfflineBox.classList.toggle('hidden', editLocType.value !== 'offline')
          if (editLocType.value === 'offline') {
            document.getElementById('edit-loc-venue')?.focus()
          }
        })

        // Multi-day toggle & duration in edit
        const editIsMulti = document.getElementById('edit-is-multiday') as HTMLInputElement
        const editSingleBox = document.getElementById('edit-single-date-box')!
        const editMultiBox = document.getElementById('edit-multiday-box')!
        const lblEditStart = document.getElementById('lbl-edit-start')!
        const lblEditEnd = document.getElementById('lbl-edit-end')!

        function updateEditDuration() {
          const sDate = (document.getElementById('edit-start-date') as HTMLInputElement).value
          const eDate = (document.getElementById('edit-end-date') as HTMLInputElement).value
          const durEl = document.getElementById('edit-duration-text')
          if (!sDate || !eDate || !durEl) return
          const [sy, sm, sd] = sDate.split('-').map(Number)
          const [ey, em, ed] = eDate.split('-').map(Number)
          const sObj = new Date(sy, sm - 1, sd)
          const eObj = new Date(ey, em - 1, ed)
          const diffDays = Math.round((eObj.getTime() - sObj.getTime()) / 86400000) + 1
          if (diffDays <= 0) {
            durEl.textContent = 'Tanggal selesai harus setelah tanggal mulai!'
            durEl.className = 'text-red-600 font-semibold'
          } else {
            durEl.textContent = `Durasi: ${diffDays} hari (${sObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${eObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`
            durEl.className = 'text-blue-700 font-semibold'
          }
        }

        if (isMultiDayInitial) updateEditDuration()

        editIsMulti.addEventListener('change', () => {
          const checked = editIsMulti.checked
          editSingleBox.classList.toggle('hidden', checked)
          editMultiBox.classList.toggle('hidden', !checked)
          if (checked) {
            lblEditStart.textContent = 'Jam Mulai (Hari 1)'
            lblEditEnd.textContent = 'Jam Selesai (Hari Terakhir)'
            const sInp = document.getElementById('edit-start-date') as HTMLInputElement
            const dInp = document.getElementById('edit-date') as HTMLInputElement
            if (sInp && dInp && !sInp.value) sInp.value = dInp.value
            updateEditDuration()
          } else {
            lblEditStart.textContent = 'Jam Mulai'
            lblEditEnd.textContent = 'Jam Selesai'
          }
        })

        document.getElementById('edit-start-date')?.addEventListener('input', updateEditDuration)
        document.getElementById('edit-end-date')?.addEventListener('input', updateEditDuration)
      },
      preConfirm: () => {
        const title = (document.getElementById('edit-title') as HTMLInputElement).value.trim()
        const editIsMulti = (document.getElementById('edit-is-multiday') as HTMLInputElement).checked
        let date = (document.getElementById('edit-date') as HTMLInputElement).value
        let multiEndDate: string | null = null

        if (editIsMulti) {
          date = (document.getElementById('edit-start-date') as HTMLInputElement).value
          multiEndDate = (document.getElementById('edit-end-date') as HTMLInputElement).value
          if (!date || !multiEndDate) {
            Swal.showValidationMessage('Tanggal mulai dan tanggal selesai wajib diisi!')
            return false
          }
          if (multiEndDate < date) {
            Swal.showValidationMessage('Tanggal selesai tidak boleh sebelum tanggal mulai!')
            return false
          }
        } else {
          if (!date) { Swal.showValidationMessage('Tanggal wajib diisi!'); return false }
        }

        const startTime = (document.getElementById('edit-start') as HTMLInputElement).value
        const endTime = (document.getElementById('edit-end') as HTMLInputElement).value
        if (!title) { Swal.showValidationMessage('Judul kegiatan wajib diisi!'); return false }

        const editLocType = (document.getElementById('edit-loc-type') as HTMLSelectElement).value
        let editLocation: string | null = null
        if (editLocType === 'offline') {
          const venue = (document.getElementById('edit-loc-venue') as HTMLInputElement).value.trim()
          editLocation = venue || 'Offline'
        } else if (editLocType === 'online') {
          editLocation = 'Online'
        }

        const isTbdChecked = (document.getElementById('edit-tbd') as HTMLInputElement).checked
        const reminderVal = (document.getElementById('edit-reminder') as HTMLSelectElement).value
        return {
          title, date, multiEndDate, isMultiDay: editIsMulti,
          startTime, endTime, isTbd: isTbdChecked,
          location: editLocation,
          desc: (document.getElementById('edit-desc') as HTMLTextAreaElement).value.trim(),
          reminder: reminderVal === '' ? null : parseInt(reminderVal),
        }
      },
    }).then(async (result) => {
      if (!result.isConfirmed || !result.value) return
      const { title, date, multiEndDate, isMultiDay: isMultiVal, startTime, endTime, desc, location: locVal, isTbd: isTbdVal, reminder } = result.value

      let startDateVal: string
      let endDateVal: string | null = null

      if (isMultiVal && multiEndDate) {
        startDateVal = isTbdVal ? `${date}T00:00:00` : `${date}T${startTime || '00:00'}:00`
        endDateVal = isTbdVal ? `${multiEndDate}T23:59:59` : `${multiEndDate}T${endTime || '23:59'}:00`
      } else {
        startDateVal = isTbdVal ? `${date}T00:00:00` : `${date}T${startTime || '00:00'}:00`
        endDateVal = isTbdVal ? null : (endTime ? `${date}T${endTime}:00` : null)
      }

      const payload = {
        title,
        description: desc || null,
        location: locVal,
        start_date: startDateVal,
        end_date: endDateVal,
        is_tbd: isTbdVal,
        reminder_offset_minutes: reminder,
      }
      Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })
      const res = applyToGroup
        ? await updateEventGroupRef.current(raw.group_id!, payload)
        : await updateEventRef.current(event.id, payload)
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Kegiatan berhasil diperbarui.', confirmButtonColor: '#2563eb', timer: 2000, showConfirmButton: false })
        refetchAndUpdateStats()
      } else {
        Swal.fire('Gagal!', res.message, 'error')
      }
    })
  }

  // ==============================
  // GROUP HELPERS
  // ==============================

  function getGroupSize(groupId?: string | null) {
    if (!groupId) return 0
    const cal = calendarInstanceRef.current
    if (!cal) return 0
    return cal.getEvents().filter((e: any) => e.extendedProps?.raw?.group_id === groupId).length
  }

  function confirmGroupAction({ groupSize, action }: { groupSize: number; action: string }): Promise<'all' | 'one' | 'abort'> {
    return Swal.fire({
      title: `${action} Kegiatan Rutinan?`,
      text: `Kegiatan ini bagian dari ${groupSize} kegiatan.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `${action} semua`,
      cancelButtonText: `${action} hanya ini`,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
    }).then(result => {
      if (result.isConfirmed) return 'all'
      if (result.dismiss === Swal.DismissReason.cancel) return 'one'
      return 'abort'
    })
  }

  // ==============================
  // DELETE HANDLER
  // ==============================

  function handleDeleteEvent(event: any, applyToGroup = false) {
    const raw: Event = event.extendedProps?.raw
    Swal.fire({
      title: applyToGroup ? 'Hapus Semua Kegiatan Grup?' : 'Hapus Kegiatan?',
      html: `
        <div class="text-left">
          <div class="bg-red-50 border border-red-100 p-3 rounded-lg">
            <p class="text-sm font-semibold text-red-800">${escapeHtml(event.title)}</p>
            <p class="text-xs text-red-500 mt-1">${event.start?.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) || ''}</p>
          </div>
          <p class="text-sm text-gray-500 mt-3">Kegiatan yang dihapus tidak bisa dikembalikan.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `${icon('trash')} Ya, Hapus!`,
      cancelButtonText: 'Batal',
    }).then(async (result) => {
      if (!result.isConfirmed) return
      Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })
      const res = applyToGroup
        ? await deleteEventGroupRef.current(raw.group_id!)
        : await deleteEventRef.current(event.id)
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Kegiatan berhasil dihapus.', confirmButtonColor: '#2563eb', timer: 2000, showConfirmButton: false })
        refetchAndUpdateStats()
      } else {
        Swal.fire('Gagal!', res.message, 'error')
      }
    })
  }

  // ==============================
  // RESCHEDULE (DRAG & DROP)
  // ==============================

  function showRescheduleForm({
    event,
    newStartDateStr,
    newEndDateStr,
    isMultiDay,
    diffDays,
    startT,
    endT,
    onCancel,
  }: {
    event: any
    newStartDateStr: string
    newEndDateStr: string
    isMultiDay: boolean
    diffDays: number
    startT: string
    endT: string
    onCancel: () => void
  }) {
    const raw: Event = event.extendedProps?.raw
    const isTbd = raw?.is_tbd || event.allDay

    Swal.fire({
      title: isMultiDay
        ? 'Pindah Jadwal <span class="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold">Multi-hari</span>'
        : 'Pindah Jadwal',
      html: `
        <div class="text-left space-y-3">
          <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <p class="text-sm font-bold text-gray-800">${escapeHtml(event.title)}</p>
            ${isMultiDay ? `
              <p class="text-xs text-blue-600 font-medium mt-0.5">Kegiatan rentang ${diffDays} hari</p>
            ` : ''}
          </div>

          ${isMultiDay ? `
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai Baru</label>
                <input type="date" id="swal-start-date" class="ds-input" value="${newStartDateStr}">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai Baru</label>
                <input type="date" id="swal-end-date" class="ds-input" value="${newEndDateStr}">
              </div>
            </div>
            <p id="swal-duration-text" class="text-xs font-semibold text-blue-700 bg-blue-50 py-1.5 px-3 rounded-lg border border-blue-100 flex items-center gap-1.5">
              ${icon('calendar', 'w-3.5 h-3.5 text-blue-600')} <span id="swal-dur-val">Durasi: ${diffDays} hari</span>
            </p>
          ` : `
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Baru</label>
              <input type="date" id="swal-date" class="ds-input" value="${newStartDateStr}">
            </div>
          `}

          <div id="swal-time-fields" style="${isTbd ? 'display:none' : ''}" class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">${isMultiDay ? 'Jam Mulai (Hari 1)' : 'Jam Mulai'}</label>
              <input type="time" id="swal-start" class="ds-input" value="${startT}">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">${isMultiDay ? 'Jam Selesai (Hari Terakhir)' : 'Jam Selesai'}</label>
              <input type="time" id="swal-end" class="ds-input" value="${endT}">
            </div>
          </div>

          <div class="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 flex items-start gap-2">
            <span class="flex-shrink-0 mt-0.5">${icon('info', 'w-3.5 h-3.5')}</span>
            <span>Perubahan jadwal akan langsung disimpan.</span>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Simpan Perubahan',
      cancelButtonText: 'Batal',
      didOpen: () => {
        if (!isMultiDay) return
        const sInp = document.getElementById('swal-start-date') as HTMLInputElement
        const eInp = document.getElementById('swal-end-date') as HTMLInputElement
        const durVal = document.getElementById('swal-dur-val')
        let lockedDiff = diffDays

        function updateDur() {
          if (!sInp || !eInp || !durVal) return
          const s = sInp.value
          const e = eInp.value
          if (!s || !e) return
          const [sy, sm, sd] = s.split('-').map(Number)
          const [ey, em, ed] = e.split('-').map(Number)
          const d1 = new Date(sy, sm - 1, sd)
          const d2 = new Date(ey, em - 1, ed)
          const days = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1
          if (days <= 0) {
            durVal.textContent = 'Tanggal selesai harus setelah tanggal mulai!'
            durVal.className = 'text-red-600 font-semibold'
          } else {
            durVal.textContent = `Durasi: ${days} hari (${d1.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${d2.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`
            durVal.className = 'text-blue-700 font-semibold'
            lockedDiff = days
          }
        }

        sInp?.addEventListener('change', () => {
          if (sInp.value && lockedDiff > 1) {
            const [sy, sm, sd] = sInp.value.split('-').map(Number)
            const autoEnd = new Date(sy, sm - 1, sd + lockedDiff - 1)
            eInp.value = toLocalDateStr(autoEnd)
          }
          updateDur()
        })

        eInp?.addEventListener('input', updateDur)
        updateDur()
      },
      preConfirm: () => {
        let startDate = ''
        let endDate: string | null = null

        if (isMultiDay) {
          const s = (document.getElementById('swal-start-date') as HTMLInputElement).value
          const e = (document.getElementById('swal-end-date') as HTMLInputElement).value
          if (!s || !e) {
            Swal.showValidationMessage('Tanggal mulai dan selesai wajib diisi!')
            return false
          }
          if (e < s) {
            Swal.showValidationMessage('Tanggal selesai tidak boleh sebelum tanggal mulai!')
            return false
          }
          startDate = s
          endDate = e
        } else {
          const d = (document.getElementById('swal-date') as HTMLInputElement).value
          if (!d) {
            Swal.showValidationMessage('Tanggal wajib diisi!')
            return false
          }
          startDate = d
          endDate = d
        }

        const newStartTime = (document.getElementById('swal-start') as HTMLInputElement)?.value || ''
        const newEndTime = (document.getElementById('swal-end') as HTMLInputElement)?.value || ''

        return {
          startDate,
          endDate,
          newStartTime,
          newEndTime,
        }
      },
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        const { startDate, endDate, newStartTime, newEndTime } = result.value
        Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })

        let startPayload: string
        let endPayload: string | null = null

        if (isMultiDay && endDate) {
          startPayload = isTbd ? `${startDate}T00:00:00` : `${startDate}T${newStartTime || '00:00'}:00`
          endPayload = isTbd ? `${endDate}T23:59:59` : `${endDate}T${newEndTime || '23:59'}:00`
        } else {
          startPayload = isTbd ? `${startDate}T00:00:00` : `${startDate}T${newStartTime || '00:00'}:00`
          endPayload = isTbd ? null : (newEndTime ? `${startDate}T${newEndTime}:00` : null)
        }

        const res = await updateEventRef.current(event.id, {
          start_date: startPayload,
          end_date: endPayload,
        })
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Jadwal berhasil dipindahkan.', confirmButtonColor: '#2563eb', timer: 2000, showConfirmButton: false })
          refetchAndUpdateStats()
        } else {
          Swal.fire('Gagal!', res.message, 'error')
          onCancel()
        }
      } else {
        onCancel()
      }
    })
  }

  // ==============================
  // INITIALIZE FULLCALENDAR (CDN)
  // ==============================

  useEffect(() => {
    if (!calendarElRef.current || calendarInstanceRef.current) return

    function initCalendar() {
      if (!calendarElRef.current || calendarInstanceRef.current || !window.FullCalendar) return

      const calendar = new window.FullCalendar.Calendar(calendarElRef.current, {
        initialView: 'dayGridMonth',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        },
        locale: 'id',
        height: 'auto',
        editable: true,
        eventStartEditable: true,
        eventDurationEditable: true,
        dayMaxEvents: 2,
        eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: false },
        moreLinkText: (n: number) => `+${n} more`,
        moreLinkDidMount: (arg: any) => {
          arg.el.setAttribute('data-n', arg.num)
        },

        // Events source — async callback, FC manages its own store
        events: async (info: any, successCallback: any, failureCallback: any) => {
          try {
            const data = await fetchEventsRef.current(info.startStr, info.endStr)
            const mapped = data.map((e: Event) => {
              const sDay = e.start_date.slice(0, 10)
              const eDay = e.end_date ? e.end_date.slice(0, 10) : ''
              const isMulti = !!(eDay && sDay !== eDay)

              let startProp: string = e.start_date
              let endProp: string | undefined = e.end_date || undefined
              let isAllDay: boolean = e.is_tbd

              if (isMulti && eDay) {
                // Multi-day events in FullCalendar:
                // 1) Use date-only start (sDay) so timezone offset (e.g. UTC+7) never jumps the event by 1 day
                startProp = sDay
                // 2) FullCalendar allDay treats end date as exclusive. Advance by +1 day so the final day is fully covered
                const [ey, em, ed] = eDay.split('-').map(Number)
                const nextD = new Date(ey, em - 1, ed + 1)
                endProp = toLocalDateStr(nextD)
                // 3) Treat as allDay in calendar view so FullCalendar draws an unbroken, continuous spanning bar across days
                isAllDay = true
              } else if (e.is_tbd) {
                isAllDay = true
                startProp = sDay
                endProp = undefined
              }

              return {
                id: e.id,
                title: e.title,
                start: startProp,
                end: endProp,
                allDay: isAllDay,
                display: 'block',
                backgroundColor: e.color || DEFAULT_COLOR,
                borderColor: e.color || DEFAULT_COLOR,
                textColor: '#FFFFFF',
                startEditable: canEditRef.current(e.created_by),
                durationEditable: canEditRef.current(e.created_by),
                extendedProps: { raw: e, isMultiDay: isMulti },
              }
            })
            const active = divisiFilterRef.current
            const visible = active
              ? mapped.filter((ev: { backgroundColor: string }) => {
                  const d = divisiRef.current.find(
                    (x) => x.color.toLowerCase() === ev.backgroundColor.toLowerCase()
                  )
                  return !!d && active.includes(d.key)
                })
              : mapped
            successCallback(visible)
            setTimeout(() => updateStatsRef.current(), 0)
          } catch (err) {
            failureCallback(err)
          }
        },

        // Date click → daily overview
        dateClick: (info: any) => {
          const dateStr = info.dateStr
          const allEvents = calendar.getEvents()
          const dayEvents = allEvents.filter((e: any) => {
            const raw: Event | undefined = e.extendedProps?.raw
            const startDay = raw?.start_date ? raw.start_date.slice(0, 10) : (e.startStr ? e.startStr.split('T')[0] : '')
            const endDay = raw?.end_date ? raw.end_date.slice(0, 10) : ''
            if (startDay === dateStr) return true
            if (endDay && startDay && startDay <= dateStr && dateStr <= endDay) return true
            return false
          })
          dayEvents.sort((a: any, b: any) => a.start - b.start)

          let eventListHtml = ''
          if (dayEvents.length > 0) {
            eventListHtml = '<div class="space-y-2 max-h-[40vh] overflow-y-auto pr-1 mb-4">'
            dayEvents.forEach((e: any) => {
              const raw: Event = e.extendedProps?.raw
              const startDay = raw?.start_date ? raw.start_date.slice(0, 10) : ''
              const endDay = raw?.end_date ? raw.end_date.slice(0, 10) : ''
              const isMulti = !!(startDay && endDay && startDay !== endDay)
              const isTbd = raw?.is_tbd || e.allDay
              const desc = raw?.description || ''
              const color = raw?.color || DEFAULT_COLOR
              const startT = e.start ? pad(e.start.getHours()) + ':' + pad(e.start.getMinutes()) : ''
              const endT = e.end ? pad(e.end.getHours()) + ':' + pad(e.end.getMinutes()) : ''

              let timeRail: string
              if (isMulti) {
                timeRail = `<span class="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Multi</span>`
              } else if (isTbd) {
                timeRail = `<span class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">TBD</span>`
              } else {
                timeRail = `<span class="block text-xs font-bold tabular-nums" style="color:${color}">${startT}</span>
                   ${endT ? `<span class="block text-[10px] text-gray-400 tabular-nums mt-0.5">${endT}</span>` : ''}`
              }
              eventListHtml += `
                <div role="button" tabindex="0" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition cursor-pointer event-day-item text-left w-full" data-event-id="${escapeHtml(e.id)}">
                  <div class="text-right flex-shrink-0 w-12">${timeRail}</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-gray-900 truncate">${escapeHtml(e.title)}</p>
                    ${desc ? `<p class="text-xs text-gray-500 truncate mt-0.5">${escapeHtml(desc)}</p>` : ''}
                  </div>
                </div>
              `
            })
            eventListHtml += '</div>'
          } else {
            eventListHtml = `
              <div class="text-center py-8 text-gray-400">
                <div class="flex justify-center mb-2 text-gray-300">${icon('calendar', 'w-9 h-9')}</div>
                <p class="text-sm">Tidak ada kegiatan pada tanggal ini.</p>
              </div>
            `
          }

          const dateObj = new Date(dateStr + 'T00:00:00')
          const formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

          Swal.fire({
            title: `<div class="text-lg font-bold">${formattedDate}</div>`,
            html: `
              <div class="text-left">
                ${eventListHtml}
                ${profileRef.current ? `
                <button id="btn-add-event-daily" class="btn btn-primary w-full">
                  ${icon('plus')} Tambah Kegiatan
                </button>
                ` : ''}
              </div>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            width: '500px',
            didOpen: () => {
              document.getElementById('btn-add-event-daily')?.addEventListener('click', () => {
                Swal.close()
                setTimeout(() => showAddEventModal(dateStr), 300)
              })
              document.querySelectorAll('.event-day-item').forEach(el => {
                const open = () => {
                  const eventId = (el as HTMLElement).dataset.eventId
                  const ev = calendar.getEventById(eventId)
                  if (ev) { Swal.close(); setTimeout(() => showEventDetail(ev), 300) }
                }
                el.addEventListener('click', open)
                el.addEventListener('keydown', (k) => {
                  if ((k as KeyboardEvent).key === 'Enter' || (k as KeyboardEvent).key === ' ') {
                    k.preventDefault()
                    open()
                  }
                })
              })
            },
          })
        },

        // Event click → detail
        eventClick: (info: any) => {
          info.jsEvent.preventDefault()
          showEventDetail(info.event)
        },

        // Drag & Drop
        eventDrop: (info: any) => {
          const event = info.event
          const raw: Event = event.extendedProps?.raw
          const isTbd = raw?.is_tbd || event.allDay

          const rawStartDay = raw?.start_date ? raw.start_date.slice(0, 10) : ''
          const rawEndDay = raw?.end_date ? raw.end_date.slice(0, 10) : ''
          const isMultiDay = !!(rawStartDay && rawEndDay && rawStartDay !== rawEndDay)

          let diffDays = 1
          if (isMultiDay) {
            const [sy, sm, sd] = rawStartDay.split('-').map(Number)
            const [ey, em, ed] = rawEndDay.split('-').map(Number)
            const d1 = new Date(sy, sm - 1, sd)
            const d2 = new Date(ey, em - 1, ed)
            diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1
          }

          const newStartDateStr = toLocalDateStr(event.start)
          let newEndDateStr = newStartDateStr

          if (isMultiDay) {
            const [ny, nm, nd] = newStartDateStr.split('-').map(Number)
            const newEndObj = new Date(ny, nm - 1, nd + diffDays - 1)
            newEndDateStr = toLocalDateStr(newEndObj)
          }

          const startT = isTbd ? '' : (event.start ? pad(event.start.getHours()) + ':' + pad(event.start.getMinutes()) : '08:00')
          const endT = isTbd ? '' : (event.end ? pad(event.end.getHours()) + ':' + pad(event.end.getMinutes()) : '10:00')

          showRescheduleForm({
            event,
            newStartDateStr,
            newEndDateStr,
            isMultiDay,
            diffDays,
            startT,
            endT,
            onCancel: () => info.revert(),
          })
        },

        // Resize
        eventResize: async (info: any) => {
          const event = info.event
          if (!event.end) { info.revert(); return }
          const raw: Event = event.extendedProps?.raw
          const isTbd = raw?.is_tbd || event.allDay

          let endPayload: string
          if (isTbd) {
            // allDay end date in FullCalendar is exclusive (00:00:00 of following day)
            const prevDay = new Date(event.end.getFullYear(), event.end.getMonth(), event.end.getDate() - 1)
            endPayload = `${toLocalDateStr(prevDay)}T23:59:59`
          } else {
            const endDayStr = toLocalDateStr(event.end)
            const endT = pad(event.end.getHours()) + ':' + pad(event.end.getMinutes())
            endPayload = `${endDayStr}T${endT}:00`
          }

          const res = await updateEventRef.current(event.id, {
            end_date: endPayload,
          })
          if (res.success) {
            refetchAndUpdateStats()
          } else {
            info.revert()
            Swal.fire('Gagal!', 'Gagal mengubah durasi.', 'error')
          }
        },

        // Tooltip
        eventDidMount: (info: any) => {
          const raw: Event = info.event.extendedProps?.raw
          const tbd = raw?.is_tbd ? ' (Jam TBD)' : ''
          const desc = raw?.description
          info.el.title = desc ? `${info.event.title}${tbd} — ${desc}` : `${info.event.title}${tbd}`
          info.el.style.cursor = 'move'
        },
      })

      calendar.render()
      calendarInstanceRef.current = calendar
    }

    // Poll for FullCalendar CDN (handles dev mode timing)
    if (window.FullCalendar) {
      initCalendar()
    } else {
      const poll = setInterval(() => {
        if (window.FullCalendar) {
          clearInterval(poll)
          initCalendar()
        }
      }, 100)
      return () => clearInterval(poll)
    }

    return () => {
      calendarInstanceRef.current?.destroy()
      calendarInstanceRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for realtime changes
  useEffect(() => {
    const handler = () => {
      const cal = calendarInstanceRef.current
      if (cal) { cal.refetchEvents(); setTimeout(() => updateStatsRef.current(), 100) }
    }
    window.addEventListener('events-changed', handler)
    return () => window.removeEventListener('events-changed', handler)
  }, [])

  // Klik item sidebar (Hari Ini / Mendatang) → buka modal detail
  useEffect(() => {
    const handler = (ev: globalThis.Event) => {
      const raw = (ev as CustomEvent).detail as Event | undefined
      if (!raw) return
      const fcEvent = calendarInstanceRef.current?.getEventById(raw.id)
      if (fcEvent) {
        showEventDetail(fcEvent)
        return
      }
      showEventDetail({
        id: raw.id,
        title: raw.title,
        start: new Date(raw.start_date),
        end: raw.end_date ? new Date(raw.end_date) : null,
        extendedProps: { raw },
      })
    }
    window.addEventListener('open-event-detail', handler)
    return () => window.removeEventListener('open-event-detail', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="calendar-wrap">
      <div ref={calendarElRef}></div>
    </div>
  )
}
