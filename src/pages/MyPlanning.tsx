import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EventsMap } from '../components/EventsMap'
import { LinkifiedText } from '../components/LinkifiedText'
import { findConflicts } from '../lib/schedule'
import { buildShareUrl } from '../lib/share'
import { dayKey, formatDay, formatTime } from '../lib/time'
import type { PlanItem } from '../store/planStore'
import { usePlanStore } from '../store/planStore'

function groupByDay(items: PlanItem[]): Map<string, PlanItem[]> {
  const map = new Map<string, PlanItem[]>()
  for (const item of items) {
    const key = dayKey(item.slot.start)
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  for (const list of map.values()) list.sort((a, b) => a.slot.start.localeCompare(b.slot.start))
  return new Map([...map.entries()].sort())
}

function NoteEditor({ item }: { item: PlanItem }) {
  const updateNote = usePlanStore((s) => s.updateNote)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.note ?? '')

  function save() {
    updateNote(item.id, draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="mt-2 flex flex-col gap-1.5">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ex : réservation ouvre le 5 septembre à 10h — https://..."
          rows={2}
          className="rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <div className="flex gap-3 text-sm">
          <button onClick={save} className="text-violet-600">
            Enregistrer
          </button>
          <button
            onClick={() => {
              setDraft(item.note ?? '')
              setEditing(false)
            }}
            className="text-neutral-500"
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  if (item.note) {
    return (
      <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 dark:bg-amber-950">
        <LinkifiedText text={item.note} className="whitespace-pre-line text-sm text-amber-800 dark:text-amber-200" />
        <button onClick={() => setEditing(true)} className="mt-1 text-xs text-violet-600">
          Modifier la note
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setEditing(true)} className="mt-2 text-sm text-violet-600">
      + Ajouter une note (ex : réservation à faire)
    </button>
  )
}

function ShareButton({ items }: { items: PlanItem[] }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = buildShareUrl(items)
    setShareUrl(url)
    setCopied(false)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Clipboard API unavailable (permissions/non-secure context) — the visible
      // link below lets the user copy it by hand instead.
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={share}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
      >
        🔗 Partager mon planning
      </button>
      {shareUrl && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-56 rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          />
          <span className="text-xs text-neutral-500">{copied ? '✓ copié' : 'sélectionne pour copier'}</span>
        </div>
      )}
    </div>
  )
}

export function MyPlanning() {
  const items = usePlanStore((s) => s.items)
  const removeItem = usePlanStore((s) => s.removeItem)
  const grouped = groupByDay(items)
  const asSlots = items.map((i) => ({ id: i.id, slot: i.slot }))

  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline')
  const [fitKey, setFitKey] = useState(0)
  useEffect(() => setFitKey((k) => k + 1), [items])

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-4 text-center text-neutral-500">
        <p>Ton planning est vide pour l'instant.</p>
        <Link to="/" className="mt-2 inline-block text-violet-600">
          Parcourir les événements →
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <ShareButton items={items} />
        <div className="flex overflow-hidden rounded-lg border border-neutral-300 text-sm dark:border-neutral-700">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 ${viewMode === 'timeline' ? 'bg-violet-600 text-white' : ''}`}
          >
            Chronologie
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1 ${viewMode === 'map' ? 'bg-violet-600 text-white' : ''}`}
          >
            Carte
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <EventsMap events={items.map((i) => i.event)} fitSignal={fitKey} />
      ) : (
        [...grouped.entries()].map(([day, dayItems]) => (
          <section key={day}>
            <h2 className="mb-2 font-medium text-neutral-800 dark:text-neutral-200">
              {formatDay(dayItems[0].slot.start)}
            </h2>
            <ol className="flex flex-col gap-2">
              {dayItems.map((item) => {
                const conflicts = findConflicts({ id: item.id, slot: item.slot }, asSlots)
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-500">
                          {formatTime(item.slot.start)}–{formatTime(item.slot.end)}
                        </p>
                        <Link to={`/event/${item.event.uid}`} className="font-medium text-neutral-900 hover:underline dark:text-neutral-100">
                          {item.event.title}
                        </Link>
                        <p className="text-sm text-neutral-500">{item.event.location.city}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        Retirer
                      </button>
                    </div>
                    {conflicts.length > 0 && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        ⚠️ Chevauche {conflicts.length} autre{conflicts.length > 1 ? 's' : ''} créneau
                        {conflicts.length > 1 ? 'x' : ''} de ton planning
                      </p>
                    )}
                    <NoteEditor item={item} />
                  </li>
                )
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  )
}
