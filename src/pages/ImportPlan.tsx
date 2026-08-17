import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchEventDetail, type OAEvent } from '../lib/openagenda'
import { decodePlanItems } from '../lib/share'
import { formatDay, formatTime } from '../lib/time'
import { usePlanStore } from '../store/planStore'
import type { Slot } from '../lib/schedule'

interface ResolvedItem {
  event: OAEvent
  slot: Slot
  note?: string
}

export function ImportPlan() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const existingCount = usePlanStore((s) => s.items.length)
  const replaceItems = usePlanStore((s) => s.replaceItems)
  const mergeItems = usePlanStore((s) => s.mergeItems)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [items, setItems] = useState<ResolvedItem[]>([])
  const [missing, setMissing] = useState(0)

  useEffect(() => {
    const data = params.get('data')
    if (!data) {
      setStatus('error')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const shared = decodePlanItems(data)
        if (shared.length === 0) throw new Error('Planning vide')
        const resolved = await Promise.all(
          shared.map(async (s): Promise<ResolvedItem | null> => {
            try {
              const event = await fetchEventDetail(s.uid)
              return { event, slot: { start: s.start, end: s.end }, ...(s.note ? { note: s.note } : {}) }
            } catch {
              return null
            }
          }),
        )
        if (cancelled) return
        const ok = resolved.filter((r): r is ResolvedItem => r !== null)
        if (ok.length === 0) throw new Error('Aucun événement valide')
        setItems(ok)
        setMissing(resolved.length - ok.length)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params])

  function apply(mode: 'replace' | 'merge') {
    const asPlain = items.map((i) => ({ event: i.event, slot: i.slot, note: i.note }))
    if (mode === 'replace') replaceItems(asPlain)
    else mergeItems(asPlain)
    navigate('/planning')
  }

  if (status === 'loading') {
    return <p className="mx-auto max-w-3xl p-4 text-center text-neutral-500">Chargement du planning partagé…</p>
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl p-4 text-center text-neutral-500">
        <p>Ce lien de partage est invalide ou incomplet.</p>
        <Link to="/" className="mt-2 inline-block text-violet-600">
          Retour à l'accueil →
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Planning partagé</h1>
      <p className="text-sm text-neutral-500">
        {items.length} événement{items.length > 1 ? 's' : ''} dans ce lien
        {missing > 0 ? ` (${missing} introuvable${missing > 1 ? 's' : ''}, ignoré${missing > 1 ? 's' : ''})` : ''}.
      </p>

      <ol className="flex flex-col gap-2">
        {items.map((i, idx) => (
          <li key={idx} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="text-sm font-medium text-neutral-500">
              {formatDay(i.slot.start)} · {formatTime(i.slot.start)}–{formatTime(i.slot.end)}
            </p>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{i.event.title}</p>
            <p className="text-sm text-neutral-500">{i.event.location.city}</p>
          </li>
        ))}
      </ol>

      {existingCount > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Tu as déjà {existingCount} événement{existingCount > 1 ? 's' : ''} dans ton planning. Que veux-tu faire ?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => apply('merge')}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white"
            >
              Fusionner avec mon planning
            </button>
            <button
              onClick={() => apply('replace')}
              className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-800"
            >
              Remplacer mon planning
            </button>
            <button
              onClick={() => navigate('/planning')}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-500"
            >
              Ignorer
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => apply('replace')}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white"
          >
            Importer dans mon planning
          </button>
          <button onClick={() => navigate('/')} className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-500">
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}
