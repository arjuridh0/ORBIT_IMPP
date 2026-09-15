/**
 * Utility untuk integrasi ekspor kalender dan generator broadcast WhatsApp
 * ORBIT IMPP
 */

export interface CalendarExportEvent {
  id?: string
  title: string
  start: Date
  end?: Date | null
  isTbd?: boolean
  description?: string
  location?: string
  divisiName?: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Format tanggal untuk Google Calendar URL parameter
 * Timed: YYYYMMDDTHHmmssZ (UTC)
 * All-day: YYYYMMDD
 */
function toGCalDate(d: Date, isAllDay: boolean): string {
  if (isAllDay) {
    const y = d.getFullYear()
    const m = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    return `${y}${m}${day}`
  }
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/**
 * Buat URL Add to Google Calendar
 */
export function generateGoogleCalendarUrl(event: CalendarExportEvent): string {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  const isAllDay = !!event.isTbd || !event.end

  const startStr = toGCalDate(event.start, isAllDay)
  let endStr: string

  if (isAllDay) {
    // Di Google Calendar, all-day event end date harus hari berikutnya (+1 day)
    const endBase = event.end ? new Date(event.end) : new Date(event.start)
    const nextDay = new Date(endBase)
    nextDay.setDate(nextDay.getDate() + 1)
    endStr = toGCalDate(nextDay, true)
  } else {
    endStr = toGCalDate(event.end || new Date(event.start.getTime() + 2 * 3600000), false)
  }

  const details = [
    event.description ? `${event.description}\n\n` : '',
    event.divisiName ? `Penyelenggara: Divisi ${event.divisiName}\n` : '',
    'Info lebih lanjut: https://orbit-impp.id',
  ].filter(Boolean).join('')

  const params = new URLSearchParams({
    text: event.title,
    dates: `${startStr}/${endStr}`,
    details,
    location: event.location || 'Sekretariat IMPP / Online',
  })

  return `${base}&${params.toString()}`
}

/**
 * Format tanggal untuk iCalendar RFC 5545 (.ics)
 */
function toIcsDate(d: Date, isAllDay: boolean): string {
  if (isAllDay) {
    const y = d.getFullYear()
    const m = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    return `${y}${m}${day}`
  }
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Generate iCalendar content string (.ics)
 */
export function generateIcsContent(event: CalendarExportEvent): string {
  const isAllDay = !!event.isTbd || !event.end
  const nowUtc = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const uid = event.id ? `orbit-${event.id}@orbit-impp.id` : `orbit-${Date.now()}@orbit-impp.id`

  const startProp = isAllDay
    ? `DTSTART;VALUE=DATE:${toIcsDate(event.start, true)}`
    : `DTSTART:${toIcsDate(event.start, false)}`

  let endProp = ''
  if (isAllDay) {
    const endBase = event.end ? new Date(event.end) : new Date(event.start)
    const nextDay = new Date(endBase)
    nextDay.setDate(nextDay.getDate() + 1)
    endProp = `DTEND;VALUE=DATE:${toIcsDate(nextDay, true)}`
  } else {
    const endDate = event.end || new Date(event.start.getTime() + 2 * 3600000)
    endProp = `DTEND:${toIcsDate(endDate, false)}`
  }

  const desc = [
    event.description ? event.description : '',
    event.divisiName ? `\nPenyelenggara: Divisi ${event.divisiName}` : '',
    '\nInfo selengkapnya: https://orbit-impp.id',
  ].filter(Boolean).join('')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ORBIT IMPP//Kalender Kegiatan//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    startProp,
    endProp,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(desc)}`,
    `LOCATION:${escapeIcs(event.location || 'Sekretariat IMPP / Online')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/**
 * Memicu pengunduhan file .ics di browser
 */
export function downloadIcsFile(event: CalendarExportEvent): void {
  const ics = generateIcsContent(event)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const slug = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 30)
    .replace(/^-|-$/g, '')

  const a = document.createElement('a')
  a.href = url
  a.download = `agenda-orbit-${slug || 'kegiatan'}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Format teks broadcast WhatsApp per-kegiatan
 */
export function generateWhatsAppBroadcast(event: CalendarExportEvent): string {
  const sDay = event.start.toDateString()
  const eDay = event.end ? event.end.toDateString() : sDay
  const isMulti = sDay !== eDay

  let dateFormatted: string
  if (isMulti && event.end) {
    const diffDays = Math.round((event.end.getTime() - event.start.getTime()) / 86400000) + 1
    const sFmt = event.start.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
    const eFmt = event.end.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    dateFormatted = `${sFmt} – ${eFmt} (${diffDays} hari)`
  } else {
    dateFormatted = event.start.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  let timeText = 'Jam belum ditentukan (TBD)'
  if (!event.isTbd && event.start) {
    const startStr = event.start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
    if (event.end) {
      const endStr = event.end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
      timeText = isMulti ? `Mulai ${startStr} WIB – Selesai ${endStr} WIB` : `${startStr} – ${endStr} WIB`
    } else {
      timeText = `${startStr} WIB – selesai`
    }
  }

  const lines = [
    '📢 *AGENDA KEGIATAN ORBIT IMPP*',
    '━━━━━━━━━━━━━━━━━━━━',
    `📌 *Kegiatan:* ${event.title}`,
    `🗓️ *Hari/Tgl:* ${dateFormatted}`,
    `⏰ *Waktu:* ${timeText}`,
    event.location ? `📍 *Lokasi:* ${event.location}` : null,
    event.divisiName ? `🏢 *Divisi:* ${event.divisiName}` : null,
    event.description ? `📝 *Deskripsi:* ${event.description}` : null,
    '━━━━━━━━━━━━━━━━━━━━',
    '🌐 *Detail & Kalender Interaktif:*',
    'https://orbit-impp.id',
  ].filter(Boolean)

  return lines.join('\n')
}

/**
 * Format teks broadcast WhatsApp rekap pekan ini (7 hari ke depan)
 */
export function generateWeeklyWhatsAppBroadcast(
  events: Array<{ title: string; start_date: string; is_tbd?: boolean; color?: string | null }>,
): string {
  const now = new Date()
  const oneWeekLater = new Date()
  oneWeekLater.setDate(oneWeekLater.getDate() + 7)

  const thisWeekEvents = events
    .filter((e) => {
      const d = new Date(e.start_date)
      return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d <= oneWeekLater
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  const rangeLabel = `${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${oneWeekLater.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`

  if (thisWeekEvents.length === 0) {
    return [
      '📢 *JADWAL KEGIATAN ORBIT IMPP PEKAN INI*',
      `📅 Periode: ${rangeLabel}`,
      '━━━━━━━━━━━━━━━━━━━━',
      '✨ Belum ada agenda kegiatan yang dijadwalkan untuk sepekan ini.',
      '━━━━━━━━━━━━━━━━━━━━',
      '🌐 Cek kalender lengkap: https://orbit-impp.id',
    ].join('\n')
  }

  // Group by date string
  const grouped: Record<string, typeof thisWeekEvents> = {}
  for (const ev of thisWeekEvents) {
    const key = new Date(ev.start_date).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(ev)
  }

  const itemsText = Object.entries(grouped)
    .map(([dateKey, evList]) => {
      const evLines = evList.map((e) => {
        const time = e.is_tbd
          ? 'Jam TBD'
          : new Date(e.start_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB'
        return `  • [${time}] *${e.title}*`
      })
      return `🔹 *${dateKey}*\n${evLines.join('\n')}`
    })
    .join('\n\n')

  return [
    '📢 *JADWAL KEGIATAN ORBIT IMPP PEKAN INI*',
    `📅 Periode: ${rangeLabel}`,
    '━━━━━━━━━━━━━━━━━━━━',
    itemsText,
    '━━━━━━━━━━━━━━━━━━━━',
    '🌐 Detail kegiatan & kalender interaktif:',
    'https://orbit-impp.id',
  ].join('\n')
}

/**
 * Salin teks ke clipboard secara aman dengan fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fallback to execCommand below
  }

  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    return false
  }
}
