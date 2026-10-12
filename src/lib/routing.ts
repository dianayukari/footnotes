import { importLibrary } from '@googlemaps/js-api-loader'
import { configureGoogle } from './google'
import type { TravelMode } from '@/types/itinerary'

export interface Point {
  lat: number
  lng: number
}

export interface Travel {
  minutes: number
  meters: number
}

export interface LegRoute extends Travel {
  path: Point[]
  summary: string
}

const googleMode = { walk: 'WALKING', transit: 'TRANSIT' } as const

// Google caps a transit matrix at 100 origin-destination pairs per request.
const MAX_SIDE = 10

const DAY_MS = 86_400_000

/**
 * The instant to query for a local clock time on a trip date. Transit schedules are only
 * published a short way ahead, so dates outside the coming week are mapped to the same weekday
 * within it.
 */
export function departureInstant(date: string, minutes: number, utcOffsetMinutes: number | null): Date {
  const offset = (utcOffsetMinutes ?? -new Date().getTimezoneOffset()) * 60_000
  // Work in "local time stored as UTC" so day arithmetic ignores the browser's timezone.
  let day = Date.parse(`${date}T00:00:00Z`)
  const today = Math.floor((Date.now() + offset) / DAY_MS) * DAY_MS
  if (day <= today || day > today + 6 * DAY_MS) {
    const tomorrow = today + DAY_MS
    const weekday = (ms: number) => new Date(ms).getUTCDay()
    day = tomorrow + ((weekday(day) - weekday(tomorrow) + 7) % 7) * DAY_MS
  }
  return new Date(day + minutes * 60_000 - offset)
}

/** Straight-line distance in metres. */
export function haversine(a: Point, b: Point): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

/** Rough walking time for pairs Google has no route for: 4.5 km/h over 1.3x the straight line. */
export function estimateWalk(a: Point, b: Point): Travel {
  const meters = haversine(a, b) * 1.3
  return { minutes: Math.round(meters / 75), meters: Math.round(meters) }
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** result[i][j] is the travel from origins[i] to destinations[j], or null when there is no route. */
export async function fetchMatrix(
  origins: Point[],
  destinations: Point[],
  mode: TravelMode,
  departure: Date,
): Promise<(Travel | null)[][]> {
  configureGoogle()
  const { RouteMatrix } = await importLibrary('routes')
  const result: (Travel | null)[][] = origins.map(() => [])

  const originChunks = chunks(origins.map((point, index) => ({ point, index })), MAX_SIDE)
  const destinationChunks = chunks(destinations.map((point, index) => ({ point, index })), MAX_SIDE)

  await Promise.all(
    originChunks.flatMap((from) =>
      destinationChunks.map(async (to) => {
        const { matrix } = await RouteMatrix.computeRouteMatrix({
          origins: from.map((o) => o.point),
          destinations: to.map((d) => d.point),
          travelMode: googleMode[mode],
          departureTime: mode === 'transit' ? departure : undefined,
          fields: ['durationMillis', 'distanceMeters', 'condition'],
        })
        matrix.rows.forEach((row, i) =>
          row.items.forEach((item, j) => {
            const found = item.condition === 'ROUTE_EXISTS' && item.durationMillis != null
            result[from[i]!.index]![to[j]!.index] = found
              ? { minutes: Math.round(item.durationMillis! / 60_000), meters: item.distanceMeters ?? 0 }
              : null
          }),
        )
      }),
    ),
  )
  return result
}

/** The path and description of one leg. Null when Google finds no route. */
export async function fetchLegRoute(
  origin: Point,
  destination: Point,
  mode: TravelMode,
  departure: Date,
): Promise<LegRoute | null> {
  configureGoogle()
  const { Route } = await importLibrary('routes')
  const { routes } = await Route.computeRoutes({
    origin,
    destination,
    travelMode: googleMode[mode],
    departureTime: mode === 'transit' ? departure : undefined,
    fields: ['path', 'durationMillis', 'distanceMeters', 'legs'],
  })
  const route = routes?.[0]
  if (!route?.path || route.durationMillis == null) return null

  const lines = (route.legs ?? [])
    .flatMap((leg) => leg.steps)
    .flatMap((step) => {
      const line = step.transitDetails?.transitLine
      if (!line) return []
      const vehicle = line.vehicle?.name ?? 'Transit'
      const name = line.shortName ?? line.name
      return [name ? `${vehicle} ${name}` : vehicle]
    })

  return {
    minutes: Math.round(route.durationMillis / 60_000),
    meters: route.distanceMeters ?? 0,
    path: route.path.map((p) => ({ lat: p.lat, lng: p.lng })),
    summary: mode === 'walk' ? 'Walk' : lines.join(' → ') || 'Transit',
  }
}
