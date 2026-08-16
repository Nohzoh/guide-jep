import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GeoBounds, LatLng } from '../lib/geo'

export interface MapView {
  center: LatLng
  zoom: number
  bounds?: GeoBounds
}

interface BrowseState {
  search: string
  day: string | null
  category: number | null
  freeOnly: boolean
  reservationOnly: boolean
  region: string
  userPos: LatLng | null
  radiusKm: number
  viewMode: 'list' | 'map'
  mapView: MapView | null
  set: (partial: Partial<BrowseState>) => void
}

export const useBrowseStore = create<BrowseState>()(
  persist(
    (set) => ({
      search: '',
      day: null,
      category: null,
      freeOnly: false,
      reservationOnly: false,
      region: '',
      userPos: null,
      radiusKm: 25,
      viewMode: 'list',
      mapView: null,
      set: (partial) => set(partial),
    }),
    { name: 'jep:browse:v1' },
  ),
)
