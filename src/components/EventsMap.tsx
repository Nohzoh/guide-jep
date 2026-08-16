import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import type { LatLng } from '../lib/geo'
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

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 })
  }, [map, points])
  return null
}

export function EventsMap({
  events,
  userPos,
  radiusKm,
}: {
  events: OAEvent[]
  userPos: LatLng | null
  radiusKm: number | null
}) {
  const located = events.filter(
    (e): e is OAEvent & { location: { latitude: number; longitude: number } } =>
      typeof e.location.latitude === 'number' && typeof e.location.longitude === 'number',
  )

  const points: LatLng[] = located.map((e) => ({ lat: e.location.latitude, lng: e.location.longitude }))
  if (userPos) points.push(userPos)

  const center = userPos ?? points[0] ?? { lat: 46.6, lng: 2.2 } // fallback: roughly France

  return (
    <div className="h-[70vh] w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <MapContainer center={[center.lat, center.lng]} zoom={userPos ? 12 : 5} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
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
    </div>
  )
}
