export type Category = 'landmark' | 'museum' | 'church' | 'food' | 'park' | 'hotel' | 'other'

export type TravelMode = 'walk' | 'transit'

export interface ItineraryStop {
  id: string
  name: string
  category: Category
  lat: number
  lng: number
  durationMinutes: number
  /** Arrival time set by the user ("HH:MM:SS"); the optimiser must not move it. */
  fixedArrival: string | null
  /** Scheduled times ("HH:MM:SS"), known once travel times have been computed. */
  arrive?: string
  depart?: string
  /** Minutes of slack between arriving and a later fixed arrival time. */
  waitMinutes?: number
  /** Minutes past the fixed arrival time, when it cannot be met. */
  lateMinutes?: number
}

/** Travel from the stop at the same index to the next one. */
export interface ItineraryLeg {
  mode: TravelMode
  minutes: number
  km: number
  summary: string
  /** The real path, once fetched. The map draws a straight line until then. */
  path?: { lat: number; lng: number }[]
}

/** Where the day starts or ends, e.g. the hotel. Not a visit, so it has no duration. */
export interface ItineraryEndpoint {
  name: string
  category: Category
  lat: number
  lng: number
  /** When the traveller leaves the start or reaches the end ("HH:MM:SS"). */
  time?: string
}

export interface ItineraryDay {
  date: string
  stops: ItineraryStop[]
  legs: ItineraryLeg[]
  start?: ItineraryEndpoint
  end?: ItineraryEndpoint
  /** From the start point to the first stop, and from the last stop to the end point. */
  startLeg?: ItineraryLeg
  endLeg?: ItineraryLeg
}

export type EndpointKind = 'start' | 'end'

export type TabId = 'day' | 'explore' | 'guide' | 'trips'
