import { useEffect, useMemo, useState } from 'react'
import { EventCard } from '../components/EventCard'
import { EventsMap } from '../components/EventsMap'
import type { GeoBounds, LatLng } from '../lib/geo'
import { bboxForRadius, distanceKm } from '../lib/geo'
import type { OAEvent, Schema } from '../lib/openagenda'
import { fetchSchema, searchEvents } from '../lib/openagenda'

const PAGE_SIZE = 24
const RADII_KM = [5, 10, 25, 50, 100]

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

  const [userPos, setUserPos] = useState<LatLng | null>(null)
  const [radiusKm, setRadiusKm] = useState(25)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  const [events, setEvents] = useState<OAEvent[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fitBoundsKey, setFitBoundsKey] = useState(0)
  const [searchingArea, setSearchingArea] = useState(false)

  const debouncedSearch = useDebounced(search, 400)
  const debouncedRegion = useDebounced(region, 400)
  const geoBounds = useMemo(() => (userPos ? bboxForRadius(userPos, radiusKm) : undefined), [userPos, radiusKm])

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
      geo: geoBounds,
      offset: 0,
      size: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return
        setEvents(res.events)
        setTotal(res.total)
        setFitBoundsKey((k) => k + 1) // fresh filter search: snap the map to the new results
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, debouncedRegion, day, category, freeOnly, freeOptionId, geoBounds])

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
        geo: geoBounds,
        offset: events.length,
        size: PAGE_SIZE,
      })
      setEvents((prev) => [...prev, ...res.events])
    } finally {
      setLoading(false)
    }
  }

  // Triggered from the map when the user pans/zooms and asks to search the visible
  // area — replaces the results without moving the map (unlike a fresh filter search).
  async function searchArea(bounds: GeoBounds) {
    const range = day ? dayRange(day) : undefined
    setSearchingArea(true)
    setError(null)
    try {
      const res = await searchEvents({
        search: debouncedSearch || undefined,
        region: debouncedRegion || undefined,
        typesEvenement: category ? [category] : undefined,
        conditions: freeOnly && freeOptionId ? [freeOptionId] : undefined,
        dateFrom: range?.dateFrom,
        dateTo: range?.dateTo,
        geo: bounds,
        offset: 0,
        size: 100,
      })
      setEvents(res.events)
      setTotal(res.total)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSearchingArea(false)
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non disponible sur ce navigateur.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      (err) => {
        setGeoError(`Impossible d'obtenir ta position (${err.message}).`)
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    )
  }

  const categoryOptions = schema?.['types-devenement']?.options ?? []

  const displayedEvents = useMemo(() => {
    if (!userPos) return events
    return [...events].sort(
      (a, b) =>
        distanceKm(userPos, { lat: a.location.latitude ?? 0, lng: a.location.longitude ?? 0 }) -
        distanceKm(userPos, { lat: b.location.latitude ?? 0, lng: b.location.longitude ?? 0 }),
    )
  }, [events, userPos])

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

      <div className="flex flex-wrap items-center gap-3">
        {userPos ? (
          <>
            <span className="text-sm text-neutral-600 dark:text-neutral-300">📍 Position définie</span>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              {RADII_KM.map((r) => (
                <option key={r} value={r}>
                  Rayon {r} km
                </option>
              ))}
            </select>
            <button onClick={() => setUserPos(null)} className="text-sm text-red-600">
              Effacer
            </button>
          </>
        ) : (
          <button
            onClick={locate}
            disabled={locating}
            className="rounded-full bg-neutral-100 px-3 py-1 text-sm disabled:opacity-50 dark:bg-neutral-800"
          >
            {locating ? 'Localisation…' : '📍 Autour de moi'}
          </button>
        )}
        <div className="ml-auto flex overflow-hidden rounded-lg border border-neutral-300 text-sm dark:border-neutral-700">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 ${viewMode === 'list' ? 'bg-violet-600 text-white' : ''}`}
          >
            Liste
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1 ${viewMode === 'map' ? 'bg-violet-600 text-white' : ''}`}
          >
            Carte
          </button>
        </div>
      </div>

      {geoError && <p className="text-sm text-red-600">{geoError}</p>}
      {error && <p className="text-sm text-red-600">Erreur de chargement : {error}</p>}

      {total !== null && (
        <p className="text-sm text-neutral-500">{total.toLocaleString('fr-FR')} événement(s) trouvé(s)</p>
      )}

      {viewMode === 'map' ? (
        <>
          {total !== null && displayedEvents.length < total && (
            <p className="text-sm text-amber-600">
              {displayedEvents.length} événement(s) affiché(s) sur la carte, sur {total.toLocaleString('fr-FR')} au
              total — déplace la carte et clique sur « Rechercher dans cette zone » pour voir les événements d'un
              autre endroit.
            </p>
          )}
          <EventsMap
            events={displayedEvents}
            userPos={userPos}
            radiusKm={userPos ? radiusKm : null}
            fitSignal={fitBoundsKey}
            onSearchArea={searchArea}
            searchingArea={searchingArea}
          />
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {displayedEvents.map((ev) => (
            <EventCard
              key={ev.uid}
              event={ev}
              schema={schema}
              distanceKm={
                userPos && ev.location.latitude && ev.location.longitude
                  ? distanceKm(userPos, { lat: ev.location.latitude, lng: ev.location.longitude })
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {viewMode === 'list' && events.length > 0 && total !== null && events.length < total && (
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
