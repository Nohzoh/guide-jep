import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OAEvent } from '../lib/openagenda'
import type { Slot } from '../lib/schedule'

export interface PlanItem {
  id: string
  event: OAEvent
  slot: Slot
  note?: string
}

interface PlanState {
  items: PlanItem[]
  addItem: (event: OAEvent, slot: Slot) => string
  removeItem: (id: string) => void
  updateSlot: (id: string, slot: Slot) => void
  updateNote: (id: string, note: string) => void
  replaceItems: (items: Omit<PlanItem, 'id'>[]) => void
  mergeItems: (items: Omit<PlanItem, 'id'>[]) => number
}

function withId(item: Omit<PlanItem, 'id'>): PlanItem {
  return { ...item, id: `${item.event.uid}-${crypto.randomUUID()}` }
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (event, slot) => {
        const id = `${event.uid}-${crypto.randomUUID()}`
        set((s) => ({ items: [...s.items, { id, event, slot }] }))
        return id
      },
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      updateSlot: (id, slot) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, slot } : i)) })),
      updateNote: (id, note) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, note } : i)) })),
      replaceItems: (items) => set({ items: items.map(withId) }),
      mergeItems: (items) => {
        const existingKeys = new Set(get().items.map((i) => `${i.event.uid}-${i.slot.start}-${i.slot.end}`))
        const toAdd = items.filter((i) => !existingKeys.has(`${i.event.uid}-${i.slot.start}-${i.slot.end}`))
        set((s) => ({ items: [...s.items, ...toAdd.map(withId)] }))
        return toAdd.length
      },
    }),
    { name: 'jep:plan:v1' },
  ),
)
