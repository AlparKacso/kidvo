// "Add to calendar" link/file builders. Ported from the Design prototype
// (data.js → googleCalendarUrl). No dependency — the .ics is plain text.

export interface CalendarEvent {
  title:        string
  start:        Date
  end:          Date
  venue?:       string | null
  description?: string | null
  organizer?:   string | null
  locale:       'ro' | 'en'
}

// YYYYMMDDTHHMMSSZ (UTC) per the iCalendar / Google Calendar format.
function fmtUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function detailsBlock(e: CalendarEvent): string {
  const by = e.locale === 'ro' ? 'Organizat de' : 'Organized by'
  const parts = [e.description?.trim() || e.title]
  if (e.organizer) parts.push(`${by} ${e.organizer}`)
  parts.push('kidvo.eu')
  return parts.join('\n\n')
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text:   e.title,
    dates:  `${fmtUtc(e.start)}/${fmtUtc(e.end)}`,
    details: detailsBlock(e),
    location: e.venue ? `${e.venue}, Timișoara` : 'Timișoara',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Escape per RFC 5545 (commas, semicolons, newlines, backslashes).
function ics(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

export function buildIcs(e: CalendarEvent): string {
  const uid = `${fmtUtc(e.start)}-${Math.random().toString(36).slice(2)}@kidvo.eu`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//kidvo//events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmtUtc(new Date())}`,
    `DTSTART:${fmtUtc(e.start)}`,
    `DTEND:${fmtUtc(e.end)}`,
    `SUMMARY:${ics(e.title)}`,
    `DESCRIPTION:${ics(detailsBlock(e))}`,
    e.venue ? `LOCATION:${ics(`${e.venue}, Timișoara`)}` : 'LOCATION:Timișoara',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

// Client-only: trigger an .ics download (Apple Calendar uses the same file).
export function downloadIcs(e: CalendarEvent): void {
  const blob = new Blob([buildIcs(e)], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${e.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 60) || 'event'}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
