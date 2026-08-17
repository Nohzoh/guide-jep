import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Link } from 'react-router-dom'
import type { GeoBounds, LatLng } from '../lib/geo'
import type { OAEvent } from '../lib/openagenda'
import type { Slot } from '../lib/schedule'
import { dayKey } from '../lib/time'
import type { MapView } from '../store/browseStore'

const eventIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#7c3aed;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

// Colors cycle across the plan's distinct days, so each day's route and stop
// numbers stay visually separate on the map.
const ROUTE_COLORS = ['#7c3aed', '#059669', '#dc2626', '#0891b2', '#d97706']

function numberedIcon(color: string, n: number) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);color:white;font-size:11px;font-weight:600;font-family:sans-serif">${n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

interface RouteItem {
  event: OAEvent
  slot: Slot
}

// Fits the map to `points` whenever `fitSignal` changes (a fresh filter search),
// never on pans/zooms or on area-search results — otherwise the map would keep
// snapping back out to fit every newly loaded pin. The very first run is skipped
// when we're restoring a previously saved view, so returning to the map keeps
// showing the place the user had zoomed into.
function FitBounds({
  points,
  fitSignal,
  skipInitialFit,
  programmaticMove,
}: {
  points: LatLng[]
  fitSignal: number
  skipInitialFit: boolean
  programmaticMove: React.MutableRefObject<boolean>
}) {
  const map = useMap()
  const pointsRef = useRef(points)
  pointsRef.current = points
  const firstRun = useRef(true)

  useEffect(() => {
    const isFirst = firstRun.current
    firstRun.current = false
    if (isFirst && skipInitialFit) return

    const current = pointsRef.current
    if (current.length === 0) return
    programmaticMove.current = true
    const bounds = L.latLngBounds(current.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitSignal])

  return null
}

// Explicitly centers/zooms the map on `bounds` (typically the geolocation
// radius) whenever `signal` changes — independent from FitBounds, since this
// should zoom to match the chosen radius rather than to wherever the fetched
// pins happen to fall.
function FitToGeoBounds({
  bounds,
  signal,
  programmaticMove,
}: {
  bounds: GeoBounds | null
  signal: number
  programmaticMove: React.MutableRefObject<boolean>
}) {
  const map = useMap()
  const boundsRef = useRef(bounds)
  boundsRef.current = bounds

  useEffect(() => {
    if (signal === 0) return
    const b = boundsRef.current
    if (!b) return
    programmaticMove.current = true
    map.fitBounds(L.latLngBounds([b.southWest.lat, b.southWest.lng], [b.northEast.lat, b.northEast.lng]), {
      padding: [32, 32],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signal])

  return null
}

function AreaWatcher({
  programmaticMove,
  onDirty,
  onViewChange,
}: {
  programmaticMove: React.MutableRefObject<boolean>
  onDirty?: () => void
  onViewChange?: (view: MapView) => void
}) {
  useMapEvents({
    moveend: (e) => {
      const map = e.target
      const c = map.getCenter()
      const b = map.getBounds()
      onViewChange?.({
        center: { lat: c.lat, lng: c.lng },
        zoom: map.getZoom(),
        bounds: {
          northEast: { lat: b.getNorthEast().lat, lng: b.getNorthEast().lng },
          southWest: { lat: b.getSouthWest().lat, lng: b.getSouthWest().lng },
        },
      })
      if (programmaticMove.current) {
        programmaticMove.current = false
        return
      }
      onDirty?.()
    },
  })
  return null
}

export function EventsMap({
  events,
  route,
  userPos = null,
  radiusKm = null,
  fitSignal = 0,
  geoFitBounds = null,
  geoFitSignal = 0,
  onSearchArea,
  searchingArea,
  initialView = null,
  onViewChange,
}: {
  events: OAEvent[]
  route?: RouteItem[]
  userPos?: LatLng | null
  radiusKm?: number | null
  fitSignal?: number
  geoFitBounds?: GeoBounds | null
  geoFitSignal?: number
  onSearchArea?: (bounds: GeoBounds) => void
  searchingArea?: boolean
  initialView?: MapView | null
  onViewChange?: (view: MapView) => void
}) {
  const programmaticMove = useRef(false)
  const mapRef = useRef<L.Map | null>(null)
  const [dirty, setDirty] = useState(false)

  const located = events.filter(
    (e): e is OAEvent & { location: { latitude: number; longitude: number } } =>
      typeof e.location.latitude === 'number' && typeof e.location.longitude === 'number',
  )

  const routeDays = useMemo(() => {
    type LocatedRouteItem = RouteItem & { event: OAEvent & { location: { latitude: number; longitude: number } } }
    if (!route) return []
    const located = route.filter(
      (r): r is LocatedRouteItem =>
        typeof r.event.location.latitude === 'number' && typeof r.event.location.longitude === 'number',
    )
    const groups = new Map<string, LocatedRouteItem[]>()
    for (const r of located) {
      const key = dayKey(r.slot.start)
      const list = groups.get(key) ?? []
      list.push(r)
      groups.set(key, list)
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, items], idx) => ({
        day,
        color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
        items: items.slice().sort((a, b) => a.slot.start.localeCompare(b.slot.start)),
      }))
  }, [route])

  const points: LatLng[] = located.map((e) => ({ lat: e.location.latitude, lng: e.location.longitude }))
  if (userPos) points.push(userPos)

  const initialCenter = initialView?.center ?? userPos ?? points[0] ?? { lat: 46.6, lng: 2.2 } // fallback: roughly France
  const initialZoom = initialView?.zoom ?? (userPos ? 12 : 5)

  function handleSearchArea() {
    const bounds = mapRef.current?.getBounds()
    if (!bounds || !onSearchArea) return
    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()
    onSearchArea({ northEast: { lat: ne.lat, lng: ne.lng }, southWest: { lat: sw.lat, lng: sw.lng } })
    setDirty(false)
  }

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <MapContainer
        ref={mapRef}
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={initialZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds
          points={points}
          fitSignal={fitSignal}
          skipInitialFit={initialView !== null}
          programmaticMove={programmaticMove}
        />
        <AreaWatcher
          programmaticMove={programmaticMove}
          onDirty={onSearchArea ? () => setDirty(true) : undefined}
          onViewChange={onViewChange}
        />
        <FitToGeoBounds bounds={geoFitBounds} signal={geoFitSignal} programmaticMove={programmaticMove} />
        {userPos && (
          <>
            <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
              <Popup>Toi</Popup>
            </Marker>
            {radiusKm && <Circle center={[userPos.lat, userPos.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.05 }} />}
          </>
        )}
        {route
          ? routeDays.map((d) => (
              <Fragment key={d.day}>
                {d.items.length >= 2 && (
                  <Polyline
                    positions={d.items.map((i) => [i.event.location.latitude, i.event.location.longitude])}
                    pathOptions={{ color: d.color, weight: 3, dashArray: '6 8', opacity: 0.8 }}
                  />
                )}
                {d.items.map((i, idx) => (
                  <Marker
                    key={`${i.event.uid}-${i.slot.start}`}
                    position={[i.event.location.latitude, i.event.location.longitude]}
                    icon={numberedIcon(d.color, idx + 1)}
                  >
                    <Popup>
                      <p className="font-medium">
                        {idx + 1}. {i.event.title}
                      </p>
                      <p className="text-neutral-500">{i.event.location.city}</p>
                      <Link to={`/event/${i.event.uid}`} className="text-violet-600">
                        Voir la fiche →
                      </Link>
                    </Popup>
                  </Marker>
                ))}
              </Fragment>
            ))
          : located.map((e) => (
              <Marker key={e.uid} position={[e.location.latitude, e.location.longitude]} icon={eventIcon}>
                <Popup>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-neutral-500">{e.location.city}</p>
                  <Link to={`/event/${e.uid}`} className="text-violet-600">
                    Voir la fiche →
                  </Link>
                </Popup>
              </Marker>
            ))}
      </MapContainer>

      {dirty && onSearchArea && (
        <button
          onClick={handleSearchArea}
          disabled={searchingArea}
          className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-violet-600 px-4 py-1.5 text-sm font-medium text-white shadow-lg disabled:opacity-50"
        >
          {searchingArea ? 'Recherche…' : '🔍 Rechercher dans cette zone'}
        </button>
      )}
    </div>
  )
}
