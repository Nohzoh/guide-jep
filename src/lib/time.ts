const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function formatDay(iso: string): string {
  const d = dayFmt.format(new Date(iso))
  return d.charAt(0).toUpperCase() + d.slice(1)
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10) // YYYY-MM-DD, local-ish (ISO already carries the event's own offset)
}

/** HTML datetime-local <-> ISO helpers (assumes Europe/Paris, the only timezone JEP events use). */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString()
}
