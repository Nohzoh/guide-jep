import type { GeoBounds } from './geo'

const AGENDA_UID = 2883956
const API_BASE = `https://api.openagenda.com/v2/agendas/${AGENDA_UID}`
const API_KEY = import.meta.env.VITE_OPENAGENDA_KEY as string | undefined

if (!API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('VITE_OPENAGENDA_KEY manquante — voir .env.example')
}

export interface Timing {
  begin: string
  end: string
}

export interface EventLocation {
  name?: string
  address?: string
  city?: string
  postalCode?: string
  department?: string
  region?: string
  latitude?: number
  longitude?: number
  access?: string
}

export interface OAEvent {
  uid: number
  slug: string
  title: string
  description: string
  longDescription?: string
  image: { thumb: string; full: string } | null
  location: EventLocation
  firstTiming: Timing
  lastTiming: Timing
  timings: Timing[]
  typesEvenement: number[]
  specificites: number[]
  conditions: number[]
  typePublic: number[]
  onlineAccessLink: string | null
  officialUrl: string
}

// asArray: OpenAgenda returns a bare number for single-select fields and an
// array for multi-select ones — normalize both to an array.
function asArray(v: unknown): number[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v as number]
}

// With monolingual=fr, OpenAgenda returns `{}` instead of a string for
// translatable fields that have no French translation — coerce those away.
function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

function toEvent(raw: any): OAEvent {
  const img = raw.image
  return {
    uid: raw.uid,
    slug: raw.slug,
    title: asString(raw.title) ?? '',
    description: asString(raw.description) ?? '',
    longDescription: asString(raw.longDescription),
    image: img
      ? {
          thumb: img.base + (img.variants?.find((v: any) => v.type === 'thumbnail')?.filename ?? img.filename),
          full: img.base + (img.variants?.find((v: any) => v.type === 'full')?.filename ?? img.filename),
        }
      : null,
    location: {
      name: asString(raw.location?.name),
      address: asString(raw.location?.address),
      city: asString(raw.location?.city),
      postalCode: asString(raw.location?.postalCode),
      department: asString(raw.location?.department),
      region: asString(raw.location?.region),
      latitude: raw.location?.latitude,
      longitude: raw.location?.longitude,
      access: asString(raw.location?.access),
    },
    firstTiming: raw.firstTiming,
    lastTiming: raw.lastTiming,
    timings: raw.timings ?? [raw.firstTiming, raw.lastTiming].filter(Boolean),
    typesEvenement: asArray(raw['types-devenement']),
    specificites: asArray(raw['specificites']),
    conditions: asArray(raw['conditions-de-participation']),
    typePublic: asArray(raw['type-de-public']),
    onlineAccessLink: raw.onlineAccessLink ?? null,
    officialUrl: `https://openagenda.com/agendas/${AGENDA_UID}/events/${raw.slug}`,
  }
}

export interface SearchParams {
  search?: string
  region?: string
  department?: string
  city?: string
  typesEvenement?: number[]
  conditions?: number[]
  dateFrom?: string // ISO
  dateTo?: string // ISO
  geo?: GeoBounds
  offset?: number
  size?: number
}

export interface SearchResult {
  total: number
  events: OAEvent[]
}

export async function searchEvents(params: SearchParams): Promise<SearchResult> {
  const usp = new URLSearchParams()
  usp.set('key', API_KEY ?? '')
  usp.set('monolingual', 'fr')
  usp.set('detailed', '0')
  usp.set('size', String(params.size ?? 24))
  usp.set('offset', String(params.offset ?? 0))
  if (params.search) usp.set('search', params.search)
  if (params.region) usp.set('region', params.region)
  if (params.department) usp.set('department', params.department)
  if (params.city) usp.set('city', params.city)
  for (const id of params.typesEvenement ?? []) usp.append('types-devenement[]', String(id))
  for (const id of params.conditions ?? []) usp.append('conditions-de-participation[]', String(id))
  if (params.dateFrom) usp.set('timings[gte]', params.dateFrom)
  if (params.dateTo) usp.set('timings[lte]', params.dateTo)
  if (params.geo) {
    usp.set('geo[northEast][lat]', String(params.geo.northEast.lat))
    usp.set('geo[northEast][lng]', String(params.geo.northEast.lng))
    usp.set('geo[southWest][lat]', String(params.geo.southWest.lat))
    usp.set('geo[southWest][lng]', String(params.geo.southWest.lng))
  }

  const res = await fetch(`${API_BASE}/events?${usp.toString()}`)
  if (!res.ok) throw new Error(`OpenAgenda ${res.status}`)
  const data = await res.json()
  return { total: data.total, events: (data.events ?? []).map(toEvent) }
}

export async function fetchEventDetail(uid: number): Promise<OAEvent> {
  const usp = new URLSearchParams()
  usp.set('key', API_KEY ?? '')
  usp.set('monolingual', 'fr')
  usp.set('detailed', '1')
  const res = await fetch(`${API_BASE}/events/${uid}?${usp.toString()}`)
  if (!res.ok) throw new Error(`OpenAgenda ${res.status}`)
  const data = await res.json()
  return toEvent(data.event ?? data)
}

// ---- Schema (category labels), cached in localStorage since it barely changes ----

export interface FieldOption {
  id: number
  value: string
  label: string
}

export interface FieldDef {
  field: string
  label: string
  fieldType: string
  options: FieldOption[]
}

export type Schema = Record<string, FieldDef>

const SCHEMA_CACHE_KEY = 'jep:schema:v1'
const SCHEMA_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function fetchSchema(): Promise<Schema> {
  const cached = localStorage.getItem(SCHEMA_CACHE_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.fetchedAt < SCHEMA_TTL_MS) return parsed.schema
    } catch {
      // ignore corrupt cache
    }
  }

  const usp = new URLSearchParams({ key: API_KEY ?? '' })
  const res = await fetch(`${API_BASE}?${usp.toString()}`)
  if (!res.ok) throw new Error(`OpenAgenda ${res.status}`)
  const data = await res.json()
  const fields = (data.schema?.fields ?? []) as any[]

  const schema: Schema = {}
  for (const f of fields) {
    if (!f.options) continue
    schema[f.field] = {
      field: f.field,
      label: f.label?.fr ?? f.field,
      fieldType: f.fieldType,
      options: f.options.map((o: any) => ({ id: o.id, value: o.value, label: o.label?.fr ?? o.value })),
    }
  }

  localStorage.setItem(SCHEMA_CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), schema }))
  return schema
}

export function labelsFor(schema: Schema | null, field: string, ids: number[]): string[] {
  if (!schema?.[field]) return []
  const byId = new Map(schema[field].options.map((o) => [o.id, o.label]))
  return ids.map((id) => byId.get(id) ?? String(id))
}
