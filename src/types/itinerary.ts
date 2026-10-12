export type Category = 'landmark' | 'museum' | 'church' | 'food' | 'park' | 'hotel' | 'other'

export type TravelMode = 'walk' | 'transit'

export interface ItineraryStop {
  id: string
  name: string
  category: Category
  lat: number
  lng: number
  arrive: string
  depart: string
  durationMinutes: number
  /** Arrival time was set by the user and must not move. */
  fixed: boolean
}

/** Travel from the stop at the same index to the next one. */
export interface ItineraryLeg {
  mode: TravelMode
  minutes: number
  km: number
  summary: string
}

export interface ItineraryDay {
  date: string
  stops: ItineraryStop[]
  legs: ItineraryLeg[]
}

export type TabId = 'day' | 'explore' | 'guide' | 'trips'
