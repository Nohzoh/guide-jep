import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { OAEvent, Schema } from '../lib/openagenda'
import { fetchEventDetail, fetchSchema, labelsFor } from '../lib/openagenda'
import { isSlotWithinTimings } from '../lib/schedule'
import { formatDay, formatTime, fromLocalInputValue, toLocalInputValue } from '../lib/time'
import { usePlanStore } from '../store/planStore'

export function EventDetail() {
  const { uid } = useParams<{ uid: string }>()
  const navigate = useNavigate()
  const addItem = usePlanStore((s) => s.addItem)

  const [event, setEvent] = useState<OAEvent | null>(null)
  const [schema, setSchema] = useState<Schema | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [slotError, setSlotError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!uid) return
    setEvent(null)
    setAdded(false)
    fetchEventDetail(Number(uid))
      .then((ev) => {
        setEvent(ev)
        if (ev.firstTiming) {
          setStart(toLocalInputValue(ev.firstTiming.begin))
          const oneHourLater = new Date(new Date(ev.firstTiming.begin).getTime() + 60 * 60 * 1000)
          const cappedEnd = Math.min(oneHourLater.getTime(), new Date(ev.firstTiming.end).getTime())
          setEnd(toLocalInputValue(new Date(cappedEnd).toISOString()))
        }
      })
      .catch((e) => setError(e.message))
    fetchSchema().then(setSchema).catch(() => setSchema(null))
  }, [uid])

  if (error) return <p className="p-4 text-sm text-red-600">Erreur : {error}</p>
  if (!event) return <p className="p-4 text-sm text-neutral-500">Chargement…</p>

  const categories = labelsFor(schema, 'types-devenement', event.typesEvenement)
  const specificites = labelsFor(schema, 'specificites', event.specificites)
  const conditions = labelsFor(schema, 'conditions-de-participation', event.conditions)

  function handleAdd() {
    if (!event) return
    const slotIso = { start: fromLocalInputValue(start), end: fromLocalInputValue(end) }
    if (!isSlotWithinTimings(slotIso, event.timings)) {
      setSlotError(
        "Ce créneau ne correspond à aucune plage d'ouverture réelle de l'événement — ajuste les horaires.",
      )
      return
    }
    setSlotError(null)
    addItem(event, slotIso)
    setAdded(true)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Link to="/" className="text-sm text-violet-600">
        ← Retour à la recherche
      </Link>

      {event.image && (
        <img src={event.image.full} alt="" className="max-h-80 w-full rounded-xl object-cover" />
      )}

      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{event.title}</h1>

      <div className="flex flex-wrap gap-1.5">
        {[...categories, ...specificites, ...conditions].map((c) => (
          <span key={c} className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            {c}
          </span>
        ))}
      </div>

      <div className="rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
        <p className="font-medium text-neutral-800 dark:text-neutral-200">
          {event.location.name ?? event.location.city}
        </p>
        <p className="text-neutral-500">{event.location.address}</p>
        {event.location.access && <p className="mt-1 text-neutral-500">Accès : {event.location.access}</p>}
      </div>

      <div>
        <h2 className="mb-1 font-medium text-neutral-800 dark:text-neutral-200">Plages d'ouverture</h2>
        <ul className="text-sm text-neutral-600 dark:text-neutral-400">
          {event.timings.map((t, i) => (
            <li key={i}>
              {formatDay(t.begin)} · {formatTime(t.begin)}–{formatTime(t.end)}
            </li>
          ))}
        </ul>
      </div>

      <p className="whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-300">
        {event.longDescription ?? event.description}
      </p>

      {event.officialUrl && (
        <a href={event.officialUrl} target="_blank" rel="noreferrer" className="text-sm text-violet-600">
          Voir la fiche complète sur OpenAgenda ↗
        </a>
      )}

      <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
        <h2 className="mb-2 font-medium text-neutral-800 dark:text-neutral-200">
          Choisir mon créneau de visite
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm">
            Arrivée
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-lg border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="flex flex-col text-sm">
            Départ
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-lg border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <button
            onClick={handleAdd}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Ajouter à mon planning
          </button>
        </div>
        {slotError && <p className="mt-2 text-sm text-red-600">{slotError}</p>}
        {added && (
          <p className="mt-2 text-sm text-emerald-600">
            Ajouté ! Voir{' '}
            <button onClick={() => navigate('/planning')} className="underline">
              mon planning
            </button>
            .
          </p>
        )}
      </div>
    </div>
  )
}
