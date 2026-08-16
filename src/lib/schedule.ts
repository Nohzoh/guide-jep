import type { Timing } from './openagenda'

export interface Slot {
  start: string // ISO
  end: string // ISO
}

/** Is [start,end) fully contained in at least one of the event's opening windows? */
export function isSlotWithinTimings(slot: Slot, timings: Timing[]): boolean {
  const start = new Date(slot.start).getTime()
  const end = new Date(slot.end).getTime()
  if (!(start < end)) return false
  return timings.some((t) => {
    const tStart = new Date(t.begin).getTime()
    const tEnd = new Date(t.end).getTime()
    return start >= tStart && end <= tEnd
  })
}

export function slotsOverlap(a: Slot, b: Slot): boolean {
  const aStart = new Date(a.start).getTime()
  const aEnd = new Date(a.end).getTime()
  const bStart = new Date(b.start).getTime()
  const bEnd = new Date(b.end).getTime()
  return aStart < bEnd && bStart < aEnd
}

/** Returns the ids of items in `slots` that overlap `target` (excluding itself). */
export function findConflicts<T extends { id: string; slot: Slot }>(target: T, slots: T[]): T[] {
  return slots.filter((s) => s.id !== target.id && slotsOverlap(s.slot, target.slot))
}
