'use client'

import { useRef, useEffect } from 'react'
import Swal from 'sweetalert2'
import type { Event } from '@/lib/supabase/types'
import { DEFAULT_COLOR, REMINDER_OPTIONS } from '@/lib/constants'
import { useDivisi } from '@/hooks/useDivisi'
import { iconString } from '@/components/icons'
import { useAuth } from '@/components/AuthProvider'
import type { useEvents } from '@/hooks/useEvents'

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
    Swal.fire({
      title: 'Tambah Kegiatan',
      html: `
        <div class="text-left space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal <span class="text-red-500">*</span></label>
            <input type="date" id="add-date" class="ds-input" value="${dateStr}">
          </div>
          <div id="add-time-fields" class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
              <input type="time" id="add-start" class="ds-input" value="08:00">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jam Selesai</label>
              <input type="time" id="add-end" class="ds-input" value="10:00">
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="add-tbd" class="w-4 h-4 accent-blue-600">
            <label for="add-tbd" class="text-sm font-medium text-gray-700">Jam TBD (belum ditentukan)</label>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Judul Kegiatan <span class="text-red-500">*</span></label>
            <input type="text" id="add-title" class="ds-input" placeholder="Contoh: Rapat Koordinasi, Baksos...">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi <span class="text-gray-400">(opsional)</span></label>
            <textarea id="add-desc" rows="3" class="ds-input" placeholder="Tempat, catatan, detail kegiatan..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Pengingat</label>
            <select id="add-reminder" class="ds-input">${reminderSelectHtml()}</select>
          </div>
          <div class="flex items-center gap-2 pt-1">
            <input type="checkbox" id="add-recurring" class="w-4 h-4 accent-blue-600">
            <label for="add-recurring" class="text-sm font-medium text-gray-700">Kegiatan berulang (rutinan)</label>
          </div>
          <div id="add-recurring-fields" class="hidden space-y-3 border border-dashed border-gray-300 rounded-lg p-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Pola pengulangan</label>
              <select id="add-pattern" class="ds-input">
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Sebanyak (kali)</label>
              <input type="number" id="add-count" min="2" max="52" value="4" class="ds-input">
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
        const rec = document.getElementById('add-recurring') as HTMLInputElement
        const recFields = document.getElementById('add-recurring-fields')!
        rec.addEventListener('change', () => {
          recFields.classList.toggle('hidden', !rec.checked)
        })
      },
      preConfirm: () => {
        const title = (document.getElementById('add-title') as HTMLInputElement).value.trim()
        const date = (document.getElementById('add-date') as HTMLInputElement).value
        const startTime = (document.getElementById('add-start') as HTMLInputElement).value
        const endTime = (document.getElementById('add-end') as HTMLInputElement).value
        const desc = (document.getElementById('add-desc') as HTMLTextAreaElement).value.trim()
        const isTbd = (document.getElementById('add-tbd') as HTMLInputElement).checked
        const reminderVal = (document.getElementById('add-reminder') as HTMLSelectElement).value

        if (!title) { Swal.showValidationMessage('Judul kegiatan wajib diisi!'); return false }
        if (!date) { Swal.showValidationMessage('Tanggal wajib diisi!'); return false }
        if (!isTbd && startTime && endTime && startTime >= endTime) {
          Swal.showValidationMessage('Jam selesai harus lebih dari jam mulai!'); return false
        }

        const recurring = (document.getElementById('add-recurring') as HTMLInputElement).checked
        let recurrence = null
        if (recurring) {
          const pattern = (document.getElementById('add-pattern') as HTMLSelectElement).value
          const count = parseInt((document.getElementById('add-count') as HTMLInputElement).value, 10) || 4
          recurrence = { pattern, count }
        }

        return { title, date, startTime, endTime, desc, isTbd, recurrence, reminder: reminderVal === '' ? null : parseInt(reminderVal) }
      },
    }).then(async (result) => {
      if (!result.isConfirmed || !result.value) return
      const { title, date, startTime, endTime, desc, isTbd, recurrence, reminder } = result.value

      const buildPayload = (d: string) => ({
        title,
        description: desc || null,
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
      if (recurrence) {
        const dates: string[] = []
        const baseDate = new Date(date)
        for (let i = 0; i < recurrence.count; i++) {
          const d = new Date(baseDate)
          if (recurrence.pattern === 'daily') d.setDate(d.getDate() + i)
          else d.setDate(d.getDate() + i * 7)
          dates.push(d.toISOString().slice(0, 10))
        }
        res = await addEventsRef.current(dates.map(buildPayload))
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
    const timeText = isTbd ? 'Jam belum ditentukan' : `${startTime} – ${endTime}`
    const dateFormatted = event.start?.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) || '-'
    const desc = raw?.description || event.extendedProps?.description || ''
    const color = raw?.color || DEFAULT_COLOR

    Swal.fire({
      html: `
        <div class="text-left">
          <div style="background:${color}" class="-mx-6 -mt-5 px-6 py-4 mb-4 rounded-t-xl">
            <h3 class="text-xl font-bold text-white leading-tight">${escapeHtml(event.title)}</h3>
          </div>
          <div class="space-y-3 px-1">
            <div class="flex items-center gap-3 text-sm">
              <span class="text-blue-500 w-5 flex-shrink-0 flex justify-center">${icon('calendar')}</span>
              <span class="text-gray-700">${dateFormatted}</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <span class="text-blue-500 w-5 flex-shrink-0 flex justify-center">${icon('clock')}</span>
              <span class="text-gray-700">${timeText}</span>
            </div>
            ${desc ? `
              <div class="flex items-start gap-3 text-sm">
                <span class="text-blue-500 w-5 flex-shrink-0 flex justify-center mt-0.5">${icon('note')}</span>
                <span class="text-gray-600 whitespace-pre-wrap">${escapeHtml(desc)}</span>
              </div>
            ` : ''}
          </div>
          ${canEditRef.current(raw?.created_by ?? null) ? `
          <div class="flex gap-2 mt-5">
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
    const dateStr = event.start?.toLocaleDateString('sv') || ''
    const startT = isTbd ? '' : (event.start ? pad(event.start.getHours()) + ':' + pad(event.start.getMinutes()) : '08:00')
    const endT = isTbd ? '' : (event.end ? pad(event.end.getHours()) + ':' + pad(event.end.getMinutes()) : '10:00')
    const desc = raw?.description || ''

    Swal.fire({
      title: 'Edit Kegiatan' + (applyToGroup ? ' <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Semua dalam grup</span>' : ''),
      html: `
        <div class="text-left space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input type="date" id="edit-date" class="ds-input" value="${dateStr}">
          </div>
          <div id="edit-time-fields" style="${isTbd ? 'display:none' : ''}" class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
              <input type="time" id="edit-start" class="ds-input" value="${startT}">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jam Selesai</label>
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
            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea id="edit-desc" rows="3" class="ds-input">${escapeHtml(desc)}</textarea>
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
      },
      preConfirm: () => {
        const title = (document.getElementById('edit-title') as HTMLInputElement).value.trim()
        const date = (document.getElementById('edit-date') as HTMLInputElement).value
        const startTime = (document.getElementById('edit-start') as HTMLInputElement).value
        const endTime = (document.getElementById('edit-end') as HTMLInputElement).value
        if (!title) { Swal.showValidationMessage('Judul kegiatan wajib diisi!'); return false }
        if (!date) { Swal.showValidationMessage('Tanggal wajib diisi!'); return false }
        const isTbdChecked = (document.getElementById('edit-tbd') as HTMLInputElement).checked
        const reminderVal = (document.getElementById('edit-reminder') as HTMLSelectElement).value
        return {
          title, date, startTime, endTime, isTbd: isTbdChecked,
          desc: (document.getElementById('edit-desc') as HTMLTextAreaElement).value.trim(),
          reminder: reminderVal === '' ? null : parseInt(reminderVal),
        }
      },
    }).then(async (result) => {
      if (!result.isConfirmed || !result.value) return
      const { title, date, startTime, endTime, desc, isTbd: isTbdVal, reminder } = result.value
      const payload = {
        title,
        description: desc || null,
        start_date: isTbdVal ? `${date}T00:00:00` : `${date}T${startTime || '00:00'}:00`,
        end_date: isTbdVal ? null : (endTime ? `${date}T${endTime}:00` : null),
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

  function showRescheduleForm(event: any, dateStr: string, startT: string, endT: string, onCancel: () => void) {
    Swal.fire({
      title: 'Pindah Jadwal',
      html: `
        <div class="text-left space-y-3">
          <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-sm font-semibold text-gray-800">${escapeHtml(event.title)}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Baru</label>
            <input type="date" id="swal-date" class="ds-input" value="${dateStr}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
              <input type="time" id="swal-start" class="ds-input" value="${startT}">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jam Selesai</label>
              <input type="time" id="swal-end" class="ds-input" value="${endT}">
            </div>
          </div>
          <div class="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 flex items-start gap-2">
            <span class="flex-shrink-0 mt-0.5">${icon('info', 'w-3.5 h-3.5')}</span>
            <span>Perubahan akan langsung disimpan.</span>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Simpan Perubahan',
      cancelButtonText: 'Batal',
      preConfirm: () => ({
        new_date: (document.getElementById('swal-date') as HTMLInputElement).value,
        new_start_time: (document.getElementById('swal-start') as HTMLInputElement).value,
        new_end_time: (document.getElementById('swal-end') as HTMLInputElement).value,
      }),
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { new_date, new_start_time, new_end_time } = result.value!
        Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })
        const res = await updateEventRef.current(event.id, {
          start_date: `${new_date}T${new_start_time}:00`,
          end_date: `${new_date}T${new_end_time}:00`,
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
            const mapped = data.map((e: Event) => ({
              id: e.id,
              title: e.title,
              start: e.start_date,
              end: e.end_date || undefined,
              allDay: e.is_tbd,
              display: 'block',
              backgroundColor: e.color || DEFAULT_COLOR,
              borderColor: e.color || DEFAULT_COLOR,
              textColor: '#FFFFFF',
              startEditable: canEditRef.current(e.created_by),
              durationEditable: canEditRef.current(e.created_by),
              extendedProps: { raw: e },
            }))
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
            const eDate = e.startStr ? e.startStr.split('T')[0] : ''
            return eDate === dateStr
          })
          dayEvents.sort((a: any, b: any) => a.start - b.start)

          let eventListHtml = ''
          if (dayEvents.length > 0) {
            eventListHtml = '<div class="space-y-2 max-h-[40vh] overflow-y-auto pr-1 mb-4">'
            dayEvents.forEach((e: any) => {
              const raw: Event = e.extendedProps?.raw
              const isTbd = raw?.is_tbd || e.allDay
              const desc = raw?.description || ''
              const color = raw?.color || DEFAULT_COLOR
              const startT = e.start ? pad(e.start.getHours()) + ':' + pad(e.start.getMinutes()) : ''
              const endT = e.end ? pad(e.end.getHours()) + ':' + pad(e.end.getMinutes()) : ''
              const timeRail = isTbd
                ? `<span class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">TBD</span>`
                : `<span class="block text-xs font-bold tabular-nums" style="color:${color}">${startT}</span>
                   ${endT ? `<span class="block text-[10px] text-gray-400 tabular-nums mt-0.5">${endT}</span>` : ''}`
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
          const newDateStr = event.start.toLocaleDateString('sv')
          const oldStart = info.oldEvent.start
          const oldEnd = info.oldEvent.end
          const startT = oldStart ? pad(oldStart.getHours()) + ':' + pad(oldStart.getMinutes()) : '08:00'
          const endT = oldEnd ? pad(oldEnd.getHours()) + ':' + pad(oldEnd.getMinutes()) : '10:00'
          showRescheduleForm(event, newDateStr, startT, endT, () => info.revert())
        },

        // Resize
        eventResize: async (info: any) => {
          const event = info.event
          if (!event.end) { info.revert(); return }
          const dateStr = event.start.toLocaleDateString('sv')
          const endT = pad(event.end.getHours()) + ':' + pad(event.end.getMinutes())
          const res = await updateEventRef.current(event.id, {
            end_date: `${dateStr}T${endT}:00`,
          })
          if (res.success) {
            setTimeout(() => updateStatsRef.current(), 0)
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
