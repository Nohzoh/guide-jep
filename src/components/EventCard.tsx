import { Link } from 'react-router-dom'
import type { OAEvent, Schema } from '../lib/openagenda'
import { labelsFor } from '../lib/openagenda'
import { formatDay, formatTime } from '../lib/time'

export function EventCard({ event, schema }: { event: OAEvent; schema: Schema | null }) {
  const categories = labelsFor(schema, 'types-devenement', event.typesEvenement)
  const sameDay = event.firstTiming?.begin?.slice(0, 10) === event.lastTiming?.end?.slice(0, 10)

  return (
    <Link
      to={`/event/${event.uid}`}
      className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-3 hover:border-violet-300 hover:shadow-sm transition dark:border-neutral-800 dark:bg-neutral-900"
    >
      {event.image ? (
        <img src={event.image.thumb} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="h-20 w-20 shrink-0 rounded-lg bg-violet-100 dark:bg-violet-950" />
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium text-neutral-900 dark:text-neutral-100">{event.title}</h3>
        <p className="mt-0.5 truncate text-sm text-neutral-500">
          {event.location.city ?? 'Lieu non précisé'}
        </p>
        <p className="mt-0.5 text-sm text-neutral-500">
          {event.firstTiming
            ? sameDay
              ? `${formatDay(event.firstTiming.begin)} · ${formatTime(event.firstTiming.begin)}–${formatTime(event.lastTiming.end)}`
              : `${formatDay(event.firstTiming.begin)} → ${formatDay(event.lastTiming.end)}`
            : null}
        </p>
        {categories.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {categories.map((c) => (
              <span
                key={c}
                className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-300"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
