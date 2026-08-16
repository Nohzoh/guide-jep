import { useEffect, useState } from 'react'
import { EventCard } from '../components/EventCard'
import type { OAEvent, Schema } from '../lib/openagenda'
import { fetchSchema, searchEvents } from '../lib/openagenda'

const PAGE_SIZE = 24

const DAYS = [
  { key: '2026-09-18', label: 'Ven. 18 (scolaires)' },
  { key: '2026-09-19', label: 'Sam. 19' },
  { key: '2026-09-20', label: 'Dim. 20' },
]

function dayRange(day: string): { dateFrom: string; dateTo: string } {
  return { dateFrom: `${day}T00:00:00+02:00`, dateTo: `${day}T23:59:00+02:00` }
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export function Browse() {
  const [schema, setSchema] = useState<Schema | null>(null)
  const [search, setSearch] = useState('')
  const [day, setDay] = useState<string | null>(null)
  const [category, setCategory] = useState<number | null>(null)
  const [freeOnly, setFreeOnly] = useState(false)
  const [region, setRegion] = useState('')

  const [events, setEvents] = useState<OAEvent[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedSearch = useDebounced(search, 400)
  const debouncedRegion = useDebounced(region, 400)

  useEffect(() => {
    fetchSchema().then(setSchema).catch(() => setSchema(null))
  }, [])

  const freeOptionId = schema?.['conditions-de-participation']?.options.find((o) => o.value === 'gratuit')?.id

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const range = day ? dayRange(day) : undefined
    searchEvents({
      search: debouncedSearch || undefined,
      region: debouncedRegion || undefined,
      typesEvenement: category ? [category] : undefined,
      conditions: freeOnly && freeOptionId ? [freeOptionId] : undefined,
      dateFrom: range?.dateFrom,
      dateTo: range?.dateTo,
      offset: 0,
      size: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return
        setEvents(res.events)
        setTotal(res.total)
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, debouncedRegion, day, category, freeOnly, freeOptionId])

  async function loadMore() {
    const range = day ? dayRange(day) : undefined
    setLoading(true)
    try {
      const res = await searchEvents({
        search: debouncedSearch || undefined,
        region: debouncedRegion || undefined,
        typesEvenement: category ? [category] : undefined,
        conditions: freeOnly && freeOptionId ? [freeOptionId] : undefined,
        dateFrom: range?.dateFrom,
        dateTo: range?.dateTo,
        offset: events.length,
        size: PAGE_SIZE,
      })
      setEvents((prev) => [...prev, ...res.events])
    } finally {
      setLoading(false)
    }
  }

  const categoryOptions = schema?.['types-devenement']?.options ?? []

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <input
        type="search"
        placeholder="Rechercher un événement (ex : orgue, château, atelier...)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setDay(null)}
          className={`rounded-full px-3 py-1 text-sm ${day === null ? 'bg-violet-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}
        >
          Tous les jours
        </button>
        {DAYS.map((d) => (
          <button
            key={d.key}
            onClick={() => setDay(day === d.key ? null : d.key)}
            className={`rounded-full px-3 py-1 text-sm ${day === d.key ? 'bg-violet-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {categoryOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((o) => (
            <button
              key={o.id}
              onClick={() => setCategory(category === o.id ? null : o.id)}
              className={`rounded-full px-3 py-1 text-sm ${category === o.id ? 'bg-violet-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Région ou département (ex : Bretagne, Gironde)"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
          Gratuit uniquement
        </label>
      </div>

      {error && <p className="text-sm text-red-600">Erreur de chargement : {error}</p>}

      {total !== null && (
        <p className="text-sm text-neutral-500">{total.toLocaleString('fr-FR')} événement(s) trouvé(s)</p>
      )}

      <div className="flex flex-col gap-2">
        {events.map((ev) => (
          <EventCard key={ev.uid} event={ev} schema={schema} />
        ))}
      </div>

      {events.length > 0 && total !== null && events.length < total && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="rounded-lg border border-neutral-300 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
        >
          {loading ? 'Chargement…' : 'Charger plus'}
        </button>
      )}

      {loading && events.length === 0 && <p className="text-sm text-neutral-500">Chargement…</p>}
    </div>
  )
}
