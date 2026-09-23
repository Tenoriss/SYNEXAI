export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function toDate(iso: string): Date | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(iso: string): string {
  const date = toDate(iso)
  return date ? dateFormatter.format(date) : 'Unknown'
}

export function formatDateTime(iso: string): string {
  const date = toDate(iso)
  return date ? dateTimeFormatter.format(date) : 'Unknown'
}

/** "3 hours ago" style label, falling back to an absolute date beyond a week. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const date = toDate(iso)
  if (!date) return 'Unknown'
  const diffSeconds = Math.round((date.getTime() - now) / 1000)
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, seconds] of steps) {
    if (Math.abs(diffSeconds) >= seconds) {
      // A date older than a week is clearer as an absolute date in a table.
      if (unit === 'week' || unit === 'month' || unit === 'year') return formatDate(iso)
      return relativeFormatter.format(Math.round(diffSeconds / seconds), unit)
    }
  }
  return Math.abs(diffSeconds) < 45 ? 'just now' : relativeFormatter.format(Math.round(diffSeconds / 60), 'minute')
}
