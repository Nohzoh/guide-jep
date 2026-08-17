import type { PlanItem } from '../store/planStore'

export interface SharedItem {
  uid: number
  start: string
  end: string
  note?: string
}

function toBase64Url(binary: string): string {
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return atob(padded + pad)
}

export function encodePlanItems(items: PlanItem[]): string {
  const compact: SharedItem[] = items.map((i) => ({
    uid: i.event.uid,
    start: i.slot.start,
    end: i.slot.end,
    ...(i.note ? { note: i.note } : {}),
  }))
  return toBase64Url(unescape(encodeURIComponent(JSON.stringify(compact))))
}

export function decodePlanItems(encoded: string): SharedItem[] {
  const json = decodeURIComponent(escape(fromBase64Url(encoded)))
  const parsed = JSON.parse(json)
  if (!Array.isArray(parsed)) throw new Error('Format invalide')
  return parsed.filter(
    (i): i is SharedItem => typeof i?.uid === 'number' && typeof i?.start === 'string' && typeof i?.end === 'string',
  )
}

export function buildShareUrl(items: PlanItem[]): string {
  const data = encodePlanItems(items)
  return `${window.location.origin}${window.location.pathname}#/import?data=${data}`
}
