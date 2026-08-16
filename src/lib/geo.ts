export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371

export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export interface GeoBounds {
  northEast: LatLng
  southWest: LatLng
}

/** Rough bounding box around a point for a given radius — good enough to pre-filter via the API before precise client-side distance sorting. */
export function bboxForRadius(center: LatLng, radiusKm: number): GeoBounds {
  const latDelta = radiusKm / 111 // ~111km per degree of latitude
  const lngDelta = radiusKm / (111 * Math.cos((center.lat * Math.PI) / 180))
  return {
    northEast: { lat: center.lat + latDelta, lng: center.lng + lngDelta },
    southWest: { lat: center.lat - latDelta, lng: center.lng - lngDelta },
  }
}
