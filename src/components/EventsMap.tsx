import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Link } from 'react-router-dom'
import type { GeoBounds, LatLng } from '../lib/geo'
import type { OAEvent } from '../lib/openagenda'

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

// Fits the map to `points` only when `fitSignal` changes (a fresh filter search),
// never on pans/zooms or on area-search results — otherwise the map would keep
// snapping back out to fit every newly loaded pin.
function FitBounds({ points, fitSignal, programmaticMove }: { points: LatLng[]; fitSignal: number; programmaticMove: React.MutableRefObject<boolean> }) {
  const map = useMap()
  const pointsRef = useRef(points)
  pointsRef.current = points

  useEffect(() => {
    const current = pointsRef.current
    if (current.length === 0) return
    programmaticMove.current = true
    const bounds = L.latLngBounds(current.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitSignal])

  return null
}

function AreaWatcher({
  programmaticMove,
  onDirty,
}: {
  programmaticMove: React.MutableRefObject<boolean>
  onDirty: () => void
}) {
  useMapEvents({
    moveend: () => {
      if (programmaticMove.current) {
        programmaticMove.current = false
        return
      }
      onDirty()
    },
  })
  return null
}

export function EventsMap({
  events,
  userPos,
  radiusKm,
  fitSignal,
  onSearchArea,
  searchingArea,
}: {
  events: OAEvent[]
  userPos: LatLng | null
  radiusKm: number | null
  fitSignal: number
  onSearchArea: (bounds: GeoBounds) => void
  searchingArea?: boolean
}) {
  const programmaticMove = useRef(false)
  const mapRef = useRef<L.Map | null>(null)
  const [dirty, setDirty] = useState(false)

  const located = events.filter(
    (e): e is OAEvent & { location: { latitude: number; longitude: number } } =>
      typeof e.location.latitude === 'number' && typeof e.location.longitude === 'number',
  )

  const points: LatLng[] = located.map((e) => ({ lat: e.location.latitude, lng: e.location.longitude }))
  if (userPos) points.push(userPos)

  const center = userPos ?? points[0] ?? { lat: 46.6, lng: 2.2 } // fallback: roughly France

  function handleSearchArea() {
    const bounds = mapRef.current?.getBounds()
    if (!bounds) return
    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()
    onSearchArea({ northEast: { lat: ne.lat, lng: ne.lng }, southWest: { lat: sw.lat, lng: sw.lng } })
    setDirty(false)
  }

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <MapContainer
        ref={mapRef}
        center={[center.lat, center.lng]}
        zoom={userPos ? 12 : 5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} fitSignal={fitSignal} programmaticMove={programmaticMove} />
        <AreaWatcher programmaticMove={programmaticMove} onDirty={() => setDirty(true)} />
        {userPos && (
          <>
            <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
              <Popup>Toi</Popup>
            </Marker>
            {radiusKm && <Circle center={[userPos.lat, userPos.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.05 }} />}
          </>
        )}
        {located.map((e) => (
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

      {dirty && (
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
